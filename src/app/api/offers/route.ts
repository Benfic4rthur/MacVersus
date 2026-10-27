import { verifiedOffers } from "@/data/offers";
import { reviewedOfferCandidates } from "@/data/offer-candidates";
import { getStorageOptions } from "@/lib/configuration";
import { loadDataset } from "@/lib/dataset-updates";
import { createOffersService, OffersError } from "@/lib/offers";
import { createOfferDiscoveryService } from "@/lib/offer-discovery";
import type { Dataset } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const services = new WeakMap<Dataset, ReturnType<typeof createOffersService>>();
const discoveryServices = new WeakMap<Dataset, ReturnType<typeof createOfferDiscoveryService>>();

async function getDiscoveryService() {
  const data = await loadDataset();
  let service = discoveryServices.get(data);
  if (!service) {
    service = createOfferDiscoveryService({ data, reviewedCandidates: reviewedOfferCandidates, storageOptions: getStorageOptions,
      apiKey: process.env.TAVILY_API_KEY, accessToken: process.env.RESEARCH_ACCESS_TOKEN });
    discoveryServices.set(data, service);
  }
  return service;
}

async function getService() {
  const data = await loadDataset();
  let service = services.get(data);
  if (!service) {
    service = createOffersService({ data, offers: verifiedOffers, storageOptions: getStorageOptions });
    services.set(data, service);
  }
  return service;
}

function errorResponse(error: unknown) {
  const safe = error instanceof OffersError ? error : new OffersError(500, "Não foi possível consultar as ofertas agora.");
  return Response.json({ error: safe.message }, {
    status: safe.status,
    headers: { "Cache-Control": "no-store", ...(safe.retryAfter ? { "Retry-After": String(safe.retryAfter) } : {}) },
  });
}

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const service = await getService();
    const result = service.get({ deviceId: params.get("deviceId"),
      storageGb: params.has("storageGb") ? params.get("storageGb") : undefined, condition: params.get("condition") ?? undefined });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}

async function readBody(request: Request): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new OffersError(415, "Envie a configuração como application/json.");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new OffersError(400, "Informe a configuração da oferta.");
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 4096) { await reader.cancel(); throw new OffersError(413, "A configuração enviada é grande demais."); }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch (error) {
    if (error instanceof OffersError) throw error;
    throw new OffersError(400, "Não foi possível ler a configuração.");
  } finally { reader.releaseLock(); }
}

export async function POST(request: Request) {
  try {
    const body = await readBody(request);
    const action = body && typeof body === "object" && "action" in body ? body.action : undefined;
    if (action === "discover") {
      const discovery = await getDiscoveryService();
      const result = await discovery.discover(body, request.headers.get("authorization"));
      return Response.json(result, { headers: { "Cache-Control": "no-store" } });
    }
    if (action !== undefined && action !== "refresh") throw new OffersError(400, "Ação de ofertas inválida.");
    const service = await getService();
    const result = await service.refresh(body);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
