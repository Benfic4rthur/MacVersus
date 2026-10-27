# Verificação e limites desta versão

Revisão: **27/10/2026**. Este registro descreve o que foi implementado e verificado. O GitHub Pages está ativo em [benfic4rthur.github.io/MacVersus](https://benfic4rthur.github.io/MacVersus/).

## Cobertura dos dados

A base incluída no projeto contém **169 entradas de hardware, 17 protocolos, 23 medições e 6 registros de fontes**. Existem medições para seis configurações específicas. As demais entradas oferecem ficha técnica e seleção de hardware, sem resultados estimados.

| Categoria | Protocolos cadastrados | Medições publicadas | Configurações com medição |
| --- | ---: | ---: | ---: |
| Jogos | 5 | 11 | 4 |
| IA local | 3 | 6 | 2 |
| Criação e aplicativos | 9 | 6 | 4 |

As contagens vêm de [catalog.ts](../src/data/catalog.ts), [catalog-devices.ts](../src/data/catalog-devices.ts) e [intel-benchmarks.ts](../src/data/intel-benchmarks.ts). Uma mesma configuração pode aparecer em mais de uma categoria. Protocolos cadastrados sem medição são alvos de pesquisa, não testes executados.

As 23 medições iniciais possuem condições parcialmente documentadas. A interface mostra os valores publicados e suas limitações, sem declarar vencedor ou vantagem percentual. O radar representa capacidades de hardware, com uma escala por eixo; não é uma previsão de FPS, tokens/s ou tempo de exportação. Jogos em Boot Camp preservam esse ambiente, separado dos registros em macOS.

Chip, CPU, GPU, RAM, família, ano e tela precisam corresponder à máquina testada. Para FPS e tokens/s, um SSD diferente ou não informado não esconde a medição: o registro aparece como referência, com a capacidade testada identificada, e um teste com SSD correspondente tem prioridade. Essa referência não recebe vencedor nem vantagem percentual. Testes de disco e dos demais aplicativos continuam exigindo correspondência de SSD. Um SSD desconhecido não passa a ser tratado como uma capacidade conhecida. Modelos novos no catálogo não recebem automaticamente resultados de chips anteriores. As fontes e datas originais estão em [sources.md](sources.md).

## Verificações realizadas

- O TypeScript foi validado sem erros nas verificações registradas desta revisão.
- O build de produção do Next.js 16.4.3 foi concluído, incluindo a página e as rotas de benchmarks, ofertas e pesquisa.
- A prévia estática foi gerada com esbuild. O HTML referencia os bundles de JavaScript e CSS com hash e os arquivos locais de imagem e marca.
- A prévia foi aberta no navegador sob `/MacVersus/`: fotos, configurações, seleção de tarefa, compartilhamento e acionamento da exportação CSV funcionaram. O filtro de usados retirou a oferta nova do Air e preservou o candidato usado do eBay, com preço observado em USD separado do ranking BRL.
- Os testes cobrem comparabilidade, integridade das referências, configurações, atualizações da base, consultas de pesquisa e ofertas. As verificações específicas de ofertas incluem correspondência exata, preço à vista, ordenação, duplicação, validade, condição desconhecida, variantes e proteção de rede.
- Os cinco anúncios cadastrados foram confrontados com suas configurações. A extração de preço e identidade foi validada nos HTMLs reais de duas páginas da Eletrohorse e de uma página do KaBuM.
- A ampliação de marketplaces passou por 14 testes de ofertas e 7 de descoberta, com TypeScript validado. Os casos incluem SSD explicitamente desconhecido, filtro de condição antes do top 3, conflitos de hardware, URLs de anúncios, proteção de acesso, cache, limite de consultas, erros do provedor e expiração de preço em USD mesmo em cache. A Tavily foi simulada nesses testes.
- A correção de correspondência de SSD passou pelos oito arquivos da suíte de testes, pela validação TypeScript e pela geração estática. No navegador, o M1 Max de 64 GB selecionado com SSD de 1 TB exibiu 97 FPS em Shadow of the Tomb Raider, identificando o SSD de 2 TB da fonte. Na comparação de Llama 2 Q4, os valores de 14,19 e 35,45 tokens/s permaneceram após selecionar 1 TB e 2 TB, com SSD da fonte explicitamente desconhecido. A abertura sem seleção também foi conferida. Os testes de regressão preservam a correspondência de CPU/GPU/RAM, priorizam SSD exato e mantêm testes de disco, aplicativos e ofertas estritos.
- O menor SSD documentado passou a ser selecionado automaticamente ao escolher um Mac. As 169 entradas do catálogo possuem um padrão válido; 12 testes de configuração cobrem também esse comportamento e os links compartilhados. No navegador, a escolha normal do M1 Max preencheu 1 TB, uma troca manual para 2 TB persistiu após recarregar, e o preset Air M5 versus M1 Max preencheu 512 GB e 1 TB. O seletor permite alterações sem exigir um passo extra. A capacidade desconhecida nas fontes continua preservada separadamente.

**Limite da validação externa:** a tentativa de consultar a Eletrohorse diretamente pelo cliente HTTPS do Node retornou `EAI_AGAIN` na resolução DNS deste ambiente. O parser foi validado com HTML real previamente obtido, mas a atualização completa pela rede não foi confirmada aqui. A consulta paga da Tavily depende de credencial do administrador e foi testada com respostas controladas, sem consumo de uma conta externa.

## Ofertas

A base inicial possui cinco anúncios revisados, dos quais três fornecem identidade e dados estruturados compatíveis com a atualização implementada. Os dois anúncios da Lucas Importados dependem de nova conferência manual.

O ranking apresenta até três menores preços à vista **entre as ofertas verificadas da configuração exata**. Não cobre todas as lojas. Frete não informado permanece desconhecido; condição não declarada permanece “Não informada”. Ofertas com mais de 24 horas, sem estoque confirmado ou sem dados suficientes deixam o ranking. A data exibida é a conferência real, nunca a simples abertura da página. Veja [market-sources.md](market-sources.md).

Há também um anúncio internacional do eBay revisado, exibido separadamente e apenas para o hardware exato. Seu preço observado é em USD, sem confirmação de envio ou custo final no Brasil, e desaparece após 24 horas. A descoberta de novos anúncios de OLX, Mercado Livre, eBay e Shopee retorna candidatos, nunca ofertas automaticamente verificadas.

## Prévia no GitHub Pages

A prévia usa o mesmo comparador em modo estático. O gerador é:

```sh
node scripts/build-preview.mjs
```

A saída é preparada em `docs/index.html`, `docs/assets/`, `docs/images/`, `docs/brand/` e `docs/.nojekyll`, com caminho base `/MacVersus/`. Após modificar componentes ou dados, o bundle precisa ser gerado novamente e seus arquivos enviados ao repositório.

| Recurso | Prévia estática | Aplicação Next.js com servidor |
| --- | --- | --- |
| Seleção, radar, detalhes, fontes, CSV e link compartilhável | Disponível | Disponível |
| Novos benchmarks | Snapshot da publicação; o botão recarrega a página | Base local e feed revisado opcional |
| Pesquisa integrada da Tavily | Indisponível; fontes da base e links externos | Disponível com chave no servidor |
| Anúncios dos marketplaces | Links externos e candidatos revisados publicados | Também permite descoberta opcional de candidatos |
| Ofertas | Snapshot exato, respeitando a validade de 24 horas | Snapshot e revisão de páginas compatíveis |
| Atualização de preço na loja | Indisponível | Implementada para páginas previamente revisadas |
| Rotas `/api/*` | Indisponíveis | Disponíveis |

O modo estático não contém chaves, não consulta as rotas do Next.js e não apresenta uma recarga como nova verificação de loja. Depois que as ofertas do snapshot vencem, permanecem os links externos de pesquisa.

### Fonte de publicação

Em **Settings > Pages > Build and deployment**, a configuração é **Source: Deploy from a branch**, **Branch: main**, **Folder: /docs**. A ativação foi confirmada nas configurações e a página pública foi aberta no navegador em `https://benfic4rthur.github.io/MacVersus/`.

Nenhum workflow de CI ou de GitHub Actions foi criado no repositório para gerar essa prévia. O GitHub executa sua própria etapa interna de implantação do Pages, inclusive quando a fonte é uma branch. Consulte a [documentação oficial de publicação](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) e a [descrição do serviço estático](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).
