import type { Benchmark, BenchmarkSource, Workload } from "@/lib/types";

// Original measurements, read on 2026-10-27. Unknown screen/SSD are intentional:
// a catalog device ID is not evidence that the author tested that screen/SSD.
const accessedAt = "2026-10-27";
const llamaDiscussion = "https://github.com/ggml-org/llama.cpp/discussions/4167";
const mostafaReadme = "https://github.com/itsmostafa/inference-speed-tests/blob/2798b0cb77f27102dc1582cad30e5448e9c4c6bb/README.md";
const mostafaPost = "https://www.reddit.com/r/LocalLLaMA/comments/1j0c53c/inference_speed_comparisons_between_m1_pro_and/";
const bishalArticle = "https://bishal.io/blog/six-local-models-m1-max-llama-cpp-vs-mlx/";

export const expandedLlmSources: BenchmarkSource[] = [
  { id: "llama-cpp-ggerganov-m1pro32", title: "llama.cpp #4167: M1 Pro CPU 8+2 / GPU 16, ggerganov", publisher: "ggerganov / projeto llama.cpp", url: llamaDiscussion, publishedAt: "2023-11-22", accessedAt },
  { id: "llama-cpp-ggerganov-m1pro32-memory", title: "llama.cpp #4167: ggerganov informa M1 Pro com 32 GB", publisher: "ggerganov / projeto llama.cpp", url: `${llamaDiscussion}#discussioncomment-7685400`, publishedAt: "2023-11-27", accessedAt },
  { id: "llama-cpp-cedric-m1max64", title: "llama.cpp #4167: MacBook Pro 16 M1 Max 64 GB, CedricYauLBD", publisher: "CedricYauLBD / comunidade llama.cpp", url: `${llamaDiscussion}#discussioncomment-7664196`, publishedAt: "2023-11-25", accessedAt },
  { id: "llama-cpp-rlippmann-m2max32", title: "llama.cpp #4167: MacBook Pro 16 M2 Max 32 GB, rlippmann", publisher: "rlippmann / comunidade llama.cpp", url: `${llamaDiscussion}#discussioncomment-7670696`, publishedAt: "2023-11-26", accessedAt },
  { id: "itsmostafa-qwen-2025", title: "Inference Speed Tests: MacBook Pro M1 Pro 32 GB e M4 Max 128 GB; README de 28/02/2025", publisher: "itsmostafa / GitHub", url: mostafaReadme, publishedAt: "2025-02-28", accessedAt },
  { id: "itsmostafa-qwen-protocol", title: "Relato original de purealgo: contexto e decodificação especulativa", publisher: "purealgo / r/LocalLLaMA", url: mostafaPost, publishedAt: null, accessedAt },
  { id: "bishal-m1max32-2026", title: "Six local AI models on my M1 Max: llama.cpp vs MLX", publisher: "Bishal Sapkota", url: bishalArticle, publishedAt: "2026-09-16", accessedAt },
  { id: "bishal-m1max32-2026-markdown", title: "Fonte Markdown do benchmark de Bishal Sapkota", publisher: "Bishal Sapkota", url: "https://bishal.io/blog/six-local-models-m1-max-llama-cpp-vs-mlx.md", publishedAt: "2026-09-16", accessedAt },
];

export const expandedLlmWorkloads: Workload[] = [
  {
    id: "llama2-q8-prompt", category: "llms", name: "Llama 2 7B",
    subtitle: "Q8_0 · Prompt de 512 tokens", metric: "tokens/s", higherIsBetter: true,
    description: "Processamento de 512 tokens no llama-bench com Q8_0 e Metal. O commit e as condições acompanham cada medição; pp512 e tg128 são ensaios separados.",
    sourceUrl: llamaDiscussion,
  },
];

export const expandedLlmBenchmarks: Benchmark[] = [];

const llamaMachines = [
  {
    deviceId: "mbp16-m1pro-32", sourceId: "llama-cpp-ggerganov-m1pro32", screen: null,
    build: "8e672ef (1550)", commit: "8e672efe632bb6a7333964a255c4b96f018b9a65",
    reportedHardware: "M1 Pro, CPU 8+2 (10), GPU 16; RAM 32 GB informada pelo mesmo autor em comentário posterior; tamanho da tela e SSD não informados",
    provenance: `CPU e GPU estão na tabela de ggerganov. Os 32 GB vêm de ${llamaDiscussion}#discussioncomment-7685400, do mesmo autor, em 27/11/2023; a associação entre os dois relatos não identifica número de série ou tamanho da tela.`,
    results: [[36.41, "± 0,01"], [22.34, "± 0,00"], [266.25, "± 0,07"], [270.37, "± 0,02"]] as const,
  },
  {
    deviceId: "mbp16-m1max-64", sourceId: "llama-cpp-cedric-m1max64", screen: 16.2,
    build: "e9c13ff (1560)", commit: "e9c13ff78114af6fc6a4f27cc8dcdda0f3d389fb",
    reportedHardware: 'MacBook Pro 16" M1 Max, CPU 8+2 (10), GPU 32, RAM 64 GB; SSD não informado',
    provenance: "Configuração declarada junto ao log de CedricYauLBD. Esta é uma medição em 64 GB. O hash foi transcrito do log original, que difere do hash atribuído pelo resumo da discussão.",
    results: [[61.19, "± 0,15"], [40.20, "± 0,03"], [530.06, "± 0,17"], [537.37, "± 0,19"]] as const,
  },
  {
    deviceId: "mbp16-m2max-32", sourceId: "llama-cpp-rlippmann-m2max32", screen: 16.2,
    build: "22da055 (1566)", commit: "22da05536ff4ad963080773bef1fb839fdab95d3",
    reportedHardware: 'MacBook Pro 16" M2 Max, CPU 8+4 (12), GPU 38, RAM 32 GB; SSD não informado',
    provenance: "Configuração e build transcritos do comentário original de rlippmann. Este é o resultado do MacBook Pro com 32 GB, não o resultado de Mac Studio nem o do Pro com 96 GB.",
    results: [[62.98, "± 0,06"], [40.67, "± 0,05"], [668.28, "± 0,24"], [674.37, "± 0,63"]] as const,
  },
];

const llamaTests = [
  { id: "llama2-q4-generation", quantization: "Q4_0", test: "tg128", size: "3,56 GiB" },
  { id: "llama2-q8-generation", quantization: "Q8_0", test: "tg128", size: "6,67 GiB" },
  { id: "llama2-q4-prompt", quantization: "Q4_0", test: "pp512", size: "3,56 GiB" },
  { id: "llama2-q8-prompt", quantization: "Q8_0", test: "pp512", size: "6,67 GiB" },
];

for (const machine of llamaMachines) {
  for (const [index, test] of llamaTests.entries()) {
    const [value, deviation] = machine.results[index];
    expandedLlmBenchmarks.push({
      id: `${test.id}-${machine.deviceId}-original`, deviceId: machine.deviceId,
      workloadId: test.id, value, sourceId: machine.sourceId,
      testedStorageGb: null, testedScreenInches: machine.screen,
      reportedHardware: machine.reportedHardware,
      conditions: {
        "Modelo": "Llama 2 7B (6,74 bilhões de parâmetros)", "Quantização": test.quantization,
        "Tamanho do modelo": test.size, "Runtime": "llama.cpp / llama-bench",
        "Build": machine.build, "Commit": machine.commit, "Backend": "Metal",
        "Camadas na GPU (ngl)": "99", "Teste": test.test,
        "Variação reportada": deviation,
      },
      quality: "partial", comparabilityKey: null,
      missingFields: ["Versão do macOS", "SSD", "Parâmetro n_batch do ensaio", "Janela máxima de contexto", "Condições de energia", "Quantidade de repetições", ...(machine.screen === null ? ["Tamanho da tela", "RAM junto ao log original"] : [])],
      notes: `${machine.provenance} Relato do participante, sem reprodução independente. pp512 e tg128 são testes separados; 512 não é o contexto da geração. Builds diferem entre autores; não se calcula vantagem a partir destes registros históricos.`,
    });
  }
}

const qwen25Results = [
  { size: "7B", value: 38.99, m4MaxValue: 101.87 },
  { size: "14B", value: 18.88, m4MaxValue: 52.22 },
  { size: "32B", value: 9.10, m4MaxValue: 24.46 },
];

for (const result of qwen25Results) {
  const workloadId = `qwen25-${result.size.toLowerCase()}-instruct-mlx4-generation`;
  const model = `Qwen2.5-${result.size}-Instruct`;
  expandedLlmWorkloads.push({
    id: workloadId, category: "llms", name: model,
    subtitle: "MLX 4-bit · Geração · LM Studio", metric: "tokens/s", higherIsBetter: true,
    description: "Geração de uma história no LM Studio/MLX. Relato de fevereiro de 2025, contexto configurado em 4096 tokens. Versões do runtime, arquivo quantizado e quantidade efetiva de tokens não publicados.",
    sourceUrl: mostafaReadme,
  });
  const qwen25Benchmark: Benchmark = {
    id: `${workloadId}-mbp-m1pro32-itsmostafa`, deviceId: "mbp16-m1pro-32",
    workloadId, value: result.value, sourceId: "itsmostafa-qwen-2025",
    testedStorageGb: null, testedScreenInches: null,
    reportedHardware: "MacBook Pro M1 Pro, GPU 16, RAM 32 GB; CPU, tamanho da tela e SSD não explicitados pelo autor",
    conditions: {
      "Modelo": model, "Quantização": "4-bit (esquema e tamanho de grupo não publicados)",
      "Runtime": "LM Studio / MLX; versões não informadas", "Teste": "Geração de texto",
      "Prompt": "Write a 500 word story", "Contexto configurado": "4096 tokens",
      "Decodificação especulativa": "Desativada, segundo resposta do autor no relato original",
      "Protocolo complementar": mostafaPost,
    },
    quality: "partial", comparabilityKey: null,
    missingFields: ["Versões do LM Studio e MLX", "Arquivo e revisão dos pesos", "Esquema exato de quantização", "Tokens efetivamente gerados", "Batch", "Quantidade de repetições", "Versão do macOS", "Condições de energia", "CPU explicitada no relato", "Tamanho da tela", "SSD"],
    notes: "README preservado no commit 2798b0c, de 28/02/2025. O autor declara MacBook Pro, GPU 16 e RAM 32 GB; CPU 10 é a configuração do catálogo Apple compatível com essa GPU, não uma contagem publicada no relato. Contexto e especulação foram confirmados no post do próprio autor. O repositório avisa que os resultados não têm verificação independente. Não confundir com dados de Mac Studio adicionados posteriormente.",
  };
  expandedLlmBenchmarks.push(qwen25Benchmark, {
    ...qwen25Benchmark,
    id: `${workloadId}-mbp-m4max128-itsmostafa`,
    deviceId: "mbp16-2024-m4-max-c16-g40-r128", value: result.m4MaxValue,
    reportedHardware: "MacBook Pro M4 Max, GPU 40, RAM 128 GB; CPU, tamanho da tela e SSD não explicitados pelo autor",
    notes: "Mesma tabela MLX/LM Studio do README preservado no commit 2798b0c, de 28/02/2025. O autor declara MacBook Pro M4 Max, GPU 40 e RAM 128 GB. CPU 16 é inferida da variante oficial GPU 40 documentada pela Apple em https://support.apple.com/en-us/121554 e https://support.apple.com/en-us/121553; não é uma contagem publicada no relato. Tela e SSD permanecem desconhecidos. Contexto e especulação foram confirmados no post do próprio autor. Versões e arquivos quantizados não foram publicados, e o repositório avisa que os resultados não têm verificação independente.",
  });
}

// The author's Markdown publishes model names, not quantized filenames or model
// revision hashes. Keep that absence explicit rather than inventing a HF path.
const bishalModels = [
  { id: "gemma4-e4b", name: "Gemma 4 E4B", family: "gemma", llamaPrompt: 877.5, mlxPrompt: 1072.7, llamaGeneration: 63.6, mlxGeneration: 52.4 },
  { id: "qwen35-9b", name: "Qwen3.5-9B", family: "qwen", llamaPrompt: 455.8, mlxPrompt: 376.8, llamaGeneration: 37.1, mlxGeneration: 57.1 },
  { id: "gemma4-12b", name: "Gemma 4 12B", family: "gemma", llamaPrompt: 344.7, mlxPrompt: 242.9, llamaGeneration: 36.7, mlxGeneration: 33.1 },
  { id: "qwen38-27b", name: "Qwen3.8-27B", family: "qwen", llamaPrompt: 134.5, mlxPrompt: 107.3, llamaGeneration: 11.8, mlxGeneration: 19.0 },
  { id: "gemma4-31b", name: "Gemma 4 31B", family: "gemma", llamaPrompt: 127.5, mlxPrompt: 91.6, llamaGeneration: 16.5, mlxGeneration: 14.9 },
  { id: "qwen36-35b-a3b", name: "Qwen3.6-35B-A3B", family: "qwen", llamaPrompt: 891.7, mlxPrompt: 636.3, llamaGeneration: 54.5, mlxGeneration: 67.8 },
];

for (const model of bishalModels) {
  for (const engine of ["llamacpp", "mlx"] as const) {
    const isLlama = engine === "llamacpp";
    const quantization = isLlama ? (model.family === "qwen" ? "Q4_K_M" : "QAT q4_0") : "Affine 4-bit, grupo 64";
    for (const stage of ["generation", "prompt"] as const) {
      const generation = stage === "generation";
      const workloadId = `${model.id}-${engine}-4bit-${stage}-2026`;
      const stageLabel = generation ? "Geração de 128 tokens" : "Prompt de 512 tokens";
      const value = isLlama
        ? (generation ? model.llamaGeneration : model.llamaPrompt)
        : (generation ? model.mlxGeneration : model.mlxPrompt);
      expandedLlmWorkloads.push({
        id: workloadId, category: "llms", name: model.name,
        subtitle: `${isLlama ? quantization : "MLX 4-bit"} · ${stageLabel}`, metric: "tokens/s", higherIsBetter: true,
        description: `Baseline de ${isLlama ? "llama-bench" : "MLX"}, sem especulação, publicado por Bishal Sapkota em setembro de 2026. Média de duas repetições. Arquivo quantizado e comando completo não publicados.`,
        sourceUrl: bishalArticle,
      });
      expandedLlmBenchmarks.push({
        id: `${workloadId}-mbp-m1max32-bishal`, deviceId: "mbp16-m1max-32",
        workloadId, value, sourceId: "bishal-m1max32-2026",
        testedStorageGb: null, testedScreenInches: null,
        reportedHardware: "MacBook Pro (2021), M1 Max, CPU 10, GPU 32, RAM 32 GB; tamanho da tela e SSD não informados",
        conditions: {
          "Modelo": model.name, "Quantização": quantization,
          "Runtime": isLlama ? "llama.cpp / llama-bench 0.4.1" : "mlx 0.32.2 / mlx-lm 0.32.0 (git)",
          "Build": isLlama ? "10964; commit b29c606e2" : "mlx-lm commit 872ae88d1fac",
          ...(isLlama ? { "Backend": "Metal" } : { "Python": "3.13.12" }),
          "Teste": stageLabel, "Decodificação especulativa": "Desativada",
          "Repetições": "2; média publicada", "Fluxos simultâneos": "1",
          "Sistema": "macOS 26.6 (25G5065a)", "Energia": "Tomada; High Power Mode",
          "Período da medição": "15–16/09/2026",
        },
        quality: "partial", comparabilityKey: null,
        missingFields: ["Arquivo e revisão dos pesos", "Comando completo do benchmark", "Batch", "Janela máxima de contexto", "Variação entre repetições", "Tamanho da tela", "SSD"],
        notes: "Medição do autor no próprio MacBook; sem reprodução independente. Dados da tabela de baseline original, não do teste separado llama-server/MTP com saída de 300 tokens. GGUF e MLX têm quantizações distintas; não são protocolos equivalentes. O artigo não identifica o arquivo quantizado. Não se presume que o ensaio de geração use 512 tokens de contexto." + (model.id === "qwen38-27b" ? " O autor informa tensores de 6/8 bits no GGUF e 4 bits nas projeções correspondentes em MLX." : "") + (model.family === "gemma" && !isLlama ? " O autor informa que as medições Gemma/MLX vieram de execução anterior, nas mesmas condições e build." : ""),
      });
    }
  }
}
