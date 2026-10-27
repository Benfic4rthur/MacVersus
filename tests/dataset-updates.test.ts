import assert from "node:assert/strict";
import test from "node:test";
import { dataset } from "../src/data/catalog";
import { createDatasetLoader, MAX_FEED_BYTES, mergeDatasetUpdate, validateFeedUrl } from "../src/lib/dataset-updates";

const empty = () => ({ schemaVersion: 1, updatedAt: "2026-10-27", devices: [], workloads: [], sources: [], benchmarks: [] });
const url = "https://raw.githubusercontent.com/example/benchmarks/main/reviewed.json";
const measurement = () => structuredClone(dataset.benchmarks[0]);
const feedWith = (key: string, value: unknown) => ({ ...empty(), [key]: [value] });

test("empty reviewed feed preserves the original measurements and unknown values", () => {
  const result = mergeDatasetUpdate(dataset, empty());
  assert.deepEqual(result, dataset);
  assert.equal(dataset.devices.find(d => d.id === "mba13-m1-16")!.storageGb, null);
});
test("update IDs cannot silently reassign a measured device to different RAM, GPU or SSD", () => {
  for (const field of ["memoryGb", "gpuCores", "storageGb"] as const) {
    const original = dataset.devices.find(d => d.id === "mbp16-m1pro-16")!;
    const modified = { ...original, [field]: Number(original[field]) * 2 };
    assert.throws(() => mergeDatasetUpdate(dataset, feedWith("devices", modified)), /identidade incompatível/);
  }
});
test("duplicate IDs, missing references, nonfinite measurements and insecure source URLs are rejected", () => {
  const b = measurement();
  assert.throws(() => mergeDatasetUpdate(dataset, { ...empty(), benchmarks: [b, b] }), /duplicados/);
  assert.throws(() => mergeDatasetUpdate(dataset, feedWith("benchmarks", { ...b, id: "test-missing", sourceId: "absent" })), /referência ausente/);
  for (const value of [0, -1, NaN, Infinity]) assert.throws(() => mergeDatasetUpdate(dataset, feedWith("benchmarks", { ...b, value })), /positivo/);
  assert.throws(() => mergeDatasetUpdate(dataset, feedWith("sources", { ...dataset.sources[0], url: "http://example.com/source" })), /HTTPS/);
});
test("wrong metric units and unsupported fields cannot enter the dataset", () => {
  assert.throws(() => mergeDatasetUpdate(dataset, feedWith("workloads", { ...dataset.workloads[0], metric: "tokens/s" })), /unidade/);
  assert.throws(() => mergeDatasetUpdate(dataset, { ...empty(), guessedValues: [] }), /campo desconhecido/);
  assert.throws(() => mergeDatasetUpdate(dataset, { ...empty(), schemaVersion: 2 }), /schemaVersion/);
  assert.throws(() => mergeDatasetUpdate(dataset, { ...empty(), updatedAt: "2026-02-30" }), /data/);
});
test("a validator never promotes incomplete metadata to a documented comparison", () => {
  const b = measurement();
  assert.throws(() => mergeDatasetUpdate(dataset, feedWith("benchmarks", { ...b, quality: "documented", comparabilityKey: "test-protocol" })), /desconhecidas/);
  assert.throws(() => mergeDatasetUpdate(dataset, feedWith("benchmarks", { ...b, quality: "documented", missingFields: [], comparabilityKey: "test-protocol", conditions: { Runtime: "Não informado" } })), /desconhecidas/);
  assert.throws(() => mergeDatasetUpdate(dataset, feedWith("benchmarks", { ...b, missingFields: [] })), /parciais/);
  assert.throws(() => mergeDatasetUpdate(dataset, feedWith("benchmarks", { ...b, reportedHardware: "Memória não informada" })), /memória descrita/);
});
test("remote fetch URL is restricted to public raw GitHub JSON and cannot request internal servers", () => {
  assert.equal(validateFeedUrl(url), url);
  for (const invalid of ["http://raw.githubusercontent.com/a/b/main/a.json", "https://127.0.0.1/a.json", "https://localhost/a.json", "https://raw.githubusercontent.com.evil.example/a/b/main/a.json", "https://token@raw.githubusercontent.com/a/b/main/a.json", `${url}?token=secret`, "https://raw.githubusercontent.com/a/b/main/a.html"]) assert.throws(() => validateFeedUrl(invalid));
});
test("concurrent loads share one request and successful data is cached for ten minutes", async () => {
  let calls = 0, now = Date.parse("2026-10-27T12:00:00Z");
  const loader = createDatasetLoader({ base: dataset, localFeed: empty(), feedUrl: () => url, now: () => now, fetcher: async (_url, init) => {
    calls++; assert.equal(init?.redirect, "error"); assert.equal(init?.cache, "no-store"); assert.ok(init?.signal instanceof AbortSignal);
    return Response.json(empty());
  } });
  const [first, second] = await Promise.all([loader.load(), loader.load()]);
  assert.deepEqual(first, second); assert.equal(calls, 1); assert.equal(loader.status().mode, "remote");
  now += 599999; await loader.load(); assert.equal(calls, 1);
  now += 2; await loader.load(); assert.equal(calls, 2);
});
test("failed updates preserve last good feed, throttle retries and eventually fall back to base", async () => {
  let calls = 0, now = Date.parse("2026-10-27T12:00:00Z");
  const loader = createDatasetLoader({ base: dataset, localFeed: empty(), feedUrl: () => url, now: () => now, fetcher: async () => {
    calls++; if (calls > 1) throw new Error("network unavailable"); return Response.json({ ...empty(), updatedAt: "2026-10-28" });
  } });
  await loader.load(); now += 600001; const stale = await loader.load();
  assert.equal(stale.updatedAt, "2026-10-28"); assert.equal(loader.status().mode, "stale");
  await loader.load(); assert.equal(calls, 2);
  now += 24 * 60 * 60 * 1000; const fallback = await loader.load();
  assert.deepEqual(fallback, dataset); assert.equal(loader.status().mode, "base");
});
test("invalid local or remote feed fails closed without crashing or modifying the base", async () => {
  const invalid = createDatasetLoader({ base: dataset, localFeed: { schemaVersion: 0 }, feedUrl: () => "https://localhost/feed.json", fetcher: async () => { throw new Error("must not fetch"); } });
  assert.deepEqual(await invalid.load(), dataset);
  const oversized = createDatasetLoader({ base: dataset, localFeed: empty(), feedUrl: () => url, fetcher: async () => new Response("{}", { headers: { "content-length": String(MAX_FEED_BYTES + 1) } }) });
  assert.deepEqual(await oversized.load(), dataset); assert.equal(oversized.status().mode, "base");
  const badJson = createDatasetLoader({ base: dataset, localFeed: empty(), feedUrl: () => url, fetcher: async () => new Response("not-json") });
  assert.deepEqual(await badJson.load(), dataset);
});

test("application updates accept measured SSD throughput and timeline FPS with an HTTPS reference", () => {
  for (const metric of ["MB/s", "fps"]) {
    const workload = { id: `fixture-app-${metric === "fps" ? "timeline" : "ssd"}`, category: "apps", name: "Fixture de validação", subtitle: "Somente teste estrutural", metric, higherIsBetter: true, description: "Não é uma medição publicada.", sourceUrl: "https://support.apple.com/en-us/111901" };
    assert.ok(mergeDatasetUpdate(dataset, feedWith("workloads", workload)).workloads.some(item => item.id === workload.id));
    assert.throws(() => mergeDatasetUpdate(dataset, feedWith("workloads", { ...workload, sourceUrl: "http://example.com" })), /HTTPS/);
  }
});
