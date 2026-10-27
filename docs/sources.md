# Fontes e limites da base

Revisão de fontes: 27/10/2026. A data de revisão não altera a data original da medição.

## Medições

| Fonte | Configuração testada | Publicação | Testes |
| --- | --- | --- | --- |
| [Notebookcheck, M1 Pro](https://www.notebookcheck.net/Apple-MacBook-Pro-16-2021-M1-Pro-in-Review-The-best-Multimedia-Laptop-for-Content-Creators.579013.0.html) | Pro 16 de 2021, CPU 10, GPU 16, RAM 16 GB, SSD 1 TB | 13/11/2021 | Shadow of the Tomb Raider, Total War, Blender e PugetBench Export |
| [Notebookcheck, M1 Max](https://www.notebookcheck.net/Apple-MacBook-Pro-16-2021-M1-Max-Laptop-Review-Full-Performance-without-Throttling.581437.0.html) | Pro 16 de 2021, CPU 10, GPU 32, RAM 64 GB, SSD 2 TB | 25/11/2021 | Os mesmos testes |
| [llama.cpp #4167, TimoLassmann](https://github.com/ggml-org/llama.cpp/discussions/4167?sort=top) | Air M1, CPU 8, GPU 7, RAM 16 GB; SSD desconhecido | 15/12/2023 | Llama 2 7B, Q4_0 e Q8_0, Metal |
| [llama.cpp #4167, Ueda-Yoshiki-121](https://github.com/ggml-org/llama.cpp/discussions/4167?sort=top) | Pro 14 M1 Pro, CPU 8, GPU 14, RAM 16 GB; SSD desconhecido | 17/12/2023 | Llama 2 7B, Q4_0 e Q8_0, Metal |
| [Notebookcheck, Intel i9](https://www.notebookcheck.net/Apple-MacBook-Pro-16-2019-Laptop-Review-A-convincing-Core-i9-9880H-and-Radeon-Pro-5500M-powered-multimedia-laptop.445902.0.html) | Pro 16 de 2019, Core i9-9880H, Radeon Pro 5500M 4 GB, RAM 16 GB, SSD 1 TB | 05/12/2019 | Jogos publicados em Windows 10 por Boot Camp |
| [Notebookcheck, Intel i5](https://www.notebookcheck.net/MacBook-Pro-13-2020-in-Review-Apple-s-subnotebook-only-gets-the-mandatory-update.467617.0.html) | Pro 13 de 2020, quatro portas, Core i5-1038NG7, Iris Plus, RAM 16 GB, SSD 512 GB | 02/06/2020 | F1 2019 e exportação de documentos no LibreOffice |
| [The Verge, 2021](https://www.theverge.com/22751921/apple-macbook-pro-14-16-inch-2021-m1-pro-max-review) | M1 Pro GPU 16/32 GB em 14 e 16 pol.; M1 Max GPU 32/64 GB em 16 pol. | 29/10/2021 | Shadow, Highest, 1920 × 1200 |
| [Reviewed](https://www.reviewed.com/laptops/content/apple-macbook-pro-16-m1-max-review) | Pro 16, M1 Max CPU 10/GPU 32/32 GB/1 TB | 12/01/2022 | Shadow, Warhammer II e Civilization VI, 1080p |
| [Digital Trends](https://www.digitaltrends.com/computing/apple-macbook-pro-m1-pro-review/) | Pro 16, M1 Pro CPU 10/GPU 16/32 GB/2 TB | Página datada de 06/11/2023 | Rise of the Tomb Raider e Civilization VI |
| [MacRumors](https://www.macrumors.com/2021/11/03/m1-pro-vs-m1-max-performance-test/) | Pro 14 M1 Pro CPU 8/GPU 14/16 GB/512 GB; Pro 16 M1 Max CPU 10/GPU 32/32 GB/1 TB | 03/11/2021 | Final Cut: exportação de vídeo de seis minutos em 4K; Blender Classroom |
| [XcodeBenchmark](https://github.com/devMEremenko/XcodeBenchmark/blob/master/ReadMe.md#xcode-15) | Pro 16 M1 Pro CPU 10/32 GB, SSD 512 GB ou 1 TB | Datas individuais ausentes | Xcode 15.0/macOS 13.5.2 e Xcode 15.0.1/macOS 14.1 |
| [The Verge, 2026](https://www.theverge.com/tech/898062/apple-macbook-pro-16-m5-max-m1-comparison-review) | Pro 16: M1 Pro 16 GB/1 TB, M1 Max 32 GB/1 TB, M5 Max 128 GB/4 TB | 21/03/2026 | Premiere 4K e leitura/gravação sustentadas do SSD |
| [ggerganov: log](https://github.com/ggml-org/llama.cpp/discussions/4167) e [RAM](https://github.com/ggml-org/llama.cpp/discussions/4167#discussioncomment-7685400) | M1 Pro CPU 10/GPU 16; RAM 32 GB declarada depois pelo mesmo autor; tela e SSD ausentes | 22 e 27/11/2023 | Llama 2 Q4_0/Q8_0, prompt e geração |
| [CedricYauLBD](https://github.com/ggml-org/llama.cpp/discussions/4167#discussioncomment-7664196) | Pro 16 M1 Max CPU 10/GPU 32/64 GB; SSD ausente | 25/11/2023 | Llama 2; build e9c13ff |
| [rlippmann](https://github.com/ggml-org/llama.cpp/discussions/4167#discussioncomment-7670696) | Pro 16 M2 Max CPU 12/GPU 38/32 GB; SSD ausente | 26/11/2023 | Llama 2; build 22da055 |
| [itsmostafa, revisão fixada](https://github.com/itsmostafa/inference-speed-tests/blob/2798b0cb77f27102dc1582cad30e5448e9c4c6bb/README.md) | MacBook Pro M1 Pro GPU 16/32 GB e M4 Max GPU 40/128 GB; tela/SSD ausentes | 28/02/2025 | Qwen2.5 7B/14B/32B, MLX 4-bit, LM Studio |
| [Bishal Sapkota](https://bishal.io/blog/six-local-models-m1-max-llama-cpp-vs-mlx/) | MacBook Pro 2021 M1 Max CPU 10/GPU 32/32 GB; tela/SSD ausentes | 16/09/2026 | Seis modelos, llama.cpp/MLX, prompt/geração sem especulação |

Os links do GitHub abrem a discussão na ordenação que expõe os relatos. Procure pelo autor e pela data indicados. A síntese por chip da discussão também reúne Mac mini e Mac Studio; por isso ela não foi atribuída automaticamente a MacBooks.

## Condições preservadas

- Jogos: resolução, preset e antisserrilhamento quando disponíveis. Versão do jogo e API gráfica não foram publicadas nesses resultados.
- Blender: versão 2.79, cena BMW27 e renderização por CPU. A fonte não explicita a arquitetura do executável.
- Premiere: pontuação de exportação do PugetBench 0.9. O review informa execução da versão Intel pelo Rosetta 2. Não há tempo de exportação em segundos nessa métrica.
- LLMs: cada registro conserva o runtime e o commit publicados. Nos logs de llama-bench, `tg128` mede geração de 128 tokens e `pp512` processamento de prompt de 512 tokens; são testes separados. Não se atribui contexto de 512 tokens ao teste `tg128`, e o parâmetro `n_batch` não é presumido a partir desses nomes.
- Intel: o ambiente de Boot Camp é identificado quando a fonte o declara. O sistema dos resultados de F1 no Pro 13 e de LibreOffice permanece desconhecido. O resultado de Blender do Pro 16 Intel vem da tabela comparativa do review do M1 Pro de 2021; a data da medição original e o sistema dessa linha não são presumidos.

Todos os registros mantêm `quality: "partial"`, pois há condições não documentadas. Uma `comparabilityKey` histórica compartilhada não elimina as limitações descritas em `missingFields` e `notes`; novos registros parciais usam chave nula. Não há medição local, extrapolação por núcleos nem estimativa de modelos diferentes. Relatos pessoais e comunitários não são apresentados como reprodução independente.

## Cuidados na ampliação

- Shadow: os dados de 32 GB usam 1200p no Pro e 1080p no Max. A interface mostra ambas as resoluções e não calcula vantagem.
- Civilization VI: a Digital Trends não informa a resolução; o campo permanece desconhecido.
- Llama 2: cada autor conserva seu build original. A RAM do ggerganov é uma associação entre dois relatos dele, explicitamente descrita. `tg128` e `pp512` não determinam o parâmetro `n_batch` individual.
- itsmostafa: CPU 10 do M1 Pro e CPU 16 do M4 Max são identificadas pelas variantes Apple compatíveis com as GPUs publicadas; as contagens não foram atribuídas ao autor. O README consultado foi fixado em um commit.
- Bishal: foram incluídos os valores da tabela de baseline de 512/128 tokens, não os do experimento separado de servidor/MTP. Quantizações de GGUF e MLX e suas limitações permanecem separadas. Arquivos quantizados não publicados não foram inventados.
- Xcode: GPU 16 do M1 Pro de 16 pol. é identificável pela variante única da ficha Apple. Registros de M1 Max sem contagem de GPU não foram importados como se fossem GPU 32.

## Especificações oficiais dos primeiros dispositivos

| Família | Fonte Apple |
| --- | --- |
| MacBook Pro 16, M1 Pro e M1 Max | [2021](https://support.apple.com/en-us/111901) |
| MacBook Pro 14, M1 Pro | [2021](https://support.apple.com/en-us/111902) |
| MacBook Air M1 | [2020](https://support.apple.com/en-us/111883) |
| MacBook Pro 16, M2 Pro e M2 Max | [2023](https://support.apple.com/en-us/111838) |
| MacBook Pro 16, M3 Pro | [Novembro de 2023](https://support.apple.com/en-us/117737) |
| MacBook Pro 14, M3 Max | [Novembro de 2023](https://support.apple.com/en-us/117736) |
| MacBook Pro 16, M4 Pro e M4 Max | [2024](https://support.apple.com/en-us/121554) |

As configurações M1 Pro e M1 Max com 32 GB agora têm fontes próprias. Quando a opção de referências está ligada, testes de RAM ou tela diferentes podem aparecer com a diferença identificada ao lado do número; nunca se tornam medições da RAM selecionada. Nos relatos de LLMs, `testedStorageGb` permanece `null`; `testedScreenInches` também é `null` quando o autor não informa a tela. Os demais modelos do catálogo indicam sua própria ficha oficial.

Ao selecionar outra capacidade de SSD, FPS e tokens/s do mesmo chip, CPU, GPU, RAM, família, ano e tela continuam disponíveis como referência. A interface informa a capacidade testada ou sua ausência na fonte. Isso preserva o hardware original, sem alterar o registro, estimar um novo resultado ou atribuir outra RAM. Se houver medição com a capacidade selecionada, ela tem prioridade. As demais métricas continuam exigindo correspondência de SSD.
