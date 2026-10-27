# MacVersus

Comparador de MacBooks com interface em português, gráficos de desempenho e rastreabilidade até a publicação original. A primeira versão cobre as famílias MacBook Pro Intel de 2019/2020 e Apple Silicon de M1 a M5, inclusive Pro e Max, com variantes documentadas de CPU, GPU e RAM.

## O que já funciona

- Seleção de dois Macs, busca de configurações e filtros Intel / Apple Silicon.
- Comparação visual de jogos, IA local e aplicativos de criação.
- FPS, tokens por segundo, tempo de render/exportação e pontuações com unidades explícitas.
- Fichas técnicas com links oficiais da Apple. GPU e VRAM dos Intel são tratadas separadamente da memória unificada dos Apple Silicon.
- Detalhes de cada medição: hardware testado, condições, informações ausentes, publicação original e data.
- Compartilhamento da seleção por URL e exportação CSV com fontes.
- Descoberta de novas publicações pela API Tavily, quando configurada.
- Sem chave, consulta às fontes já pesquisadas e links externos de pesquisa, identificados claramente.
- Interface responsiva, navegação por teclado, diálogos acessíveis, animações e respeito à preferência de movimento reduzido.

## Regras dos dados

**O catálogo de hardware é maior que a base inicial de benchmarks.** A presença de um Mac na lista não significa que exista uma medição publicada para todas as tarefas.

Os números iniciais foram transcritos de testes do Notebookcheck e de relatos identificados na discussão de benchmarks do projeto llama.cpp. As especificações vêm de páginas oficiais da Apple. A base inclui publicações históricas, cuja data permanece visível; a data de consulta não representa uma nova execução do teste.

Não há geração de FPS ou tokens/s por IA, extrapolação por núcleos de GPU, atribuição de testes de Mac Studio a MacBook Pro ou transferência automática de resultados entre configurações com RAM diferente. Também não há média global misturando jogos e aplicativos.

Um percentual e um vencedor só podem ser exibidos quando os dois registros possuem o mesmo protocolo, condições documentadas e nenhuma informação ausente. Os registros iniciais com condições incompletas permanecem sinalizados como parciais, mesmo quando os números foram publicados. Jogos em Windows/Boot Camp têm esse ambiente identificado e não são tratados como equivalentes aos testes em macOS.

A descoberta na web retorna publicações, não transforma resumos de busca em medições. Inclusão no comparador exige conferir a fonte e registrar o protocolo. Consulte [a documentação das fontes](docs/sources.md).

## Executar localmente

Requer Node.js 22 ou superior; Node.js 24 é a versão usada no desenvolvimento.

```sh
npm ci
npm run dev
```

Abra `http://localhost:3000`.

Para validar e executar o build de produção:

```sh
npm test
npm run typecheck
npm run build
npm start
```

## Pesquisa na internet

Copie `.env.example` para `.env.local` e configure `TAVILY_API_KEY` no servidor. A chave não é enviada ao navegador. A documentação do provedor está em https://docs.tavily.com/documentation/api-reference/endpoint/search.

O campo opcional `RESEARCH_ACCESS_TOKEN` permite restringir a pesquisa integrada. Quando configurado, o visitante informa esse token no painel de pesquisa. Ele permanece apenas na memória da página; a aplicação não o grava no armazenamento do navegador.

A comparação e o catálogo funcionam sem essas variáveis. Sem a chave Tavily, a interface informa que está consultando as fontes da base e oferece pesquisas externas. Esta versão não possui um crawler autônomo nem atualização automática dos benchmarks.

As buscas integradas usam cache de cinco minutos, limite de resultados, timeout e limitação por processo. Para disponibilizar a pesquisa paga em uma implantação pública com várias instâncias, configure proteção de acesso e um limitador compartilhado. Consumo e limites do provedor dependem da conta configurada.

## Organização

| Caminho | Responsabilidade |
| --- | --- |
| `src/app` | Página, estilos e rotas HTTP do Next.js |
| `src/components` | Comparador, seleção de hardware, pesquisa e detalhes |
| `src/data/catalog-devices.ts` | Variantes de hardware baseadas em fichas da Apple |
| `src/data/catalog.ts` | Medições, protocolos e fontes iniciais de Apple Silicon |
| `src/data/intel-benchmarks.ts` | Medições e ambientes de execução dos Intel |
| `src/lib/comparison.ts` | Regras de comparabilidade, unidades e CSV |
| `src/lib/research.ts` | Validação, pesquisa externa, cache e proteção |
| `src/lib/types.ts` | Contrato dos dados |
| `tests` | Comparações, integridade da base e comportamento da pesquisa |

## APIs

`GET /api/benchmarks` devolve a base. Os filtros opcionais são `category=games|llms|apps` e `deviceIds=id1,id2`.

`POST /api/research` recebe `category`, `deviceIds` e `query` opcional. A resposta informa `mode: live` para consultas ao provedor e `mode: catalog` para fontes da base. Erros são retornados com status HTTP e a propriedade `error`.

## Acrescentar medições

1. Cadastre ou encontre a configuração exata da máquina, incluindo GPU e RAM.
2. Cadastre a fonte com link e datas. Confira se o dado é uma medição, e não uma previsão do autor.
3. Defina a tarefa e a unidade. Geração de texto e processamento de prompt são tarefas diferentes; pontuação não é tempo em segundos.
4. Registre sistema, versões, resolução, preset, modelo, quantização e demais condições aplicáveis. Campos desconhecidos devem continuar desconhecidos.
5. Use `quality: partial` e `missingFields` para condições ausentes. Um `comparabilityKey` igual, sozinho, não autoriza calcular vantagem.
6. Execute os testes de integridade antes de publicar a alteração.

Nenhum serviço de banco de dados ou hospedagem é necessário para a versão inicial. O projeto pode ser executado em um servidor Node.js compatível com Next.js. Uma publicação com pesquisa integrada precisa de execução no servidor; exportação puramente estática não atende essa rota.

## Documentação técnica utilizada

- Next.js: https://nextjs.org/docs/app/getting-started/installation
- Route Handlers: https://nextjs.org/docs/app/getting-started/route-handlers
- Tavily Search: https://docs.tavily.com/documentation/api-reference/endpoint/search
- Identificação de MacBooks Pro: https://support.apple.com/en-us/108052

MacVersus é um projeto independente, sem vínculo com a Apple ou com os autores das medições.
