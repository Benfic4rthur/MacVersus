import type { Workload } from "@/lib/types";

// These are selectable research targets, not fabricated benchmark results.
// Their inclusion never creates a measurement. New records need a source and
// exact hardware/protocol before the application can display any numeric result.
export const additionalWorkloads: Workload[] = [
  { id: "crimson-desert-1080-medium", category: "games", name: "Crimson Desert", subtitle: "1080p · Médio · Sem geração de quadros", metric: "fps", higherIsBetter: true,
    description: "Protocolo de pesquisa: macOS, saída 1920 × 1080, preset médio e geração de quadros desligada. A resolução interna e o modo MetalFX precisam ser publicados. As metas da desenvolvedora não são benchmarks de uma configuração específica; ainda não há medição verificada na base.",
    sourceUrl: "https://crimsondesert.pearlabyss.com/en-US/News/Notice/Detail?_boardNo=62" },
  { id: "xcode-clean-build", category: "apps", name: "Xcode", subtitle: "XcodeBenchmark · Compilação limpa", metric: "seconds", higherIsBetter: false,
    description: "Tempo de compilação limpa do projeto XcodeBenchmark. A comparação exige a mesma versão do Xcode, commit do projeto, macOS e procedimento. Ainda não há medição revisada para este protocolo na base.", sourceUrl: "https://github.com/devMEremenko/XcodeBenchmark" },
  { id: "resolve-4k-timeline", category: "apps", name: "DaVinci Resolve", subtitle: "Timeline 4K · Reprodução", metric: "fps", higherIsBetter: true,
    description: "Quadros efetivamente reproduzidos na timeline. Para registrar uma medição são necessários o projeto, codec, efeitos, resolução, mídia, versão do aplicativo e modo de cache. Ainda não há projeto e medição revisados; resolução 4K sozinha não define um teste comparável.", sourceUrl: "https://www.blackmagicdesign.com/products/davinciresolve" },
  { id: "final-cut-export", category: "apps", name: "Final Cut Pro", subtitle: "Projeto 4K · Exportação", metric: "seconds", higherIsBetter: false,
    description: "Tempo de exportação de um projeto 4K. Duração, mídia, codec de saída, efeitos, versão do Final Cut e cache devem acompanhar a publicação. Ainda não há medição revisada para este protocolo na base.", sourceUrl: "https://www.apple.com/final-cut-pro/" },
  { id: "data-export", category: "apps", name: "Exportação de dados", subtitle: "Dataset e procedimento documentados", metric: "seconds", higherIsBetter: false,
    description: "Tempo de exportação de um conjunto de dados. Volume, formato, software, versão, transformações, armazenamento e cache precisam coincidir. Ainda não há dataset e medições revisados na base." },
  { id: "ssd-read", category: "apps", name: "SSD · Leitura", subtitle: "Sequencial · MB/s", metric: "MB/s", higherIsBetter: true,
    description: "Velocidade de leitura sequencial medida no SSD interno. Capacidade, ferramenta, versão, tamanho do arquivo, espaço livre e cache fazem parte do protocolo. Ainda não há medição revisada na base." },
  { id: "ssd-write", category: "apps", name: "SSD · Gravação", subtitle: "Sequencial · MB/s", metric: "MB/s", higherIsBetter: true,
    description: "Velocidade de gravação sequencial medida no SSD interno. Capacidade não é velocidade: não estimamos MB/s a partir do tamanho do disco. Ferramenta, arquivo, espaço livre e cache devem ser documentados." },
];
