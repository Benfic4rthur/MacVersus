"use client";

import { ArrowUpRight, ChevronRight, Info } from "lucide-react";
import { compareBenchmarks, formatValue } from "@/lib/comparison";
import { storageLabel } from "@/lib/configuration";
import type { Benchmark, BenchmarkSource, Device, Workload } from "@/lib/types";

const unitLabel = { fps: "FPS", "tokens/s": "tokens/s", seconds: "segundos", score: "pontos", "MB/s": "MB/s" };
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[\s_]+/g, "").replaceAll("×", "x");
const screenLabel = (value: number) => `${value.toLocaleString("pt-BR")}″`;
type ConditionField = { label: string; keys: string[] };
const gameFields: ConditionField[] = [
  { label: "Resolução", keys: ["Resolução", "resolution"] },
  { label: "Preset", keys: ["Qualidade", "preset", "quality"] },
  { label: "Antisserrilhamento", keys: ["Antisserrilhamento", "antialiasing"] },
];
const llmFields: ConditionField[] = [
  { label: "Modelo", keys: ["Modelo", "model"] },
  { label: "Quantização", keys: ["Quantização", "quantization"] },
  { label: "Teste", keys: ["Teste", "test"] },
  { label: "Backend", keys: ["Backend", "backend"] },
  { label: "Runtime", keys: ["Runtime", "runtime"] },
  { label: "Build", keys: ["Build", "commit"] },
];

function conditionValue(record: Benchmark, field: ConditionField) {
  const keys = field.keys.map(normalize);
  return Object.entries(record.conditions).find(([key, value]) => keys.includes(normalize(key)) && value.trim())?.[1];
}

function conditionSummary(record: Benchmark, workload: Workload) {
  const fields = workload.category === "games" ? gameFields : workload.category === "llms" ? llmFields : [];
  return fields.flatMap(field => {
    const value = conditionValue(record, field);
    if (!value) return [];
    const display = field.label === "Teste" && /^tg\d+$/i.test(value) ? `Geração (${value})`
      : field.label === "Teste" && /^pp\d+$/i.test(value) ? `Prompt (${value})` : value;
    return [{ label: field.label, value: display }];
  });
}

export function benchmarkProtocolDifference(left: Benchmark | undefined, right: Benchmark | undefined, workload: Workload): "resolution" | "resolution-unknown" | "conditions" | null {
  if (!left || !right) return null;
  const fields = workload.category === "games" ? gameFields : workload.category === "llms" ? llmFields : [];
  for (const field of fields) {
    const a = conditionValue(left, field), b = conditionValue(right, field);
    if (field.label === "Resolução") {
      const unknown = (value: string | undefined) => !value || /^(?:nao(?:informad[oa]|documentad[oa]|especificad[oa]|publicad[oa])|unknown|not(?:reported|specified|documented|provided)|n\/a|n\/d)/.test(normalize(value));
      if (unknown(a) || unknown(b)) return "resolution-unknown";
    }
    if (a && b && normalize(a) !== normalize(b)) return field.label === "Resolução" ? "resolution" : "conditions";
  }
  return null;
}

export function BenchmarkReferenceBadges({ record }: { record: Benchmark }) {
  const reference = record.hardwareReference;
  if (!reference) return null;
  return <div className="benchmark-reference-badges">
    {reference.differences.includes("memory") && <span className="benchmark-memory-badge">Teste em {reference.testedMemoryGb} GB</span>}
    {reference.differences.includes("screen") && <span>{reference.testedScreenInches === null ? "Tela não informada na fonte" : `Tela do teste: ${screenLabel(reference.testedScreenInches)}`}</span>}
  </div>;
}

export function BenchmarkCard({ workload, left, right, leftDevice, rightDevice, sources, onDetails }: {
  workload: Workload; left?: Benchmark; right?: Benchmark; leftDevice: Device; rightDevice: Device; sources: BenchmarkSource[]; onDetails: () => void;
}) {
  const comparison = compareBenchmarks(left, right, workload);
  const protocolDifference = benchmarkProtocolDifference(left, right, workload);
  const hasReference = Boolean(left?.hardwareReference || right?.hardwareReference || left?.storageReference || right?.storageReference);
  const comparable = comparison.status === "comparable" && !protocolDifference && !hasReference;
  const max = Math.max(left?.value ?? 0, right?.value ?? 0, 1);
  const winner = comparison.winner === "left" ? leftDevice : rightDevice;
  const context = protocolDifference === "resolution" ? "Resoluções diferentes. Valores de referência, sem vantagem calculada."
    : protocolDifference === "resolution-unknown" ? "Resolução não informada em um dos testes. Sem vantagem calculada."
    : protocolDifference === "conditions" ? "Condições diferentes. Valores de referência, sem vantagem calculada."
    : left?.hardwareReference || right?.hardwareReference ? "Referências de RAM ou tela diferentes. Sem estimativa para a sua configuração."
    : comparison.winner === "tie" && comparable ? "Resultados equivalentes neste teste."
    : comparison.status === "missing" ? "Faltam medições para comparar esta configuração."
    : "Condições parciais. Confira o contexto antes de comparar.";
  return <article className="benchmark-card">
    <div className="benchmark-card-heading"><div><h3>{workload.name}</h3><p>{workload.subtitle}</p></div><span className="unit-pill">{unitLabel[workload.metric]}</span></div>
    <div className="benchmark-bars">{([{ side: "left", record: left, device: leftDevice }, { side: "right", record: right, device: rightDevice }] as const).map(({ side, record, device }) => {
      const memory = record?.hardwareReference?.testedMemoryGb ?? device.memoryGb;
      const screen = record?.testedScreenInches !== undefined ? record.testedScreenInches
        : record?.hardwareReference ? record.hardwareReference.testedScreenInches : device.screenInches;
      const conditions = record ? conditionSummary(record, workload) : [];
      const source = sources.find(item => item.id === record?.sourceId);
      return <div className={`benchmark-row benchmark-${side}`} key={side}>
        <div className="bar-label"><span><i />{device.chip} <small>{record?.hardwareReference?.differences.includes("memory") ? `selecionado: ${device.memoryGb} GB` : `${device.memoryGb} GB`}</small></span><div className="benchmark-value-group"><strong>{record ? formatValue(record.value, workload.metric) : <span className="no-value">Sem medição</span>}</strong>{record && <BenchmarkReferenceBadges record={record} />}</div></div>
        {conditions.length > 0 && <div className="benchmark-run-conditions" aria-label="Condições desta medição">{conditions.map(condition => <span key={condition.label}><span className="sr-only">{condition.label}: </span>{condition.value}</span>)}</div>}
        <div className={`bar-track ${record ? "" : "bar-empty"}`} role={record ? "img" : undefined} aria-label={record ? `${device.chip}, teste em ${memory} GB: ${formatValue(record.value, workload.metric)}` : undefined}>{record && <div className="bar-fill" style={{ width: `${Math.max(2, record.value / max * 100)}%` }} />}</div>
        {record && <p className="benchmark-tested-hardware">Testado: CPU {device.cpuCores} · {device.gpuCores === null ? device.gpuName ?? "GPU não informada" : `GPU ${device.gpuCores}`} · {memory} GB RAM · {screen === null ? "tela não informada" : screenLabel(screen)}</p>}
        {record?.storageReference && <p className="benchmark-storage-reference"><Info size={11} /><span>{record.storageReference.testedStorageGb === null ? "SSD não informado na fonte" : `SSD do teste: ${storageLabel(record.storageReference.testedStorageGb)}`}</span></p>}
        {source && <a className="benchmark-row-source" href={source.url} target="_blank" rel="noopener noreferrer">Publicado por {source.publisher} · {source.publishedAt ? new Date(`${source.publishedAt.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "data não informada"}<ArrowUpRight size={11} /></a>}
      </div>;
    })}</div>
    <div className="benchmark-card-foot"><span className="direction-label">{workload.higherIsBetter ? "Maior é melhor" : "Menor é melhor"}</span><button onClick={onDetails}>Teste e fontes<ChevronRight size={14} /></button></div>
    {comparable && comparison.winner !== "tie" && comparison.percent !== null ? <div className={`benchmark-insight insight-${comparison.winner}`}><ArrowUpRight size={15} /><span><strong>{winner.chip}</strong>: {comparison.percent.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% {workload.higherIsBetter ? `mais ${unitLabel[workload.metric]}` : "menos tempo"} neste teste.</span></div> : <div className="benchmark-context"><Info size={14} /><span>{context}</span></div>}
  </article>;
}
