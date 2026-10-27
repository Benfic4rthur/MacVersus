import test from "node:test";
import assert from "node:assert/strict";
import { dataset } from "../src/data/catalog";
import { buildCapacityProfile, datasetForSelections, getStorageOptions, parseStorageSelection, recordForConfiguration } from "../src/lib/configuration";
import type { Device, Workload } from "../src/lib/types";

test("FPS remains a labelled reference when only the selected SSD changes", () => {
  const deviceId = "mbp16-m1max-64";
  const exact = recordForConfiguration(dataset, { deviceId, storageGb: 2048 }, "shadow-1080-high")!;
  assert.ok(exact);
  assert.equal(exact.storageReference, undefined);
  for (const storageGb of [1024, null]) {
    const reference = recordForConfiguration(dataset, { deviceId, storageGb }, "shadow-1080-high")!;
    assert.deepEqual(reference.storageReference, { testedStorageGb: 2048, selectedStorageGb: storageGb });
    assert.equal(reference.id, exact.id);
    assert.equal(reference.deviceId, exact.deviceId);
    assert.equal(reference.sourceId, exact.sourceId);
    assert.equal(reference.reportedHardware, exact.reportedHardware);
    assert.equal(reference.value, exact.value);
    assert.equal(reference.conditions, exact.conditions);
    assert.equal(reference.missingFields, exact.missingFields);
  }
  assert.equal(exact.storageReference, undefined, "The source measurement must remain unchanged");
});

test("tokens per second with unknown tested SSD remains explicitly unknown", () => {
  const deviceId = "mba13-m1-16";
  const exact = recordForConfiguration(dataset, { deviceId, storageGb: null }, "llama2-q4-generation")!;
  const reference = recordForConfiguration(dataset, { deviceId, storageGb: 1024 }, "llama2-q4-generation")!;
  assert.ok(exact);
  assert.equal(exact.storageReference, undefined);
  assert.deepEqual(reference.storageReference, { testedStorageGb: null, selectedStorageGb: 1024 });
  assert.equal(reference.value, exact.value);
  assert.match(reference.reportedHardware, /SSD não informado/u);
  assert.ok(reference.missingFields.includes("SSD"));
});

test("a newly sourced exact SSD configuration takes priority over a reference", () => {
  const original = dataset.devices.find(d => d.id === "mbp16-m1max-64")!;
  const record = dataset.benchmarks.find(b => b.deviceId === original.id)!;
  const extra = { ...original, id: "fixture-only-exact-ssd", storageGb: 1024 };
  const fixture = { ...dataset, devices: [...dataset.devices, extra], benchmarks: [...dataset.benchmarks, { ...record, id: "fixture-only-record", deviceId: extra.id }] };
  const exact = recordForConfiguration(fixture, { deviceId: original.id, storageGb: 1024 }, record.workloadId)!;
  assert.equal(exact.id, "fixture-only-record");
  assert.equal(exact.deviceId, extra.id);
  assert.equal(exact.storageReference, undefined);
  const differentRam = { ...fixture, devices: fixture.devices.map(d => d.id === extra.id ? { ...d, memoryGb: 32 } : d) };
  const reference = recordForConfiguration(differentRam, { deviceId: original.id, storageGb: 1024 }, record.workloadId)!;
  assert.equal(reference.id, record.id);
  assert.deepEqual(reference.storageReference, { testedStorageGb: 2048, selectedStorageGb: 1024 });
});

test("legacy Apple Silicon entries without architecture still match explicit catalog aliases", () => {
  const original = dataset.devices.find(d => d.id === "mbp16-m1max-64")!;
  const source = dataset.benchmarks.find(b => b.deviceId === original.id && b.workloadId === "shadow-1080-high")!;
  const legacy = { ...original, id: "fixture-legacy", architecture: undefined };
  const fixture = { ...dataset, devices: [original, legacy], benchmarks: [{ ...source, deviceId: legacy.id }] };
  assert.equal(recordForConfiguration(fixture, { deviceId: original.id, storageGb: 2048 }, source.workloadId)?.deviceId, legacy.id);
  assert.equal(recordForConfiguration(fixture, { deviceId: original.id, storageGb: 1024 }, source.workloadId)?.deviceId, legacy.id);
});

test("SSD references never cross CPU, GPU, RAM, family, year, architecture or screen configurations", () => {
  const original = dataset.devices.find(d => d.id === "mbp16-m1max-64")!;
  const record = dataset.benchmarks.find(b => b.deviceId === original.id && b.workloadId === "shadow-1080-high")!;
  const differences: Partial<Device>[] = [
    { cpuCores: 8 }, { gpuCores: 24 }, { gpuName: "Different GPU" }, { gpuMemoryGb: 8 },
    { memoryGb: 32 }, { family: "MacBook Air" }, { year: 2023 }, { screenInches: 14.2 },
    { chip: "M2 Max" }, { architecture: "intel" },
  ];
  for (const difference of differences) {
    const other = { ...original, ...difference, id: "fixture-other", storageGb: 1024 };
    const fixture = { ...dataset, devices: [original, other], benchmarks: [{ ...record, deviceId: other.id }] };
    assert.equal(recordForConfiguration(fixture, { deviceId: original.id, storageGb: 512 }, record.workloadId), undefined,
      `Unexpected match for ${JSON.stringify(difference)}`);
    assert.equal(recordForConfiguration(fixture, { deviceId: original.id, storageGb: 1024 }, record.workloadId), undefined);
  }
});

test("Intel references require the same GPU model and dedicated memory", () => {
  const intel = dataset.devices.find(d => d.architecture === "intel" && d.gpuMemoryGb)!;
  const game = dataset.workloads.find(w => w.category === "games" && w.metric === "fps")!;
  const sample = dataset.benchmarks.find(b => b.workloadId === game.id)!;
  const other = { ...intel, id: "fixture-intel", storageGb: 2048 };
  const fixture = { ...dataset, devices: [intel, other], benchmarks: [{ ...sample, deviceId: other.id }] };
  assert.ok(recordForConfiguration(fixture, { deviceId: intel.id, storageGb: 1024 }, game.id)?.storageReference);
  for (const difference of [{ gpuName: "Different Radeon" }, { gpuMemoryGb: intel.gpuMemoryGb! + 4 }, { gpuName: undefined }]) {
    const mismatch = { ...fixture, devices: [intel, { ...other, ...difference }] };
    assert.equal(recordForConfiguration(mismatch, { deviceId: intel.id, storageGb: 1024 }, game.id), undefined);
  }
});

test("rendering, exports and storage tests require the selected SSD, even for app throughput", () => {
  const deviceId = "mbp16-m1max-64";
  for (const workloadId of ["blender-bmw-cpu", "premiere-export-score"]) {
    assert.ok(recordForConfiguration(dataset, { deviceId, storageGb: 2048 }, workloadId));
    assert.equal(recordForConfiguration(dataset, { deviceId, storageGb: 1024 }, workloadId), undefined);
  }
  const source = dataset.benchmarks.find(b => b.deviceId === deviceId)!;
  for (const metric of ["seconds", "score", "MB/s", "fps", "tokens/s"] as const) {
    const workload: Workload = { id: "fixture-app", category: "apps", metric, name: "Fixture only", subtitle: "", higherIsBetter: true, description: "Synthetic test fixture" };
    const fixture = { ...dataset, workloads: [workload], benchmarks: [{ ...source, workloadId: workload.id }] };
    assert.equal(recordForConfiguration(fixture, { deviceId, storageGb: 1024 }, workload.id), undefined, metric);
    assert.ok(recordForConfiguration(fixture, { deviceId, storageGb: 2048 }, workload.id));
  }
});

test("selection exports retain tested SSD and reported hardware separately from the selected capacity", () => {
  const deviceId = "mbp16-m1max-64";
  const exported = datasetForSelections(dataset, [{ deviceId, storageGb: 1024 }, { deviceId, storageGb: 2048 }]);
  const references = exported.benchmarks.filter(b => b.deviceId === exported.devices[0].id);
  assert.ok(references.length > 0);
  assert.ok(references.every(b => b.storageReference?.testedStorageGb === 2048));
  assert.ok(references.every(b => b.storageReference?.selectedStorageGb === 1024));
  assert.ok(references.every(b => b.reportedHardware.includes("SSD 2 TB")));
  assert.equal(exported.devices[0].storageGb, 1024);
  assert.equal(exported.devices[1].storageGb, 2048);
  assert.ok(exported.benchmarks.filter(b => b.deviceId === exported.devices[1].id).every(b => !b.storageReference));
});

test("storage URLs reject unsupported values without changing the configuration", () => {
  const device = dataset.devices.find(d => d.id === "mbp16-m1max-64")!;
  assert.equal(parseStorageSelection("1024", device), 1024);
  assert.equal(parseStorageSelection("1234", device), 2048);
  assert.equal(parseStorageSelection("unknown", device), null);
  assert.equal(getStorageOptions(device).includes(256), false);
});

test("radar uses actual capacities and leaves unsupported Intel GPU axis unknown", () => {
  const left = dataset.devices.find(d => d.id === "mbp16-m1pro-16")!;
  const right = dataset.devices.find(d => d.id === "mbp16-m1max-64")!;
  const profile = buildCapacityProfile(left, right);
  assert.equal(profile.find(a => a.id === "ram")!.leftRatio, .25);
  assert.equal(profile.find(a => a.id === "ram")!.rightRatio, 1);
  const intel = dataset.devices.find(d => d.architecture === "intel")!;
  const missing = buildCapacityProfile(intel, { ...right, storageGb: null });
  assert.equal(missing.find(a => a.id === "gpu")!.leftRatio, null);
  assert.equal(missing.find(a => a.id === "ssd")!.rightRatio, null);
});
