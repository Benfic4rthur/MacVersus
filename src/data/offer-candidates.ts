import type { ReviewedOfferCandidate } from "@/lib/offer-types";

/** International listings stay outside the verified BRL ranking. */
export const reviewedOfferCandidates: ReviewedOfferCandidate[] = [
  {
    title: 'MacBook Pro 16" 2021 M1 Max, GPU 32, 64 GB RAM, SSD 1 TB, usado',
    url: "https://www.ebay.com/itm/840059639965",
    marketplace: "eBay", condition: "used", reviewStatus: "listing-reviewed",
    hardware: { family: "MacBook Pro", screenInches: 16.2, year: 2021, chip: "M1 Max", cpuCores: 10, gpuCores: 32, memoryGb: 64, storageGb: 1024 },
    snippet: "Anúncio do vendedor advbroadcastsystems, com compra direta e condição usada. Configuração e preço foram conferidos na página.",
    reason: "Candidato internacional revisado. Envio ao Brasil, frete para o seu CEP, impostos e custo final não foram confirmados. Confira também o preço atual. Não participa do ranking em reais.",
    observedPrice: { amount: 1350, currency: "USD", checkedAt: "2026-10-27T15:36:53Z" },
    evidence: "O anúncio informa M1 Max, GPU 32, RAM 64 GB, SSD 1 TB, ano 2021 e tela de 16 polegadas. CPU 10 e diagonal de 16,2 polegadas correspondem à ficha Apple do modelo (https://support.apple.com/en-us/111901). A frequência incorreta de 4,50 GHz do vendedor não foi utilizada. A página mostrava frete para destino americano 50307, sem confirmação de entrega ou tributação brasileira.",
  },
];
