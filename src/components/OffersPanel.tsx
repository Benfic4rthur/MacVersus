"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, BadgeCheck, ChevronDown, Clock3, ExternalLink, KeyRound, LoaderCircle, RefreshCw, Search, ShoppingBag, Truck } from "lucide-react";
import type { Device } from "@/lib/types";
import type { OfferConditionFilter, OfferDiscoveryResponse, OffersResponse, VerifiedOffer } from "@/lib/offer-types";
import { staticOfferDiscovery, staticOffers } from "@/lib/static-preview";
import { offerSearchLinks } from "@/lib/marketplace-links";
import "./offers-discovery.css";

const EMPTY_OFFERS: VerifiedOffer[] = [];

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
const conditionLabels = { new: "Novo", used: "Usado", refurbished: "Recondicionado", "open-box": "Caixa aberta", unknown: "Não informada" };
const storageLabel = (value: number | null) => value ? value >= 1024 ? `${value / 1024} TB` : `${value} GB` : "SSD não informado";
const checkedAt = (value: string) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(value));

function useOffers(device: Device, staticPreview: boolean, previewOffers: VerifiedOffer[], condition: OfferConditionFilter) {
  const deviceId = device.id, storageGb = device.storageGb;
  const [result, setResult] = useState<OffersResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const load = useCallback(async (method: "GET" | "POST" = "GET") => {
    controller.current?.abort();
    if (staticPreview) { setResult(staticOffers(previewOffers, device, Date.now(), condition)); setLoading(false); setError(""); return; }
    const request = new AbortController(); controller.current = request;
    setLoading(true); setError(""); setResult(null);
    try {
      const params = new URLSearchParams({ deviceId, condition, storageGb: storageGb === null ? "unknown" : String(storageGb) });
      const response = await fetch(method === "GET" ? `/api/offers?${params}` : "/api/offers", {
        method, signal: request.signal, cache: "no-store",
        ...(method === "POST" ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deviceId, storageGb, condition }) } : {}),
      });
      const body = await response.json();
      if (request.signal.aborted) return;
      if (!response.ok) throw new Error(body.error ?? "Não foi possível consultar os anúncios.");
      if (body.deviceId !== deviceId || body.storageGb !== storageGb || body.condition !== condition || !Array.isArray(body.offers)) throw new Error("A consulta não retornou a configuração solicitada.");
      setResult(body as OffersResponse);
    } catch (cause) {
      if (!request.signal.aborted) setError(cause instanceof Error ? cause.message : "Não foi possível consultar os anúncios.");
    } finally { if (!request.signal.aborted) setLoading(false); }
  }, [deviceId, storageGb, staticPreview, previewOffers, condition]);
  useEffect(() => { void load(); const interval = staticPreview ? window.setInterval(() => { void load(); }, 60000) : null; return () => { controller.current?.abort(); if (interval !== null) window.clearInterval(interval); }; }, [load, staticPreview]);
  const currentResult = result?.deviceId === deviceId && result.storageGb === storageGb && result.condition === condition ? result : null;
  return { result: currentResult, loading, error, refresh: () => load("POST"), retry: () => load("GET") };
}

type OffersState = ReturnType<typeof useOffers>;

export function OffersPanel({ left, right, staticPreview = false, previewOffers = EMPTY_OFFERS }: { left: Device; right: Device; staticPreview?: boolean; previewOffers?: VerifiedOffer[] }) {
  const [condition, setCondition] = useState<OfferConditionFilter>("all");
  const [token, setToken] = useState("");
  const leftState = useOffers(left, staticPreview, previewOffers, condition);
  const rightState = useOffers(right, staticPreview, previewOffers, condition);
  const [previewMessage, setPreviewMessage] = useState("");
  const busy = leftState.loading || rightState.loading;
  return <section className="offers-section" aria-labelledby="offers-heading">
    <div className="results-heading"><div><div className="section-eyebrow"><ShoppingBag size={13} /> NOVOS E USADOS</div><h2 id="offers-heading">Onde comprar.</h2></div><button className="outline-button offers-refresh" disabled={busy} onClick={() => { if (staticPreview) setPreviewMessage("Esta prévia não consulta preços ao vivo. Abra os links das lojas para conferir o preço atual; a verificação online está na versão completa."); void Promise.allSettled([leftState.refresh(), rightState.refresh()]); }}>{busy ? <LoaderCircle className="spinning" size={15} /> : <RefreshCw size={15} />}<span>{busy ? "Consultando..." : "Atualizar preços"}</span></button></div>
    <p className="offers-intro">Até três menores preços à vista, em reais, entre anúncios verificados da configuração exata. Novos e usados entram conforme o filtro; o frete aparece separadamente.</p>
    <div className="offers-market-filters"><label>Condição<select value={condition} onChange={event => setCondition(event.target.value as OfferConditionFilter)}><option value="all">Todas</option><option value="new">Novos</option><option value="used">Usados e seminovos</option></select></label><p>OLX, Mercado Livre, eBay e Shopee também entram na pesquisa de anúncios.</p></div>
    {!staticPreview && <details className="research-access offers-search-access"><summary><KeyRound size={14} />Acesso à pesquisa protegida</summary><label htmlFor="offers-search-token">Token de acesso, se solicitado pelo servidor</label><input id="offers-search-token" type="password" autoComplete="off" value={token} onChange={event => setToken(event.target.value)} placeholder="Opcional" /><p>Usado somente nesta página ao pesquisar novos anúncios.</p></details>}
    {previewMessage && <p className="offers-intro" role="status">{previewMessage}</p>}
    <div className="offers-columns"><DeviceOffers device={left} side="left" state={leftState} staticPreview={staticPreview} condition={condition} token={token} /><DeviceOffers device={right} side="right" state={rightState} staticPreview={staticPreview} condition={condition} token={token} /></div>
    <p className="offers-footnote"><Clock3 size={13} />Ofertas com verificação recente. Preço e disponibilidade podem mudar no site do vendedor.</p>
  </section>;
}

function DeviceOffers({ device, side, state, staticPreview, condition, token }: { device: Device; side: "left" | "right"; state: OffersState; staticPreview: boolean; condition: OfferConditionFilter; token: string }) {
  const { result, loading, error } = state;
  return <div className={`offers-device offers-${side}`}>
    <div className="offers-device-heading"><span className={`dot-${side}`} /><div><h3>{device.family} · {device.chip}</h3><p>{device.gpuCores !== null ? `${device.gpuCores} GPU` : `${device.gpuName ?? "GPU integrada"}${device.gpuMemoryGb ? ` (${device.gpuMemoryGb} GB)` : ""}`} <span>·</span> {device.memoryGb} GB RAM <span>·</span> {storageLabel(device.storageGb)}</p></div><span className="offers-result-count">{result ? `${result.offers.length}/3` : ""}</span></div>
    {loading && <div className="offers-loading" role="status"><LoaderCircle className="spinning" size={22} /><strong>Consultando anúncios verificados</strong><p>Conferindo esta configuração e a validade dos preços.</p></div>}
    {!loading && error && <div className="offers-empty offers-error" role="alert"><ShoppingBag size={27} /><h4>A consulta não foi concluída.</h4><p>{error}</p><button className="outline-button" onClick={() => void state.retry()}>Tentar novamente</button></div>}
    {!loading && !error && result && <>
      {result.offers.length > 0 ? <div className="offer-cards">{result.offers.slice(0, 3).map((offer, index) => <OfferCard key={offer.id} offer={offer} rank={index + 1} />)}</div> : <div className="offers-empty"><span className="offers-empty-icon">{result.state === "needs-storage" ? <ShoppingBag size={27} /> : <Search size={27} />}</span><h4>{result.state === "needs-storage" ? "Escolha o SSD para buscar ofertas." : "Ainda sem uma oferta exata verificada."}</h4><p>{result.message}</p>{result.state === "needs-storage" && <span className="offers-ssd-hint">A capacidade pode ser selecionada no cartão do Mac.</span>}</div>}
      {result.offers.length > 0 && <p className="offers-verification-window"><BadgeCheck size={13} />Menores preços entre ofertas conferidas nas últimas {result.verificationMaxAgeHours} horas.</p>}
      {result.excludedStaleCount > 0 && <p className="offers-stale-note">{result.excludedStaleCount} {result.excludedStaleCount === 1 ? "anúncio ficou fora da lista por verificação vencida" : "anúncios ficaram fora da lista por verificação vencida"}.</p>}
      {result.refresh && result.refresh.attempted > 0 && <p className="offers-refresh-result">{result.refresh.updated} {result.refresh.updated === 1 ? "anúncio atualizado" : "anúncios atualizados"}{result.refresh.failed > 0 ? `. ${result.refresh.failed} sem confirmação na última consulta.` : "."}</p>}
    </>}
    <MarketplaceDiscovery device={device} staticPreview={staticPreview} condition={condition} token={token} />
  </div>;
}

function OfferCard({ offer, rank }: { offer: VerifiedOffer; rank: number }) {
  return <article className={`offer-card ${rank === 1 ? "first-offer" : ""}`}>
    <div className="offer-card-top"><span className="offer-rank">{String(rank).padStart(2, "0")}</span><div><strong>{offer.store}</strong>{offer.seller && offer.seller !== offer.store && <span>{offer.seller}</span>}</div><span className="offer-condition">{conditionLabels[offer.condition]}</span></div>
    <h4>{offer.title}</h4><div className="offer-price"><strong>{money.format(offer.cashPrice)}</strong><span>{offer.paymentMethod} · BRL</span></div>
    <div className="offer-shipping"><Truck size={13} /><span>{offer.shippingPrice === null ? "Frete a consultar" : offer.shippingPrice === 0 ? "Frete grátis" : `Frete: ${money.format(offer.shippingPrice)}`}</span></div>{offer.shippingNote && <p className="offer-shipping-note">{offer.shippingNote}</p>}
    <details className="offer-evidence"><summary><BadgeCheck size={13} />Configuração conferida<ChevronDown size={12} /></summary><p>{offer.evidence}</p><span>{offer.hardware.year} · {offer.hardware.cpuCores} CPU · {offer.hardware.memoryGb} GB RAM · {storageLabel(offer.hardware.storageGb)} SSD</span></details>
    <div className="offer-card-bottom"><span><Clock3 size={11} />{checkedAt(offer.verifiedAt)}</span><a href={offer.url} target="_blank" rel="noopener noreferrer">Ver anúncio<ExternalLink size={13} /></a></div>
  </article>;
}

function MarketplaceDiscovery({ device, staticPreview, condition, token }: { device: Device; staticPreview: boolean; condition: OfferConditionFilter; token: string }) {
  const [result, setResult] = useState<OfferDiscoveryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    controller.current?.abort(); setError(""); setLoading(false);
    const showSnapshot = () => { const snapshot = staticOfferDiscovery(device, condition); setResult(snapshot.candidates.length ? snapshot : null); };
    showSnapshot();
    const interval = staticPreview ? window.setInterval(showSnapshot, 60000) : null;
    return () => { controller.current?.abort(); if (interval !== null) window.clearInterval(interval); };
  }, [device.id, device.storageGb, condition, staticPreview]);
  const currentResult = result?.deviceId === device.id && result.storageGb === device.storageGb && result.condition === condition ? result : null;
  const links = currentResult?.searchLinks ?? offerSearchLinks(device, device.storageGb, condition);
  async function discover() {
    if (staticPreview) return;
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    setLoading(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/offers", {
        method: "POST", signal: request.signal,
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ action: "discover", deviceId: device.id, storageGb: device.storageGb, condition }),
      });
      const body = await response.json();
      if (request.signal.aborted) return;
      if (!response.ok) throw new Error(body.error ?? "Não foi possível pesquisar novos anúncios.");
      if (body.deviceId !== device.id || body.storageGb !== device.storageGb || body.condition !== condition || !Array.isArray(body.candidates)) throw new Error("A pesquisa retornou uma resposta inválida.");
      setResult(body as OfferDiscoveryResponse);
    } catch (cause) {
      if (!request.signal.aborted) setError(cause instanceof Error ? cause.message : "Não foi possível pesquisar os anúncios.");
    } finally { if (!request.signal.aborted) setLoading(false); }
  }
  return <section className="offers-marketplace-tools" aria-label={`Pesquisar anúncios para ${device.chip}`}>
    <div className="offer-discovery-links"><span>Pesquisar nos marketplaces</span><div>{links.map(link => <a href={link.url} target="_blank" rel="noopener noreferrer" key={link.url}>{link.label}<ArrowUpRight size={13} /></a>)}</div><small>Resultados de busca precisam de conferência. No eBay, confira a moeda, o frete e os custos de importação no anúncio.</small></div>
    {!staticPreview && <button className="outline-button offer-discovery-button" onClick={() => void discover()} disabled={loading}>{loading ? <LoaderCircle size={15} className="spinning" /> : <Search size={15} />}{loading ? "Pesquisando anúncios..." : "Pesquisar mais ofertas"}</button>}
    {staticPreview && <p className="offers-static-search-note">Na prévia, os botões abrem a pesquisa diretamente em cada marketplace.</p>}
    {error && <p className="offers-discovery-error" role="alert">{error}</p>}
    {currentResult && <div className="offer-candidates" aria-live="polite"><div className="offer-candidates-heading"><h4>Anúncios para conferir</h4><span>{currentResult.mode === "live" ? "Busca na web" : "Pesquisa externa"}{currentResult.cached ? " · cache" : ""}</span></div><p>{currentResult.message}</p>{currentResult.candidates.length === 0 ? <p className="offers-candidate-empty">Nenhum novo anúncio retornado. Os links dos marketplaces continuam disponíveis acima.</p> : <div className="offer-candidate-list">{currentResult.candidates.map((candidate, index) => <article className="offer-candidate" key={`${candidate.url}-${index}`}><div><span>{candidate.marketplace}</span><small>{candidate.reviewStatus === "listing-reviewed" ? "Página conferida" : "Resultado de busca"}</small></div><a href={candidate.url} target="_blank" rel="noopener noreferrer">{candidate.title}<ArrowUpRight size={14} /></a>{candidate.observedPrice && <p className="candidate-observed-price">Preço observado: <strong>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: candidate.observedPrice.currency }).format(candidate.observedPrice.amount)}</strong><span>{candidate.observedPrice.currency} · {checkedAt(candidate.observedPrice.checkedAt)}</span></p>}<p>{candidate.snippet}</p><p className="candidate-reason">{candidate.reason}</p><small className="candidate-price-context">Fora do ranking em reais. Confira configuração, estado, moeda e frete na página do anúncio.</small></article>)}</div>}</div>}
  </section>;
}
