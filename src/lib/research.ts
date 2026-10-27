import { timingSafeEqual } from "node:crypto";
import type { Category, Dataset, ResearchResponse, ResearchResult } from "./types";
import { getStorageOptions, recordForConfiguration, storageLabel } from "./configuration";

const CATEGORIES = new Set<Category>(["games", "llms", "apps"]);
const CATEGORY_TERMS: Record<Category, string> = {
  games: "gaming benchmark FPS resolution settings",
  llms: "llama.cpp MLX benchmark tokens per second model quantization",
  apps: "Blender DaVinci Resolve Final Cut benchmark render export time",
};
const CACHE_TTL_MS = 5 * 60_000;
const MAX_CACHE_ENTRIES = 100;
const MAX_BODY_BYTES = 8 * 1024;

export class ResearchError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly retryAfter?: number,
  ) {
    super(message);
    this.name = "ResearchError";
  }
}

export interface ResearchInput {
  category: Category;
  deviceIds: string[];
  query: string;
  storageGb?: (number | null)[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseResearchInput(value: unknown, data: Dataset): ResearchInput {
  if (!isRecord(value)) throw new ResearchError(400, "Envie um objeto JSON válido.");
  if (typeof value.category !== "string" || !CATEGORIES.has(value.category as Category)) {
    throw new ResearchError(400, "Escolha uma categoria válida: games, llms ou apps.");
  }
  if (!Array.isArray(value.deviceIds) || value.deviceIds.length < 1 || value.deviceIds.length > 2) {
    throw new ResearchError(400, "Informe de um a dois MacBooks para pesquisar.");
  }
  const validIds = new Set(data.devices.map((device) => device.id));
  if (value.deviceIds.some((id) => typeof id !== "string" || !validIds.has(id))) {
    throw new ResearchError(400, "Um dos MacBooks informados não existe no catálogo.");
  }
  if (value.query !== undefined && typeof value.query !== "string") {
    throw new ResearchError(400, "O termo de pesquisa deve ser um texto.");
  }
  if (value.storageGb !== undefined && (!Array.isArray(value.storageGb)
    || value.storageGb.length !== value.deviceIds.length
    || value.storageGb.some((storage, index) => storage !== null && (typeof storage !== "number"
      || !getStorageOptions(data.devices.find(device => device.id === (value.deviceIds as string[])[index])!).includes(storage))))) {
    throw new ResearchError(400, "O SSD informado não corresponde às opções documentadas desta configuração.");
  }
  const rawQuery = (value.query as string | undefined) ?? "";
  if (rawQuery.length > 240 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(rawQuery)) {
    throw new ResearchError(400, "Use um termo de pesquisa com até 240 caracteres.");
  }
  return {
    category: value.category as Category,
    deviceIds: value.storageGb === undefined ? [...new Set(value.deviceIds as string[])] : value.deviceIds as string[],
    query: rawQuery.trim().replace(/\s+/gu, " "),
    ...(value.storageGb === undefined ? {} : { storageGb: value.storageGb as (number | null)[] }),
  };
}

async function readTextLimited(stream: ReadableStream<Uint8Array> | null, maxBytes: number): Promise<string> {
  if (!stream) return "";
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let result = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new ResearchError(413, "O conteúdo enviado é grande demais.");
      }
      result += decoder.decode(value, { stream: true });
    }
    return result + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

export async function readResearchBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    throw new ResearchError(415, "Envie a pesquisa com Content-Type application/json.");
  }
  const length = request.headers.get("content-length");
  if (length !== null) {
    if (!/^\d+$/u.test(length)) throw new ResearchError(400, "Tamanho de conteúdo inválido.");
    if (Number(length) > MAX_BODY_BYTES) throw new ResearchError(413, "A pesquisa ultrapassa o limite de 8 KB.");
  }
  try {
    return JSON.parse(await readTextLimited(request.body, MAX_BODY_BYTES)) as unknown;
  } catch (error) {
    if (error instanceof ResearchError) throw error;
    throw new ResearchError(400, "Não foi possível ler o JSON da pesquisa.");
  }
}

export function safeResultUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > 2048) return null;
  try {
    const url = new URL(raw);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    if (!url.hostname.includes(".") || url.hostname.endsWith(".local") || url.hostname.endsWith(".localhost")) return null;
    if (/^[\d.]+$/u.test(url.hostname) || url.hostname.includes(":")) return null;
    return url.href;
  } catch {
    return null;
  }
}

function normalizeText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/gu, "").toLowerCase();
}

function buildQuery(input: ResearchInput, data: Dataset): string {
  const devices = input.deviceIds.map((id, index) => {
    const device = data.devices.find((device) => device.id === id)!;
    return { ...device, storageGb: input.storageGb ? input.storageGb[index] : device.storageGb };
  }).sort((a, b) => `${a.id}-${a.storageGb}`.localeCompare(`${b.id}-${b.storageGb}`));
  const hardware = devices.map((device) =>
    `${device.family} ${device.screenInches} ${device.year} ${device.chip} ${device.gpuName ?? `${device.gpuCores ?? ""} GPU cores`} ${device.memoryGb}GB RAM${input.category !== "apps" || device.storageGb === null ? "" : ` ${storageLabel(device.storageGb)} SSD`}`,
  ).join(" vs ");
  return `${hardware} ${CATEGORY_TERMS[input.category]}${input.query ? ` ${input.query}` : ""}`;
}

function searchLinks(query: string): ResearchResponse["searchLinks"] {
  return [
    { label: "Pesquisar no Google", url: `https://www.google.com/search?q=${encodeURIComponent(query)}` },
    { label: "Pesquisar no DuckDuckGo", url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}` },
  ];
}

function catalogResults(input: ResearchInput, data: Dataset): ResearchResult[] {
  const workloads = data.workloads.filter((workload) => workload.category === input.category);
  const terms = normalizeText(input.query).split(/\s+/u).filter(Boolean);
  const available = input.deviceIds.flatMap((deviceId, index) => {
    const original = data.devices.find(device => device.id === deviceId)!;
    const storageGb = input.storageGb ? input.storageGb[index] : original.storageGb;
    return workloads.flatMap(workload => {
      const record = recordForConfiguration(data, { deviceId, storageGb }, workload.id);
      return record ? [record] : [];
    });
  });
  const matches = [...new Map(available.map(record => [record.id, record])).values()].filter((benchmark) => {
    const source = data.sources.find((item) => item.id === benchmark.sourceId);
    const workload = workloads.find((item) => item.id === benchmark.workloadId);
    const searchable = normalizeText([
      source?.title, source?.publisher, workload?.name, workload?.subtitle,
      benchmark.reportedHardware, benchmark.notes, ...Object.values(benchmark.conditions),
    ].join(" "));
    return terms.every((term) => searchable.includes(term));
  });
  const sourceIds = new Set(matches.map((benchmark) => benchmark.sourceId));
  return data.sources.filter((source) => sourceIds.has(source.id)).flatMap((source) => {
    const url = safeResultUrl(source.url);
    if (!url) return [];
    const names = [...new Set(matches.filter((benchmark) => benchmark.sourceId === source.id)
      .map((benchmark) => workloads.find((workload) => workload.id === benchmark.workloadId)?.name)
      .filter(Boolean))];
    return [{
      title: source.title,
      url,
      snippet: `Fonte já incluída na base: ${names.join(", ")}. Consulte as condições de cada medição no comparador.`,
      publisher: source.publisher,
      publishedAt: source.publishedAt,
    }];
  }).slice(0, 6);
}

function authorized(header: string | null | undefined, token: string): boolean {
  if (!header?.startsWith("Bearer ")) return false;
  const actual = Buffer.from(header.slice(7), "utf8");
  const expected = Buffer.from(token, "utf8");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

interface ResearchOptions {
  data: Dataset;
  apiKey?: string;
  accessToken?: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
  limitPerMinute?: number;
}

/** Limits and cache are per server process. Multi-instance deployments need a shared limiter. */
export function createResearchService(options: ResearchOptions) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? Date.now;
  const cache = new Map<string, { expires: number; response: ResearchResponse }>();
  const inFlight = new Map<string, Promise<ResearchResponse>>();
  const limit = options.limitPerMinute ?? 12;
  let windowStart = now();
  let requestCount = 0;

  async function runLive(query: string): Promise<ResearchResponse> {
    try {
      const response = await fetchImpl("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${options.apiKey}` },
        body: JSON.stringify({
          query,
          topic: "general",
          search_depth: "basic",
          max_results: 6,
          include_answer: false,
          include_raw_content: false,
          include_published_date: true,
        }),
        signal: AbortSignal.timeout(12_000),
        cache: "no-store",
      });
      if (!response.ok) {
        await response.body?.cancel();
        if (response.status === 401 || response.status === 403) {
          throw new ResearchError(502, "A chave do serviço de pesquisa precisa ser revisada pelo administrador.");
        }
        if (response.status === 429 || response.status === 432 || response.status === 433) {
          throw new ResearchError(429, "O serviço de pesquisa atingiu seu limite. Tente novamente mais tarde.", 60);
        }
        throw new ResearchError(502, "O serviço de pesquisa está indisponível. Tente novamente mais tarde.");
      }
      const raw: unknown = JSON.parse(await readTextLimited(response.body, 256 * 1024));
      if (!isRecord(raw) || !Array.isArray(raw.results)) {
        throw new ResearchError(502, "O serviço de pesquisa retornou uma resposta inválida.");
      }
      const seen = new Set<string>();
      const results: ResearchResult[] = raw.results.slice(0, 20).flatMap((item: unknown) => {
        if (!isRecord(item)) return [];
        const url = safeResultUrl(item.url);
        if (!url || seen.has(url) || typeof item.title !== "string") return [];
        seen.add(url);
        const date = typeof item.published_date === "string" ? Date.parse(item.published_date) : NaN;
        return [{
          title: item.title.slice(0, 250),
          url,
          snippet: typeof item.content === "string" ? item.content.slice(0, 1200) : "",
          publisher: new URL(url).hostname.replace(/^www\./u, ""),
          publishedAt: Number.isFinite(date) ? new Date(date).toISOString().slice(0, 10) : null,
        }];
      }).slice(0, 6);
      return {
        mode: "live", query, results, cached: false, searchLinks: searchLinks(query),
        message: "Fontes encontradas na web. Os resultados ainda precisam de revisão das condições de teste antes de entrar na comparação.",
      };
    } catch (error) {
      if (error instanceof ResearchError && error.status !== 413) throw error;
      if (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name)) {
        throw new ResearchError(504, "A pesquisa demorou mais que o esperado. Tente novamente.");
      }
      throw new ResearchError(502, "Não foi possível consultar o serviço de pesquisa agora.");
    }
  }

  return {
    async search(rawInput: unknown, authorization?: string | null): Promise<ResearchResponse> {
      const input = parseResearchInput(rawInput, options.data);
      const query = buildQuery(input, options.data);
      if (!options.apiKey?.trim()) {
        return {
          mode: "catalog", query, results: catalogResults(input, options.data), cached: false,
          message: "Estas são fontes já pesquisadas na base local. A pesquisa integrada na web não está habilitada nesta instalação. Você pode continuar a busca pelos links abaixo.",
          searchLinks: searchLinks(query),
        };
      }
      if (options.accessToken && !authorized(authorization, options.accessToken)) {
        throw new ResearchError(401, "Informe a chave de acesso à pesquisa configurada pelo administrador.");
      }
      const currentTime = now();
      for (const [key, entry] of cache) if (entry.expires <= currentTime) cache.delete(key);
      const cacheKey = JSON.stringify([input.category, [...input.deviceIds].sort(), input.query.toLowerCase()]);
      const cached = cache.get(cacheKey);
      if (cached) return { ...cached.response, cached: true };
      const pending = inFlight.get(cacheKey);
      if (pending) return { ...await pending, cached: true };
      if (currentTime - windowStart >= 60_000 || currentTime < windowStart) {
        windowStart = currentTime;
        requestCount = 0;
      }
      if (requestCount >= limit) {
        throw new ResearchError(429, "Muitas pesquisas em sequência. Aguarde um pouco e tente novamente.",
          Math.max(1, Math.ceil((windowStart + 60_000 - currentTime) / 1000)));
      }
      requestCount += 1;
      const task = runLive(query);
      inFlight.set(cacheKey, task);
      try {
        const response = await task;
        if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value!);
        cache.set(cacheKey, { expires: now() + CACHE_TTL_MS, response });
        return response;
      } finally {
        inFlight.delete(cacheKey);
      }
    },
  };
}

export function researchErrorResponse(error: unknown): Response {
  const safeError = error instanceof ResearchError
    ? error
    : new ResearchError(500, "Não foi possível processar a pesquisa.");
  return Response.json({ error: safeError.message }, {
    status: safeError.status,
    headers: {
      "Cache-Control": "no-store",
      ...(safeError.retryAfter ? { "Retry-After": String(safeError.retryAfter) } : {}),
    },
  });
}
