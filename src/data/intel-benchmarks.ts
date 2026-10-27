import type { Benchmark, BenchmarkSource, Device, Workload } from "@/lib/types";

export const intelDevices: Device[] = [
  {
    id: "mbp16-intel2019-i9-5500m-16", name: 'MacBook Pro 16"', family: "MacBook Pro",
    year: 2019, chip: "Intel Core i9 2.3 GHz", architecture: "intel", cpuCores: 8,
    gpuCores: null, gpuName: "Radeon Pro 5500M", gpuMemoryGb: 4,
    memoryGb: 16, storageGb: 1024, bandwidthGbps: null, screenInches: 16,
    specUrl: "https://support.apple.com/en-us/111932",
  },
  {
    id: "mbp13-intel2020-i5-16", name: 'MacBook Pro 13" (4 Thunderbolt)', family: "MacBook Pro",
    year: 2020, chip: "Intel Core i5 2.0 GHz", architecture: "intel", cpuCores: 4,
    gpuCores: null, gpuName: "Intel Iris Plus Graphics", gpuMemoryGb: null,
    memoryGb: 16, storageGb: 512, bandwidthGbps: null, screenInches: 13.3,
    specUrl: "https://support.apple.com/en-us/111339",
  },
];

export const intelSources: BenchmarkSource[] = [
  {
    id: "notebookcheck-intel2019", title: "Review do MacBook Pro 16 Intel i9 com Radeon Pro 5500M",
    publisher: "Notebookcheck",
    url: "https://www.notebookcheck.net/Apple-MacBook-Pro-16-2019-Laptop-Review-A-convincing-Core-i9-9880H-and-Radeon-Pro-5500M-powered-multimedia-laptop.445902.0.html",
    publishedAt: "2019-12-05", accessedAt: "2026-10-27",
  },
  {
    id: "notebookcheck-intel2020", title: "Review do MacBook Pro 13 Intel i5 de décima geração",
    publisher: "Notebookcheck",
    url: "https://www.notebookcheck.net/MacBook-Pro-13-2020-in-Review-Apple-s-subnotebook-only-gets-the-mandatory-update.467617.0.html",
    publishedAt: "2020-06-02", accessedAt: "2026-10-27",
  },
];

export const intelWorkloads: Workload[] = [
  {
    id: "f1-2019-1080-high", name: "F1 2019", category: "games",
    subtitle: "1080p · Alto · TAA", metric: "fps", higherIsBetter: true,
    description: "Média de quadros em 1920 × 1080, preset High, filtro anisotrópico 16× e TAA. Confira o sistema operacional de cada medição.",
  },
  {
    id: "libreoffice-20-pdf", name: "LibreOffice", category: "apps",
    subtitle: "Exportação de 20 documentos para PDF", metric: "seconds", higherIsBetter: false,
    description: "Tempo publicado para a conversão de 20 documentos em PDF. A versão do aplicativo e os documentos de entrada não são detalhados pela fonte.",
  },
];

const i9Hardware = 'MacBook Pro 16" (2019), Core i9-9880H, CPU 8, Radeon Pro 5500M 4 GB, RAM 16 GB, SSD 1 TB';
const i5Hardware = 'MacBook Pro 13" (2020, 4 Thunderbolt 3), Core i5-1038NG7, CPU 4, Iris Plus G7, RAM 16 GB, SSD 512 GB';

function intelGame(workloadId: string, value: number, quality: string, aa?: string): Benchmark {
  return {
    id: `${workloadId}-mbp16-intel2019-i9-5500m-16`, deviceId: "mbp16-intel2019-i9-5500m-16",
    workloadId, value, sourceId: "notebookcheck-intel2019", reportedHardware: i9Hardware,
    conditions: {
      "Resolução": "1920 × 1080", "Qualidade": quality,
      "Sistema": "Windows 10", "Modo de execução": "Boot Camp",
      ...(aa ? { "Antisserrilhamento": aa } : {}),
      ...(workloadId === "f1-2019-1080-high" ? { "Filtro anisotrópico": "16×" } : {}),
    },
    quality: "partial", comparabilityKey: null,
    missingFields: ["Versão do jogo", "API gráfica", "Versão do driver", "Quantidade de repetições"],
    notes: "O review identifica os testes principais de jogos como Windows 10 via Boot Camp. Sistema, API e drivers podem alterar o resultado em relação ao macOS. Este registro mantém seu próprio ambiente de teste e não gera comparação estrita com medições em macOS.",
  };
}

export const intelBenchmarks: Benchmark[] = [
  intelGame("shadow-1080-high", 54, "High", "SMAA"),
  intelGame("shadow-1080-highest", 46, "Highest", "TAA"),
  intelGame("totalwar-1080-high", 40.5, "High, incluindo texturas"),
  intelGame("f1-2019-1080-high", 97, "High", "TAA"),
  {
    id: "blender-bmw-cpu-mbp16-intel2019-i9-5500m-16", deviceId: "mbp16-intel2019-i9-5500m-16",
    workloadId: "blender-bmw-cpu", value: 343,
    // This source is supplied by the base dataset. Its comparison table names the Intel model.
    sourceId: "notebookcheck-m1pro", reportedHardware: i9Hardware,
    conditions: { "Aplicativo": "Blender 2.79", "Cena": "BMW27", "Dispositivo de render": "CPU", "Sistema": "Não informado para este resultado" },
    quality: "partial", comparabilityKey: null,
    missingFields: ["Sistema operacional do teste", "Arquitetura do executável", "Quantidade de repetições", "Data da medição original"],
    notes: "O valor aparece na tabela comparativa do review do M1 Pro de 2021, associado ao Pro 16 Intel i9/5500M. A configuração desse equipamento foi verificada no review original de 2019. A tabela não informa o sistema usado neste teste; não se presume macOS ou Windows.",
  },
  {
    id: "f1-2019-1080-high-mbp13-intel2020-i5-16", deviceId: "mbp13-intel2020-i5-16",
    workloadId: "f1-2019-1080-high", value: 25, sourceId: "notebookcheck-intel2020", reportedHardware: i5Hardware,
    conditions: { "Resolução": "1920 × 1080", "Qualidade": "High", "Antisserrilhamento": "TAA", "Filtro anisotrópico": "16×", "Sistema": "Não informado para este resultado" },
    quality: "partial", comparabilityKey: null,
    missingFields: ["Sistema operacional do teste", "Versão do jogo", "API gráfica", "Versão do driver", "Quantidade de repetições"],
    notes: "O review publica a configuração e o preset, mas utiliza macOS e Windows em diferentes testes e não explicita o sistema desta linha. A medição permanece contextual.",
  },
  {
    id: "libreoffice-20-pdf-mbp13-intel2020-i5-16", deviceId: "mbp13-intel2020-i5-16",
    workloadId: "libreoffice-20-pdf", value: 88.6, sourceId: "notebookcheck-intel2020", reportedHardware: i5Hardware,
    conditions: { "Tarefa": "Conversão de 20 documentos para PDF", "Sistema": "Não informado para este resultado" },
    quality: "partial", comparabilityKey: null,
    missingFields: ["Versão do LibreOffice", "Documentos de entrada", "Sistema operacional do teste", "Quantidade de repetições"],
    notes: "Tempo em segundos publicado no review de 2020. O resultado não identifica a versão do LibreOffice ou os arquivos de entrada.",
  },
];
