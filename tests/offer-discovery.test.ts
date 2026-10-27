import assert from "node:assert/strict";
import test from "node:test";
import { reviewedOfferCandidates } from "../src/data/offer-candidates";
import { candidateListingUrl, createOfferDiscoveryService } from "../src/lib/offer-discovery";
import { OffersError } from "../src/lib/offers";
import type { Dataset, Device } from "../src/lib/types";

const observed = reviewedOfferCandidates[0];
const now = Date.parse(observed.observedPrice!.checkedAt) + 60_000;
const device: Device = {
  id: "discovery-fixture", name: "MacBook Pro 16", architecture: "apple-silicon",
  ...observed.hardware, bandwidthGbps: 400, specUrl: "https://support.apple.com/en-us/111901",
};
const data: Dataset = { updatedAt: "2026-10-27", devices: [device], sources: [], workloads: [], benchmarks: [] };
const input = { deviceId: device.id, storageGb: 1024 };
const options = { data, reviewedCandidates: reviewedOfferCandidates, now: () => now };
const hasStatus = (status: number) => (error: unknown) => error instanceof OffersError && error.status === status;

test("without a provider key discovery returns honest external links and only exact reviewed candidates", async () => {
  let fetches = 0;
  const service = createOfferDiscoveryService({ ...options, fetchImpl: async () => { fetches++; throw new Error("unexpected network"); } });
  const result = await service.discover(input);
  assert.equal(result.mode, "links");
  assert.equal(result.condition, "all");
  assert.equal(result.candidates[0].observedPrice?.amount, 1350);
  assert.equal(result.candidates[0].reviewStatus, "listing-reviewed");
  assert.equal(result.searchLinks.length, 5);
  assert.match(result.message, /não está habilitada/u);
  assert.doesNotMatch(result.message, /TAVILY|API_KEY/u);
  assert.match(result.query, /32 núcleos GPU 64GB RAM 1TB SSD/u);
  assert.equal((await service.discover({ ...input, storageGb: 2048 })).candidates.length, 0);
  assert.equal((await service.discover({ ...input, condition: "new" })).candidates.length, 0);
  assert.equal((await service.discover({ ...input, condition: "used" })).candidates.length, 1);
  assert.equal((await service.discover({ ...input, storageGb: null })).candidates.length, 0);
  for (const difference of [{ memoryGb: 32 }, { gpuCores: 24 }, { year: 2023 }]) {
    const different = createOfferDiscoveryService({ ...options, data: { ...data, devices: [{ ...device, ...difference }] } });
    assert.equal((await different.discover(input)).candidates.length, 0);
  }
  assert.equal(fetches, 0);
});

test("listing URL validation rejects unsafe hosts and search pages while accepting supported marketplace IDs", () => {
  const valid = [
    ["https://www.ebay.com/itm/840059639965", "eBay"],
    ["https://www.mercadolivre.com.br/macbook/up/MLBU5694254028", "Mercado Livre"],
    ["https://produto.mercadolivre.com.br/MLB-1234567890-macbook", "Mercado Livre"],
    ["https://sp.olx.com.br/sao-paulo/computadores/macbook-1234567890", "OLX"],
    ["https://shopee.com.br/macbook-i.12345.67890", "Shopee"],
  ];
  for (const [url, marketplace] of valid) assert.equal(candidateListingUrl(url)?.marketplace, marketplace);
  for (const url of [
    "javascript:alert(1)", "http://www.ebay.com/itm/840059639965", "https://ebay.com.evil.test/itm/840059639965",
    "https://user:secret@www.ebay.com/itm/840059639965", "https://www.ebay.com:8443/itm/840059639965",
    "https://127.0.0.1/itm/840059639965", "https://www.ebay.com/sch/i.html?_nkw=macbook",
    "https://www.mercadolivre.com.br/macbook", "https://www.olx.com.br/brasil?q=macbook",
  ]) assert.equal(candidateListingUrl(url), null, url);
  assert.equal(candidateListingUrl(`${observed.url}?utm_source=test#details`)?.url, observed.url);
});

test("provider snippets never supply verified prices; explicit hardware conflicts are discarded", async () => {
  let called = false;
  const service = createOfferDiscoveryService({ ...options, apiKey: "server-secret", fetchImpl: async (url, init) => {
    called = true;
    assert.equal(url, "https://api.tavily.com/search");
    const body = JSON.parse(String(init?.body));
    assert.deepEqual(body.include_domains, ["olx.com.br", "mercadolivre.com.br", "ebay.com", "shopee.com.br"]);
    assert.equal(body.include_answer, false);
    assert.equal(body.max_results, 8);
    assert.ok(init?.signal);
    return Response.json({ results: [
      { title: "MacBook Pro M1 Max 64GB RAM 1TB SSD 32-core GPU", url: "https://www.mercadolivre.com.br/macbook/up/MLBU5694254028", content: "R$ 1,00 e estoque informado no resumo", price: 1, observedPrice: { amount: 1, currency: "USD" } },
      { title: "MacBook Pro M1 Max", url: "https://shopee.com.br/macbook-i.12345.67890", content: "Sem GPU ou SSD no resumo" },
      { title: "MacBook Pro M1 Max 32GB RAM 1TB SSD", url: "https://sp.olx.com.br/macbook-1234567890" },
      { title: "MacBook Pro M1 Max 64GB RAM 512GB SSD", url: "https://www.ebay.com/itm/840059639966" },
      { title: "MacBook Pro M1 Max 24-core GPU", url: "https://www.ebay.com/itm/840059639967" },
      { title: "MacBook Pro M2 Max 64GB RAM 1TB SSD", url: "https://www.ebay.com/itm/840059639968" },
      { title: "MacBook Pro M1 Max", url: "https://www.ebay.com.evil.test/itm/840059639969" },
      { title: "MacBook Pro M1 Max", url: observed.url, observedPrice: { amount: 1, currency: "USD" } },
    ] });
  } });
  const result = await service.discover(input);
  assert.equal(called, true);
  assert.equal(result.mode, "live");
  assert.equal(result.candidates.length, 3);
  assert.equal(result.candidates[0].observedPrice?.amount, 1350);
  for (const candidate of result.candidates.slice(1)) {
    assert.equal(candidate.reviewStatus, "search-candidate");
    assert.equal(candidate.observedPrice, undefined);
    assert.match(candidate.reason, /Campos ausentes não foram considerados iguais/u);
    assert.match(candidate.reason, /Confirme/u);
  }
});

test("authorization precedes provider use and cached responses; concurrent identical searches share one request", async () => {
  let calls = 0;
  const service = createOfferDiscoveryService({ ...options, apiKey: "provider-key", accessToken: "private-token", fetchImpl: async () => {
    calls++; await Promise.resolve(); return Response.json({ results: [] });
  } });
  await assert.rejects(() => service.discover(input), hasStatus(401));
  await assert.rejects(() => service.discover(input, "Bearer wrong-token"), hasStatus(401));
  assert.equal(calls, 0);
  const results = await Promise.all([service.discover(input, "Bearer private-token"), service.discover(input, "Bearer private-token")]);
  assert.equal(calls, 1);
  assert.ok(results.some((result) => result.cached));
  assert.equal((await service.discover(input, "Bearer private-token")).cached, true);
  await assert.rejects(() => service.discover(input), hasStatus(401));
  assert.equal(calls, 1);
});

test("reviewed USD prices expire after 24 hours even while their discovery response remains cached", async () => {
  let clock = Date.parse(observed.observedPrice!.checkedAt) + 24 * 60 * 60_000 - 1;
  let calls = 0;
  const service = createOfferDiscoveryService({ ...options, apiKey: "provider-key", now: () => clock,
    fetchImpl: async () => { calls++; return Response.json({ results: [] }); } });
  const before = await service.discover(input);
  assert.ok(before.candidates[0].observedPrice);
  clock += 2;
  const after = await service.discover(input);
  assert.equal(after.cached, true);
  assert.equal(after.candidates[0].observedPrice, undefined);
  assert.equal(after.candidates[0].url, observed.url);
  assert.match(after.candidates[0].reason, /venceu/u);
  assert.equal(calls, 1);
  assert.ok(observed.observedPrice, "The curated source must remain unchanged");
});

test("rate limiting counts only uncached searches and resets after its bounded window", async () => {
  let clock = now;
  let calls = 0;
  const service = createOfferDiscoveryService({ ...options, apiKey: "provider-key", now: () => clock,
    fetchImpl: async () => { calls++; return Response.json({ results: [] }); } });
  for (const storageGb of [128, 256, 512, 1024, 2048, 4096]) await service.discover({ ...input, storageGb });
  await service.discover(input);
  assert.equal(calls, 6);
  await assert.rejects(() => service.discover({ ...input, storageGb: 8192 }), hasStatus(429));
  clock += 60_001;
  await service.discover({ ...input, storageGb: 8192 });
  assert.equal(calls, 7);
  clock += 5 * 60_001;
  assert.equal((await service.discover(input)).cached, false);
});

test("unknown SSD avoids paid search and upstream errors never expose provider response bodies or secrets", async () => {
  const noSearch = createOfferDiscoveryService({ ...options, apiKey: "provider-key", fetchImpl: async () => { throw new Error("should not run"); } });
  assert.equal((await noSearch.discover({ ...input, storageGb: null })).mode, "links");
  for (const [providerStatus, status] of [[401, 502], [403, 502], [429, 429], [500, 502]]) {
    const service = createOfferDiscoveryService({ ...options, apiKey: "secret-provider-key", fetchImpl: async () => new Response("secret-provider-key", { status: providerStatus }) });
    await assert.rejects(() => service.discover(input), (error) => hasStatus(status)(error) && error instanceof Error && !error.message.includes("secret"));
  }
  const timeout = createOfferDiscoveryService({ ...options, apiKey: "key", fetchImpl: async () => { throw new DOMException("secret-provider-key", "TimeoutError"); } });
  await assert.rejects(() => timeout.discover(input), hasStatus(504));
  const oversized = createOfferDiscoveryService({ ...options, apiKey: "key", fetchImpl: async () => new Response("x".repeat(256 * 1024 + 1)) });
  await assert.rejects(() => oversized.discover(input), hasStatus(502));
});
