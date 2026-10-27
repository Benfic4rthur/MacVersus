import type { Workload } from "@/lib/types";

// Selectable workloads. Numeric observations are separate, sourced records;
// merely adding a workload never creates a result.
export const additionalWorkloads: Workload[] = [
  { id: "crimson-desert-1080-medium", category: "games", name: "Crimson Desert", subtitle: "1080p · Médio · Sem geração de quadros", metric: "fps", higherIsBetter: true,
    description: "Protocolo de pesquisa: macOS, saída 1920 × 1080, preset médio e geração de quadros desligada. A resolução interna e o modo MetalFX precisam ser publicados. As metas da desenvolvedora não são benchmarks de uma configuração específica; ainda não há medição verificada na base.",
    sourceUrl: "https://crimsondesert.pearlabyss.com/en-US/News/Notice/Detail?_boardNo=62" },
  { id: "xcode-clean-build", category: "apps", name: "Xcode", subtitle: "XcodeBenchmark · Compilação limpa", metric: "seconds", higherIsBetter: false,
    description: "Tempo de compilação limpa do projeto XcodeBenchmark. Cada resultado identifica Xcode e macOS; versões diferentes não são equivalentes. As submissões da comunidade nem sempre informam o commit e as repetições.", sourceUrl: "https://github.com/devMEremenko/XcodeBenchmark" },
  { id: "resolve-4k-timeline", category: "apps", name: "DaVinci Resolve", subtitle: "Timeline 4K · Reprodução", metric: "fps", higherIsBetter: true,
    description: "Quadros efetivamente reproduzidos na timeline. Para registrar uma medição são necessários o projeto, codec, efeitos, resolução, mídia, versão do aplicativo e modo de cache. Ainda não há projeto e medição revisados; resolução 4K sozinha não define um teste comparável.", sourceUrl: "https://www.blackmagicdesign.com/products/davinciresolve" },
  { id: "final-cut-export", category: "apps", name: "Final Cut Pro", subtitle: "Vídeo de 6 min em 4K · MacRumors", metric: "seconds", higherIsBetter: false,
    description: "Exportação do vídeo de seis minutos em 4K usado pela MacRumors em novembro de 2021. Versão do aplicativo, codec e projeto completo não foram publicados. Os tempos pertencem a esse teste específico.", sourceUrl: "https://www.macrumors.com/2021/11/03/m1-pro-vs-m1-max-performance-test/" },
  { id: "data-export", category: "apps", name: "Exportação de dados", subtitle: "Dataset e procedimento documentados", metric: "seconds", higherIsBetter: false,
    description: "Tempo de exportação de um conjunto de dados. Volume, formato, software, versão, transformações, armazenamento e cache precisam coincidir. Ainda não há dataset e medições revisados na base." },
  { id: "ssd-read", category: "apps", name: "SSD · Leitura", subtitle: "Sustentada · MB/s", metric: "MB/s", higherIsBetter: true,
    description: "Velocidade de leitura sustentada publicada para o SSD indicado. Ferramenta, tamanho do arquivo, espaço livre e cache precisam ser conferidos. Não transferimos a taxa medida para outra capacidade." },
  { id: "ssd-write", category: "apps", name: "SSD · Gravação", subtitle: "Sustentada · MB/s", metric: "MB/s", higherIsBetter: true,
    description: "Velocidade de gravação sustentada publicada para o SSD indicado. Capacidade não determina velocidade: não estimamos MB/s a partir do tamanho do disco. Os parâmetros ausentes ficam identificados em cada medição." },
];
