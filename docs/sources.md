# Fontes e limites da base inicial

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

Os links do GitHub abrem a discussão na ordenação que expõe os relatos. Procure pelo autor e pela data indicados. A síntese por chip da discussão também reúne Mac mini e Mac Studio; por isso ela não foi atribuída automaticamente a MacBooks.

## Condições preservadas

- Jogos: resolução, preset e antisserrilhamento quando disponíveis. Versão do jogo e API gráfica não foram publicadas nesses resultados.
- Blender: versão 2.79, cena BMW27 e renderização por CPU. A fonte não explicita a arquitetura do executável.
- Premiere: pontuação de exportação do PugetBench 0.9. O review informa execução da versão Intel pelo Rosetta 2. Não há tempo de exportação em segundos nessa métrica.
- LLMs: commit `8e672ef (1550)`, Metal, `ngl=99`. `tg128` mede geração com batch 1; `pp512` mede processamento de prompt com batch 512. São testes separados. Não se atribui contexto de 512 tokens ao teste `tg128`.
- Intel: o ambiente de Boot Camp é identificado quando a fonte o declara. O sistema dos resultados de F1 no Pro 13 e de LibreOffice permanece desconhecido. O resultado de Blender do Pro 16 Intel vem da tabela comparativa do review do M1 Pro de 2021; a data da medição original e o sistema dessa linha não são presumidos.

Todos os registros iniciais mantêm `quality: "partial"`, pois há condições não documentadas. Uma `comparabilityKey` compartilhada identifica o mesmo protocolo nominal publicado, sem eliminar as limitações descritas em `missingFields` e `notes`. Comparações estritas devem continuar exigindo metadados completos. Não há medição local, extrapolação por núcleos, estimativa de modelos diferentes ou transferência de resultados para outra quantidade de RAM.

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

As configurações M1 Pro e M1 Max com 32 GB não herdam os benchmarks das máquinas testadas de 16 GB e 64 GB. Nos relatos de LLMs, o SSD permanece `null`; a largura de banda do Air M1 também permanece `null`, pois não consta na ficha Apple usada. Os demais modelos do catálogo devem indicar sua própria ficha oficial.
