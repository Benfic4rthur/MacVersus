import assert from "node:assert/strict";
import test from "node:test";
import { buildComparisonCsv, compareBenchmarks, formatValue } from "../src/lib/comparison";
import type { Benchmark, Dataset, Workload } from "../src/lib/types";

const workload: Workload = { id: "render", category: "apps", name: "Render", subtitle: "Cena fixa", metric: "seconds", higherIsBetter: false, description: "Mesma cena e versão" };
const sample: Benchmark = { id: "a", deviceId: "a", workloadId: "render", value: 100, sourceId: "source", conditions: { Versão: "1" }, quality: "documented", missingFields: [], comparabilityKey: "render-v1", notes: "", reportedHardware: "a" };

test("render: calculates time saved using the slower measurement as baseline", () => {
  const result = compareBenchmarks(sample, { ...sample, id: "b", value: 50 }, workload);
  assert.equal(result.winner, "right");
  assert.equal(result.percent, 50);
  assert.equal(result.status, "comparable");
});

test("throughput: twice the FPS means 100 percent more", () => {
  const result = compareBenchmarks(sample, { ...sample, value: 200 }, { ...workload, metric: "fps", higherIsBetter: true });
  assert.equal(result.percent, 100);
  assert.equal(result.winner, "right");
});

test("incomplete or different protocols cannot produce a winning device", () => {
  for (const change of [ { comparabilityKey: null }, { comparabilityKey: "render-v2" }, { quality: "partial" as const }, { missingFields: ["Versão do aplicativo"] }, { workloadId: "other" } ]) {
    const result = compareBenchmarks(sample, { ...sample, ...change, value: 200 }, workload);
    assert.equal(result.status, "partial");
    assert.equal(result.percent, null);
    assert.equal(result.winner, null);
  }
});

test("missing and invalid measurements never become zeros or estimates", () => {
  assert.equal(compareBenchmarks(sample, undefined, workload).status, "missing");
  for (const value of [0, -1, NaN, Infinity]) {
    assert.equal(compareBenchmarks(sample, { ...sample, value }, workload).status, "missing");
  }
  assert.equal(formatValue(NaN, "fps"), "Sem dados");
});

test("equal measurements are a tie", () => {
  assert.deepEqual({ ...compareBenchmarks(sample, sample, workload), explanation: "" }, {
    status: "comparable", percent: 0, winner: "tie", explanation: "",
  });
});

test("CSV includes provenance, escapes formulas and retains missing data", () => {
  const dataset: Dataset = {
    updatedAt: "2026-10-27", workloads: [workload], benchmarks: [{ ...sample, notes: '=HYPERLINK("https://example.com")' }],
    sources: [{ id: "source", title: "Teste", publisher: "Autor", url: "https://example.com/test", publishedAt: "2025-01-01", accessedAt: "2026-10-27" }],
    devices: ["a", "b"].map((id) => ({ id, name: `Mac ${id}`, family: "MacBook Pro", year: 2021, chip: "M1 Pro", cpuCores: 10, gpuCores: 16, memoryGb: 32, storageGb: null, bandwidthGbps: 200, screenInches: 16, specUrl: "https://support.apple.com/" })),
  };
  const csv = buildComparisonCsv(dataset, "a", "b", "apps");
  assert.ok(csv.includes("https://example.com/test"));
  assert.ok(csv.includes("Sem dados"));
  assert.ok(csv.includes("'=HYPERLINK"));
  assert.ok(csv.startsWith("\uFEFF"));
});
