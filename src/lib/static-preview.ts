import type { Category, Dataset, Device, ResearchResponse } from "./types";
import type { OfferConditionFilter, OfferDiscoveryResponse, OffersResponse, VerifiedOffer } from "./offer-types";
import { offerSearchLinks, offerSearchQuery } from "./marketplace-links";
import { reviewedOfferCandidates } from "@/data/offer-candidates";
import { recordForConfiguration } from "./configuration";

export const STATIC_PREVIEW_NOTICE = "Prévia estática: dados da base publicada; consultas online disponíveis na versão completa.";
export function publicAssetPath(path: string): string {
  const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
const normalized = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const storageLabel = (size: number | null) => size === null ? "SSD não informado" : size >= 1024 ? `${size / 1024}TB SSD` : `${size}GB SSD`;
function deviceQuery(device: Device) {
  return `${device.family} ${device.screenInches} ${device.year} ${device.chip} CPU ${device.cpuCores} ${device.gpuCores === null ? device.gpuName ?? "" : `GPU ${device.gpuCores}`} ${device.memoryGb}GB RAM ${storageLabel(device.storageGb)}`;
}
export function staticResearch(data: Dataset, left: Device, right: Device, category: Category, term: string): ResearchResponse {
  const words = normalized(term).split(/\s+/).filter(Boolean);
  const workloads = data.workloads.filter(workload => workload.category === category && words.every(word => normalized(`${workload.name} ${workload.subtitle} ${workload.description}`).includes(word)));
  const sourceWorkloads = new Map<string, string[]>();
  for (const workload of workloads) {
    for (const device of [left, right]) {
      const record = recordForConfiguration(data, { deviceId: device.id, storageGb: device.storageGb }, workload.id);
      if (!record) continue;
      const names = sourceWorkloads.get(record.sourceId) ?? [];
      if (!names.includes(workload.name)) names.push(workload.name);
      sourceWorkloads.set(record.sourceId, names);
    }
  }
  const query = `${deviceQuery(left)} vs ${deviceQuery(right)} ${term.trim() || (category === "games" ? "gaming FPS benchmarks" : category === "llms" ? "LLM tokens per second benchmarks" : "render export benchmarks")}`;
  const results = data.sources.filter(source => sourceWorkloads.has(source.id)).map(source => ({
    title: source.title, url: source.url, publisher: source.publisher, publishedAt: source.publishedAt,
    snippet: `Publicação presente na base para esta configuração. Testes: ${sourceWorkloads.get(source.id)!.join(", ")}. Consulte a fonte e as condições de cada medição.`,
  }));
  for (const workload of workloads) {
    if (!workload.sourceUrl || results.some(result => result.url === workload.sourceUrl)) continue;
    results.push({ title: `${workload.name}: documentação da tarefa`, url: workload.sourceUrl, publisher: new URL(workload.sourceUrl).hostname, publishedAt: null, snippet: "Referência da tarefa presente na base. Esta documentação não é uma medição de desempenho do Mac selecionado." });
  }
  return { mode: "catalog", query, results, cached: false, message: STATIC_PREVIEW_NOTICE, searchLinks: [
    { label: "Buscar no Google", url: `https://www.google.com/search?q=${encodeURIComponent(query)}` },
    { label: "Buscar no DuckDuckGo", url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}` },
  ] };
}
function exactOffer(offer: Pick<VerifiedOffer, "hardware">, device: Device): boolean {
  const h = offer.hardware;
  if (device.storageGb === null || h.family !== device.family || h.year !== device.year || h.screenInches !== device.screenInches || normalized(h.chip) !== normalized(device.chip) || h.cpuCores !== device.cpuCores || h.memoryGb !== device.memoryGb || h.storageGb !== device.storageGb) return false;
  if (device.architecture === "intel") return h.gpuCores === null && !!h.gpuName && !!device.gpuName && normalized(h.gpuName) === normalized(device.gpuName) && (h.gpuMemoryGb ?? null) === (device.gpuMemoryGb ?? null);
  return device.gpuCores !== null && h.gpuCores === device.gpuCores;
}
function canonicalUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) if (/^(?:utm_|gclid$|fbclid$|msclkid$)/i.test(key)) url.searchParams.delete(key);
    url.searchParams.sort();
    url.pathname = url.pathname.replace(/\/$/, "") || "/";
    return url.href;
  } catch { return null; }
}
export function staticOffers(offers: VerifiedOffer[], device: Device, now = Date.now(), condition: OfferConditionFilter = "all"): OffersResponse {
  // Preserve the latest observation before checking stock, condition or freshness.
  // An older, cheaper observation must never resurrect a sold-out listing.
  const latest = new Map<string, VerifiedOffer>();
  for (const offer of [...offers].sort((a, b) => Date.parse(b.verifiedAt) - Date.parse(a.verifiedAt))) {
    const url = canonicalUrl(offer.url); if (url && !latest.has(url)) latest.set(url, offer);
  }
  const matching = [...latest.values()].filter(offer => exactOffer(offer, device) && offer.country === "BR" && offer.currency === "BRL" && Number.isFinite(offer.cashPrice) && offer.cashPrice > 0 && offer.cashPrice <= 1000000 && Math.abs(offer.cashPrice * 100 - Math.round(offer.cashPrice * 100)) < .00001 && offer.paymentMethod.trim() && offer.evidence.trim() && offer.store.trim() && ["page-reviewed", "json-ld"].includes(offer.verification) && ["new", "used", "refurbished", "open-box", "unknown"].includes(offer.condition) && (offer.shippingPrice === null || (Number.isFinite(offer.shippingPrice) && offer.shippingPrice >= 0)));
  const isFresh = (offer: VerifiedOffer) => { const time = Date.parse(offer.verifiedAt); return Number.isFinite(time) && time <= now + 60000 && now - time <= 24 * 60 * 60 * 1000; };
  const selected = matching.filter(offer => offer.availability === "in-stock" && isFresh(offer) && (condition === "all" || offer.condition === condition)).sort((a, b) => a.cashPrice - b.cashPrice || Date.parse(b.verifiedAt) - Date.parse(a.verifiedAt) || a.id.localeCompare(b.id)).slice(0, 3);
  return {
    state: device.storageGb === null ? "needs-storage" : selected.length ? "ready" : "empty", deviceId: device.id, storageGb: device.storageGb, condition,
    currency: "BRL", generatedAt: new Date(now).toISOString(), offers: selected, excludedStaleCount: matching.filter(offer => !isFresh(offer)).length, verificationMaxAgeHours: 24,
    message: device.storageGb === null ? "Informe o SSD para identificar anúncios desta configuração exata." : selected.length ? "Anúncios da base publicada, conferidos há menos de 24 horas. A prévia não consulta preços ao vivo." : "A base publicada não contém uma oferta exata nesta condição com verificação nas últimas 24 horas. Use os links abaixo para pesquisar preços atuais.",
    searchLinks: offerSearchLinks(device, device.storageGb, condition), refresh: null,
  };
}

export function staticOfferDiscovery(device: Device, condition: OfferConditionFilter = "all", now = Date.now()): OfferDiscoveryResponse {
  const candidates = reviewedOfferCandidates.filter(candidate => exactOffer(candidate, device) && (condition === "all" || candidate.condition === condition)).map(candidate => {
    const checked = Date.parse(candidate.observedPrice?.checkedAt ?? "");
    const fresh = Number.isFinite(checked) && checked <= now + 60000 && now - checked <= 24 * 60 * 60 * 1000;
    return {
      title: candidate.title, url: candidate.url, marketplace: candidate.marketplace, snippet: candidate.snippet,
      reason: candidate.reason + (!fresh ? " O preço observado expirou e foi ocultado; confira o valor atual na loja." : ""),
      reviewStatus: candidate.reviewStatus, ...(fresh && candidate.observedPrice ? { observedPrice: candidate.observedPrice } : {}),
    };
  });
  return {
    mode: "links", deviceId: device.id, storageGb: device.storageGb, condition,
    query: offerSearchQuery(device, device.storageGb, condition), candidates, cached: false, discoveredAt: null,
    message: "Anúncios presentes na base publicada, separados do ranking em reais. Confira a página atual, o estado e os custos de envio antes de comparar o custo final.",
    searchLinks: offerSearchLinks(device, device.storageGb, condition),
  };
}
