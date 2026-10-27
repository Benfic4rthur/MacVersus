import { loadDataset, loadDatasetStatus } from "@/lib/dataset-updates";
import type { Category } from "@/lib/types";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const category = params.get("category");
  if (category !== null && !["games", "llms", "apps"].includes(category)) {
    return Response.json({ error: "Categoria inválida. Use games, llms ou apps." }, { status: 400 });
  }
  const dataset = await loadDataset();
  const rawIds = params.get("deviceIds");
  if (rawIds !== null && rawIds.length > 1000) {
    return Response.json({ error: "A lista de MacBooks é grande demais." }, { status: 400 });
  }
  const deviceIds = rawIds === null ? null : [...new Set(rawIds.split(",").map((id) => id.trim()))];
  if (deviceIds && (deviceIds.length > 20 || deviceIds.some((id) => !dataset.devices.some((device) => device.id === id)))) {
    return Response.json({ error: "Um dos MacBooks informados não existe no catálogo." }, { status: 400 });
  }
  const workloads = dataset.workloads.filter((workload) => !category || workload.category === category as Category);
  const workloadIds = new Set(workloads.map((workload) => workload.id));
  const devices = dataset.devices.filter((device) => !deviceIds || deviceIds.includes(device.id));
  const benchmarks = dataset.benchmarks.filter((benchmark) =>
    workloadIds.has(benchmark.workloadId) && (!deviceIds || deviceIds.includes(benchmark.deviceId)),
  );
  const sourceIds = new Set(benchmarks.map((benchmark) => benchmark.sourceId));
  return Response.json({
    updatedAt: dataset.updatedAt,
    devices,
    workloads,
    benchmarks,
    sources: dataset.sources.filter((source) => sourceIds.has(source.id)),
    metadata: { mode: "curated", update: loadDatasetStatus(), measurements: benchmarks.length, filters: { category, deviceIds } },
  }, { headers: { "Cache-Control": "no-store" } });
}
