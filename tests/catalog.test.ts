import assert from "node:assert/strict";
import test from "node:test";
import { GET as getBenchmarks } from "../src/app/api/benchmarks/route";
import { dataset } from "../src/data/catalog";
import { compareBenchmarks } from "../src/lib/comparison";
import { recordForConfiguration } from "../src/lib/configuration";

test("catalog collections have nonempty unique identifiers", () => {
  for (const [name, items] of Object.entries({
    devices: dataset.devices, workloads: dataset.workloads,
    benchmarks: dataset.benchmarks, sources: dataset.sources,
  })) {
    const ids = items.map((item) => item.id);
    assert.ok(ids.every((id) => id.trim().length > 0), `${name}: empty ID`);
    assert.equal(new Set(ids).size, ids.length, `${name}: duplicate ID`);
  }
});

test("every measurement has valid provenance and exact hardware and workload references", () => {
  const devices = new Map(dataset.devices.map((item) => [item.id, item]));
  const workloadIds = new Set(dataset.workloads.map((item) => item.id));
  const sourceIds = new Set(dataset.sources.map((item) => item.id));
  for (const benchmark of dataset.benchmarks) {
    const device = devices.get(benchmark.deviceId);
    assert.ok(device, `${benchmark.id}: missing device`);
    assert.ok(workloadIds.has(benchmark.workloadId), `${benchmark.id}: missing workload`);
    assert.ok(sourceIds.has(benchmark.sourceId), `${benchmark.id}: missing source`);
    assert.ok(Number.isFinite(benchmark.value) && benchmark.value > 0, `${benchmark.id}: invalid measurement`);
    assert.ok(benchmark.reportedHardware.trim(), `${benchmark.id}: missing tested hardware description`);
    assert.match(benchmark.reportedHardware, new RegExp(`\\b${device.memoryGb}\\s*GB\\b`, "i"),
      `${benchmark.id}: reported RAM does not match selected hardware`);
    assert.ok(Object.keys(benchmark.conditions).length > 0, `${benchmark.id}: missing conditions`);
  }
});

test("documented comparisons have a protocol and no missing conditions", () => {
  const protocols = new Map<string, string>();
  for (const benchmark of dataset.benchmarks) {
    if (benchmark.quality === "documented") {
      assert.ok(benchmark.comparabilityKey?.trim(), `${benchmark.id}: documented without protocol`);
      assert.deepEqual(benchmark.missingFields, [], `${benchmark.id}: documented with missing conditions`);
    } else {
      assert.equal(benchmark.quality, "partial");
      assert.ok(benchmark.missingFields.length > 0, `${benchmark.id}: partial without explaining missing conditions`);
    }
    if (benchmark.comparabilityKey) {
      const existing = protocols.get(benchmark.comparabilityKey);
      assert.ok(!existing || existing === benchmark.workloadId,
        `${benchmark.id}: one comparability key reused across different workloads`);
      protocols.set(benchmark.comparabilityKey, benchmark.workloadId);
    }
  }
});

test("source and specification URLs use HTTPS and Intel GPUs are not Apple GPU core counts", () => {
  for (const source of dataset.sources) {
    const url = new URL(source.url);
    assert.equal(url.protocol, "https:", `${source.id}: insecure source URL`);
    assert.equal(url.username + url.password, "", `${source.id}: URL credentials`);
    assert.ok(Number.isFinite(Date.parse(source.accessedAt)), `${source.id}: invalid access date`);
    if (source.publishedAt) assert.ok(Number.isFinite(Date.parse(source.publishedAt)), `${source.id}: invalid publication date`);
  }
  for (const device of dataset.devices) {
    const url = new URL(device.specUrl);
    assert.equal(url.protocol, "https:", `${device.id}: insecure specifications URL`);
    assert.ok(url.hostname === "apple.com" || url.hostname.endsWith(".apple.com"), `${device.id}: specs must cite Apple`);
    assert.ok(Number.isInteger(device.cpuCores) && device.cpuCores > 0, `${device.id}: invalid CPU cores`);
    assert.ok(device.memoryGb > 0, `${device.id}: invalid RAM`);
    if (device.architecture === "intel") {
      assert.equal(device.gpuCores, null, `${device.id}: Intel GPU cannot reuse Apple GPU-core units`);
      assert.ok(device.gpuName?.trim(), `${device.id}: missing Intel GPU model`);
    } else {
      assert.ok(Number.isInteger(device.gpuCores) && device.gpuCores! > 0, `${device.id}: invalid Apple GPU cores`);
    }
  }
});

test("API exposes newly sourced 32GB results without relabelling the 16GB or 64GB measurements", async () => {
  for (const id of ["mbp16-m1pro-32", "mbp16-m1max-32"]) {
    assert.ok(dataset.devices.some((device) => device.id === id));
    const response = await getBenchmarks(new Request(`https://example.com/api/benchmarks?deviceIds=${id}`));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.devices.length, 1);
    assert.ok(body.benchmarks.length > 0);
    assert.ok(body.sources.length > 0);
    assert.ok(body.benchmarks.every((record: { deviceId: string; reportedHardware: string }) =>
      record.deviceId === id && /RAM 32 GB/u.test(record.reportedHardware)));
    assert.ok(!body.benchmarks.some((record: { sourceId: string }) =>
      record.sourceId === "notebookcheck-m1pro" || record.sourceId === "notebookcheck-m1max"));
  }
});

test("the user's 32GB pair shows published FPS with the actual, different resolutions", () => {
  const workload = dataset.workloads.find(w => w.id === "shadow-highest-published")!;
  const left = recordForConfiguration(dataset, { deviceId: "mbp16-m1pro-32", storageGb: 1024 }, workload.id)!;
  const right = recordForConfiguration(dataset, { deviceId: "mbp16-m1max-32", storageGb: 1024 }, workload.id)!;
  assert.equal(left.value, 46);
  assert.equal(right.value, 85);
  assert.equal(left.conditions["Resolução"], "1920 × 1200");
  assert.equal(right.conditions["Resolução"], "1920 × 1080");
  assert.equal(left.sourceId, "verge-m1-2021");
  assert.equal(right.sourceId, "reviewed-m1max-32");
  assert.equal(left.hardwareReference, undefined);
  assert.equal(right.hardwareReference, undefined);
  const comparison = compareBenchmarks(left, right, workload);
  assert.equal(comparison.winner, null);
  assert.equal(comparison.percent, null, "Different resolutions cannot become a performance advantage");
});

test("LLM references retain measured RAM, while new M1 Max 32GB results remain distinct", () => {
  const configuration = { deviceId: "mbp16-m1max-32", storageGb: 1024 };
  assert.equal(recordForConfiguration(dataset, configuration, "llama2-q4-generation"), undefined);
  const reference = recordForConfiguration(dataset, configuration, "llama2-q4-generation", { includeRelated: true })!;
  assert.equal(reference.value, 61.19);
  assert.equal(reference.deviceId, "mbp16-m1max-64");
  assert.equal(reference.hardwareReference?.testedMemoryGb, 64);
  assert.match(reference.reportedHardware, /RAM 64 GB/u);
  const actual32 = recordForConfiguration(dataset, configuration, "qwen35-9b-llamacpp-4bit-generation-2026", { includeRelated: true })!;
  assert.equal(actual32.value, 37.1);
  assert.equal(actual32.deviceId, "mbp16-m1max-32");
  assert.equal(actual32.hardwareReference?.testedMemoryGb, 32);
  assert.equal(actual32.hardwareReference?.testedScreenInches, null);
  assert.equal(actual32.testedStorageGb, null);
  assert.match(actual32.reportedHardware, /RAM 32 GB/u);
});

test("API filters exact IDs and categories without fabricating missing entries", async () => {
  for (const query of ["category=invalid", "deviceIds=nonexistent-config", "deviceIds="]) {
    assert.equal((await getBenchmarks(new Request(`https://example.com/api/benchmarks?${query}`))).status, 400);
  }
  const record = dataset.benchmarks[0];
  assert.ok(record, "The initial dataset must contain real measured data");
  const workload = dataset.workloads.find((item) => item.id === record.workloadId)!;
  const response = await getBenchmarks(new Request(
    `https://example.com/api/benchmarks?deviceIds=${record.deviceId}&category=${workload.category}`,
  ));
  const body = await response.json();
  assert.ok(body.benchmarks.length > 0);
  assert.ok(body.benchmarks.every((entry: { deviceId: string; workloadId: string }) =>
    entry.deviceId === record.deviceId && dataset.workloads.some((item) =>
      item.id === entry.workloadId && item.category === workload.category)));
});

test("partial source metadata never produces an automatic winning device", () => {
  for (const left of dataset.benchmarks.filter((entry) => entry.quality === "partial")) {
    const right = dataset.benchmarks.find((entry) =>
      entry.workloadId === left.workloadId && entry.deviceId !== left.deviceId);
    const workload = dataset.workloads.find((entry) => entry.id === left.workloadId);
    const result = compareBenchmarks(left, right, workload);
    assert.equal(result.percent, null, `${left.id}: partial measurement produced an advantage`);
    assert.equal(result.winner, null, `${left.id}: partial measurement produced a winner`);
  }
});
