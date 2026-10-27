import { lookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import type { Dataset, Device } from "./types";
import type { OfferConditionFilter, OffersResponse, OfferRefreshSummary, VerifiedOffer } from "./offer-types";
import { offerSearchLinks } from "./marketplace-links";

export const OFFER_MAX_AGE_HOURS = 24;
const MAX_PAGE_BYTES = 2 * 1024 * 1024;
const REFRESH_COOLDOWN_MS = 15 * 60_000;

// Add a domain only after reviewing its exact product page and structured data.
export const OFFER_REFRESH_HOSTS = new Set<string>([
  "eletrohorse.com.br", "www.kabum.com.br",
]);

export class OffersError extends Error {
  constructor(public readonly status: number, message: string, public readonly retryAfter?: number) {
    super(message);
    this.name = "OffersError";
  }
}

export interface OffersInput { device: Device; storageGb: number | null; condition?: OfferConditionFilter }

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalized(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/gu, "").toLowerCase().replace(/\s+/gu, " ").trim();
}

export function parseOffersInput(
  raw: unknown, data: Dataset, storageOptions?: (device: Device) => number[],
): OffersInput {
  if (!record(raw) || typeof raw.deviceId !== "string") throw new OffersError(400, "Informe um MacBook válido.");
  const device = data.devices.find((entry) => entry.id === raw.deviceId);
  if (!device) throw new OffersError(400, "O MacBook selecionado não existe no catálogo.");
  const condition = raw.condition ?? "all";
  if (condition !== "all" && condition !== "new" && condition !== "used") throw new OffersError(400, "Escolha todas as condições, novos ou usados.");
  const candidate = raw.storageGb === undefined ? device.storageGb : raw.storageGb;
  if (candidate === null || candidate === "" || candidate === "unknown") return { device, storageGb: null, condition };
  if (typeof candidate !== "string" && typeof candidate !== "number") throw new OffersError(400, "Informe um SSD válido.");
  if (typeof candidate === "string" && !/^\d{3,4}$/u.test(candidate)) throw new OffersError(400, "Informe um SSD válido em GB.");
  const storageGb = Number(candidate);
  const allowed = storageOptions?.(device) ?? [128, 256, 512, 1024, 2048, 4096, 8192];
  if (!Number.isInteger(storageGb) || !allowed.includes(storageGb)) {
    throw new OffersError(400, "Essa capacidade de SSD não está disponível para o modelo selecionado.");
  }
  return { device, storageGb, condition };
}

/** Prices must be actual cash totals, never installment amounts or a computed installment sum. */
export function parseBrlPrice(value: unknown): number | null {
  let amount: number;
  if (typeof value === "number") amount = value;
  else if (typeof value === "string") {
    let text = value.trim();
    const brazilian = /^R\$\s*/iu.test(text) || text.includes(",");
    text = text.replace(/^R\$\s*/iu, "");
    if (brazilian) {
      if (!/^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{2})?$/u.test(text)) return null;
      amount = Number(text.replaceAll(".", "").replace(",", "."));
    } else {
      if (!/^\d+(?:\.\d{1,2})?$/u.test(text)) return null;
      amount = Number(text);
    }
  } else return null;
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) return null;
  if (Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001) return null;
  return Math.round(amount * 100) / 100;
}

export function matchesExactHardware(offer: Pick<VerifiedOffer, "hardware">, device: Device, storageGb: number | null): boolean {
  if (storageGb === null) return false;
  const hardware = offer.hardware;
  if (hardware.family !== device.family || hardware.screenInches !== device.screenInches
    || hardware.year !== device.year || normalized(hardware.chip) !== normalized(device.chip)
    || hardware.cpuCores !== device.cpuCores || hardware.memoryGb !== device.memoryGb
    || hardware.storageGb !== storageGb) return false;
  if (device.architecture === "intel") {
    return Boolean(hardware.gpuName && device.gpuName)
      && normalized(hardware.gpuName!) === normalized(device.gpuName!)
      && hardware.gpuCores === null
      && (hardware.gpuMemoryGb ?? null) === (device.gpuMemoryGb ?? null);
  }
  return device.gpuCores !== null && hardware.gpuCores === device.gpuCores;
}

function canonicalUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(?:utm_|gclid$|fbclid$|msclkid$)/iu.test(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    url.pathname = url.pathname.replace(/\/$/u, "") || "/";
    return url.href;
  } catch { return null; }
}

export function isFreshOffer(offer: VerifiedOffer, now: number): boolean {
  const verified = Date.parse(offer.verifiedAt);
  return Number.isFinite(verified) && verified <= now + 60_000 && now - verified <= OFFER_MAX_AGE_HOURS * 60 * 60_000;
}

function validCashOffer(offer: VerifiedOffer): boolean {
  return offer.country === "BR" && offer.currency === "BRL" && parseBrlPrice(offer.cashPrice) !== null
    && Boolean(offer.paymentMethod.trim()) && Boolean(offer.evidence.trim())
    && Boolean(offer.store.trim()) && Boolean(canonicalUrl(offer.url))
    && ["page-reviewed", "json-ld"].includes(offer.verification)
    && ["new", "used", "refurbished", "open-box", "unknown"].includes(offer.condition)
    && (offer.shippingPrice === null || (Number.isFinite(offer.shippingPrice) && offer.shippingPrice >= 0));
}

export function rankVerifiedOffers(
  offers: VerifiedOffer[], device: Device, storageGb: number | null, now = Date.now(), condition: OfferConditionFilter = "all",
): { offers: VerifiedOffer[]; excludedStaleCount: number } {
  const matched = offers.filter((offer) => matchesExactHardware(offer, device, storageGb) && validCashOffer(offer));
  const unique = new Map<string, VerifiedOffer>();
  // The most recent observation wins for a duplicated listing, even when its price increased.
  for (const offer of matched.sort((a, b) => Date.parse(b.verifiedAt) - Date.parse(a.verifiedAt))) {
    const key = canonicalUrl(offer.url)!;
    if (!unique.has(key)) unique.set(key, offer);
  }
  return {
    offers: [...unique.values()].filter((offer) => (condition === "all" || offer.condition === condition)
      && offer.availability === "in-stock" && isFreshOffer(offer, now)).sort((a, b) => a.cashPrice - b.cashPrice
      || Date.parse(b.verifiedAt) - Date.parse(a.verifiedAt) || a.id.localeCompare(b.id)).slice(0, 3),
    excludedStaleCount: matched.filter((offer) => !isFreshOffer(offer, now)).length,
  };
}

export function buildOffersResponse(
  input: OffersInput, offers: VerifiedOffer[], now = Date.now(), refresh: OfferRefreshSummary | null = null,
): OffersResponse {
  const condition = input.condition ?? "all";
  const ranked = rankVerifiedOffers(offers, input.device, input.storageGb, now, condition);
  const state = input.storageGb === null ? "needs-storage" : ranked.offers.length ? "ready" : "empty";
  let message = state === "needs-storage"
    ? "Selecione um SSD para buscar ofertas da configuração exata."
    : state === "ready"
      ? "Até 3 menores preços à vista entre as ofertas verificadas desta configuração. O frete é informado separadamente; a busca não cobre todo o mercado."
      : "Ainda não há ofertas com preço à vista, estoque e configuração exata verificados nas últimas 24 horas. Os links de pesquisa não são ofertas verificadas.";
  if (refresh && refresh.attempted === 0 && refresh.unsupported > 0) {
    message += " Estas páginas exigem nova conferência manual; a data original foi preservada.";
  } else if (refresh && refresh.failed > 0) {
    message += " Algumas páginas não puderam ser reconfirmadas e foram retiradas do ranking.";
  }
  return {
    state, deviceId: input.device.id, storageGb: input.storageGb, condition, currency: "BRL",
    generatedAt: new Date(now).toISOString(), ...ranked, verificationMaxAgeHours: OFFER_MAX_AGE_HOURS,
    message, searchLinks: offerSearchLinks(input.device, input.storageGb, condition), refresh,
  };
}

export function isPublicAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const [a, b, c] = address.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && (b === 168 || (b === 0 && (c === 0 || c === 2)) || (b === 88 && c === 99)))
      || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113));
  }
  if (version === 6) {
    const [first, second] = address.split(":").map((value) => parseInt(value, 16));
    return first >= 0x2000 && first <= 0x3fff && first !== 0x2002
      && !(first === 0x2001 && (second < 0x200 || second === 0xdb8));
  }
  return false;
}

export function approvedOfferUrl(value: string, allowedHosts: ReadonlySet<string> = OFFER_REFRESH_HOSTS): URL {
  const safe = canonicalUrl(value);
  if (!safe) throw new OffersError(400, "URL de oferta inválida.");
  const url = new URL(safe);
  if (!allowedHosts.has(url.hostname) || isIP(url.hostname)) throw new OffersError(400, "A loja ainda não está aprovada para atualização automática.");
  return url;
}

interface Address { address: string; family: number }
interface PageFetchOptions {
  allowedHosts?: ReadonlySet<string>;
  resolve?: (hostname: string) => Promise<Address[]>;
  transport?: (url: URL, address: Address) => Promise<string>;
}

function requestPinnedPage(url: URL, address: Address): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = httpsRequest(url, {
      agent: false, family: address.family,
      // Pin the validated DNS result to prevent a second resolution or DNS rebinding.
      lookup: (_host, _options, callback) => callback(null, address.address, address.family),
      headers: { Accept: "text/html", "Accept-Encoding": "identity", "User-Agent": "MacVersus/0.1 (product price verification)" },
    }, (response) => {
      if (response.statusCode !== 200) {
        response.destroy();
        reject(new OffersError(502, "A página da oferta não respondeu diretamente com sucesso."));
        return;
      }
      const contentType = response.headers["content-type"] ?? "";
      if (!contentType.toLowerCase().includes("text/html") || response.headers["content-encoding"] && response.headers["content-encoding"] !== "identity") {
        response.destroy();
        reject(new OffersError(502, "Formato da página não suportado."));
        return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      response.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_PAGE_BYTES) request.destroy(new OffersError(502, "A página da oferta é grande demais."));
        else chunks.push(chunk);
      });
      response.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      response.on("error", reject);
    });
    const timeout = setTimeout(() => request.destroy(new OffersError(504, "A loja demorou para responder.")), 10_000);
    request.on("close", () => clearTimeout(timeout));
    request.on("error", reject);
    request.end();
  });
}

export async function fetchReviewedOfferPage(value: string, options: PageFetchOptions = {}): Promise<string> {
  const url = approvedOfferUrl(value, options.allowedHosts);
  const resolver = options.resolve ?? ((hostname: string) => lookup(hostname, { all: true }));
  let timer: ReturnType<typeof setTimeout> | undefined;
  let addresses: Address[];
  try {
    addresses = await Promise.race([
      resolver(url.hostname),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new OffersError(504, "A resolução da loja demorou demais.")), 3_000); }),
    ]);
  } finally { if (timer) clearTimeout(timer); }
  if (!addresses.length || addresses.some((entry) => !isPublicAddress(entry.address))) {
    throw new OffersError(400, "O endereço da loja não é público.");
  }
  return (options.transport ?? requestPinnedPage)(url, addresses[0]);
}

function hasType(value: Record<string, unknown>, type: string): boolean {
  const types = Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]];
  return types.some((entry) => entry === type || entry === `https://schema.org/${type}` || entry === `http://schema.org/${type}`);
}

function jsonLdProducts(html: string): Record<string, unknown>[] {
  const products: Record<string, unknown>[] = [];
  let visited = 0;
  function walk(value: unknown, depth = 0) {
    if (depth > 8 || ++visited > 1000) return;
    if (Array.isArray(value)) { value.forEach((entry) => walk(entry, depth + 1)); return; }
    if (!record(value)) return;
    if (hasType(value, "Product")) products.push(value);
    if (value["@graph"]) walk(value["@graph"], depth + 1);
    if (value.hasVariant) walk(value.hasVariant, depth + 1);
  }
  const scripts = html.matchAll(/<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/giu);
  for (const script of scripts) {
    try { walk(JSON.parse(script[1]) as unknown); } catch { /* Malformed structured data cannot verify a price. */ }
    if (visited > 1000) break;
  }
  return products;
}

/** Reverify an exact, previously reviewed SKU. Never parse prices from arbitrary page snippets. */
export function extractReviewedOffer(html: string, previous: VerifiedOffer, now = Date.now()): VerifiedOffer | null {
  const refresh = previous.refresh;
  if (!refresh?.cashPriceIsExplicit || (!refresh.sku?.trim() && !refresh.productId?.trim()) || refresh.requiredHardwareText.length < 4) return null;
  const products = jsonLdProducts(html).filter((product) => refresh.sku
    ? String(product.sku ?? "") === refresh.sku
    : String(product["@id"] ?? "") === refresh.productId);
  if (products.length !== 1) return null;
  const product = products[0];
  const hardwareText = normalized(JSON.stringify({ name: product.name, description: product.description, additionalProperty: product.additionalProperty }));
  if (!refresh.requiredHardwareText.every((fragment) => fragment.trim() && hardwareText.includes(normalized(fragment)))) return null;
  const offers = Array.isArray(product.offers) ? product.offers : [product.offers];
  if (offers.length !== 1 || !record(offers[0]) || !hasType(offers[0], "Offer")) return null;
  const offer = offers[0];
  if (String(offer.priceCurrency ?? "").toUpperCase() !== "BRL") return null;
  const cashPrice = parseBrlPrice(offer.price);
  if (cashPrice === null) return null;
  if (offer.url && canonicalUrl(String(offer.url)) !== canonicalUrl(previous.url)) return null;
  const condition = String(offer.itemCondition ?? product.itemCondition ?? "").split("/").pop();
  const conditions = { NewCondition: "new", UsedCondition: "used", RefurbishedCondition: "refurbished" } as const;
  const explicitConditionText = refresh.requiredConditionText?.trim();
  const observedCondition = conditions[condition as keyof typeof conditions]
    ?? (explicitConditionText && hardwareText.includes(normalized(explicitConditionText)) ? previous.condition : "unknown");
  if (previous.condition !== "unknown" && observedCondition !== previous.condition) return null;
  if (offer.priceValidUntil) {
    const expiration = String(offer.priceValidUntil);
    const parsed = Date.parse(/^\d{4}-\d{2}-\d{2}$/u.test(expiration) ? `${expiration}T23:59:59.999Z` : expiration);
    if (!Number.isFinite(parsed) || parsed < now) return null;
  }
  const availability = String(offer.availability ?? "").split("/").pop();
  if (!["InStock", "LimitedAvailability"].includes(availability ?? "")) return null;
  return {
    ...previous, cashPrice, condition: observedCondition, availability: "in-stock", verification: "json-ld", verifiedAt: new Date(now).toISOString(),
    shippingPrice: null, shippingNote: "Consulte o frete para seu CEP na loja.",
    evidence: "Preço à vista, disponibilidade e identidade do SKU reconferidos no Product/Offer JSON-LD da página previamente revisada.",
  };
}

interface OffersServiceOptions {
  data: Dataset;
  offers: VerifiedOffer[];
  storageOptions?: (device: Device) => number[];
  now?: () => number;
  fetchPage?: (offer: VerifiedOffer) => Promise<string>;
}

export function createOffersService(options: OffersServiceOptions) {
  const now = options.now ?? Date.now;
  const current = new Map(options.offers.map((offer) => [offer.id, offer]));
  const attempts = new Map<string, number>();
  const pending = new Map<string, Promise<OffersResponse>>();
  let windowStart = now();
  let calls = 0;
  const parse = (raw: unknown) => parseOffersInput(raw, options.data, options.storageOptions);
  return {
    get(raw: unknown): OffersResponse { return buildOffersResponse(parse(raw), [...current.values()], now()); },
    async refresh(raw: unknown): Promise<OffersResponse> {
      const input = parse(raw);
      if (input.storageGb === null) return buildOffersResponse(input, [...current.values()], now());
      const key = `${input.device.id}:${input.storageGb}:${input.condition ?? "all"}`;
      if (pending.has(key)) return pending.get(key)!;
      const candidates = [...current.values()].filter((offer) => matchesExactHardware(offer, input.device, input.storageGb));
      const supported = candidates.filter((offer) => Boolean(offer.refresh));
      const eligible = supported.filter((offer) => now() - (attempts.get(offer.id) ?? -Infinity) >= REFRESH_COOLDOWN_MS).slice(0, 8);
      const summary: OfferRefreshSummary = { attempted: eligible.length, updated: 0, failed: 0, unsupported: candidates.length - supported.length };
      if (!eligible.length) return buildOffersResponse(input, [...current.values()], now(), summary);
      if (now() - windowStart >= 60_000) { windowStart = now(); calls = 0; }
      if (++calls > 6) throw new OffersError(429, "Aguarde um pouco antes de atualizar mais ofertas.", 60);
      const task = (async () => {
        await Promise.all(eligible.map(async (offer) => {
          attempts.set(offer.id, now());
          try {
            const html = await (options.fetchPage ?? ((entry) => fetchReviewedOfferPage(entry.url)))(offer);
            const updated = extractReviewedOffer(html, offer, now());
            if (!updated) throw new Error("Offer no longer verified");
            current.set(offer.id, updated);
            summary.updated++;
          } catch {
            current.set(offer.id, { ...offer, availability: "unknown" });
            summary.failed++;
          }
        }));
        return buildOffersResponse(input, [...current.values()], now(), summary);
      })();
      pending.set(key, task);
      try { return await task; } finally { pending.delete(key); }
    },
  };
}
