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

test("SSD references show published values without a winner, percentage or apparent tie", () => {
  const throughput = { ...workload, category: "games" as const, metric: "fps" as const, higherIsBetter: true };
  for (const testedStorageGb of [2048, null]) {
    const reference = { ...sample, storageReference: { testedStorageGb, selectedStorageGb: 1024 } };
    for (const [left, right] of [[reference, sample], [sample, reference], [reference, { ...reference, value: 200 }]]) {
      const result = compareBenchmarks(left, right, throughput);
      assert.equal(result.status, "partial");
      assert.equal(result.percent, null);
      assert.equal(result.winner, null);
      assert.match(result.explanation, /SSD/u);
    }
  }
});

test("RAM or unknown-screen references cannot produce a winner even with documented matching protocols", () => {
  for (const hardwareReference of [
    { testedMemoryGb: 64, selectedMemoryGb: 32, testedScreenInches: 16.2, selectedScreenInches: 16.2, differences: ["memory" as const] },
    { testedMemoryGb: 32, selectedMemoryGb: 32, testedScreenInches: null, selectedScreenInches: 16.2, differences: ["screen" as const] },
  ]) {
    const reference = { ...sample, hardwareReference, value: 200 };
    for (const [left, right] of [[reference, sample], [sample, reference], [reference, reference]]) {
      const result = compareBenchmarks(left, right, workload);
      assert.equal(result.status, "partial");
      assert.equal(result.winner, null);
      assert.equal(result.percent, null);
      assert.match(result.explanation, /RAM ou tela/u);
    }
  }
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

test("CSV keeps selected and tested RAM/screens separate and labels reference versus exact", () => {
  const measurement: Benchmark = {
    ...sample, reportedHardware: "M1 Pro, RAM 64 GB; tela e SSD não informados",
    testedStorageGb: null, testedScreenInches: null,
    storageReference: { testedStorageGb: null, selectedStorageGb: 1024 },
    hardwareReference: {
      testedMemoryGb: 64, selectedMemoryGb: 32, testedScreenInches: null,
      selectedScreenInches: 16.2, differences: ["memory", "screen"],
    },
  };
  const fixture: Dataset = {
    updatedAt: "2026-10-27", workloads: [workload], benchmarks: [measurement], sources: [],
    devices: [{ id: "a", name: "Mac", family: "MacBook Pro", year: 2021, chip: "M1 Pro", cpuCores: 10,
      gpuCores: 16, memoryGb: 32, storageGb: 1024, bandwidthGbps: 200, screenInches: 16.2, specUrl: "https://support.apple.com/" }],
  };
  const cells = (line: string) => [...line.matchAll(/"((?:[^"]|"")*)"/gu)].map(match => match[1].replaceAll('""', '"'));
  const read = (data: Dataset) => {
    const [header, row] = buildComparisonCsv(data, "a", "missing", "apps").slice(1).split("\r\n").map(cells);
    assert.equal(row.length, header.length);
    return Object.fromEntries(header.map((key, index) => [key, row[index]]));
  };
  const reference = read(fixture);
  assert.equal(reference["RAM selecionada (GB)"], "32");
  assert.equal(reference["RAM testada (GB)"], "64");
  assert.equal(reference["Tela testada (pol.)"], "Não informado");
  assert.equal(reference["Tela selecionada (pol.)"], "16.2");
  assert.equal(reference["SSD testado (GB)"], "Não informado");
  assert.equal(reference["Tipo de resultado"], "reference");
  assert.equal(reference["Hardware reportado"], measurement.reportedHardware);
  assert.match(reference["Hardware selecionado"], /RAM 32 GB/u);
  const exact = read({ ...fixture, benchmarks: [sample] });
  assert.equal(exact["Tipo de resultado"], "exact");
  assert.equal(exact["RAM testada (GB)"], "32");
  assert.equal(exact["SSD testado (GB)"], "1024");
  const persistedUnknown = read({ ...fixture, benchmarks: [{ ...sample, testedStorageGb: null, testedScreenInches: null }] });
  assert.equal(persistedUnknown["SSD testado (GB)"], "Não informado");
  assert.equal(persistedUnknown["Tela testada (pol.)"], "Não informado");
  assert.equal(persistedUnknown["Tipo de resultado"], "reference");
});

test("CSV separates selected and tested SSD and preserves the real reported hardware", () => {
  const throughput: Workload = { ...workload, category: "llms", metric: "tokens/s", higherIsBetter: true };
  const fixture: Dataset = {
    updatedAt: "2026-10-27", workloads: [throughput], benchmarks: [{
      ...sample, reportedHardware: "M1 Pro, 32 GB RAM, SSD não informado",
      storageReference: { testedStorageGb: null, selectedStorageGb: 1024 },
    }],
    sources: [{ id: "source", title: "Original test", publisher: "Original author", url: "https://example.com/original-test", publishedAt: "2025-01-01", accessedAt: "2026-10-27" }],
    devices: [{ id: "a", name: "Mac", family: "MacBook Pro", year: 2021, chip: "M1 Pro", cpuCores: 10, gpuCores: 16, memoryGb: 32, storageGb: 1024, bandwidthGbps: 200, screenInches: 16, specUrl: "https://support.apple.com/" }],
  };
  const csv = buildComparisonCsv(fixture, "a", "missing-device", "llms");
  assert.ok(csv.includes('"Hardware reportado","SSD testado (GB)","Aplicação do resultado"'));
  assert.ok(csv.includes('"32","1024","llms"'));
  assert.ok(csv.includes('"M1 Pro, 32 GB RAM, SSD não informado","Não informado","Referência de FPS/tokens/s; SSD diferente ou não informado; sem vantagem calculada"'));
  assert.ok(csv.includes("https://example.com/original-test"));
  const knownTestedSsd = { ...fixture, benchmarks: [{ ...fixture.benchmarks[0], storageReference: { testedStorageGb: 2048, selectedStorageGb: null } }] };
  const unknownSelectionCsv = buildComparisonCsv(knownTestedSsd, "a", "missing-device", "llms");
  assert.ok(unknownSelectionCsv.includes('"32","Não informado","llms"'));
  assert.ok(unknownSelectionCsv.includes('","2048","Referência de FPS/tokens/s;'));
});
