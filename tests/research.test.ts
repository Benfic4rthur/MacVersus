import assert from "node:assert/strict";
import test from "node:test";
import {
  createResearchService,
  parseResearchInput,
  readResearchBody,
  ResearchError,
  researchErrorResponse,
  safeResultUrl,
} from "../src/lib/research";
import type { Dataset } from "../src/lib/types";

const data: Dataset = {
  updatedAt: "2026-10-27",
  devices: [{
    id: "mac-a", name: "Mac A", family: "MacBook Pro", year: 2021, chip: "M1 Pro",
    cpuCores: 10, gpuCores: 16, memoryGb: 16, storageGb: 1024, bandwidthGbps: 200,
    screenInches: 16, specUrl: "https://support.apple.com/en-us/111901",
  }, {
    id: "mac-b", name: "Mac B", family: "MacBook Pro", year: 2021, chip: "M1 Max",
    cpuCores: 10, gpuCores: 32, memoryGb: 64, storageGb: 2048, bandwidthGbps: 400,
    screenInches: 16, specUrl: "https://support.apple.com/en-us/111901",
  }],
  workloads: [{
    id: "game", category: "games", name: "Shadow of the Tomb Raider", subtitle: "1080p High",
    metric: "fps", higherIsBetter: true, description: "Benchmark integrado",
  }],
  sources: [{
    id: "source", title: "MacBook Pro review", publisher: "Notebookcheck",
    url: "https://www.notebookcheck.net/review.html", publishedAt: "2021-11-13", accessedAt: "2026-10-27",
  }],
  benchmarks: [{
    id: "result", deviceId: "mac-a", workloadId: "game", value: 57, sourceId: "source",
    conditions: { resolution: "1920x1080" }, quality: "partial", missingFields: ["Game version"],
    comparabilityKey: null, notes: "Rosetta", reportedHardware: "M1 Pro 16GB",
  }],
};
const input = { category: "games", deviceIds: ["mac-a", "mac-b"], query: "" };

function stubFetch(handler: (url: string, init?: RequestInit) => Promise<Response>): typeof fetch {
  return ((url, init) => handler(String(url), init)) as typeof fetch;
}

const liveResponse = () => Response.json({
  results: [{
    title: "A measured benchmark", url: "https://example.com/results", content: "Conditions and measurements.",
    published_date: "2025-12-03",
  }],
});

test("input validates category, known IDs and query size before any upstream work", () => {
  assert.deepEqual(parseResearchInput({ ...input, query: "  Tomb  Raider  " }, data).query, "Tomb Raider");
  for (const invalid of [null, [], {}, { ...input, category: "invalid" },
    { ...input, deviceIds: ["unknown"] }, { ...input, deviceIds: [] },
    { ...input, deviceIds: ["mac-a", "mac-a", "mac-a"] },
    { ...input, query: "a".repeat(241) }, { ...input, query: 42 }, { ...input, query: "bad\u0000query" }]) {
    assert.throws(() => parseResearchInput(invalid, data), (error: unknown) => error instanceof ResearchError && error.status === 400);
  }
});

test("missing API key honestly serves catalog records, no fetch and no invented measurements", async () => {
  let calls = 0;
  const service = createResearchService({ data, fetchImpl: stubFetch(async () => { calls++; return liveResponse(); }) });
  const result = await service.search(input);
  assert.equal(result.mode, "catalog");
  assert.equal(result.results.length, 1);
  assert.match(result.message, /base local/u);
  assert.match(result.message, /não está habilitada/u);
  assert.equal(result.searchLinks.length, 2);
  assert.equal(calls, 0);
  assert.equal((await service.search({ ...input, category: "llms" })).results.length, 0);
  assert.equal((await service.search({ ...input, query: "Qwen" })).results.length, 0);
});

test("Intel discovery uses the real GPU name and release year instead of Apple GPU-core units", async () => {
  const intelData: Dataset = { ...data, devices: [{
    ...data.devices[0], id: "intel", year: 2019, chip: "Intel Core i9", architecture: "intel",
    gpuCores: null, gpuName: "Radeon Pro 5600M", gpuMemoryGb: 8,
  }] };
  const result = await createResearchService({ data: intelData }).search({
    category: "games", deviceIds: ["intel"],
  });
  assert.match(result.query, /2019 Intel Core i9 Radeon Pro 5600M/u);
  assert.doesNotMatch(result.query, /null|GPU cores/u);
});

test("benchmark discovery preserves FPS and tokens sources across SSD choices but keeps app tests exact", async () => {
  for (const [category, metric, expected] of [["games", "fps", 1], ["llms", "tokens/s", 1], ["apps", "seconds", 0]] as const) {
    const fixture: Dataset = { ...data, workloads: [{ ...data.workloads[0], category, metric }] };
    const service = createResearchService({ data: fixture });
    const result = await service.search({ category, deviceIds: ["mac-a"], storageGb: [512], query: "" });
    assert.equal(result.results.length, expected, `${category}: source follows the comparison matching policy`);
    if (category === "apps") assert.match(result.query, /512 GB SSD/u);
    else assert.doesNotMatch(result.query, /SSD/u);
    assert.match(result.query, /16GB RAM/u);
  }
});

test("live provider request is server-only, bounded, cached and omits LLM answer generation", async () => {
  let calls = 0;
  const service = createResearchService({ data, apiKey: "test-secret", fetchImpl: stubFetch(async (url, init) => {
    calls++;
    assert.equal(url, "https://api.tavily.com/search");
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer test-secret");
    const body = JSON.parse(String(init?.body));
    assert.equal(body.max_results, 6);
    assert.equal(body.search_depth, "basic");
    assert.equal(body.include_answer, false);
    assert.equal(body.include_raw_content, false);
    assert.ok(init?.signal);
    return liveResponse();
  }) });
  const first = await service.search(input);
  assert.equal(first.mode, "live");
  assert.equal(first.cached, false);
  assert.equal(first.results[0].publishedAt, "2025-12-03");
  assert.doesNotMatch(JSON.stringify(first), /test-secret/u);
  const second = await service.search(input);
  assert.equal(second.cached, true);
  assert.equal(calls, 1);
});

test("optional access token protects cached and new live searches", async () => {
  let calls = 0;
  const service = createResearchService({ data, apiKey: "provider-key", accessToken: "private-token", fetchImpl: stubFetch(async () => {
    calls++; return liveResponse();
  }) });
  for (const authorization of [undefined, "Bearer wrong", "Basic private-token", "Bearer private-token "]) {
    await assert.rejects(() => service.search(input, authorization), (error: unknown) => error instanceof ResearchError && error.status === 401);
  }
  assert.equal(calls, 0);
  await service.search(input, "Bearer private-token");
  await assert.rejects(() => service.search(input), (error: unknown) => error instanceof ResearchError && error.status === 401);
  assert.equal(calls, 1);
});

test("simultaneous identical searches share a single upstream request", async () => {
  let calls = 0;
  const service = createResearchService({ data, apiKey: "key", fetchImpl: stubFetch(async () => {
    calls++;
    await Promise.resolve();
    return liveResponse();
  }) });
  const results = await Promise.all([service.search(input), service.search(input), service.search(input)]);
  assert.equal(calls, 1);
  assert.equal(results.filter((result) => result.cached).length, 2);
});

test("rate limit bounds paid misses but allows cache hits and resets", async () => {
  let time = 0;
  let calls = 0;
  const service = createResearchService({ data, apiKey: "key", now: () => time, limitPerMinute: 1,
    fetchImpl: stubFetch(async () => { calls++; return liveResponse(); }) });
  await service.search(input);
  assert.equal((await service.search(input)).cached, true);
  await assert.rejects(() => service.search({ ...input, query: "Blender" }),
    (error: unknown) => error instanceof ResearchError && error.status === 429 && error.retryAfter === 60);
  time = 60_001;
  await service.search({ ...input, query: "Blender" });
  assert.equal(calls, 2);
  time = 300_001;
  assert.equal((await service.search(input)).cached, false);
  assert.equal(calls, 3);
});

test("provider status and timeout errors are safe and do not expose upstream text", async () => {
  for (const [upstream, expected] of [[401, 502], [403, 502], [429, 429], [500, 502]]) {
    const service = createResearchService({ data, apiKey: "very-secret", fetchImpl: stubFetch(async () =>
      new Response("sensitive provider output very-secret", { status: upstream })) });
    await assert.rejects(() => service.search(input), (error: unknown) => {
      assert.ok(error instanceof ResearchError);
      assert.equal(error.status, expected);
      assert.doesNotMatch(error.message, /very-secret|sensitive/u);
      return true;
    });
  }
  const service = createResearchService({ data, apiKey: "key", fetchImpl: stubFetch(async () => {
    throw new DOMException("test", "TimeoutError");
  }) });
  await assert.rejects(() => service.search(input), (error: unknown) => error instanceof ResearchError && error.status === 504);
});

test("unsafe URLs and malformed results are not sent to the UI", async () => {
  for (const raw of ["javascript:alert(1)", "data:text/html,evil", "file:///etc/passwd", "https://localhost/a",
    "https://127.0.0.1/", "https://service.local/a", "https://user:pass@example.com/a", null]) {
    assert.equal(safeResultUrl(raw), null);
  }
  const service = createResearchService({ data, apiKey: "key", fetchImpl: stubFetch(async () => Response.json({ results: [
    { title: "unsafe", url: "javascript:alert(1)" },
    { title: "ok", url: "https://example.com/a", published_date: "not a date" },
    { title: "duplicate", url: "https://example.com/a" },
    { url: "https://example.com/b" },
  ] })) });
  const response = await service.search(input);
  assert.equal(response.results.length, 1);
  assert.equal(response.results[0].publishedAt, null);
  const malformed = createResearchService({ data, apiKey: "key", fetchImpl: stubFetch(async () => Response.json({ results: null })) });
  await assert.rejects(() => malformed.search(input), (error: unknown) => error instanceof ResearchError && error.status === 502);
});

test("body size is enforced even without content-length and malformed JSON is rejected", async () => {
  const request = (body: string, headers: Record<string, string> = {}) => new Request("https://example.com/api/research", {
    method: "POST", headers: { "content-type": "application/json", ...headers }, body,
  });
  assert.deepEqual(await readResearchBody(request(JSON.stringify(input))), input);
  await assert.rejects(() => readResearchBody(request("{")), (error: unknown) => error instanceof ResearchError && error.status === 400);
  await assert.rejects(() => readResearchBody(request(JSON.stringify({ query: "a".repeat(9000) }))),
    (error: unknown) => error instanceof ResearchError && error.status === 413);
  await assert.rejects(() => readResearchBody(request("{}", { "content-length": "9000" })),
    (error: unknown) => error instanceof ResearchError && error.status === 413);
  await assert.rejects(() => readResearchBody(request("{}", { "content-type": "text/plain" })),
    (error: unknown) => error instanceof ResearchError && error.status === 415);
});

test("unknown internal errors are redacted and limiter errors include retry-after", async () => {
  const unexpected = researchErrorResponse(new Error("credentials should stay private"));
  assert.equal(unexpected.status, 500);
  assert.doesNotMatch(await unexpected.text(), /credentials/u);
  const limited = researchErrorResponse(new ResearchError(429, "Aguarde.", 42));
  assert.equal(limited.headers.get("retry-after"), "42");
  assert.equal(limited.headers.get("cache-control"), "no-store");
});
