import type { Benchmark, BenchmarkSource, Workload } from "@/lib/types";

// Results transcribed from the publications' own tests. Settings stay attached
// to each observation: a shared game title is not a shared benchmark protocol.
export const expandedGameWorkloads: Workload[] = [
  { id: "shadow-highest-published", category: "games", name: "Shadow of the Tomb Raider", subtitle: "Highest · Resolução indicada em cada teste", metric: "fps", higherIsBetter: true,
    description: "Médias publicadas no preset Highest. The Verge usou 1920 × 1200; Reviewed usou 1920 × 1080. São observações dos Macs indicados, em condições diferentes. Não representam uma comparação controlada." },
  { id: "rise-1200-highest", category: "games", name: "Rise of the Tomb Raider", subtitle: "1920 × 1200 · Highest", metric: "fps", higherIsBetter: true,
    description: "Média publicada pela Digital Trends no preset Highest. Rise of the Tomb Raider é um jogo diferente de Shadow of the Tomb Raider." },
  { id: "rise-1200-medium", category: "games", name: "Rise of the Tomb Raider", subtitle: "1920 × 1200 · Medium", metric: "fps", higherIsBetter: true,
    description: "Média publicada pela Digital Trends no preset Medium, em 1920 × 1200." },
  { id: "warhammer2-1080-ultra", category: "games", name: "Total War: Warhammer II", subtitle: "1080p · Ultra", metric: "fps", higherIsBetter: true,
    description: "Teste próprio da Reviewed em 1920 × 1080, preset Ultra. Não corresponde a Total War: Three Kingdoms." },
  { id: "civilization6-ultra-published", category: "games", name: "Civilization VI", subtitle: "Ultra · Resolução indicada em cada teste", metric: "fps", higherIsBetter: true,
    description: "Médias publicadas no preset Ultra. A Reviewed informa 1080p; a Digital Trends não informa a resolução. A ausência impede uma comparação controlada." },
  { id: "civilization6-medium-published", category: "games", name: "Civilization VI", subtitle: "Medium · Resolução não informada", metric: "fps", higherIsBetter: true,
    description: "Resultado próprio da Digital Trends. A publicação informa o preset, mas não a resolução do teste." },
];

export const expandedGameSources: BenchmarkSource[] = [
  { id: "verge-m1-2021", title: "MacBook Pro 14 e 16 (2021): testes de Shadow of the Tomb Raider", publisher: "The Verge",
    url: "https://www.theverge.com/22751921/apple-macbook-pro-14-16-inch-2021-m1-pro-max-review", publishedAt: "2021-10-29", accessedAt: "2026-10-27" },
  { id: "reviewed-m1max-32", title: "MacBook Pro 16 M1 Max: review e testes próprios", publisher: "Reviewed",
    url: "https://www.reviewed.com/laptops/content/apple-macbook-pro-16-m1-max-review", publishedAt: "2022-01-12", accessedAt: "2026-10-27" },
  { id: "digitaltrends-m1pro-32", title: "MacBook Pro M1 Pro: review e testes próprios", publisher: "Digital Trends",
    url: "https://www.digitaltrends.com/computing/apple-macbook-pro-m1-pro-review/", publishedAt: "2023-11-06", accessedAt: "2026-10-27" },
];

type GameObservation = {
  id: string; deviceId: string; workloadId: string; value: number; sourceId: string;
  reportedHardware: string; testedStorageGb: number; resolution: string; preset: string;
};
const vergePro = { sourceId: "verge-m1-2021", testedStorageGb: 1024, reportedHardware: 'MacBook Pro 16" (2021), M1 Pro, CPU 10, GPU 16, RAM 32 GB, SSD 1 TB' };
const reviewedMax = { sourceId: "reviewed-m1max-32", deviceId: "mbp16-m1max-32", testedStorageGb: 1024, reportedHardware: 'MacBook Pro 16" (2021), M1 Max, CPU 10, GPU 32, RAM 32 GB, SSD 1 TB' };
const digitalPro = { sourceId: "digitaltrends-m1pro-32", deviceId: "mbp16-m1pro-32", testedStorageGb: 2048, reportedHardware: 'MacBook Pro 16" (2021), M1 Pro, CPU 10, GPU 16, RAM 32 GB, SSD 2 TB' };

const observations: GameObservation[] = [
  { ...vergePro, id: "verge-shadow-pro16-32", deviceId: "mbp16-m1pro-32", workloadId: "shadow-highest-published", value: 46, resolution: "1920 × 1200", preset: "Highest" },
  { ...vergePro, id: "verge-shadow-pro14-32", deviceId: "mbp14-2021-m1-pro-c10-g16-r32", reportedHardware: 'MacBook Pro 14" (2021), M1 Pro, CPU 10, GPU 16, RAM 32 GB, SSD 1 TB', workloadId: "shadow-highest-published", value: 46, resolution: "1920 × 1200", preset: "Highest" },
  { id: "verge-shadow-max16-64", deviceId: "mbp16-m1max-64", sourceId: "verge-m1-2021", testedStorageGb: 2048,
    reportedHardware: 'MacBook Pro 16" (2021), M1 Max, CPU 10, GPU 32, RAM 64 GB, SSD 2 TB', workloadId: "shadow-highest-published", value: 84, resolution: "1920 × 1200", preset: "Highest" },
  { ...reviewedMax, id: "reviewed-shadow-max32", workloadId: "shadow-highest-published", value: 85, resolution: "1920 × 1080", preset: "Highest" },
  { ...reviewedMax, id: "reviewed-warhammer2-max32", workloadId: "warhammer2-1080-ultra", value: 115, resolution: "1920 × 1080", preset: "Ultra" },
  { ...reviewedMax, id: "reviewed-civ6-max32", workloadId: "civilization6-ultra-published", value: 43, resolution: "1920 × 1080", preset: "Ultra" },
  { ...digitalPro, id: "dt-rise-highest-pro32", workloadId: "rise-1200-highest", value: 40, resolution: "1920 × 1200", preset: "Highest" },
  { ...digitalPro, id: "dt-rise-medium-pro32", workloadId: "rise-1200-medium", value: 47, resolution: "1920 × 1200", preset: "Medium" },
  { ...digitalPro, id: "dt-civ6-ultra-pro32", workloadId: "civilization6-ultra-published", value: 49, resolution: "Não informada", preset: "Ultra" },
  { ...digitalPro, id: "dt-civ6-medium-pro32", workloadId: "civilization6-medium-published", value: 64, resolution: "Não informada", preset: "Medium" },
];

export const expandedGameBenchmarks: Benchmark[] = observations.map(({ resolution, preset, ...observation }) => ({
  ...observation,
  conditions: { "Resolução": resolution, "Qualidade": preset, "Métrica": "FPS médio" },
  quality: "partial", comparabilityKey: null,
  missingFields: ["Versão do jogo", "Versão do macOS", "API e modo de execução", "Antisserrilhamento", "Quantidade de repetições", ...(resolution === "Não informada" ? ["Resolução"] : [])],
  notes: "Valor medido e publicado pelo veículo citado. Preset, resolução e hardware pertencem a esta observação. Não foi calculada equivalência entre resoluções, configurações ou laboratórios.",
}));
