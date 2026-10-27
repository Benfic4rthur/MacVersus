import { loadDataset } from "@/lib/dataset-updates";
import { createResearchService, readResearchBody, researchErrorResponse } from "@/lib/research";
import type { Dataset } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const services = new WeakMap<Dataset, ReturnType<typeof createResearchService>>();

async function getService() {
  const data = await loadDataset();
  let service = services.get(data);
  if (!service) {
    service = createResearchService({ data, apiKey: process.env.TAVILY_API_KEY, accessToken: process.env.RESEARCH_ACCESS_TOKEN });
    services.set(data, service);
  }
  return service;
}

export async function POST(request: Request) {
  try {
    const body = await readResearchBody(request);
    const service = await getService();
    const result = await service.search(body, request.headers.get("authorization"));
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return researchErrorResponse(error);
  }
}
