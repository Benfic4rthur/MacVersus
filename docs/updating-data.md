# Atualização da base de benchmarks

A base combina o catálogo incluído no projeto com `src/data/reviewed-updates.json`. Um feed remoto opcional permite receber dados revisados sem publicar uma nova versão do aplicativo. O aplicativo não transforma resumos de buscas em resultados numéricos.

## Arquivo local

O arquivo `src/data/reviewed-updates.json` começa vazio, com `schemaVersion: 1`, `updatedAt` em `YYYY-MM-DD` e as listas `devices`, `workloads`, `benchmarks` e `sources`. Use as interfaces de `src/lib/types.ts` e registros existentes de `src/data/catalog.ts` como referência. Inclua somente os registros novos ou corrigidos; referências aos IDs existentes continuam válidas. Não substitua uma configuração por outra mantendo o mesmo ID.

Cada medição precisa de hardware exato, teste, valor positivo, condições, fonte HTTPS e descrição do equipamento. Dados desconhecidos devem continuar `null` quando o campo permite, ou ser identificados em `missingFields`. Não use zero para significar ausência. Nos feeds de atualização, registros parciais exigem `quality: "partial"`, `missingFields` preenchido e `comparabilityKey: null`. Algumas entradas históricas da base incluída preservam uma chave nominal; essa chave não autoriza calcular vantagens e não deve ser copiada para novos registros parciais do feed.

Os campos opcionais `testedStorageGb` e `testedScreenInches` preservam a capacidade e a tela efetivamente publicadas para uma observação. Campo ausente herda o dispositivo; `null` significa que a fonte não informou, e nunca deve ser substituído pela configuração do catálogo. Use um novo ID de medição para outro teste em outro SSD. `storageReference` e `hardwareReference` são calculados durante a seleção e são rejeitados no feed. Só FPS de jogos e tokens/s podem aparecer como referências de RAM/tela próximas quando o visitante permite; apps e ofertas continuam exigindo a configuração correspondente.

`quality: "documented"` exige condições conhecidas, nenhuma informação ausente e um protocolo explícito. Um mesmo protocolo não pode representar testes ou condições diferentes. O validador verifica essas regras estruturais. Ele não verifica a veracidade de uma página nem certifica que os testes foram executados: essa conferência permanece responsabilidade do curador.

## Validação local opcional

É possível validar um arquivo sem rede, sem modificar o repositório e sem GitHub Actions:

```sh
node --import tsx scripts/validate-data.ts src/data/reviewed-updates.json
```

O comando sai com código 1 quando rejeita o arquivo. Esta ferramenta é opcional para quem mantém os dados; não faz parte do envio do projeto ao GitHub. Não há workflow de CI neste projeto.

## Feed remoto

Defina `BENCHMARK_DATA_URL` no servidor com a URL HTTPS de um arquivo JSON em um repositório público do GitHub, no formato `https://raw.githubusercontent.com/OWNER/REPO/REF/caminho/feed.json`. `REF` pode ser uma branch atualizável ou um commit específico para fixar uma revisão. Repositórios privados não são acessados por esta integração e nenhum token é enviado. A configuração não é exposta como parâmetro público da API.

Somente `raw.githubusercontent.com` é aceito. URLs com credenciais, parâmetros, redirecionamentos, hosts internos ou protocolos diferentes de HTTPS são rejeitadas. A resposta tem limite de 2 MiB e prazo de 8 segundos, incluindo a leitura do conteúdo. O feed é combinado com a base local após validação integral, sem aplicação parcial de arquivos inválidos.

Há cache em memória por até 10 minutos e deduplicação de consultas simultâneas no mesmo processo. Falhas têm intervalo mínimo de 1 minuto entre tentativas. Se uma atualização falhar, a última versão válida permanece por até 24 horas; depois disso, o aplicativo usa a base incluída no projeto. Reinícios, novas instâncias ou deploys podem descartar esse cache. A disponibilidade da base local não depende do feed.

A página usa `loadDataset()` no servidor. `GET /api/benchmarks` também carrega a base atual e inclui `metadata.update` com a origem, a data da consulta e a mensagem de estado. A atualização de `updatedAt` representa revisão da base, não uma nova execução de todos os benchmarks.

## Identidade e correções

IDs de dispositivos não podem mudar chip, CPU, GPU, VRAM, RAM, SSD, tela ou demais características físicas. Crie um novo ID para outra configuração de processamento ou RAM. Observações do mesmo hardware com SSD diferente devem registrar `testedStorageGb`, sem reescrever o dispositivo; tela não publicada deve registrar `testedScreenInches: null`. IDs de testes preservam categoria, nome, preset, unidade e direção da métrica. IDs de fontes preservam URL e publicador. IDs de medições preservam os vínculos de hardware, teste e fonte; correções de valor e contexto exigem conferência da evidência original.

O feed pode acrescentar dados ao comparador e corrigir registros existentes. Não executa código, não elimina registros antigos, não publica conteúdo e não busca anúncios. A pesquisa na web e a verificação de ofertas continuam integrações separadas.

Na prévia estática do GitHub Pages, o conjunto de dados acompanha o bundle publicado. Atualizar o JSON de origem exige gerar novamente `docs/` com `node scripts/build-preview.mjs` e enviar os arquivos resultantes. A prévia não executa o carregador de feed do servidor.

Referências oficiais: [fetch e AbortSignal no Node.js](https://nodejs.org/api/globals.html#fetch) e [links de arquivos e revisões no GitHub](https://docs.github.com/en/repositories/working-with-files/using-files/getting-permanent-links-to-files).
