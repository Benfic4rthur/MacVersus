import { dataset as baseDataset } from "@/data/catalog";
import reviewedUpdates from "@/data/reviewed-updates.json";
import type { Benchmark, BenchmarkSource, Dataset, Device, Workload } from "./types";

export interface DatasetUpdateFeed extends Dataset { schemaVersion: 1 }
export interface DatasetLoadStatus {
  mode: "base" | "local" | "remote" | "stale";
  updatedAt: string;
  checkedAt: string | null;
  message: string;
}
export const MAX_FEED_BYTES = 2 * 1024 * 1024;
const CACHE_MS = 10 * 60 * 1000;
const RETRY_MS = 60 * 1000;
const MAX_STALE_MS = 24 * 60 * 60 * 1000;
const idPattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,159}$/;
const unknownText = /^(?:n\/?a|n\/?d|unknown|undisclosed|not (?:reported|specified)|n[aã]o (?:informad[oa]|divulgad[oa]|especificad[oa])(?:.*)?|[?\-])$/i;

type RecordValue = Record<string, unknown>;
function object(value: unknown, label: string): RecordValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label}: objeto obrigatório.`);
  return value as RecordValue;
}
function keys(value: RecordValue, allowed: string[], label: string) {
  const unexpected = Object.keys(value).find(key => !allowed.includes(key));
  if (unexpected) throw new Error(`${label}: campo desconhecido ${unexpected}.`);
}
function text(value: unknown, label: string, max = 10000): asserts value is string {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error(`${label}: texto não vazio obrigatório.`);
}
function id(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !idPattern.test(value)) throw new Error(`${label}: identificador inválido.`);
}
function positive(value: unknown, label: string, integer = false) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || (integer && !Number.isInteger(value))) throw new Error(`${label}: número positivo${integer ? " inteiro" : ""} obrigatório.`);
}
function nullablePositive(value: unknown, label: string, integer = false) { if (value !== null) positive(value, label, integer); }
function date(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new Error(`${label}: data YYYY-MM-DD inválida.`);
}
function https(value: unknown, label: string): URL {
  text(value, label, 4096);
  let url: URL;
  try { url = new URL(value); } catch { throw new Error(`${label}: URL inválida.`); }
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") || !url.hostname.includes(".") || /(?:^|\.)(?:localhost|local|internal)$/.test(url.hostname) || /^\d+(?:\.\d+){3}$/.test(url.hostname) || url.hostname.includes(":")) throw new Error(`${label}: use HTTPS público sem credenciais.`);
  return url;
}
function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value) || value.length > 10000) throw new Error(`${label}: lista inválida ou grande demais.`);
  return value;
}
function strings(value: unknown, label: string): string[] { const values = array(value, label); values.forEach(v => text(v, label, 500)); return values as string[]; }

function parseDevice(value: unknown): Device {
  const d = object(value, "device");
  keys(d, ["id","name","family","year","chip","cpuCores","gpuCores","architecture","gpuName","gpuMemoryGb","memoryGb","storageGb","bandwidthGbps","screenInches","specUrl"], "device");
  id(d.id, "device.id"); text(d.name, "device.name", 300); text(d.chip, "device.chip", 200);
  if (d.family !== "MacBook Pro" && d.family !== "MacBook Air") throw new Error(`${d.id}: família inválida.`);
  if (!Number.isInteger(d.year) || Number(d.year) < 2006 || Number(d.year) > 2100) throw new Error(`${d.id}: ano inválido.`);
  positive(d.cpuCores, `${d.id}.cpuCores`, true); positive(d.memoryGb, `${d.id}.memoryGb`, true);
  positive(d.screenInches, `${d.id}.screenInches`); nullablePositive(d.storageGb, `${d.id}.storageGb`, true); nullablePositive(d.bandwidthGbps, `${d.id}.bandwidthGbps`);
  if (d.architecture !== "intel" && d.architecture !== "apple-silicon") throw new Error(`${d.id}: arquitetura explícita obrigatória.`);
  if (d.architecture === "intel") {
    if (d.gpuCores !== null) throw new Error(`${d.id}: GPU Intel não usa contagem de núcleos Apple.`);
    text(d.gpuName, `${d.id}.gpuName`, 200);
  } else {
    positive(d.gpuCores, `${d.id}.gpuCores`, true);
    if (d.gpuMemoryGb !== undefined && d.gpuMemoryGb !== null) throw new Error(`${d.id}: Apple Silicon usa memória unificada.`);
  }
  if (d.gpuName !== undefined) text(d.gpuName, `${d.id}.gpuName`, 200);
  if (d.gpuMemoryGb !== undefined) nullablePositive(d.gpuMemoryGb, `${d.id}.gpuMemoryGb`, true);
  const url = https(d.specUrl, `${d.id}.specUrl`);
  if (url.hostname !== "apple.com" && !url.hostname.endsWith(".apple.com")) throw new Error(`${d.id}: ficha técnica deve citar a Apple.`);
  return d as unknown as Device;
}
function parseWorkload(value: unknown): Workload {
  const w = object(value, "workload"); keys(w, ["id","category","name","subtitle","metric","higherIsBetter","description","sourceUrl"], "workload");
  id(w.id, "workload.id"); text(w.name, `${w.id}.name`, 300); text(w.subtitle, `${w.id}.subtitle`, 1000); text(w.description, `${w.id}.description`);
  const units: Record<string, string[]> = { games: ["fps"], llms: ["tokens/s"], apps: ["seconds","score","fps","MB/s"] };
  if (typeof w.category !== "string" || !units[w.category]?.includes(String(w.metric))) throw new Error(`${w.id}: categoria e unidade incompatíveis.`);
  if (typeof w.higherIsBetter !== "boolean" || w.higherIsBetter !== (w.metric !== "seconds")) throw new Error(`${w.id}: direção da métrica inválida.`);
  if (w.sourceUrl !== undefined) https(w.sourceUrl, `${w.id}.sourceUrl`);
  return w as unknown as Workload;
}
function parseSource(value: unknown): BenchmarkSource {
  const s = object(value, "source"); keys(s, ["id","title","publisher","url","publishedAt","accessedAt"], "source");
  id(s.id, "source.id"); text(s.title, `${s.id}.title`, 1000); text(s.publisher, `${s.id}.publisher`, 300); https(s.url, `${s.id}.url`); date(s.accessedAt, `${s.id}.accessedAt`);
  if (s.publishedAt !== null) { date(s.publishedAt, `${s.id}.publishedAt`); if (s.publishedAt > s.accessedAt) throw new Error(`${s.id}: publicação posterior à consulta.`); }
  return s as unknown as BenchmarkSource;
}
function parseBenchmark(value: unknown): Benchmark {
  const b = object(value, "benchmark"); keys(b, ["id","deviceId","workloadId","value","sourceId","conditions","quality","missingFields","comparabilityKey","notes","reportedHardware"], "benchmark");
  for (const key of ["id","deviceId","workloadId","sourceId"]) id(b[key], `benchmark.${key}`);
  positive(b.value, `${b.id}.value`); text(b.reportedHardware, `${b.id}.reportedHardware`, 2000);
  if (typeof b.notes !== "string" || b.notes.length > 10000) throw new Error(`${b.id}: notes deve ser texto.`);
  const conditions = object(b.conditions, `${b.id}.conditions`);
  if (Object.keys(conditions).length === 0 || Object.keys(conditions).length > 60) throw new Error(`${b.id}: informe as condições do teste.`);
  Object.entries(conditions).forEach(([key, value]) => { text(key, `${b.id}.conditions`, 200); text(value, `${b.id}.conditions.${key}`, 2000); });
  const missing = strings(b.missingFields, `${b.id}.missingFields`);
  if (b.quality === "documented") {
    text(b.comparabilityKey, `${b.id}.comparabilityKey`, 500);
    if (missing.length || Object.values(conditions).some(v => unknownText.test(String(v).trim()))) throw new Error(`${b.id}: protocolo documentado não pode ter condições desconhecidas.`);
  } else if (b.quality === "partial") {
    if (!missing.length) throw new Error(`${b.id}: dados parciais exigem missingFields.`);
    if (b.comparabilityKey !== null) text(b.comparabilityKey, `${b.id}.comparabilityKey`, 500);
  } else throw new Error(`${b.id}: qualidade inválida.`);
  return b as unknown as Benchmark;
}
function unique<T extends { id: string }>(values: T[], label: string): T[] {
  if (new Set(values.map(v => v.id)).size !== values.length) throw new Error(`${label}: IDs duplicados.`);
  return values;
}
function sameFields(a: object, b: object, fields: string[]) { return fields.every(key => ((a as RecordValue)[key] ?? null) === ((b as RecordValue)[key] ?? null)); }
function merge<T extends { id: string }>(base: T[], updates: T[], immutable: string[], label: string): T[] {
  const values = new Map(base.map(value => [value.id, value]));
  for (const update of updates) {
    const previous = values.get(update.id);
    if (previous && !sameFields(previous, update, immutable)) throw new Error(`${label} ${update.id}: identidade incompatível. Use um novo ID para outro hardware, teste ou origem.`);
    values.set(update.id, update);
  }
  return Array.from(values.values());
}

/** Validates structure and provenance references. A human curator still validates the evidence. */
export function mergeDatasetUpdate(base: Dataset, input: unknown): Dataset {
  const feed = object(input, "feed"); keys(feed, ["schemaVersion","updatedAt","devices","workloads","benchmarks","sources"], "feed");
  if (feed.schemaVersion !== 1) throw new Error("schemaVersion deve ser 1.");
  date(feed.updatedAt, "feed.updatedAt");
  const devices = unique(array(feed.devices, "devices").map(parseDevice), "devices");
  const workloads = unique(array(feed.workloads, "workloads").map(parseWorkload), "workloads");
  const sources = unique(array(feed.sources, "sources").map(parseSource), "sources");
  const benchmarks = unique(array(feed.benchmarks, "benchmarks").map(parseBenchmark), "benchmarks");
  const output: Dataset = {
    updatedAt: feed.updatedAt > base.updatedAt ? feed.updatedAt : base.updatedAt,
    devices: merge(base.devices, devices, ["family","year","chip","cpuCores","gpuCores","architecture","gpuName","gpuMemoryGb","memoryGb","storageGb","bandwidthGbps","screenInches"], "Device"),
    workloads: merge(base.workloads, workloads, ["category","name","subtitle","metric","higherIsBetter"], "Workload"),
    sources: merge(base.sources, sources, ["url","publisher"], "Source"),
    benchmarks: merge(base.benchmarks, benchmarks, ["deviceId","workloadId","sourceId"], "Benchmark"),
  };
  const deviceMap = new Map(output.devices.map(d => [d.id, d])); const workloadIds = new Set(output.workloads.map(w => w.id)); const sourceIds = new Set(output.sources.map(s => s.id));
  const protocols = new Map<string, string>();
  for (const b of output.benchmarks) {
    const d = deviceMap.get(b.deviceId);
    if (!d || !workloadIds.has(b.workloadId) || !sourceIds.has(b.sourceId)) throw new Error(`${b.id}: referência ausente de hardware, teste ou fonte.`);
    if (!new RegExp(`\\b${d.memoryGb}\\s*GB\\b`, "i").test(b.reportedHardware)) throw new Error(`${b.id}: memória descrita não corresponde ao hardware.`);
    if (b.comparabilityKey && b.quality === "documented") {
      const signature = JSON.stringify([b.workloadId, Object.entries(b.conditions).sort(([a], [c]) => a.localeCompare(c))]);
      if (protocols.has(b.comparabilityKey) && protocols.get(b.comparabilityKey) !== signature) throw new Error(`${b.id}: protocolo reutilizado com condições diferentes.`);
      protocols.set(b.comparabilityKey, signature);
    }
  }
  return output;
}

export function validateFeedUrl(value: string): string {
  const url = https(value, "BENCHMARK_DATA_URL");
  if (url.hostname !== "raw.githubusercontent.com" || url.search || url.hash || !/^\/[\w.-]+\/[\w.-]+\/[^/]+\/.+\.json$/.test(url.pathname)) throw new Error("BENCHMARK_DATA_URL deve apontar para um JSON público versionado em raw.githubusercontent.com.");
  return url.toString();
}
async function readJson(response: Response): Promise<unknown> {
  if (!response.ok || response.redirected) throw new Error("O feed não retornou uma resposta válida.");
  if (Number(response.headers.get("content-length")) > MAX_FEED_BYTES) throw new Error("O feed excede 2 MB.");
  if (!response.body) throw new Error("O feed está vazio.");
  const reader = response.body.getReader(); const decoder = new TextDecoder("utf-8", { fatal: true }); let length = 0; let content = "";
  try {
    while (true) { const chunk = await reader.read(); if (chunk.done) break; length += chunk.value.byteLength; if (length > MAX_FEED_BYTES) { await reader.cancel(); throw new Error("O feed excede 2 MB."); } content += decoder.decode(chunk.value, { stream: true }); }
    content += decoder.decode(); return JSON.parse(content);
  } finally { reader.releaseLock(); }
}
interface CacheEntry { dataset?: Dataset; successAt: number; checkedAt: number; retryAt: number; failed: boolean; pending?: Promise<Dataset> }
interface LoaderOptions { base: Dataset; localFeed: unknown; feedUrl?: () => string | undefined; fetcher?: typeof fetch; now?: () => number; cache?: Map<string, CacheEntry> }

export function createDatasetLoader(options: LoaderOptions) {
  const now = options.now ?? Date.now, fetcher = options.fetcher ?? fetch, cache = options.cache ?? new Map<string, CacheEntry>();
  let local = options.base, localInvalid = false;
  try { local = mergeDatasetUpdate(options.base, options.localFeed); } catch { localInvalid = true; }
  const localHasChanges = local.updatedAt !== options.base.updatedAt || (["devices", "workloads", "benchmarks", "sources"] as const).some(key => JSON.stringify(local[key]) !== JSON.stringify(options.base[key]));
  let status: DatasetLoadStatus = { mode: localHasChanges ? "local" : "base", updatedAt: local.updatedAt, checkedAt: null, message: localInvalid ? "A atualização local não passou na validação; a base original foi preservada." : "Base curada disponível." };
  const mark = (data: Dataset, mode: DatasetLoadStatus["mode"], checkedAt: number | null, message: string) => { status = { mode, updatedAt: data.updatedAt, checkedAt: checkedAt === null ? null : new Date(checkedAt).toISOString(), message }; return data; };
  async function load(): Promise<Dataset> {
    const configured = options.feedUrl?.()?.trim();
    if (!configured) return mark(local, localHasChanges ? "local" : "base", null, localInvalid ? "A atualização local inválida foi ignorada; a base original foi preservada." : "Base curada disponível.");
    let url: string;
    try { url = validateFeedUrl(configured); } catch { return mark(local, localHasChanges ? "local" : "base", now(), "O endereço do feed não é permitido; a base curada foi preservada."); }
    let entry = cache.get(url);
    if (!entry) { if (cache.size >= 2) cache.clear(); entry = { successAt: 0, checkedAt: 0, retryAt: 0, failed: false }; cache.set(url, entry); }
    const current = entry;
    const fallback = () => current.dataset && now() - current.successAt <= MAX_STALE_MS
      ? mark(current.dataset, "stale", current.checkedAt, "O feed está indisponível ou inválido. A última atualização válida foi preservada.")
      : mark(local, localHasChanges ? "local" : "base", current.checkedAt, "O feed está indisponível ou inválido. A base curada foi preservada.");
    if (current.pending) return current.pending;
    if (now() < current.retryAt) return current.failed ? fallback() : mark(current.dataset!, "remote", current.checkedAt, "Feed curado validado; cache de até 10 minutos.");
    current.pending = (async () => {
      current.checkedAt = now();
      try {
        const response = await fetcher(url, { redirect: "error", signal: AbortSignal.timeout(8000), cache: "no-store", headers: { Accept: "application/json, text/plain" } });
        const updated = mergeDatasetUpdate(local, await readJson(response));
        current.dataset = updated; current.successAt = now(); current.retryAt = now() + CACHE_MS; current.failed = false;
        return mark(updated, "remote", current.checkedAt, "Feed curado carregado e validado estruturalmente. A evidência continua sob revisão do curador.");
      } catch { current.failed = true; current.retryAt = now() + RETRY_MS; return fallback(); }
      finally { current.pending = undefined; }
    })();
    return current.pending;
  }
  return { load, status: () => ({ ...status }) };
}

const shared = globalThis as typeof globalThis & { __macversusDatasetCache?: Map<string, CacheEntry> };
shared.__macversusDatasetCache ??= new Map();
const loader = createDatasetLoader({ base: baseDataset, localFeed: reviewedUpdates, feedUrl: () => process.env.BENCHMARK_DATA_URL, cache: shared.__macversusDatasetCache });
export const loadDataset = () => loader.load();
export const loadDatasetStatus = () => loader.status();
