import type { Benchmark, Category, Dataset, Metric, Workload } from "./types";

export interface ComparisonResult {
  status: "comparable" | "partial" | "missing";
  percent: number | null;
  winner: "left" | "right" | "tie" | null;
  explanation: string;
}

export function compareBenchmarks(
  left?: Benchmark,
  right?: Benchmark,
  workload?: Workload,
): ComparisonResult {
  if (!left || !right || !workload) {
    return { status: "missing", percent: null, winner: null,
      explanation: "Dados insuficientes. Ainda não há uma medição publicada para cada configuração neste teste." };
  }
  if (![left.value, right.value].every((value) => Number.isFinite(value) && value > 0)) {
    return { status: "missing", percent: null, winner: null,
      explanation: "Não há valores válidos suficientes para esta comparação." };
  }
  if (left.workloadId !== workload.id || right.workloadId !== workload.id
    || !left.comparabilityKey || left.comparabilityKey !== right.comparabilityKey
    || left.quality !== "documented" || right.quality !== "documented"
    || left.missingFields.length > 0 || right.missingFields.length > 0) {
    return { status: "partial", percent: null, winner: null,
      explanation: "As fontes não documentam condições equivalentes suficientes. Os valores são exibidos como referência, sem calcular vantagem." };
  }
  if (left.value === right.value) {
    return { status: "comparable", percent: 0, winner: "tie",
      explanation: "As medições publicadas têm o mesmo valor neste protocolo." };
  }
  const leftWins = workload.higherIsBetter ? left.value > right.value : left.value < right.value;
  const best = leftWins ? left.value : right.value;
  const worst = leftWins ? right.value : left.value;
  const percent = workload.higherIsBetter
    ? (best / worst - 1) * 100
    : ((worst - best) / worst) * 100;
  return {
    status: "comparable", percent, winner: leftWins ? "left" : "right",
    explanation: "Comparação das medições publicadas para o mesmo protocolo. O resultado se aplica às configurações e às versões informadas." };
}

const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export function formatValue(value: number, metric: Metric): string {
  if (!Number.isFinite(value)) return "Sem dados";
  const unit = metric === "tokens/s" ? "tok/s" : metric === "seconds" ? "s" : metric === "score" ? "pts" : metric === "MB/s" ? "MB/s" : "FPS";
  return `${decimal.format(value)} ${unit}`;
}

function csvCell(value: string | number): string {
  const text = String(value);
  // A CSV must never turn source text into a spreadsheet formula.
  const safe = /^[=+\-@\t\r\n]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function buildComparisonCsv(dataset: Dataset, leftId: string, rightId: string, category: Category): string {
  const header = ["Modelo", "Chip", "Ano", "CPU", "GPU", "RAM (GB)", "Armazenamento (GB)", "Categoria", "Teste", "Valor", "Unidade", "Condições", "Qualidade", "Informações ausentes", "Fonte", "URL", "Data da fonte", "Consulta", "Observações"];
  const rows: (string | number)[][] = [header];
  for (const deviceId of [leftId, rightId]) {
    const device = dataset.devices.find((entry) => entry.id === deviceId);
    if (!device) continue;
    for (const workload of dataset.workloads.filter((entry) => entry.category === category)) {
      const records = dataset.benchmarks.filter((entry) => entry.deviceId === deviceId && entry.workloadId === workload.id);
      if (records.length === 0) {
        rows.push([device.name, device.chip, device.year, device.cpuCores, device.gpuName ?? `${device.gpuCores ?? "Não informado"} núcleos`, device.memoryGb, device.storageGb ?? "Não informado", category, workload.name, "Sem dados", workload.metric, "", "Sem medição", "", "", "", "", dataset.updatedAt, "Não é uma estimativa."]);
      }
      for (const record of records) {
        const source = dataset.sources.find((entry) => entry.id === record.sourceId);
        rows.push([device.name, device.chip, device.year, device.cpuCores, device.gpuName ?? `${device.gpuCores ?? "Não informado"} núcleos`, device.memoryGb, device.storageGb ?? "Não informado", category, workload.name, record.value, workload.metric,
          Object.entries(record.conditions).map(([key, value]) => `${key}: ${value}`).join("; "),
          record.quality, record.missingFields.join("; "), source?.publisher ?? "", source?.url ?? "", source?.publishedAt ?? "Não informada", source?.accessedAt ?? "", record.notes]);
      }
    }
  }
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
