"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Cpu, Laptop, Search, SlidersHorizontal } from "lucide-react";
import type { Device } from "@/lib/types";
import { getDeviceImage } from "@/data/device-images";
import { Dialog } from "./Dialog";
import { publicAssetPath } from "@/lib/static-preview";

export const isIntel = (device: Device) => device.architecture === "intel" || /intel|core i[3579]/i.test(device.chip);
export const gpuLabel = (device: Device) => isIntel(device) ? device.gpuName ?? "Gráficos Intel" : `${device.gpuCores ?? "?"} núcleos`;
const screenLabel = (device: Device) => `${device.screenInches.toLocaleString("pt-BR")}"`;
const storageLabel = (value: number) => value >= 1024 ? `${value / 1024} TB` : `${value} GB`;
const gpuKey = (device: Device) => isIntel(device) ? `${device.gpuName ?? "integrada"}:${device.gpuMemoryGb ?? "shared"}` : `cores:${device.gpuCores}`;
const gpuOptionLabel = (device: Device) => `${gpuLabel(device)}${isIntel(device) && device.gpuMemoryGb ? ` · ${device.gpuMemoryGb} GB VRAM` : ""}`;
const byText = (a: string, b: string) => a.localeCompare(b, "pt-BR", { numeric: true });

function DevicePhoto({ device }: { device: Device }) {
  const image = getDeviceImage(device);
  const [failedSrc, setFailedSrc] = useState("");
  if (!image || failedSrc === image.src) return <div className="product-photo-unavailable"><Laptop size={66} strokeWidth={1} /><span>Imagem não disponível para este modelo</span></div>;
  return <figure className="product-photo" key={image.src}>
    <img src={publicAssetPath(image.src)} alt={image.alt} width={720} height={440} decoding="async" onError={() => setFailedSrc(image.src)} />
    <figcaption><a href={image.sourceUrl} target="_blank" rel="noopener noreferrer">{image.credit}</a></figcaption>
  </figure>;
}

export function DeviceCard({ device, side, onPick, storageGb = device.storageGb, storageOptions = [], onStorageChange }: {
  device: Device; side: "left" | "right"; onPick: () => void;
  storageGb?: number | null; storageOptions?: number[]; onStorageChange?: (value: number | null) => void;
}) {
  return <article className={`device-card device-${side}`}>
    <div className="device-card-top"><span className="device-marker"><i />{side === "left" ? "CONFIGURAÇÃO A" : "CONFIGURAÇÃO B"}</span><button className="change-model" onClick={onPick}><SlidersHorizontal size={12} />Configurar Mac<ChevronDown size={13} /></button></div>
    <div className="device-card-body"><div className="device-title"><span className="device-year">{device.year}<span>·</span>{screenLabel(device)}</span><h2>{device.family}</h2><span className="device-chip-label">{device.chip}</span></div><DevicePhoto device={device} /></div>
    <div className="device-stats"><div><span>CPU</span><strong>{device.cpuCores} <small>núcleos</small></strong></div><div className={isIntel(device) ? "gpu-intel" : ""}><span>GPU</span><strong>{isIntel(device) ? <>{device.gpuName ?? "Integrada"}{device.gpuMemoryGb ? <small>{device.gpuMemoryGb} GB VRAM</small> : null}</> : <>{device.gpuCores} <small>núcleos</small></>}</strong></div><div><span>Memória RAM</span><strong>{device.memoryGb} <small>GB</small></strong></div></div>
    <div className="device-storage"><label htmlFor={`storage-${side}`}><span>SSD</span><small>Capacidade desta configuração</small></label>{onStorageChange && storageOptions.length > 0 ? <select id={`storage-${side}`} value={storageGb ?? ""} onChange={event => onStorageChange(event.target.value ? Number(event.target.value) : null)}><option value="">Não informado</option>{storageOptions.map(value => <option key={value} value={value}>{storageLabel(value)}</option>)}</select> : <strong>{storageGb ? storageLabel(storageGb) : "Não informado"}</strong>}</div>
  </article>;
}

export function DevicePicker({ devices, measuredDeviceIds, selectedId, open, onClose, onSelect }: {
  devices: Device[]; measuredDeviceIds: string[]; selectedId: string; open: boolean; onClose: () => void; onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [architecture, setArchitecture] = useState<"all" | "apple" | "intel">("all");
  const [family, setFamily] = useState("all");
  const [chip, setChip] = useState("all");
  const [screen, setScreen] = useState("all");
  const [gpu, setGpu] = useState("all");
  const [cpu, setCpu] = useState("all");
  const [memory, setMemory] = useState("all");
  const [onlyMeasured, setOnlyMeasured] = useState(false);

  useEffect(() => {
    if (!open) return;
    const selected = devices.find(device => device.id === selectedId);
    setQuery(""); setOnlyMeasured(false); setArchitecture("all");
    setFamily(selected?.family ?? "all"); setChip(selected?.chip ?? "all");
    setScreen(selected ? String(selected.screenInches) : "all");
    setGpu(selected ? gpuKey(selected) : "all");
    setCpu(selected ? String(selected.cpuCores) : "all");
    setMemory(selected ? String(selected.memoryGb) : "all");
  }, [open, selectedId, devices]);

  const byArchitecture = useMemo(() => devices.filter(d => architecture === "all" || (architecture === "intel" ? isIntel(d) : !isIntel(d))), [devices, architecture]);
  const byFamily = byArchitecture.filter(d => family === "all" || d.family === family);
  const byChip = byFamily.filter(d => chip === "all" || d.chip === chip);
  const byScreen = byChip.filter(d => screen === "all" || String(d.screenInches) === screen);
  const byGpu = byScreen.filter(d => gpu === "all" || gpuKey(d) === gpu);
  const byCpu = byGpu.filter(d => cpu === "all" || String(d.cpuCores) === cpu);
  const chipOptions = Array.from(new Set(byFamily.map(d => d.chip))).sort(byText);
  const screenOptions = Array.from(new Set(byChip.map(d => d.screenInches))).sort((a, b) => a - b);
  const gpuOptions = Array.from(new Map(byScreen.map(d => [gpuKey(d), gpuOptionLabel(d)])).entries());
  const cpuOptions = Array.from(new Set(byGpu.map(d => d.cpuCores))).sort((a, b) => a - b);
  const memoryOptions = Array.from(new Set(byCpu.map(d => d.memoryGb))).sort((a, b) => a - b);
  const words = query.toLowerCase().trim().split(/\s+/);
  const filtered = byCpu.filter(d => (memory === "all" || String(d.memoryGb) === memory) && (!onlyMeasured || measuredDeviceIds.includes(d.id)) && words.every(word => `${d.name} ${d.family} ${d.chip} ${d.year} RAM ${d.memoryGb}GB CPU ${d.cpuCores} GPU ${d.gpuCores ?? ""} ${d.gpuName ?? ""} ${d.gpuMemoryGb ?? ""}GB VRAM ${d.screenInches}`.toLowerCase().includes(word)));

  function resetHardware() { setChip("all"); setScreen("all"); setGpu("all"); setCpu("all"); setMemory("all"); }
  function resetAll() { setArchitecture("all"); setFamily("all"); resetHardware(); setQuery(""); setOnlyMeasured(false); }

  return <Dialog open={open} title="Configure seu Mac" onClose={onClose}>
    <p className="dialog-description">Escolha o chip, a GPU e a memória. As combinações disponíveis seguem as configurações publicadas pela Apple.</p>
    <div className="architecture-filters" aria-label="Arquitetura">{([['all', 'Todos'], ['apple', 'Apple Silicon'], ['intel', 'Intel']] as const).map(([value, label]) => <button key={value} className={architecture === value ? "active" : ""} onClick={() => { setArchitecture(value); setFamily("all"); resetHardware(); }} aria-pressed={architecture === value}>{label}</button>)}</div>
    <div className="configuration-filters">
      <label>Família<select value={family} onChange={event => { setFamily(event.target.value); resetHardware(); }}><option value="all">Todas as famílias</option>{Array.from(new Set(byArchitecture.map(d => d.family))).map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      <label>Chip<select autoFocus value={chip} onChange={event => { setChip(event.target.value); setScreen("all"); setGpu("all"); setCpu("all"); setMemory("all"); }}><option value="all">Todos os chips</option>{chipOptions.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      <label>Tamanho da tela<select value={screen} onChange={event => { setScreen(event.target.value); setGpu("all"); setCpu("all"); setMemory("all"); }}><option value="all">Todos os tamanhos</option>{screenOptions.map(value => <option key={value} value={value}>{value.toLocaleString("pt-BR")}"</option>)}</select></label>
      <label>GPU<select value={gpu} onChange={event => { setGpu(event.target.value); setCpu("all"); setMemory("all"); }}><option value="all">Todas as GPUs</option>{gpuOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>CPU<select value={cpu} onChange={event => { setCpu(event.target.value); setMemory("all"); }}><option value="all">Todas as CPUs</option>{cpuOptions.map(value => <option key={value} value={value}>{value} núcleos</option>)}</select></label>
      <label>Memória RAM<select value={memory} onChange={event => setMemory(event.target.value)}><option value="all">Todas as capacidades</option>{memoryOptions.map(value => <option key={value} value={value}>{value} GB</option>)}</select></label>
    </div>
    <div className="configuration-search-row"><label className="search-field picker-search"><Search size={16} /><span className="sr-only">Buscar nos modelos filtrados</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Filtrar por ano ou detalhes..." /></label><button className="reset-filters" onClick={resetAll}>Limpar filtros</button></div>
    <div className="picker-filter-row"><div className="picker-count">{filtered.length} {filtered.length === 1 ? "configuração disponível" : "configurações disponíveis"}</div><label className="measured-filter"><input type="checkbox" checked={onlyMeasured} onChange={event => setOnlyMeasured(event.target.checked)} />Só com medições</label></div>
    <div className="device-options configured-options">{filtered.map(device => <button key={device.id} className={`device-option ${device.id === selectedId ? "selected" : ""}`} onClick={() => { onSelect(device.id); onClose(); }}>
      <span className="option-icon"><Laptop size={23} /></span><span className="option-copy"><strong>{device.family} {screenLabel(device)} <span>{device.year}</span></strong><span>{device.chip} <i>·</i> {device.memoryGb} GB RAM <i>·</i> {device.cpuCores} CPU <i>·</i> {isIntel(device) ? `${device.gpuName}${device.gpuMemoryGb ? ` · ${device.gpuMemoryGb} GB VRAM` : ""}` : `${device.gpuCores} GPU`}</span>{measuredDeviceIds.includes(device.id) && <span className="option-measured">Medições disponíveis</span>}</span>{device.id === selectedId && <Check size={18} className="selected-check" />}
    </button>)}{filtered.length === 0 && <div className="empty-state compact"><Cpu size={26} /><h3>Nenhuma configuração encontrada</h3><p>Altere os filtros ou limpe a busca para ver os modelos disponíveis.</p><button className="outline-button" onClick={resetAll}>Limpar filtros</button></div>}</div>
  </Dialog>;
}
