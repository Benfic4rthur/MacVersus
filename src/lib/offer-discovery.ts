import { timingSafeEqual } from "node:crypto";
import type { Dataset, Device } from "./types";
import type { OfferCandidate, OfferDiscoveryResponse, OfferMarketplace, ReviewedOfferCandidate } from "./offer-types";
import { matchesExactHardware, OffersError, parseOffersInput, type OffersInput } from "./offers";
import { offerSearchLinks, offerSearchQuery } from "./marketplace-links";

const DOMAINS = ["olx.com.br", "mercadolivre.com.br", "ebay.com", "shopee.com.br"];
const CACHE_MS = 5 * 60_000;
const MAX_BODY_BYTES = 256 * 1024;

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Candidate URLs are links only. They are never fetched by the price updater. */
export function candidateListingUrl(raw: unknown): { url: string; marketplace: OfferMarketplace } | null {
  if (typeof raw !== "string" || raw.length > 2048) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || url.port && url.port !== "443") return null;
    const host = url.hostname;
    const matches = (domain: string) => host === domain || host.endsWith(`.${domain}`);
    let marketplace: OfferMarketplace;
    if (matches("olx.com.br") && /[-/]\d{8,}\/?$/u.test(url.pathname)) marketplace = "OLX";
    else if (matches("mercadolivre.com.br") && /\bMLB(?:-?\d{6,}|U\d{6,})\b/iu.test(url.pathname)) marketplace = "Mercado Livre";
    else if (matches("ebay.com") && /\/itm\/(?:[^/]+\/)?\d{9,15}(?:\/|$)/u.test(url.pathname)) marketplace = "eBay";
    else if (matches("shopee.com.br") && /(?:-i\.\d+\.\d+|\/product\/\d+\/\d+)\/?$/u.test(url.pathname)) marketplace = "Shopee";
    else return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) if (/^(?:utm_|gclid$|fbclid$)/iu.test(key)) url.searchParams.delete(key);
    url.searchParams.sort();
    return { url: url.href, marketplace };
  } catch { return null; }
}

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/gu, "").toLowerCase().replaceAll("-", " ");

/** Reject explicit contradictions; missing fields still require manual review, never an exact-match claim. */
function titleContradictsHardware(title: string, input: OffersInput): boolean {
  const text = normalize(title);
  const memory = [...text.matchAll(/\b(\d{1,3})\s*gb\s*(?:de\s*)?(?:ram|memoria)\b/gu),
    ...text.matchAll(/\b(?:ram|memoria(?:\s+unificada)?)\s*(?:de|:)?\s*(\d{1,3})\s*gb\b/gu)];
  if (memory.some((match) => Number(match[1]) !== input.device.memoryGb)) return true;
  const storage = [...text.matchAll(/\b(\d{1,4})\s*(gb|tb)\s*(?:de\s*)?ssd\b/gu),
    ...text.matchAll(/\bssd\s*(?:de|:)?\s*(\d{1,4})\s*(gb|tb)\b/gu)];
  if (storage.some((match) => Number(match[1]) * (match[2] === "tb" ? 1024 : 1) !== input.storageGb)) return true;
  if (input.device.architecture !== "intel") {
    const chips = [...text.matchAll(/\bm\d+\b(?:\s+(?:pro|max|ultra)\b)?/gu)];
    if (chips.some((match) => match[0].replace(/\s+/gu, " ") !== normalize(input.device.chip))) return true;
    const gpu = [...text.matchAll(/\bgpu\s*(?:de|:)?\s*(\d{1,3})\b/gu),
      ...text.matchAll(/\b(\d{1,3})\s*(?:cores?|nucleos?)\s*(?:de\s*)?gpu\b/gu)];
    if (gpu.some((match) => Number(match[1]) !== input.device.gpuCores)) return true;
  }
  return false;
}

function reviewReason(input: OffersInput, marketplace: OfferMarketplace): string {
  const device = input.device;
  const gpu = device.gpuName ?? `GPU com ${device.gpuCores} núcleos`;
  const storage = input.storageGb! >= 1024 ? `${input.storageGb! / 1024} TB` : `${input.storageGb} GB`;
  return `Candidato encontrado por busca. Confirme ${gpu}, RAM de ${device.memoryGb} GB, SSD de ${storage}, condição, preço à vista e estoque na página. Campos ausentes não foram considerados iguais.${marketplace === "eBay" ? " Confira também envio ao Brasil, moeda, frete e impostos." : ""}`;
}

function withCurrentObservedPrice(candidate: OfferCandidate, now: number): OfferCandidate {
  if (!candidate.observedPrice) return candidate;
  const checked = Date.parse(candidate.observedPrice.checkedAt);
  if (Number.isFinite(checked) && checked <= now + 60_000 && now - checked <= 24 * 60 * 60_000) return candidate;
  const { observedPrice: _observedPrice, ...withoutPrice } = candidate;
  return { ...withoutPrice, reason: `${candidate.reason} A conferência de preço venceu; consulte o valor atual no anúncio.` };
}

function curatedCandidates(input: OffersInput, reviewed: ReviewedOfferCandidate[], now: number): OfferCandidate[] {
  return reviewed.filter((candidate) => matchesExactHardware(candidate, input.device, input.storageGb)
    && ((input.condition ?? "all") === "all" || candidate.condition === input.condition))
    .flatMap((candidate) => {
      if (!candidateListingUrl(candidate.url)) return [];
      const { hardware: _hardware, condition: _condition, evidence: _evidence, ...result } = candidate;
      return [withCurrentObservedPrice(result, now)];
    });
}

async function readProviderJson(response: Response): Promise<unknown> {
  if (!response.body) throw new OffersError(502, "O serviço de descoberta retornou uma resposta vazia.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let body = "";
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > MAX_BODY_BYTES) { await reader.cancel(); throw new OffersError(502, "A resposta da descoberta ultrapassou o limite."); }
      body += decoder.decode(part.value, { stream: true });
    }
    return JSON.parse(body + decoder.decode()) as unknown;
  } finally { reader.releaseLock(); }
}

function authorized(header: string | null | undefined, token: string): boolean {
  if (!header?.startsWith("Bearer ")) return false;
  const received = Buffer.from(header.slice(7));
  const expected = Buffer.from(token);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

interface DiscoveryOptions {
  data: Dataset;
  reviewedCandidates?: ReviewedOfferCandidate[];
  storageOptions?: (device: Device) => number[];
  apiKey?: string;
  accessToken?: string;
  now?: () => number;
  fetchImpl?: typeof fetch;
}

export function createOfferDiscoveryService(options: DiscoveryOptions) {
  const now = options.now ?? Date.now;
  const fetchImpl = options.fetchImpl ?? fetch;
  const cache = new Map<string, { until: number; response: OfferDiscoveryResponse }>();
  const pending = new Map<string, Promise<OfferDiscoveryResponse>>();
  let windowStart = now();
  let calls = 0;

  return {
    async discover(raw: unknown, authorization?: string | null): Promise<OfferDiscoveryResponse> {
      const input = parseOffersInput(raw, options.data, options.storageOptions);
      const query = offerSearchQuery(input.device, input.storageGb, input.condition);
      const reviewed = curatedCandidates(input, options.reviewedCandidates ?? [], now());
      const base: OfferDiscoveryResponse = {
        mode: "links", deviceId: input.device.id, storageGb: input.storageGb, condition: input.condition ?? "all",
        query, candidates: reviewed, message: "", cached: false, discoveredAt: null,
        searchLinks: offerSearchLinks(input.device, input.storageGb, input.condition),
      };
      if (input.storageGb === null) return { ...base, message: "Selecione o SSD para pesquisar anúncios da configuração exata." };
      if (!options.apiKey?.trim()) return {
        ...base, message: "A busca integrada não está habilitada nesta instalação. Use os links dos marketplaces.",
      };
      if (options.accessToken && !authorized(authorization, options.accessToken)) {
        throw new OffersError(401, "Informe a chave de acesso à pesquisa configurada pelo administrador.");
      }
      for (const [key, entry] of cache) if (entry.until <= now()) cache.delete(key);
      const key = JSON.stringify([input.device.id, input.storageGb, input.condition ?? "all"]);
      const previous = cache.get(key);
      const currentResponse = (response: OfferDiscoveryResponse, cached: boolean) => ({
        ...response, cached, candidates: response.candidates.map((candidate) => withCurrentObservedPrice(candidate, now())),
      });
      if (previous) return currentResponse(previous.response, true);
      if (pending.has(key)) return currentResponse(await pending.get(key)!, true);
      if (now() - windowStart >= 60_000) { windowStart = now(); calls = 0; }
      if (calls >= 6) throw new OffersError(429, "Muitas buscas de anúncios em sequência. Aguarde um pouco.", 60);
      calls++;
      const task = (async (): Promise<OfferDiscoveryResponse> => {
        try {
          const response = await fetchImpl("https://api.tavily.com/search", {
            method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${options.apiKey}` },
            body: JSON.stringify({ query, topic: "general", search_depth: "basic", max_results: 8,
              include_domains: DOMAINS, include_answer: false, include_raw_content: false }),
            signal: AbortSignal.timeout(10_000), cache: "no-store",
          });
          if (!response.ok) {
            await response.body?.cancel();
            if (response.status === 429 || response.status === 432 || response.status === 433) throw new OffersError(429, "O serviço de descoberta atingiu seu limite. Tente mais tarde.", 60);
            throw new OffersError(502, response.status === 401 || response.status === 403
              ? "A chave do serviço de pesquisa precisa ser revisada pelo administrador."
              : "O serviço de descoberta está indisponível agora.");
          }
          const body = await readProviderJson(response);
          if (!object(body) || !Array.isArray(body.results)) throw new OffersError(502, "A descoberta retornou dados inválidos.");
          const candidates = new Map(reviewed.map((candidate) => [candidate.url, candidate]));
          for (const item of body.results.slice(0, 20)) {
            if (!object(item) || typeof item.title !== "string" || !item.title.trim()) continue;
            const listing = candidateListingUrl(item.url);
            if (!listing || candidates.has(listing.url) || titleContradictsHardware(item.title, input)) continue;
            candidates.set(listing.url, {
              title: item.title.slice(0, 300), ...listing,
              snippet: typeof item.content === "string" ? item.content.slice(0, 800) : "",
              reason: reviewReason(input, listing.marketplace), reviewStatus: "search-candidate",
            });
          }
          return {
            ...base, mode: "live", candidates: [...candidates.values()].slice(0, 8), discoveredAt: new Date(now()).toISOString(),
            message: "Candidatos encontrados nos marketplaces, separados das ofertas verificadas. O resumo da busca não confirma preço, estoque, condição ou equivalência da configuração.",
          };
        } catch (error) {
          if (error instanceof OffersError) throw error;
          if (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name)) throw new OffersError(504, "A busca de anúncios demorou demais. Tente novamente.");
          throw new OffersError(502, "Não foi possível buscar novos anúncios agora.");
        }
      })();
      pending.set(key, task);
      try {
        const response = await task;
        if (cache.size >= 80) cache.delete(cache.keys().next().value!);
        cache.set(key, { until: now() + CACHE_MS, response });
        return currentResponse(response, false);
      } finally { pending.delete(key); }
    },
  };
}
