import type { Benchmark, Dataset, Device, Workload } from "@/lib/types";
import { mergeDevices } from "./catalog-devices";
import { intelBenchmarks, intelDevices, intelSources, intelWorkloads } from "./intel-benchmarks";
import { additionalWorkloads } from "./additional-workloads";
import { expandedGameBenchmarks, expandedGameSources, expandedGameWorkloads } from "./game-expansion";
import { expandedAppBenchmarks, expandedAppSources, expandedAppWorkloads } from "./app-expansion";
import { expandedLlmBenchmarks, expandedLlmSources, expandedLlmWorkloads } from "./llm-expansion";

function device(
  id: string, family: Device["family"], screenInches: number, year: number, chip: string,
  cpuCores: number, gpuCores: number, memoryGb: number, storageGb: number | null,
  bandwidthGbps: number | null, article: string,
): Device {
  return {
    id, name: `${family} ${Math.floor(screenInches)}\"`, family, screenInches, year, chip,
    architecture: "apple-silicon", cpuCores, gpuCores, memoryGb, storageGb, bandwidthGbps,
    specUrl: `https://support.apple.com/en-us/${article}`,
  };
}

// One hardware configuration per ID. A matching chip alone is never a match.
const devices: Device[] = [
  device("mbp16-m1pro-16", "MacBook Pro", 16.2, 2021, "M1 Pro", 10, 16, 16, 1024, 200, "111901"),
  device("mbp16-m1max-64", "MacBook Pro", 16.2, 2021, "M1 Max", 10, 32, 64, 2048, 400, "111901"),
  device("mba13-m1-16", "MacBook Air", 13.3, 2020, "M1", 8, 7, 16, null, null, "111883"),
  device("mbp14-m1pro-16", "MacBook Pro", 14.2, 2021, "M1 Pro", 8, 14, 16, null, 200, "111902"),
  device("mbp16-m1pro-32", "MacBook Pro", 16.2, 2021, "M1 Pro", 10, 16, 32, 1024, 200, "111901"),
  device("mbp16-m1max-32", "MacBook Pro", 16.2, 2021, "M1 Max", 10, 32, 32, 1024, 400, "111901"),
  device("mbp16-m2pro-32", "MacBook Pro", 16.2, 2023, "M2 Pro", 12, 19, 32, 1024, 200, "111838"),
  device("mbp16-m2max-32", "MacBook Pro", 16.2, 2023, "M2 Max", 12, 38, 32, 1024, 400, "111838"),
  device("mbp16-m3pro-36", "MacBook Pro", 16.2, 2023, "M3 Pro", 12, 18, 36, 1024, 150, "117737"),
  device("mbp14-m3max-36", "MacBook Pro", 14.2, 2023, "M3 Max", 14, 30, 36, 1024, 300, "117736"),
  device("mbp16-m4pro-24", "MacBook Pro", 16.2, 2024, "M4 Pro", 14, 20, 24, 512, 273, "121554"),
  device("mbp16-m4max-48", "MacBook Pro", 16.2, 2024, "M4 Max", 16, 40, 48, 1024, 546, "121554"),
];

const workloads: Workload[] = [
  { id: "shadow-1080-high", category: "games", name: "Shadow of the Tomb Raider", subtitle: "1080p · Alto · SMAA", metric: "fps", higherIsBetter: true, description: "Média de quadros em 1920 × 1080 com preset High e SMAA. Sistema e modo de execução devem ser conferidos em cada medição." },
  { id: "shadow-1080-highest", category: "games", name: "Shadow of the Tomb Raider", subtitle: "1080p · Máximo · TAA", metric: "fps", higherIsBetter: true, description: "Teste em 1920 × 1080 com preset Highest e TAA." },
  { id: "totalwar-1080-high", category: "games", name: "Total War: Three Kingdoms", subtitle: "1080p · Alto", metric: "fps", higherIsBetter: true, description: "Média de quadros em 1920 × 1080 com preset High, incluindo as texturas." },
  { id: "llama2-q4-generation", category: "llms", name: "Llama 2 7B", subtitle: "Q4_0 · Geração · Metal", metric: "tokens/s", higherIsBetter: true, description: "Geração de 128 tokens no llama-bench, batch 1 e todas as camadas na GPU. Cada resultado conserva o commit e as condições publicados pelo autor; builds diferentes não são tratados como um protocolo controlado." },
  { id: "llama2-q8-generation", category: "llms", name: "Llama 2 7B", subtitle: "Q8_0 · Geração · Metal", metric: "tokens/s", higherIsBetter: true, description: "Teste de geração de 128 tokens com quantização Q8_0. A quantização faz parte do protocolo." },
  { id: "llama2-q4-prompt", category: "llms", name: "Llama 2 7B", subtitle: "Q4_0 · Prompt de 512 tokens", metric: "tokens/s", higherIsBetter: true, description: "Processamento de um prompt de 512 tokens no llama-bench. Mede a leitura do prompt, uma etapa distinta da geração de texto." },
  { id: "blender-bmw-cpu", category: "apps", name: "Blender", subtitle: "2.79 · BMW27 · Render por CPU", metric: "seconds", higherIsBetter: false, description: "Tempo de renderização da cena BMW27 pela CPU no Blender 2.79. Valores menores representam menor tempo de espera." },
  { id: "premiere-export-score", category: "apps", name: "Adobe Premiere Pro", subtitle: "PugetBench 0.9 · Pontuação de exportação", metric: "score", higherIsBetter: true, description: "Pontuação do teste de exportação do PugetBench 0.9. O review usou a versão Intel do Premiere, executada pelo Rosetta 2." },
];

const reviewedMachines = [
  { deviceId: "mbp16-m1pro-16", sourceId: "notebookcheck-m1pro", reportedHardware: 'MacBook Pro 16" (2021), M1 Pro, CPU 10, GPU 16, RAM 16 GB, SSD 1 TB' },
  { deviceId: "mbp16-m1max-64", sourceId: "notebookcheck-m1max", reportedHardware: 'MacBook Pro 16" (2021), M1 Max, CPU 10, GPU 32, RAM 64 GB, SSD 2 TB' },
];

function reviewPair(
  workloadId: string, values: [number, number], conditions: Record<string, string>,
  missingFields: string[], comparabilityKey: string, notes: string,
): Benchmark[] {
  return reviewedMachines.map((machine, index) => ({
    id: `${workloadId}-${machine.deviceId}`, ...machine, workloadId,
    value: values[index], conditions, quality: "partial", missingFields, comparabilityKey, notes,
  }));
}

const gameConditions = {
  "Resolução": "1920 × 1080", "Sistema": "macOS 12 Monterey",
  "Origem do teste": "Notebookcheck, reviews de novembro de 2021",
};
const gameMissing = ["Versão do jogo", "API gráfica", "Modo de execução", "Quantidade de repetições"];
const gameNote = "Preset e resolução coincidem na metodologia do mesmo laboratório. A versão exata do jogo e a API não foram publicadas. As máquinas testadas têm RAM e SSD diferentes; os valores pertencem às configurações indicadas.";

const benchmarks: Benchmark[] = [
  ...reviewPair("shadow-1080-high", [57, 97],
    { ...gameConditions, "Qualidade": "High", "Antisserrilhamento": "SMAA" },
    gameMissing, "nbc-2021-shadow-1080-high-smaa", gameNote),
  ...reviewPair("shadow-1080-highest", [50, 87],
    { ...gameConditions, "Qualidade": "Highest", "Antisserrilhamento": "TAA" },
    gameMissing, "nbc-2021-shadow-1080-highest-taa", gameNote),
  ...reviewPair("totalwar-1080-high", [43.8, 80],
    { ...gameConditions, "Qualidade": "High, incluindo texturas" },
    [...gameMissing, "Antisserrilhamento"], "nbc-2021-totalwar-1080-high", gameNote),
  ...reviewPair("blender-bmw-cpu", [183.3, 189],
    { "Aplicativo": "Blender 2.79", "Cena": "BMW27", "Dispositivo de render": "CPU", "Sistema": "macOS 12 Monterey" },
    ["Modo de execução", "Quantidade de repetições"], "nbc-2021-blender279-bmw27-cpu",
    "Cena, versão e render por CPU estão identificados. O review não explicita a arquitetura do executável deste teste. O resultado não mede a renderização por GPU."),
  ...reviewPair("premiere-export-score", [40.7, 53.2],
    { "Suíte": "PugetBench 0.9", "Teste": "Export", "Modo de execução": "Intel via Rosetta 2", "Sistema": "macOS 12 Monterey" },
    ["Versão do Premiere Pro", "Projetos e codecs detalhados", "Quantidade de repetições"], "nbc-2021-puget09-premiere-export-rosetta2",
    "A unidade publicada é pontuação. O review identifica a suíte e o uso do Rosetta 2, mas não informa a versão exata do Premiere ou o tempo de exportação em segundos."),
];

const llmMachines = [
  {
    deviceId: "mba13-m1-16", sourceId: "llama-cpp-air-m1",
    reportedHardware: 'MacBook Air M1, CPU 8, GPU 7, RAM 16 GB; SSD não informado',
    q4Generation: 14.19, q8Generation: 7.92, q4Prompt: 107.81,
    q4GenerationDeviation: "± 0,05", q8GenerationDeviation: "± 0,01", q4PromptDeviation: "± 0,10",
  },
  {
    deviceId: "mbp14-m1pro-16", sourceId: "llama-cpp-m1pro14",
    reportedHardware: 'MacBook Pro 14" M1 Pro, CPU 8, GPU 14, RAM 16 GB; SSD não informado',
    q4Generation: 35.45, q8Generation: 22.16, q4Prompt: 233.01,
    q4GenerationDeviation: "± 0,03", q8GenerationDeviation: "± 0,02", q4PromptDeviation: "± 0,08",
  },
];

for (const machine of llmMachines) {
  const tests = [
    { workloadId: "llama2-q4-generation", value: machine.q4Generation, quantization: "Q4_0", test: "tg128", batch: "1", deviation: machine.q4GenerationDeviation },
    { workloadId: "llama2-q8-generation", value: machine.q8Generation, quantization: "Q8_0", test: "tg128", batch: "1", deviation: machine.q8GenerationDeviation },
    { workloadId: "llama2-q4-prompt", value: machine.q4Prompt, quantization: "Q4_0", test: "pp512", batch: "512", deviation: machine.q4PromptDeviation },
  ];
  for (const test of tests) {
    benchmarks.push({
      id: `${test.workloadId}-${machine.deviceId}`, deviceId: machine.deviceId,
      workloadId: test.workloadId, value: test.value, sourceId: machine.sourceId,
      reportedHardware: machine.reportedHardware,
      conditions: {
        "Modelo": "Llama 2 7B (6,74 bilhões de parâmetros)", "Quantização": test.quantization,
        "Runtime": "llama.cpp / llama-bench", "Build": "8e672ef (1550)", "Backend": "Metal",
        "Camadas na GPU (ngl)": "99", "Teste": test.test, "Batch": test.batch,
        "Variação reportada": test.deviation,
      },
      quality: "partial",
      missingFields: ["Versão do macOS", "SSD", "Janela máxima de contexto", "Controle de energia equivalente"],
      comparabilityKey: `llamabench-8e672ef-llama2-7b-${test.quantization.toLowerCase()}-metal-ngl99-${test.test}-bs${test.batch}`,
      notes: "Medição publicada por um participante da comunidade. Modelo, quantização, commit e teste coincidem. Sistema e energia não estão controlados entre relatos. pp512 e tg128 são testes separados; o prompt de 512 tokens não é o contexto do teste de geração. Estes dados históricos não representam versões atuais do runtime.",
    });
  }
}

export const dataset: Dataset = {
  updatedAt: "2026-10-27", devices: mergeDevices(devices, intelDevices),
  workloads: [...workloads, ...intelWorkloads, ...additionalWorkloads, ...expandedGameWorkloads, ...expandedAppWorkloads, ...expandedLlmWorkloads],
  benchmarks: [...benchmarks, ...intelBenchmarks, ...expandedGameBenchmarks, ...expandedAppBenchmarks, ...expandedLlmBenchmarks],
  sources: [
    ...intelSources,
    ...expandedGameSources, ...expandedAppSources, ...expandedLlmSources,
    {
      id: "notebookcheck-m1pro", title: "Review do MacBook Pro 16 com M1 Pro (2021)", publisher: "Notebookcheck",
      url: "https://www.notebookcheck.net/Apple-MacBook-Pro-16-2021-M1-Pro-in-Review-The-best-Multimedia-Laptop-for-Content-Creators.579013.0.html",
      publishedAt: "2021-11-13", accessedAt: "2026-10-27",
    },
    {
      id: "notebookcheck-m1max", title: "Review do MacBook Pro 16 com M1 Max (2021)", publisher: "Notebookcheck",
      url: "https://www.notebookcheck.net/Apple-MacBook-Pro-16-2021-M1-Max-Laptop-Review-Full-Performance-without-Throttling.581437.0.html",
      publishedAt: "2021-11-25", accessedAt: "2026-10-27",
    },
    {
      id: "llama-cpp-air-m1", title: "llama.cpp #4167: MacBook Air M1, relato de TimoLassmann", publisher: "Comunidade llama.cpp / GitHub",
      url: "https://github.com/ggml-org/llama.cpp/discussions/4167?sort=top",
      publishedAt: "2023-12-15", accessedAt: "2026-10-27",
    },
    {
      id: "llama-cpp-m1pro14", title: "llama.cpp #4167: MacBook Pro 14, relato de Ueda-Yoshiki-121", publisher: "Comunidade llama.cpp / GitHub",
      url: "https://github.com/ggml-org/llama.cpp/discussions/4167?sort=top",
      publishedAt: "2023-12-17", accessedAt: "2026-10-27",
    },
  ],
};
