"use client";

import { useId, useState } from "react";
import { Info, Radar } from "lucide-react";
import type { Device } from "@/lib/types";
import { buildCapacityProfile, storageLabel } from "@/lib/configuration";

const center = 180, radius = 111;
function point(index: number, ratio: number, count: number) {
  const angle = -Math.PI / 2 + index * Math.PI * 2 / count;
  return [center + Math.cos(angle) * radius * ratio, center + Math.sin(angle) * radius * ratio] as const;
}

export function RadarProfile({ left, right }: { left: Device; right: Device }) {
  const axes = buildCapacityProfile(left, right);
  const [active, setActive] = useState<number | null>(null);
  const id = useId();
  const format = (axis: typeof axes[number], value: number | null) => value === null ? "Não informado" : axis.id === "ssd" ? storageLabel(value) : `${value.toLocaleString("pt-BR")} ${axis.unit}`;
  return <section className="profile-section" aria-labelledby={`${id}-heading`}>
    <div className="results-heading"><div><div className="section-eyebrow"><Radar size={14} /> VISÃO GERAL</div><h2 id={`${id}-heading`}>Perfil do hardware.</h2></div><span className="profile-type">Capacidades do hardware</span></div>
    <div className="profile-card"><div className="profile-visual"><div className="profile-legend"><span><i className="dot-left" />{left.chip}</span><span><i className="dot-right" />{right.chip}</span></div>
      <svg className="profile-radar" viewBox="0 0 360 340" role="img" aria-labelledby={`${id}-title ${id}-description`}>
        <title id={`${id}-title`}>{`Perfil das capacidades de ${left.chip} e ${right.chip}`}</title>
        <desc id={`${id}-description`}>Cada eixo tem escala própria: o maior valor do par ocupa a borda. O desenho não é uma nota de desempenho. Valores desconhecidos deixam lacunas. Os valores exatos aparecem na tabela ao lado.</desc>
        {[.25, .5, .75, 1].map(level => <polygon key={level} points={axes.map((_, i) => point(i, level, axes.length).join(",")).join(" ")} className="radar-grid" />)}
        {axes.map((axis, i) => { const [x, y] = point(i, 1, axes.length); const [tx, ty] = point(i, 1.28, axes.length); return <g key={axis.id}><line x1={center} y1={center} x2={x} y2={y} className={`radar-spoke ${active === i ? "active" : ""}`} /><text x={tx} y={ty + 4} textAnchor="middle" className={active === i ? "active" : ""}>{axis.label}</text></g>; })}
        {(["right", "left"] as const).map(side => {
          const values = axes.map(axis => side === "left" ? axis.leftRatio : axis.rightRatio);
          const complete = values.every(value => value !== null);
          const points = values.map((value, i) => value === null ? null : point(i, value, axes.length));
          return <g key={side} className={`radar-series radar-series-${side}`}>
            {complete ? <polygon points={points.map(p => p!.join(",")).join(" ")} /> : points.map((p, i) => { const next = points[(i + 1) % points.length]; return p && next ? <line key={i} x1={p[0]} y1={p[1]} x2={next[0]} y2={next[1]} /> : null; })}
            {points.map((p, i) => p ? <circle key={i} cx={p[0]} cy={p[1]} r={active === i ? 5 : 3.5} /> : null)}
          </g>;
        })}
      </svg><p className="radar-caption">A borda representa o maior valor do par em cada eixo.</p>
    </div><div className="profile-values"><div className="profile-table-heading"><span>Atributo</span><span><i className="dot-left" />Mac A</span><span><i className="dot-right" />Mac B</span></div>
      {axes.map((axis, index) => <button key={axis.id} className={`profile-value-row ${active === index ? "active" : ""}`} onMouseEnter={() => setActive(index)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(index)} onBlur={() => setActive(null)} onClick={() => setActive(active === index ? null : index)} aria-label={`${axis.label}: ${left.chip}, ${format(axis, axis.left)}; ${right.chip}, ${format(axis, axis.right)}`}><strong>{axis.label}</strong><span>{format(axis, axis.left)}</span><span>{format(axis, axis.right)}</span></button>)}
      <div className="profile-explanation"><Info size={17} /><p><strong>Capacidade não é velocidade.</strong> Núcleos de gerações diferentes não têm o mesmo desempenho. RAM e SSD indicam espaço disponível. FPS, exportação, leitura e gravação dependem de testes reais abaixo.</p></div>
      <div className="profile-source-links"><a href={left.specUrl} target="_blank" rel="noopener noreferrer">Ficha técnica do Mac A</a><a href={right.specUrl} target="_blank" rel="noopener noreferrer">Ficha técnica do Mac B</a></div>
    </div></div>
  </section>;
}
