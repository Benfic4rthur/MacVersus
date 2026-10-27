import assert from "node:assert/strict";
import test from "node:test";
import {
  approvedOfferUrl, buildOffersResponse, createOffersService, extractReviewedOffer,
  fetchReviewedOfferPage, isPublicAddress, matchesExactHardware, OffersError,
  parseBrlPrice, parseOffersInput, rankVerifiedOffers,
} from "../src/lib/offers";
import type { VerifiedOffer } from "../src/lib/offer-types";
import type { Dataset, Device } from "../src/lib/types";

const now = Date.parse("2026-10-27T16:00:00Z");
const device: Device = {
  id: "test-device", name: 'MacBook Pro 16"', family: "MacBook Pro", screenInches: 16.2,
  year: 2021, chip: "M1 Pro", architecture: "apple-silicon", cpuCores: 10, gpuCores: 16,
  memoryGb: 16, storageGb: 1024, bandwidthGbps: 200, specUrl: "https://support.apple.com/en-us/111901",
};
const data: Dataset = { updatedAt: "2026-10-27", devices: [device], sources: [], workloads: [], benchmarks: [] };

// Synthetic test fixtures only. None of these prices is shipped in the application's offer data.
const offer: VerifiedOffer = {
  id: "fixture-1", hardware: { ...device, storageGb: 1024 },
  title: "MacBook Pro M1 Pro 16 GPU 16GB RAM 1TB SSD", url: "https://shop.example.com/macbook-a",
  store: "Test shop", country: "BR", currency: "BRL", cashPrice: 9200, paymentMethod: "Pix",
  shippingPrice: null, shippingNote: "Consultar CEP", condition: "new", availability: "in-stock",
  verifiedAt: "2026-10-27T15:00:00Z", verification: "page-reviewed", evidence: "Synthetic testing evidence",
  refresh: { sku: "TEST-EXACT-SKU", cashPriceIsExplicit: true, requiredHardwareText: ["M1 Pro", "16 GPU", "16GB RAM", "1TB SSD"] },
};

function productHtml(overrides: Record<string, unknown> = {}, productOverrides: Record<string, unknown> = {}): string {
  return `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org", "@type": "Product", sku: "TEST-EXACT-SKU",
    name: offer.title, description: "M1 Pro, 16 GPU, 16GB RAM, 1TB SSD",
    offers: { "@type": "Offer", price: "8900.00", priceCurrency: "BRL", availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition", url: offer.url, ...overrides },
    ...productOverrides,
  })}</script>`;
}

test("cash prices parse numerically and installment snippets never become a cash total", () => {
  for (const [value, expected] of [["R$ 9.200,50", 9200.5], ["9200.50", 9200.5], ["9.200,50", 9200.5], [9200, 9200]] as const) {
    assert.equal(parseBrlPrice(value), expected);
  }
  for (const value of ["12x R$ 920,00", "a partir de R$ 9.200", "US$ 9200", "9.200", "NaN", -1, 0, NaN, Infinity, 99.999, null]) {
    assert.equal(parseBrlPrice(value), null, `Invalid price accepted: ${String(value)}`);
  }
});

test("a matching chip does not override different GPU, CPU, RAM, year or SSD", () => {
  assert.equal(matchesExactHardware(offer, device, 1024), true);
  for (const hardware of [
    { gpuCores: 14 }, { cpuCores: 8 }, { memoryGb: 32 }, { storageGb: 512 }, { chip: "M1 Max" },
    { year: 2023 }, { family: "MacBook Air" as const }, { screenInches: 14.2 }, { gpuCores: null },
  ]) {
    assert.equal(matchesExactHardware({ ...offer, hardware: { ...offer.hardware, ...hardware } }, device, 1024), false);
  }
  assert.equal(matchesExactHardware(offer, device, null), false);
  assert.equal(matchesExactHardware(offer, device, 2048), false);
});

test("Intel offers match the GPU model and dedicated memory, not Apple GPU cores", () => {
  const intel: Device = { ...device, year: 2019, chip: "Intel Core i9", architecture: "intel", gpuCores: null,
    gpuName: "Radeon Pro 5600M", gpuMemoryGb: 8 };
  const intelOffer = { ...offer, hardware: { ...intel, storageGb: 1024 } };
  assert.equal(matchesExactHardware(intelOffer, intel, 1024), true);
  assert.equal(matchesExactHardware({ ...intelOffer, hardware: { ...intelOffer.hardware, gpuName: "Radeon Pro 5500M" } }, intel, 1024), false);
  assert.equal(matchesExactHardware({ ...intelOffer, hardware: { ...intelOffer.hardware, gpuMemoryGb: 4 } }, intel, 1024), false);
  assert.equal(matchesExactHardware({ ...intelOffer, hardware: { ...intelOffer.hardware, gpuName: undefined } }, intel, 1024), false);
});

test("ranking returns at most three numerical cash prices with freight kept separate", () => {
  const offers = [12_000, 9500, 8500, 10_000].map((cashPrice, index) => ({
    ...offer, id: `price-${index}`, url: `https://shop.example.com/product-${index}`, cashPrice,
    shippingPrice: index === 2 ? 9999 : 0,
  }));
  const result = rankVerifiedOffers(offers, device, 1024, now);
  assert.deepEqual(result.offers.map((entry) => entry.cashPrice), [8500, 9500, 10000]);
  assert.equal(result.offers[0].shippingPrice, 9999);
});

test("old, future, unknown-stock, wrong-currency and incomplete prices are excluded", () => {
  for (const change of [
    { verifiedAt: "2026-10-25T15:00:00Z" }, { verifiedAt: "2026-10-28T15:00:00Z" },
    { availability: "unknown" }, { availability: "out-of-stock" }, { currency: "USD" },
    { cashPrice: 0 }, { cashPrice: NaN }, { paymentMethod: "" }, { evidence: "" }, { country: "US" },
  ]) {
    const changed = { ...offer, ...change } as VerifiedOffer;
    assert.equal(rankVerifiedOffers([changed], device, 1024, now).offers.length, 0);
  }
  assert.equal(rankVerifiedOffers([{ ...offer, verifiedAt: "2026-10-25T15:00:00Z" }], device, 1024, now).excludedStaleCount, 1);
});

test("duplicate tracking URLs use the newest observation even if sold out or more expensive", () => {
  const latest = { ...offer, id: "newer", cashPrice: 10_000, url: `${offer.url}/?utm_source=search`, verifiedAt: "2026-10-27T15:30:00Z" };
  const ranked = rankVerifiedOffers([offer, latest], device, 1024, now);
  assert.equal(ranked.offers.length, 1);
  assert.equal(ranked.offers[0].cashPrice, 10_000);
  assert.equal(rankVerifiedOffers([offer, { ...latest, availability: "out-of-stock" }], device, 1024, now).offers.length, 0);
});

test("missing SSD requires a selection and official storage choices are enforced", () => {
  const unknownStorage = { ...device, storageGb: null };
  const unknownData = { ...data, devices: [unknownStorage] };
  const input = parseOffersInput({ deviceId: device.id }, unknownData);
  const response = buildOffersResponse(input, [offer], now);
  assert.equal(response.state, "needs-storage");
  assert.deepEqual(response.offers, []);
  assert.ok(response.searchLinks.length > 0);
  assert.throws(() => parseOffersInput({ deviceId: device.id, storageGb: 8192 }, data, () => [512, 1024]), OffersError);
  for (const invalid of [0, -1, "1TB", {}, "01024", "1e3"]) {
    assert.throws(() => parseOffersInput({ deviceId: device.id, storageGb: invalid }, data), OffersError);
  }
  assert.equal(parseOffersInput({ deviceId: device.id }, data).storageGb, 1024);
  for (const storageGb of [null, "", "unknown"]) {
    const explicitUnknown = parseOffersInput({ deviceId: device.id, storageGb }, data);
    assert.equal(explicitUnknown.storageGb, null);
    assert.equal(buildOffersResponse(explicitUnknown, [offer], now).state, "needs-storage");
  }
  assert.throws(() => parseOffersInput({ deviceId: device.id, condition: "anything" }, data), OffersError);
});

test("condition filters run after latest-observation deduplication and before the top three", () => {
  const offers: VerifiedOffer[] = [1, 2, 3, 4].map((index) => ({
    ...offer, id: `condition-${index}`, url: `https://shop.example.com/condition-${index}`,
    cashPrice: 4000 + index * 1000, condition: index < 4 ? "new" : "used",
  }));
  assert.equal(rankVerifiedOffers(offers, device, 1024, now, "used").offers[0].id, "condition-4");
  assert.equal(rankVerifiedOffers(offers, device, 1024, now).offers.length, 3);
  const oldUsed = { ...offer, condition: "used" as const };
  const newerNew = { ...offer, id: "new-observation", condition: "new" as const, verifiedAt: "2026-10-27T15:30:00Z" };
  assert.equal(rankVerifiedOffers([oldUsed, newerNew], device, 1024, now, "used").offers.length, 0);
  const response = buildOffersResponse(parseOffersInput({ deviceId: device.id, condition: "used" }, data), offers, now);
  assert.equal(response.condition, "used");
  assert.deepEqual(response.searchLinks.map((link) => link.label), ["Google Shopping", "OLX", "Mercado Livre", "eBay", "Shopee"]);
});

test("structured refresh requires exact SKU, hardware fragments, BRL, stock and cash mapping", () => {
  const updated = extractReviewedOffer(productHtml(), offer, now);
  assert.ok(updated);
  assert.equal(updated.cashPrice, 8900);
  assert.equal(updated.verification, "json-ld");
  assert.equal(updated.verifiedAt, new Date(now).toISOString());
  assert.equal(updated.shippingPrice, null);
  assert.equal(extractReviewedOffer("<p>MacBook R$ 1.000,00 à vista em estoque</p>", offer, now), null);
  assert.equal(extractReviewedOffer(productHtml(), { ...offer, refresh: undefined }, now), null);
  assert.equal(extractReviewedOffer(productHtml({}, { sku: "DIFFERENT-SKU" }), offer, now), null);
  assert.equal(extractReviewedOffer(productHtml({}, { name: "MacBook 8GB", description: "M1 Pro 16 GPU 8GB RAM 512GB SSD" }), offer, now), null);
  for (const changes of [
    { priceCurrency: "USD" }, { availability: "https://schema.org/OutOfStock" },
    { availability: "https://schema.org/PreOrder" }, { price: "12x R$ 999,00" },
    { itemCondition: "https://schema.org/UsedCondition" }, { itemCondition: undefined },
    { priceValidUntil: "2026-10-01" }, { "@type": "AggregateOffer" }, { url: "https://shop.example.com/other-variant" },
  ]) assert.equal(extractReviewedOffer(productHtml(changes), offer, now), null);
});

test("refresh rejects ambiguous multiple offers and JSON-LD from a different product", () => {
  const multiple = productHtml({}, { offers: [
    { "@type": "Offer", price: 1000, priceCurrency: "BRL" },
    { "@type": "Offer", price: 2000, priceCurrency: "BRL" },
  ] });
  assert.equal(extractReviewedOffer(multiple, offer, now), null);
  assert.equal(extractReviewedOffer(productHtml() + productHtml(), offer, now), null);
});

test("exact Product variant ID and explicitly reviewed condition text support Shopify pages", () => {
  const productId = "/products/macbook-a?variant=123#variant";
  const previous: VerifiedOffer = { ...offer, refresh: {
    productId, cashPriceIsExplicit: true, requiredHardwareText: offer.refresh!.requiredHardwareText,
    requiredConditionText: "Novo (lacrado na caixa)",
  } };
  const variant = {
    "@type": "Product", "@id": productId, name: `${offer.title} / Novo (lacrado na caixa)`,
    offers: { "@type": "Offer", price: "8900.00", priceCurrency: "BRL", availability: "https://schema.org/InStock", url: offer.url },
  };
  const html = `<script type="application/ld+json">${JSON.stringify({ "@type": "ProductGroup", hasVariant: [variant] })}</script>`;
  const updated = extractReviewedOffer(html, previous, now);
  assert.ok(updated);
  assert.equal(updated.condition, "new");
  assert.equal(updated.cashPrice, 8900);
  assert.equal(extractReviewedOffer(html, { ...previous, refresh: { ...previous.refresh!, productId: "different" } }, now), null);
  const unknown = extractReviewedOffer(productHtml({ itemCondition: undefined }), { ...offer, condition: "unknown" }, now);
  assert.ok(unknown);
  assert.equal(unknown.condition, "unknown");
});

test("SSRF protection requires an exact HTTPS allowlist and public DNS addresses", async () => {
  const allowedHosts = new Set(["shop.example.com"]);
  for (const url of ["http://shop.example.com/a", "https://shop.example.com.evil.test/a", "https://127.0.0.1/a",
    "https://shop.example.com:8443/a", "https://user:password@shop.example.com/a", "file:///etc/passwd"]) {
    assert.throws(() => approvedOfferUrl(url, allowedHosts), OffersError);
  }
  for (const address of ["127.0.0.1", "10.0.0.1", "169.254.169.254", "192.168.1.1", "172.16.2.1",
    "100.64.0.1", "0.0.0.0", "::1", "::ffff:127.0.0.1", "fd00::1", "fe80::1", "2001:0db8::1", "2002:a00:1::1"]) {
    assert.equal(isPublicAddress(address), false, address);
  }
  let networkCalls = 0;
  await assert.rejects(() => fetchReviewedOfferPage(offer.url, {
    allowedHosts, resolve: async () => [{ address: "127.0.0.1", family: 4 }],
    transport: async () => { networkCalls++; return "should not happen"; },
  }), OffersError);
  assert.equal(networkCalls, 0);
  const page = await fetchReviewedOfferPage(offer.url, {
    allowedHosts, resolve: async () => [{ address: "93.184.216.34", family: 4 }],
    transport: async (url, address) => {
      assert.equal(url.hostname, "shop.example.com");
      assert.equal(address.address, "93.184.216.34");
      return "public page";
    },
  });
  assert.equal(page, "public page");
});

test("unsupported refresh preserves the real verification timestamp instead of inventing a check", async () => {
  let fetched = 0;
  const service = createOffersService({ data, offers: [{ ...offer, refresh: undefined }], now: () => now,
    fetchPage: async () => { fetched++; return productHtml(); } });
  const result = await service.refresh({ deviceId: device.id });
  assert.equal(fetched, 0);
  assert.equal(result.refresh?.unsupported, 1);
  assert.equal(result.offers[0].verifiedAt, offer.verifiedAt);
  assert.match(result.message, /conferência manual/u);
});

test("parallel refreshes are deduplicated and a failed recheck removes that listing", async () => {
  let fetched = 0;
  const service = createOffersService({ data, offers: [offer], now: () => now, fetchPage: async () => {
    fetched++; await Promise.resolve(); return productHtml();
  } });
  const results = await Promise.all([service.refresh({ deviceId: device.id }), service.refresh({ deviceId: device.id })]);
  assert.equal(fetched, 1);
  assert.equal(results[0].offers[0].cashPrice, 8900);
  await service.refresh({ deviceId: device.id });
  assert.equal(fetched, 1);
  const failed = createOffersService({ data, offers: [offer], now: () => now, fetchPage: async () => { throw new Error("blocked"); } });
  const response = await failed.refresh({ deviceId: device.id });
  assert.equal(response.refresh?.failed, 1);
  assert.deepEqual(response.offers, []);
  assert.deepEqual(failed.get({ deviceId: device.id }).offers, []);
});
