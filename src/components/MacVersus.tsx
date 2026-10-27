"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, ArrowRight, ArrowUpRight, BarChart3, BookOpen, BrainCircuit, Check, CheckCheck, ChevronRight, Clapperboard, Clock3, Download, ExternalLink, FileCheck2, Gamepad2, GitBranch, Globe2, Info, Layers3, Menu, RefreshCw, Search, Share2, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import type { Benchmark, Category, Dataset, Device, Workload } from "@/lib/types";
import { buildComparisonCsv, compareBenchmarks, formatValue } from "@/lib/comparison";
import { DeviceCard, DevicePicker, gpuLabel, isIntel } from "./DevicePicker";
import { BenchmarkCard } from "./BenchmarkCard";
import { Dialog } from "./Dialog";
import { ResearchPanel } from "./ResearchPanel";
import { RadarProfile } from "./RadarProfile";
import { OffersPanel } from "./OffersPanel";
import type { VerifiedOffer } from "@/lib/offer-types";
import { publicAssetPath, STATIC_PREVIEW_NOTICE } from "@/lib/static-preview";
import { datasetForSelections, getStorageOptions, parseStorageSelection, recordForConfiguration } from "@/lib/configuration";

type View = "compare" | "research" | "methodology";
const categories = [
  { id: "games" as const, label: "Jogos", icon: Gamepad2, description: "Frames que fazem diferença." },
  { id: "llms" as const, label: "IA local", icon: BrainCircuit, description: "Do prompt à resposta." },
  { id: "apps" as const, label: "Aplicativos", icon: Clapperboard, description: "Menos espera. Mais criação." },
];
const formatDate = (value: string | null) => value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "Data não informada";

export function MacVersus({ data: initialData, staticPreview = false, previewOffers }: { data: Dataset; staticPreview?: boolean; previewOffers?: VerifiedOffer[] }) {
  const [data, setData] = useState(initialData);
  const [leftId, setLeftId] = useState(data.devices.find(d => d.id === "mbp16-m1pro-16")?.id ?? data.devices[0]?.id ?? "");
  const [rightId, setRightId] = useState(data.devices.find(d => d.id === "mbp16-m1max-64")?.id ?? data.devices[1]?.id ?? "");
  const [leftStorage, setLeftStorage] = useState<number | null>(data.devices.find(d => d.id === "mbp16-m1pro-16")?.storageGb ?? null);
  const [rightStorage, setRightStorage] = useState<number | null>(data.devices.find(d => d.id === "mbp16-m1max-64")?.storageGb ?? null);
  const [category, setCategory] = useState<Category>("games");
  const [view, setView] = useState<View>("compare");
  const [picker, setPicker] = useState<"left" | "right" | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [taskId, setTaskId] = useState("all");
  const [researchTerm, setResearchTerm] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [ready, setReady] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [notice, setNotice] = useState("");
  const [shareFallback, setShareFallback] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const left = params.get("left"), right = params.get("right"), tab = params.get("category");
    const leftDevice = data.devices.find(d => d.id === left);
    const rightDevice = data.devices.find(d => d.id === right);
    if (leftDevice) { setLeftId(leftDevice.id); setLeftStorage(parseStorageSelection(params.get("leftSSD"), leftDevice)); }
    if (rightDevice) { setRightId(rightDevice.id); setRightStorage(parseStorageSelection(params.get("rightSSD"), rightDevice)); }
    if (tab === "games" || tab === "llms" || tab === "apps") setCategory(tab);
    const task = data.workloads.find(w => w.id === params.get("task") && w.category === tab);
    if (task) setTaskId(task.id);
    setReady(true);
  }, [data.devices]);
  useEffect(() => {
    if (!ready) return;
    const url = new URL(window.location.href);
    url.searchParams.set("left", leftId); url.searchParams.set("right", rightId); url.searchParams.set("category", category);
    url.searchParams.set("leftSSD", leftStorage === null ? "unknown" : String(leftStorage));
    url.searchParams.set("rightSSD", rightStorage === null ? "unknown" : String(rightStorage));
    if (taskId === "all") url.searchParams.delete("task"); else url.searchParams.set("task", taskId);
    window.history.replaceState(null, "", url);
  }, [leftId, rightId, leftStorage, rightStorage, category, taskId, ready]);
  useEffect(() => { if (notice) { const timeout = window.setTimeout(() => setNotice(""), 4500); return () => window.clearTimeout(timeout); } }, [notice]);

  useEffect(() => {
    if (!mobileNav) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileNav(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNav]);

  const leftBase = data.devices.find(d => d.id === leftId);
  const rightBase = data.devices.find(d => d.id === rightId);
  const left = leftBase ? { ...leftBase, storageGb: leftStorage } : undefined;
  const right = rightBase ? { ...rightBase, storageGb: rightStorage } : undefined;
  const workloads = useMemo(() => data.workloads.filter(w => w.category === category && (taskId === "all" || w.id === taskId) && `${w.name} ${w.subtitle}`.toLowerCase().includes(query.toLowerCase())), [data.workloads, category, taskId, query]);
  const measuredDeviceIds = useMemo(() => Array.from(new Set(data.benchmarks.map(b => b.deviceId))), [data.benchmarks]);
  const categoryWorkloads = data.workloads.filter(w => w.category === category);
  const getRecord = (device: Device | undefined, workloadId: string) => device ? recordForConfiguration(data, { deviceId: device.id, storageGb: device.storageGb }, workloadId) : undefined;
  const pairedCount = workloads.filter(w => getRecord(left, w.id) && getRecord(right, w.id)).length;
  const matchingRecords = workloads.flatMap(w => [getRecord(left, w.id), getRecord(right, w.id)]).filter(Boolean);
  const selectedTask = data.workloads.find(w => w.id === taskId);
  const selectedDetail = data.workloads.find(w => w.id === detailId);
  const availableLlmPreset = data.devices.some(d => d.id === "mba13-m1-16") && data.devices.some(d => d.id === "mbp14-m1pro-16");

  function handleTabKey(event: React.KeyboardEvent<HTMLDivElement>) {
    const index = categories.findIndex(item => item.id === category);
    const nextIndex = event.key === "ArrowRight" || event.key === "ArrowDown" ? (index + 1) % categories.length
      : event.key === "ArrowLeft" || event.key === "ArrowUp" ? (index + categories.length - 1) % categories.length
      : event.key === "Home" ? 0 : event.key === "End" ? categories.length - 1 : null;
    if (nextIndex === null) return;
    event.preventDefault(); const next = categories[nextIndex].id;
    setCategory(next); setTaskId("all"); setQuery(""); document.getElementById(`tab-${next}`)?.focus();
  }
  function navigate(next: View) { setView(next); setMobileNav(false); window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }); }
  async function share() {
    const url = new URL(window.location.href);
    url.searchParams.set("left", leftId); url.searchParams.set("right", rightId); url.searchParams.set("category", category);
    url.searchParams.set("leftSSD", leftStorage === null ? "unknown" : String(leftStorage));
    url.searchParams.set("rightSSD", rightStorage === null ? "unknown" : String(rightStorage));
    if (taskId === "all") url.searchParams.delete("task"); else url.searchParams.set("task", taskId);
    try { await navigator.clipboard.writeText(url.toString()); setNotice("Link da comparação copiado."); }
    catch { setShareFallback(url.toString()); }
  }
  function exportCsv() {
    const selectionData = datasetForSelections(data, [{ deviceId: leftId, storageGb: leftStorage }, { deviceId: rightId, storageGb: rightStorage }]);
    selectionData.workloads = workloads;
    const blob = new Blob([buildComparisonCsv(selectionData, selectionData.devices[0].id, selectionData.devices[1].id, category)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.href = url; link.download = `macversus-${category}-${leftId}-vs-${rightId}.csv`; document.body.append(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000); setNotice("Comparação exportada com condições e fontes.");
  }
  function chooseDevice(side: "left" | "right", id: string, storage?: number | null) {
    const device = data.devices.find(d => d.id === id);
    if (!device) return;
    if (side === "left") { setLeftId(id); setLeftStorage(storage === undefined ? device.storageGb : storage); }
    else { setRightId(id); setRightStorage(storage === undefined ? device.storageGb : storage); }
  }
  function setLlmPreset() { chooseDevice("left", "mba13-m1-16"); chooseDevice("right", "mbp14-m1pro-16"); setCategory("llms"); setTaskId("llama2-q4-generation"); setQuery(""); setNotice("Comparação de IA: MacBook Air M1 e MacBook Pro M1 Pro."); }
  function userExample() { chooseDevice("left", "mba13-2026-m5-c10-g10-r24", 1024); chooseDevice("right", "mbp16-m1max-64", 1024); setCategory("games"); setTaskId("crimson-desert-1080-medium"); setQuery(""); }
  function maxExample() { chooseDevice("left", "mbp16-2021-m1-max-c10-g24-r64", 1024); chooseDevice("right", "mbp16-m2max-32", 1024); setTaskId("all"); setQuery(""); }
  function exploreSelectedTask() { setResearchTerm(selectedTask ? `${selectedTask.name} ${selectedTask.subtitle}` : query); navigate("research"); }
  async function refreshData() {
    if (staticPreview) { window.location.reload(); return; }
    setRefreshing(true);
    try {
      const response = await fetch("/api/benchmarks", { cache: "no-store" });
      if (!response.ok) throw new Error("Não foi possível consultar a base.");
      const updated = await response.json() as Dataset;
      if (!Array.isArray(updated.devices) || !Array.isArray(updated.benchmarks) || !Array.isArray(updated.workloads) || !Array.isArray(updated.sources)) throw new Error("Resposta inválida.");
      setData(updated); setNotice(`Base consultada: ${updated.benchmarks.length} medições. Revisão publicada em ${formatDate(updated.updatedAt)}.`);
    } catch { setNotice("Não foi possível atualizar agora. A base carregada continua disponível."); }
    finally { setRefreshing(false); }
  }

  if (!left || !right) return <main className="empty-state"><Layers3 size={32} /><h1>O catálogo está sendo preparado.</h1><p>Não há configurações disponíveis para comparar.</p></main>;

  return <div className="app-shell">
    <a href="#main-content" className="skip-link">Pular para o conteúdo</a>
    {mobileNav && <button className="nav-scrim" aria-label="Fechar navegação" onClick={() => setMobileNav(false)} />}
    <aside id="app-navigation" className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}><button className="mobile-nav-close icon-button" onClick={() => setMobileNav(false)} aria-label="Fechar navegação"><X size={19} /></button>
      <button className="brand" onClick={() => navigate("compare")} aria-label="MacVersus, início"><img className="brand-asset" src={publicAssetPath("/brand/macversus-icon.svg")} alt="" width="42" height="42" /><span>Mac<span>Versus</span></span></button>
      <span className="sidebar-eyebrow">SEU PRÓXIMO MAC</span>
      <nav aria-label="Navegação principal"><button className={view === "compare" ? "active" : ""} onClick={() => navigate("compare")}><BarChart3 size={19} /><span>Comparador</span><ChevronRight size={15} /></button><button className={view === "research" ? "active" : ""} onClick={() => navigate("research")}><Globe2 size={19} /><span>Explorar fontes</span></button><button className={view === "methodology" ? "active" : ""} onClick={() => navigate("methodology")}><BookOpen size={19} /><span>Metodologia</span></button></nav>
      <div className="sidebar-bottom"><div className="sidebar-note"><span className="sidebar-note-icon"><ShieldCheck size={21} /></span><strong>Menos achismo.<br />Mais evidência.</strong><p>Cada resultado tem uma fonte. Cada comparação tem contexto.</p><button onClick={() => navigate("methodology")}>Entenda os dados<ArrowUpRight size={14} /></button></div><a className="sidebar-github" href="https://github.com/Benfic4rthur/MacVersus" target="_blank" rel="noopener noreferrer"><GitBranch size={17} /><span>MacVersus no GitHub</span><ArrowUpRight size={14} /></a><span className="sidebar-version">Feito para escolher melhor. <span>v0.1</span></span></div>
    </aside>
    <div className="app-main"><header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="Abrir navegação" aria-expanded={mobileNav} aria-controls="app-navigation"><Menu size={21} /></button><span className="topbar-breadcrumb">MacVersus<ChevronRight size={13} /><strong>{view === "compare" ? "Comparador" : view === "research" ? "Explorar fontes" : "Metodologia"}</strong></span></div><div className="topbar-actions"><button className="icon-button" onClick={refreshData} disabled={refreshing} aria-label="Atualizar base de medições" title="Consultar a versão mais recente da base revisada"><RefreshCw size={16} className={refreshing ? "spinning" : ""} /></button><span className="evidence-status"><i />Fontes rastreáveis</span><button className="outline-button share-button" onClick={share}><Share2 size={15} /><span>Compartilhar</span></button></div></header>
      <main id="main-content" className={`content view-${view}`}>
        {staticPreview && <div className="preset-notice" role="note"><Info size={17} /><div><strong>{STATIC_PREVIEW_NOTICE}</strong></div></div>}
        {view === "compare" && <><section className="hero"><div><div className="section-eyebrow"><span className="beta-badge">BETA</span> COMPARAÇÃO DE CONFIGURAÇÕES</div><h1>Compare configurações<span>.</span></h1><p>Escolha chip, GPU, memória e SSD. Consulte os testes da sua tarefa, com a fonte ao lado.</p></div><div className="hero-data"><span className="hero-data-icon"><Layers3 size={23} /></span><div><strong>{data.devices.length}</strong><span>configurações no catálogo</span></div><div className="hero-data-divider" /><div><strong>{data.benchmarks.length}</strong><span>medições com fonte</span></div></div></section>
          <section className="machine-comparison" aria-label="MacBooks selecionados"><DeviceCard device={left} side="left" onPick={() => setPicker("left")} storageGb={leftStorage} storageOptions={getStorageOptions(left)} onStorageChange={setLeftStorage} /><button className="swap-button" onClick={() => { setLeftId(rightId); setRightId(leftId); setLeftStorage(rightStorage); setRightStorage(leftStorage); }} aria-label="Trocar posições dos Macs" title="Trocar posições"><ArrowLeftRight size={20} /></button><DeviceCard device={right} side="right" onPick={() => setPicker("right")} storageGb={rightStorage} storageOptions={getStorageOptions(right)} onStorageChange={setRightStorage} /></section>
          <div className="example-presets"><span>Experimente</span><button onClick={userExample}>Air M5 24 GB × M1 Max 64 GB</button><button onClick={maxExample}>M1 Max GPU 24 × M2 Max GPU 38</button><button onClick={setLlmPreset}>IA local com medições</button></div>
          {(leftStorage !== leftBase?.storageGb || rightStorage !== rightBase?.storageGb) && <p className="configuration-note"><Info size={14} />SSD personalizado: só entram resultados medidos com essa capacidade. Testes de outro SSD não são reaproveitados.</p>}
          <RadarProfile left={left} right={right} />
          <section className="results-section"><div className="results-heading"><div><div className="section-eyebrow">BENCHMARKS</div><h2>Resultados por tarefa.</h2></div><button className="text-button export-button" onClick={exportCsv}><Download size={16} />Exportar dados</button></div>
            <div className="results-toolbar"><div className="category-tabs" role="tablist" aria-label="Categoria de benchmark" onKeyDown={handleTabKey}>{categories.map(({ id, label, icon: Icon }) => <button role="tab" id={`tab-${id}`} aria-controls="benchmark-results" aria-selected={category === id} tabIndex={category === id ? 0 : -1} className={category === id ? "active" : ""} key={id} onClick={() => { setCategory(id); setTaskId("all"); setQuery(""); }}><Icon size={18} />{label}</button>)}</div><label className="search-field workload-search"><Search size={16} /><span className="sr-only">Filtrar testes</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filtrar testes..." />{query && <button onClick={() => setQuery("")} aria-label="Limpar filtro"><X size={14} /></button>}</label></div>
            <div className="task-selector"><label>Escolha o jogo, modelo ou aplicativo<select aria-label="Escolher tarefa" value={taskId} onChange={event => { setTaskId(event.target.value); setQuery(""); }}><option value="all">Todos os testes desta categoria</option>{categoryWorkloads.map(w => <option value={w.id} key={w.id}>{w.name} · {w.subtitle}</option>)}</select></label><button className="text-button" onClick={exploreSelectedTask}><Globe2 size={14} />Buscar novas fontes</button></div>
            {selectedTask?.sourceUrl && <a className="task-source-link" href={selectedTask.sourceUrl} target="_blank" rel="noopener noreferrer">Referência do aplicativo ou protocolo<ArrowUpRight size={12} /></a>}
            {category === "llms" && pairedCount === 0 && availableLlmPreset && <div className="preset-notice"><BrainCircuit size={19} /><div><strong>Há uma comparação de IA disponível na base.</strong><span>MacBook Air M1 (16 GB) e MacBook Pro 14" M1 Pro (16 GB).</span></div><button onClick={setLlmPreset}>Ver comparação<ArrowRight size={15} /></button></div>}
            <div className="results-layout"><div id="benchmark-results" role="tabpanel" tabIndex={0} aria-labelledby={`tab-${category}`} className="benchmark-grid" key={category}>{workloads.map(workload => <BenchmarkCard key={workload.id} workload={workload} left={getRecord(left, workload.id)} right={getRecord(right, workload.id)} leftDevice={left} rightDevice={right} onDetails={() => setDetailId(workload.id)} />)}{workloads.length === 0 && <div className="empty-state"><Search size={29} /><h3>Nenhum teste encontrado</h3><p>Tente outro termo ou explore novas fontes para esta categoria.</p><button className="outline-button" onClick={exploreSelectedTask}>Pesquisar fontes<ArrowUpRight size={15} /></button></div>}</div>
              <aside className="context-column"><div className="context-card"><span className="context-icon"><FileCheck2 size={21} /></span><h3>Sobre estes resultados</h3><p>Uma medição só representa o hardware e as condições publicados na fonte.</p><div className="coverage-row"><span>Medições nesta seleção</span><strong>{matchingRecords.length}</strong></div><div className="coverage-row"><span>Testes com os dois Macs</span><strong>{pairedCount}</strong></div><button onClick={() => navigate("methodology")}>Como comparamos<ArrowUpRight size={14} /></button></div><button className="discover-card" onClick={() => navigate("research")}><span className="discover-icon"><Globe2 size={22} /></span><strong>Está faltando um teste?</strong><span>Encontre publicações sobre o seu jogo, modelo de IA ou aplicativo.</span><b>Explorar fontes<ArrowRight size={15} /></b></button></aside>
            </div>
          </section>
          <OffersPanel left={left} right={right} staticPreview={staticPreview} previewOffers={previewOffers} />
          <section className="specs-section"><div className="results-heading"><div><div className="section-eyebrow">FICHA TÉCNICA</div><h2>Especificações.</h2></div><span className="specs-origin"><CheckCheck size={15} />Especificações da Apple</span></div><SpecsTable left={left} right={right} /></section>
        </>}
        {view === "research" && <><div className="research-selection-bar"><div><SlidersHorizontal size={17} /><span>Comparação atual</span></div><button onClick={() => setPicker("left")}><i className="dot-left" />{left.chip}<ChevronRight size={13} /></button><button onClick={() => setPicker("right")}><i className="dot-right" />{right.chip}<ChevronRight size={13} /></button><label><span className="sr-only">Categoria da pesquisa</span><select value={category} onChange={e => setCategory(e.target.value as Category)}>{categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label></div><ResearchPanel key={`${left.id}-${left.storageGb}-${right.id}-${right.storageGb}-${researchTerm}`} left={left} right={right} category={category} initialQuery={researchTerm} staticPreview={staticPreview} publishedData={data} /></>}
        {view === "methodology" && <Methodology data={data} />}
        <footer className="page-footer"><span><span className="footer-mark">M</span>MacVersus <span>·</span> Comparações com fonte</span><span><Clock3 size={13} />Base revisada em {formatDate(data.updatedAt)}</span></footer>
      </main>
    </div>
    <DevicePicker devices={data.devices} measuredDeviceIds={measuredDeviceIds} selectedId={picker === "left" ? leftId : rightId} open={picker !== null} onClose={() => setPicker(null)} onSelect={id => chooseDevice(picker === "left" ? "left" : "right", id)} />
    <Dialog open={!!selectedDetail} title={selectedDetail?.name ?? "Detalhes do teste"} onClose={() => setDetailId(null)} wide>{selectedDetail && <BenchmarkDetails workload={selectedDetail} left={left} right={right} data={data} />}</Dialog>
    <Dialog open={!!shareFallback} title="Compartilhar comparação" onClose={() => setShareFallback("")}><p className="dialog-description">Copie o link abaixo para abrir estes modelos e esta categoria.</p><label className="share-fallback-label">Link da comparação<input value={shareFallback} readOnly onFocus={event => event.target.select()} /></label></Dialog>
    <div className={`toast ${notice ? "toast-visible" : ""}`} role="status" aria-live="polite">{notice && <><Check size={16} />{notice}</>}</div>
  </div>;
}

function SpecsTable({ left, right }: { left: Device; right: Device }) {
  const rows: { label: string; value: (d: Device) => React.ReactNode }[] = [
    { label: "Chip", value: d => d.chip }, { label: "Arquitetura", value: d => isIntel(d) ? "Intel" : "Apple Silicon" },
    { label: "CPU", value: d => `${d.cpuCores} núcleos` }, { label: "GPU", value: d => gpuLabel(d) },
    { label: "Memória RAM", value: d => `${d.memoryGb} GB${isIntel(d) ? "" : " unificada"}` },
    { label: "Memória da GPU", value: d => isIntel(d) ? d.gpuMemoryGb ? `${d.gpuMemoryGb} GB dedicada` : "Compartilhada / não informada" : "Compartilhada com a memória unificada" },
    { label: "Largura de banda", value: d => d.bandwidthGbps ? `${d.bandwidthGbps} GB/s` : "Não informada" },
    { label: "Armazenamento", value: d => d.storageGb ? `${d.storageGb >= 1024 ? `${d.storageGb / 1024} TB` : `${d.storageGb} GB`} SSD` : "Não informado" },
    { label: "Tela", value: d => `${d.screenInches.toLocaleString("pt-BR")}"` }, { label: "Ano do modelo", value: d => d.year },
  ];
  return <div className="specs-table-wrap"><table className="specs-table"><thead><tr><th scope="col">Especificação</th><th scope="col"><i className="dot-left" />{left.chip}<span>{left.family} · {left.memoryGb} GB</span></th><th scope="col"><i className="dot-right" />{right.chip}<span>{right.family} · {right.memoryGb} GB</span></th></tr></thead><tbody>{rows.map(row => <tr key={row.label}><th scope="row">{row.label}</th><td>{row.value(left)}</td><td>{row.value(right)}</td></tr>)}<tr className="source-specs-row"><th scope="row">Fonte oficial</th><td><a href={left.specUrl} target="_blank" rel="noopener noreferrer">Ficha técnica<ArrowUpRight size={13} /></a></td><td><a href={right.specUrl} target="_blank" rel="noopener noreferrer">Ficha técnica<ArrowUpRight size={13} /></a></td></tr></tbody></table></div>;
}

function BenchmarkDetails({ workload, left, right, data }: { workload: Workload; left: Device; right: Device; data: Dataset }) {
  const leftRecord = recordForConfiguration(data, { deviceId: left.id, storageGb: left.storageGb }, workload.id);
  const rightRecord = recordForConfiguration(data, { deviceId: right.id, storageGb: right.storageGb }, workload.id);
  const comparison = compareBenchmarks(leftRecord, rightRecord, workload);
  return <><p className="dialog-description">{workload.description}</p><div className={`detail-comparability ${comparison.status}`}><Info size={17} /><p>{comparison.explanation}</p></div><div className="detail-columns">{([{ device: left, record: leftRecord, side: "left" }, { device: right, record: rightRecord, side: "right" }] as { device: Device; record?: Benchmark; side: string }[]).map(({ device, record, side }) => {
    const source = data.sources.find(s => s.id === record?.sourceId);
    return <section className="detail-column" key={side}><div className="detail-device"><i className={`dot-${side}`} /><h3>{device.chip}</h3><span>{device.memoryGb} GB RAM</span></div>{record ? <><strong className="detail-value">{formatValue(record.value, workload.metric)}</strong><span className={`quality-label ${record.quality}`}>{record.quality === "documented" ? "Protocolo documentado" : "Condições parcialmente documentadas"}</span><p className="reported-hardware">{record.reportedHardware}</p><dl className="conditions-list">{Object.entries(record.conditions).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>{record.missingFields.length > 0 && <div className="missing-fields"><strong>A fonte não informa</strong><p>{record.missingFields.join("; ")}.</p></div>}{record.notes && <p className="record-notes">{record.notes}</p>}{source && <div className="detail-source"><span>PUBLICAÇÃO ORIGINAL</span><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<ExternalLink size={14} /></a><p>{source.publisher} · {formatDate(source.publishedAt)}</p><small>Consultada em {formatDate(source.accessedAt)}</small></div>}</> : <div className="detail-no-data"><Search size={23} /><h4>Ainda sem medição</h4><p>Não há um resultado publicado na base para esta configuração e este teste. Valores de outros Macs não foram usados como estimativa.</p></div>}</section>;
  })}</div></>;
}

function Methodology({ data }: { data: Dataset }) {
  const principles = [
    { icon: Layers3, number: "01", title: "A configuração é exata.", text: "Chip, núcleos, memória, SSD e tamanho do Mac fazem parte do resultado. Uma medição de 16 GB não é atribuída automaticamente a um Mac de 32 GB." },
    { icon: SlidersHorizontal, number: "02", title: "A tarefa precisa ser a mesma.", text: "Jogos exigem resolução e preset. IA exige modelo, quantização e runtime. Renderizações exigem a mesma cena, versão e método de execução." },
    { icon: FileCheck2, number: "03", title: "A origem fica à vista.", text: "Cada medição aponta para a publicação original. Dados ausentes continuam ausentes. O comparador não inventa FPS, tokens por segundo ou tempos." },
  ];
  return <section className="methodology"><div className="section-eyebrow"><ShieldCheck size={15} /> TRANSPARÊNCIA POR PADRÃO</div><h1>Como os dados entram<br /><span>na comparação.</span></h1><p className="methodology-intro">O MacVersus organiza testes publicados para ajudar você a comparar. Estes são os critérios que mantêm os resultados úteis.</p><div className="principle-grid">{principles.map(({ icon: Icon, number, title, text }) => <article key={number}><div><span className="principle-icon"><Icon size={23} /></span><span className="principle-number">{number}</span></div><h2>{title}</h2><p>{text}</p></article>)}</div><section className="reading-guide"><h2>Como interpretar os resultados</h2><div><span className="guide-status comparable">Comparável</span><p>O mesmo protocolo está documentado para as duas configurações. A diferença percentual se aplica somente a esse teste.</p></div><div><span className="guide-status partial">Contexto parcial</span><p>Há valores publicados, mas faltam condições equivalentes. Eles aparecem como referência, sem declarar vencedor ou vantagem.</p></div><div><span className="guide-status missing">Sem medição</span><p>A base ainda não possui esse resultado. Mais núcleos ou mais memória não são usados para fabricar uma estimativa.</p></div></section><div className="methodology-note"><Info size={21} /><p><strong>Publicações de terceiros, com limites claros.</strong> Os testes não foram executados pelo MacVersus. Resultados antigos continuam identificados pelas datas e versões de origem. Fontes de comunidade são identificadas como tal, e a busca na web descobre publicações sem converter seus resumos em benchmarks automaticamente.</p></div><section className="original-sources"><div className="results-heading"><div><div className="section-eyebrow">CONFIRA VOCÊ MESMO</div><h2>Publicações que sustentam a base.</h2></div><span className="sources-total">{data.sources.length} fontes</span></div><div className="original-source-grid">{data.sources.map(source => <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer"><div><span>{source.publisher}</span><ArrowUpRight size={17} /></div><h3>{source.title}</h3><p>Publicação: {formatDate(source.publishedAt)}</p><small>Consulta: {formatDate(source.accessedAt)}</small></a>)}</div></section></section>;
}
