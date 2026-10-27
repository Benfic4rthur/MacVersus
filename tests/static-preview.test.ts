import assert from "node:assert/strict";
import test from "node:test";
import { staticOfferDiscovery, staticOffers, staticResearch } from "../src/lib/static-preview";
import { reviewedOfferCandidates } from "../src/data/offer-candidates";
import type { VerifiedOffer } from "../src/lib/offer-types";
import type { Dataset, Device } from "../src/lib/types";

const now = Date.parse("2026-10-27T16:00:00Z");
const device: Device = {
  id: "test-static-device", name: "MacBook Pro 16", family: "MacBook Pro", screenInches: 16.2,
  year: 2021, chip: "M1 Pro", architecture: "apple-silicon", cpuCores: 10, gpuCores: 16,
  memoryGb: 16, storageGb: 1024, bandwidthGbps: 200, specUrl: "https://support.apple.com/en-us/111901",
};
// Synthetic fixtures stay in tests and never enter the published offer catalog.
const offer: VerifiedOffer = {
  id: "fixture-static", hardware: { ...device, storageGb: 1024 }, title: "Synthetic offer",
  url: "https://shop.example.com/macbook", store: "Test shop", country: "BR", currency: "BRL",
  cashPrice: 9000, paymentMethod: "Pix", shippingPrice: null, shippingNote: "Consultar CEP",
  condition: "new", availability: "in-stock", verifiedAt: "2026-10-27T15:00:00Z",
  verification: "page-reviewed", evidence: "Synthetic testing evidence",
};

test("Pages research uses the same SSD policy as the comparison without changing source hardware", () => {
  for (const [category, metric, expected] of [["games", "fps", 1], ["llms", "tokens/s", 1], ["apps", "MB/s", 0]] as const) {
    const fixture: Dataset = {
      updatedAt: "2026-10-27", devices: [device],
      workloads: [{ id: "fixture-workload", category, name: "Fixture workload", subtitle: "Controlled test", metric, higherIsBetter: true, description: "Synthetic test fixture" }],
      sources: [{ id: "fixture-source", title: "Fixture source", publisher: "Test publisher", url: "https://example.com/benchmark", publishedAt: "2026-10-27", accessedAt: "2026-10-27" }],
      benchmarks: [{ id: "fixture-record", deviceId: device.id, workloadId: "fixture-workload", value: 10, sourceId: "fixture-source", conditions: {}, quality: "partial", missingFields: ["Runtime"], comparabilityKey: null, notes: "Test only", reportedHardware: "Test Mac with 1 TB SSD" }],
    };
    const selection = { ...device, storageGb: 512 };
    const result = staticResearch(fixture, selection, selection, category, "");
    assert.equal(result.results.length, expected);
    if (category === "apps") assert.match(result.query, /512GB SSD/);
    else assert.doesNotMatch(result.query, /SSD/);
    assert.equal(fixture.devices[0].storageGb, 1024);
    if (expected) assert.match(result.results[0].snippet, /SSD testado/);
  }
});

test("static ranking keeps the latest price and cannot resurrect a sold-out observation", () => {
  const newer: VerifiedOffer = { ...offer, id: "fixture-newer", cashPrice: 10000,
    url: `${offer.url}/?utm_source=search#details`, verifiedAt: "2026-10-27T15:30:00Z" };
  assert.deepEqual(staticOffers([offer, newer], device, now).offers.map(entry => entry.cashPrice), [10000]);
  assert.deepEqual(staticOffers([offer, { ...newer, availability: "out-of-stock" }], device, now).offers, []);
  assert.deepEqual(staticOffers([offer, { ...newer, condition: "used" }], device, now, "new").offers, []);
});

test("static condition filtering happens before the cheapest three are selected", () => {
  const offers: VerifiedOffer[] = Array.from({ length: 6 }, (_, index) => ({ ...offer,
    id: `fixture-${index}`, url: `https://shop.example.com/macbook-${index}`, cashPrice: 7000 + index * 1000,
    condition: index < 3 ? "new" : "used", shippingPrice: index === 3 ? 500 : null,
  }));
  const result = staticOffers(offers, device, now, "used");
  assert.deepEqual(result.offers.map(entry => entry.cashPrice), [10000, 11000, 12000]);
  assert.equal(result.offers[0].shippingPrice, 500);
  assert.equal(result.condition, "used");
  assert.equal(staticOffers(offers, device, now).condition, "all");
  assert.deepEqual(staticOffers(offers, device, now, "new").offers.map(entry => entry.cashPrice), [7000, 8000, 9000]);
});

test("static exact matching rejects unknown SSD, other configurations and expired prices", () => {
  assert.equal(staticOffers([offer], { ...device, storageGb: null }, now).state, "needs-storage");
  for (const change of [{ storageGb: null }, { storageGb: 512 }, { gpuCores: 14 }, { memoryGb: 32 }, { cpuCores: 8 }]) {
    assert.deepEqual(staticOffers([offer], { ...device, ...change }, now).offers, []);
  }
  const expired = staticOffers([offer], device, now + 24 * 60 * 60 * 1000);
  assert.equal(expired.offers.length, 0);
  assert.equal(expired.excludedStaleCount, 1);
});

test("static marketplace links include all requested platforms with exact configuration and condition", () => {
  const result = staticOffers([], device, now, "used");
  assert.deepEqual(result.searchLinks.map(link => link.label), ["Google Shopping", "OLX", "Mercado Livre", "eBay", "Shopee"]);
  for (const link of result.searchLinks) {
    assert.equal(new URL(link.url).protocol, "https:");
    const decoded = decodeURIComponent(link.url);
    assert.match(decoded, /M1 Pro/);
    assert.match(decoded, /16GB RAM/);
    assert.match(decoded, /1TB SSD/);
    assert.match(decoded, link.label === "eBay" ? /\bused\b/ : /usado seminovo/);
  }
});

test("reviewed international candidates remain separate and hide their observed price after 24 hours", () => {
  const candidate = reviewedOfferCandidates[0];
  assert.ok(candidate?.observedPrice);
  const exact: Device = { ...device, ...candidate.hardware, id: "test-reviewed-candidate" };
  const checked = Date.parse(candidate.observedPrice.checkedAt);
  const fresh = staticOfferDiscovery(exact, "all", checked + 60000);
  assert.equal(fresh.candidates.length, 1);
  assert.equal(fresh.candidates[0].observedPrice?.currency, "USD");
  assert.equal(fresh.mode, "links");
  assert.equal(staticOfferDiscovery(exact, "new", checked).candidates.length, 0);
  assert.equal(staticOfferDiscovery({ ...exact, gpuCores: 24 }, "all", checked).candidates.length, 0);
  assert.equal(staticOfferDiscovery({ ...exact, storageGb: null }, "all", checked).candidates.length, 0);
  const stale = staticOfferDiscovery(exact, "used", checked + 24 * 60 * 60 * 1000 + 1);
  assert.equal(stale.candidates[0].url, candidate.url);
  assert.equal(stale.candidates[0].observedPrice, undefined);
  assert.match(stale.candidates[0].reason, /preço observado expirou/);
});
