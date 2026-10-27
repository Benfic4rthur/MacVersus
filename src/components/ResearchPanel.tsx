"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, BookOpen, Globe2, KeyRound, LoaderCircle, Search, ShieldCheck } from "lucide-react";
import type { Category, Dataset, Device, ResearchResponse } from "@/lib/types";

import { staticResearch } from "@/lib/static-preview";

export function ResearchPanel({ left, right, category, initialQuery = "", staticPreview = false, publishedData }: { left: Device; right: Device; category: Category; initialQuery?: string; staticPreview?: boolean; publishedData?: Dataset }) {
  const [query, setQuery] = useState(initialQuery);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchResponse | null>(null);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    controller.current?.abort(); setLoading(false); setResult(null); setError("");
  }, [left.id, left.storageGb, right.id, right.storageGb, category]);

  async function research(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    controller.current?.abort();
    if (staticPreview) {
      setError(""); setLoading(false);
      if (publishedData) setResult(staticResearch(publishedData, left, right, category, query));
      else setError("A base publicada não está disponível nesta prévia.");
      return;
    }
    const request = new AbortController();
    controller.current = request;
    setLoading(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/research", {
        method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ deviceIds: [left.id, right.id], storageGb: [left.storageGb, right.storageGb], category, query: query.trim() }), signal: request.signal,
      });
      const body = await response.json();
      if (request.signal.aborted) return;
      if (!response.ok) throw new Error(body.error ?? "Não foi possível concluir a pesquisa. Tente novamente.");
      setResult(body as ResearchResponse);
    } catch (cause) {
      if (!request.signal.aborted) setError(cause instanceof Error ? cause.message : "Não foi possível acessar a pesquisa.");
    } finally { if (!request.signal.aborted) setLoading(false); }
  }

  return <section className="research-panel">
    <div className="section-eyebrow"><Globe2 size={15} /> PESQUISA DE BENCHMARKS</div><h2>O próximo resultado começa<br />com uma boa fonte.</h2><p className="research-intro">Encontre testes para os Macs selecionados. Abra a publicação original para conferir a configuração e as condições da medição.</p>
    <div className="research-devices"><span><i className="dot-left" />{left.chip} · {left.memoryGb} GB</span><span><i className="dot-right" />{right.chip} · {right.memoryGb} GB</span></div>
    <form onSubmit={research} className="research-form"><label htmlFor="research-query">O que você quer comparar?</label><div className="research-input-row"><div className="search-field"><Search size={19} /><input id="research-query" value={query} onChange={(e) => setQuery(e.target.value)} maxLength={240} placeholder="Ex.: Cyberpunk 2077, Qwen, exportação no Final Cut..." /></div><button className="primary-button" disabled={loading} type="submit">{loading ? <LoaderCircle size={17} className="spinning" /> : <Search size={17} />}{loading ? "Pesquisando..." : staticPreview ? "Pesquisar base" : "Pesquisar fontes"}</button></div><p className="field-help">A categoria e os modelos selecionados também entram na pesquisa.</p>
      {!staticPreview && <details className="research-access"><summary><KeyRound size={14} />Acesso à pesquisa protegida</summary><label htmlFor="research-token">Token de acesso, se solicitado pelo servidor</label><input id="research-token" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Opcional" /><p>O token permanece apenas nesta sessão da página.</p></details>}
    </form>
    {error && <div className="error-message" role="alert">{error}</div>}
    {loading && <div className="research-loading" role="status"><LoaderCircle className="spinning" size={27} /><span>Procurando publicações e condições de teste...</span></div>}
    {result && <div className="research-results" aria-live="polite"><div className="research-result-heading"><h3>{result.mode === "live" ? "Fontes encontradas na web" : "Fontes da base pesquisada"}</h3><span className={`mode-badge ${result.mode === "live" ? "live" : ""}`}>{result.mode === "live" ? "Pesquisa na web" : "Catálogo local"}{result.cached ? " · cache" : ""}</span></div><p className="research-status">{result.message}</p><p className="research-query-label">Pesquisa: <strong>{result.query}</strong></p>
      {result.results.length ? <div className="source-result-list">{result.results.map((item, index) => <a className="source-result" href={item.url} target="_blank" rel="noopener noreferrer" key={`${item.url}-${index}`}><div className="source-result-meta"><span>{item.publisher}</span>{item.publishedAt && <time>{new Date(`${item.publishedAt.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR")}</time>}</div><h4>{item.title}<ArrowUpRight size={17} /></h4><p>{item.snippet}</p><span className="source-url">{new URL(item.url).hostname}</span></a>)}</div> : <div className="empty-state compact"><BookOpen size={27} /><h3>Nenhuma publicação encontrada</h3><p>Tente um nome de jogo, modelo de IA ou aplicativo mais específico.</p></div>}
      {!!result.searchLinks.length && <div className="external-searches"><span>Continue a pesquisa:</span>{result.searchLinks.map(link => <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">{link.label}<ArrowUpRight size={14} /></a>)}</div>}
    </div>}
    {!result && !loading && <div className="research-principle"><ShieldCheck size={22} /><div><strong>Uma fonte encontrada ainda precisa de contexto.</strong><p>Resumos da web não se tornam números no comparador automaticamente. Cada medição precisa de hardware, tarefa, unidade e origem identificáveis.</p></div></div>}
  </section>;
}
