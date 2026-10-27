"use client";

import { ArrowUpRight, ChevronRight, Info } from "lucide-react";
import { compareBenchmarks, formatValue } from "@/lib/comparison";
import type { Benchmark, Device, Workload } from "@/lib/types";

const unitLabel = { fps: "FPS", "tokens/s": "tokens/s", seconds: "segundos", score: "pontos", "MB/s": "MB/s" };

export function BenchmarkCard({ workload, left, right, leftDevice, rightDevice, onDetails }: {
  workload: Workload; left?: Benchmark; right?: Benchmark; leftDevice: Device; rightDevice: Device; onDetails: () => void;
}) {
  const comparison = compareBenchmarks(left, right, workload);
  const max = Math.max(left?.value ?? 0, right?.value ?? 0, 1);
  const winner = comparison.winner === "left" ? leftDevice : rightDevice;
  return <article className="benchmark-card">
    <div className="benchmark-card-heading"><div><h3>{workload.name}</h3><p>{workload.subtitle}</p></div><span className="unit-pill">{unitLabel[workload.metric]}</span></div>
    <div className="benchmark-bars">{([{ side: "left", record: left, device: leftDevice }, { side: "right", record: right, device: rightDevice }] as const).map(({ side, record, device }) => <div className={`benchmark-row benchmark-${side}`} key={side}>
      <div className="bar-label"><span><i />{device.chip} <small>{device.memoryGb} GB</small></span><strong>{record ? formatValue(record.value, workload.metric) : <span className="no-value">Sem medição</span>}</strong></div>
      <div className={`bar-track ${record ? "" : "bar-empty"}`} role={record ? "img" : undefined} aria-label={record ? `${device.chip}: ${formatValue(record.value, workload.metric)}` : undefined}>{record && <div className="bar-fill" style={{ width: `${Math.max(2, record.value / max * 100)}%` }} />}</div>
    </div>)}</div>
    <div className="benchmark-card-foot"><span className="direction-label">{workload.higherIsBetter ? "Maior é melhor" : "Menor é melhor"}</span><button onClick={onDetails}>Teste e fontes<ChevronRight size={14} /></button></div>
    {comparison.status === "comparable" && comparison.winner !== "tie" && comparison.percent !== null ? <div className={`benchmark-insight insight-${comparison.winner}`}><ArrowUpRight size={15} /><span><strong>{winner.chip}</strong>: {comparison.percent.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% {workload.higherIsBetter ? `mais ${unitLabel[workload.metric]}` : "menos tempo"} neste teste.</span></div> : <div className="benchmark-context"><Info size={14} /><span>{comparison.winner === "tie" && comparison.status === "comparable" ? "Resultados equivalentes neste teste." : comparison.status === "missing" ? "Faltam medições para comparar esta configuração." : "Condições parciais. Confira o contexto antes de comparar."}</span></div>}
  </article>;
}
