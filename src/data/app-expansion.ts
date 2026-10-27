import type { Benchmark, BenchmarkSource, Workload } from "@/lib/types";

export const expandedAppWorkloads: Workload[] = [
  { id: "blender-classroom-macrumors", category: "apps", name: "Blender", subtitle: "Classroom · Teste MacRumors de 2021", metric: "seconds", higherIsBetter: false,
    description: "Tempo de renderização da cena Classroom no teste da MacRumors. A publicação não identifica a versão nem se o render usou CPU ou GPU. Não equivale ao teste BMW27." },
  { id: "premiere-4k-verge-2026", category: "apps", name: "Adobe Premiere Pro", subtitle: "Exportação 4K · Teste The Verge de 2026", metric: "seconds", higherIsBetter: false,
    description: "Tempo de exportação 4K publicado no comparativo de março de 2026. Duração do projeto, codec, efeitos e versão do Premiere não foram detalhados; os valores não são uma previsão para qualquer projeto 4K." },
];

export const expandedAppSources: BenchmarkSource[] = [
  { id: "macrumors-pro-max-2021", title: "M1 Pro vs. M1 Max: teste próprio em Final Cut e Blender", publisher: "MacRumors",
    url: "https://www.macrumors.com/2021/11/03/m1-pro-vs-m1-max-performance-test/", publishedAt: "2021-11-03", accessedAt: "2026-10-27" },
  { id: "xcodebenchmark-m1pro32", title: "XcodeBenchmark: resultados comunitários com Xcode 15", publisher: "XcodeBenchmark / GitHub",
    url: "https://github.com/devMEremenko/XcodeBenchmark/blob/master/ReadMe.md#xcode-15", publishedAt: null, accessedAt: "2026-10-27" },
  { id: "verge-m5max-comparison-2026", title: "MacBook Pro: M5 Max, M1 Max e M1 Pro nos testes de 2026", publisher: "The Verge",
    url: "https://www.theverge.com/tech/898062/apple-macbook-pro-16-m5-max-m1-comparison-review", publishedAt: "2026-03-21", accessedAt: "2026-10-27" },
];

const macrumorsMachines = [
  { deviceId: "mbp14-m1pro-16", testedStorageGb: 512, reportedHardware: 'MacBook Pro 14" (2021), M1 Pro, CPU 8, GPU 14, RAM 16 GB, SSD 512 GB', finalCut: 175, blender: 658 },
  { deviceId: "mbp16-m1max-32", testedStorageGb: 1024, reportedHardware: 'MacBook Pro 16" (2021), M1 Max, CPU 10, GPU 32, RAM 32 GB, SSD 1 TB', finalCut: 109, blender: 503 },
];

export const expandedAppBenchmarks: Benchmark[] = macrumorsMachines.flatMap(({ finalCut, blender, ...machine }): Benchmark[] => [
  { ...machine, id: `macrumors-finalcut-${machine.deviceId}`, workloadId: "final-cut-export", value: finalCut, sourceId: "macrumors-pro-max-2021",
    conditions: { "Aplicativo": "Final Cut Pro", "Projeto": "Vídeo de 6 minutos em 4K", "Teste": "Exportação", "Unidade": "Segundos" },
    quality: "partial", comparabilityKey: null,
    missingFields: ["Versão do Final Cut Pro", "Versão do macOS", "Codec e preset de saída", "Mídia e efeitos", "Quantidade de repetições"],
    notes: "Tempo convertido de minutos e segundos para segundos. Teste próprio da MacRumors; o projeto completo não foi disponibilizado. Não representa o tempo de exportação de todo vídeo 4K." },
  { ...machine, id: `macrumors-classroom-${machine.deviceId}`, workloadId: "blender-classroom-macrumors", value: blender, sourceId: "macrumors-pro-max-2021",
    conditions: { "Aplicativo": "Blender", "Cena": "Classroom", "Teste": "Renderização", "Unidade": "Segundos" },
    quality: "partial", comparabilityKey: null,
    missingFields: ["Versão do Blender", "Versão do macOS", "CPU ou GPU de render", "Backend e amostras", "Quantidade de repetições"],
    notes: "Tempo convertido de minutos e segundos para segundos. A fonte descreve a cena Classroom, mas não publica um protocolo completo." },
]);

for (const test of [
  { value: 122, testedStorageGb: 1024, xcode: "15.0.1", macOS: "14.1" },
  { value: 137, testedStorageGb: 512, xcode: "15.0", macOS: "13.5.2" },
]) {
  expandedAppBenchmarks.push({
    id: `xcode15-pro32-${test.testedStorageGb}`, deviceId: "mbp16-m1pro-32", workloadId: "xcode-clean-build", value: test.value,
    sourceId: "xcodebenchmark-m1pro32", testedStorageGb: test.testedStorageGb,
    reportedHardware: `MacBook Pro 16" (2021), M1 Pro, CPU 10, GPU 16, RAM 32 GB, SSD ${test.testedStorageGb} GB`,
    conditions: { "Aplicativo": `Xcode ${test.xcode}`, "Sistema": `macOS ${test.macOS}`, "Projeto": "XcodeBenchmark", "Teste": "Compilação limpa" },
    quality: "partial", comparabilityKey: null,
    missingFields: ["Commit do projeto usado na execução", "Data da submissão", "Quantidade de repetições", "Controle de energia"],
    notes: "Submissão comunitária. GPU 16 identificada pela ficha Apple: é a única variante de GPU do M1 Pro de 16 polegadas de 2021. Os dois registros usam versões diferentes do Xcode e macOS; a diferença de tempo não mede o efeito do SSD.",
  });
}

const vergeMachines = [
  { deviceId: "mbp16-m1pro-16", testedStorageGb: 1024, reportedHardware: 'MacBook Pro 16" (2021), M1 Pro, CPU 10, GPU 16, RAM 16 GB, SSD 1 TB', premiere: 170, read: 6685.35, write: 6966.43 },
  { deviceId: "mbp16-m1max-32", testedStorageGb: 1024, reportedHardware: 'MacBook Pro 16" (2021), M1 Max, CPU 10, GPU 32, RAM 32 GB, SSD 1 TB', premiere: 123, read: 6741.38, write: 7067.34 },
  { deviceId: "mbp16-2026-m5-max-c18-g40-r128", testedStorageGb: 4096, reportedHardware: 'MacBook Pro 16" (2026), M5 Max, CPU 18, GPU 40, RAM 128 GB, SSD 4 TB', premiere: 70, read: 13638.91, write: 17814.19 },
];
for (const { premiere, read, write, ...machine } of vergeMachines) {
  expandedAppBenchmarks.push({
    ...machine, id: `verge2026-premiere-${machine.deviceId}`, workloadId: "premiere-4k-verge-2026", value: premiere, sourceId: "verge-m5max-comparison-2026",
    conditions: { "Aplicativo": "Adobe Premiere Pro", "Teste": "Exportação 4K", "Rodada": "Comparativo publicado em março de 2026" },
    quality: "partial", comparabilityKey: null,
    missingFields: ["Versão do Premiere Pro", "Versão do macOS", "Duração e arquivo do projeto", "Codec e efeitos", "Quantidade de repetições"],
    notes: "Tempo publicado convertido para segundos. A publicação reuniu os computadores na mesma rodada, mas não detalha suficientemente o projeto para reprodução.",
  });
  for (const [workloadId, value, operation] of [["ssd-read", read, "Leitura sustentada"], ["ssd-write", write, "Gravação sustentada"]] as const) {
    expandedAppBenchmarks.push({
      ...machine, id: `verge2026-${workloadId}-${machine.deviceId}`, workloadId, value, sourceId: "verge-m5max-comparison-2026",
      conditions: { "Teste": operation, "Unidade": "MB/s", "Rodada": "Comparativo publicado em março de 2026" },
      quality: "partial", comparabilityKey: null,
      missingFields: ["Ferramenta e versão", "Tamanho do arquivo", "Espaço livre e cache", "Versão do macOS", "Quantidade de repetições"],
      notes: "Taxa medida na capacidade de SSD indicada. Não extrapolada para discos menores ou maiores. A fonte descreve a operação como sustentada e não publica todos os parâmetros.",
    });
  }
}
