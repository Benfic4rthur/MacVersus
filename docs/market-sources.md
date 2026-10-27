# Fontes de ofertas e armazenamento

Revisão: **27/10/2026, 15:07–15:09 UTC**. A pesquisa identificou anúncios públicos no Brasil. As páginas completas foram lidas e os respectivos HTMLs e dados estruturados foram conferidos; resultados de busca serviram apenas para localizar candidatos.

## Ofertas incluídas

Os registros completos e URLs ficam em `src/data/offers.ts`. Os preços são os valores à vista anunciados, sem frete. “Menores preços” significa ordenação entre as ofertas verificadas da configuração selecionada; a coleta não cobre todo o mercado. Condição e disponibilidade pertencem ao anúncio, não às especificações Apple.

| Configuração exata | Loja | À vista | Condição | Disponibilidade observada | Fonte |
|---|---|---:|---|---|---|
| Air M5, 13,6″, CPU 10, GPU 10, RAM 24 GB, SSD 1 TB | Eletrohorse Marketplace | R$ 11.999,00 no Pix | Novo, lacrado | InStock na variante 53571167519061 | [Página](https://eletrohorse.com.br/pt-br/products/macbook-air-m5-de-13-6-polegadas-24gb-ram-1tb-ssd-cpu-de-10-nucleos-e-gpu-de-10-nucleos?variant=53571167519061) |
| Air M5, 15,3″, CPU 10, GPU 10, RAM 24 GB, SSD 1 TB | Eletrohorse Marketplace | R$ 12.999,00 no Pix | Novo, lacrado | InStock na variante 53571167813973 | [Página](https://eletrohorse.com.br/pt-br/products/macbook-air-m5-de-15-3-polegadas-24gb-ram-1tb-ssd-cpu-de-10-nucleos-e-gpu-de-10-nucleos?variant=53571167813973) |
| Pro M1 Pro, 16,2″, CPU 10, GPU 16, RAM 16 GB, SSD 1 TB | Lucas Importados | R$ 10.490,00 | Seminovo | InStock no JSON-LD; compra por WhatsApp | [Página](https://www.lucasimportadosportoalegre.com/product-page/macbook-pro-m1-pro-16-2-1tb-16gb-space-gray-seminovo) |
| Pro M2 Max, 14,2″, CPU 12, GPU 30, RAM 32 GB, SSD 1 TB | Lucas Importados | R$ 15.990,00 | Seminovo | InStock no JSON-LD; compra por WhatsApp | [Página](https://www.lucasimportadosportoalegre.com/product-page/macbook-pro-m2-max-14-2-1tb-ssd-32gb-space-gray-seminovo) |
| Air M5, 15,3″, CPU 10, GPU 10, RAM 24 GB, SSD 1 TB | KaBuM! | R$ 18.499,99 no Pix | Não informada explicitamente | Uma unidade na página; InStock, SKU 1014733 | [Página](https://www.kabum.com.br/produto/1014733/macbook-air-apple-15-chip-m5-cpu-de-10-nucleos-gpu-de-10-nucleos-neural-engine-de-24-nucleos-1tb-meia-noite-mdvn4bz-a) |

Nenhum frete foi presumido grátis. Nenhum preço parcelado foi convertido em preço à vista. Não foi aplicado o cupom exibido pelo KaBuM; o valor registrado é o preço Pix efetivamente publicado. A página KaBuM contém “Neural Engine de 24 núcleos”, divergente da ficha Apple; esse campo não foi reproduzido no catálogo nem usado para identificar a configuração.

## Atualização

Eletrohorse usa `ProductGroup.hasVariant`, com `@id` e URL específicos para cada variante. O nome dessa variante contém tela, CPU, GPU, RAM, SSD e condição “Novo (lacrado na caixa)”. O preço do `Offer` foi confrontado com o preço Pix visível. KaBuM possui SKU próprio e preço do `Offer` igual ao Pix visível. Os metadados de atualização exigem essas identidades e fragmentos do hardware.

As páginas Lucas não fornecem SKU ou `@id` de produto utilizável para esse contrato. Seus registros dependem de nova revisão após a janela de validade, sem atualização automática por correspondência aproximada. A indicação InStock é a declaração da loja na consulta; não representa reserva de unidade ou consulta a um estoque privado.

## Candidatos não incluídos

- KaBuM Air M5 13″ prateado, SKU 1014715: página indica produto esgotado.
- Magalu/iPlace Air M5 13″ estelar, código kj37h9cc1e: página indica indisponível.
- MonacoMac Air M5 13″, RAM 24 GB, SSD 1 TB: preço e hardware presentes, mas a revisão não fechou condição e disponibilidade da variante principal.
- BNE Store Air M5 13″, RAM 24 GB, SSD 1 TB: a ficha não informa quantidade de núcleos de GPU; não foi deduzida.
- Mac Switch M1/M2: seletores misturam RAM/SSD e não explicam a GPU da variante; não foram mapeados por aproximação.
- Anúncios OLX de M1 Max 64 GB com GPU 24 ou 32 retornaram HTTP 410 na abertura. Páginas Mercado Livre consultadas não puderam ser verificadas por HTTP 403. Nenhum valor foi importado só pelo trecho da busca.
- Não houve oferta brasileira em BRL validada para o M1 Max 16″, GPU 32, RAM 64 GB, SSD 1 TB ou 2 TB nesta coleta. Isso não significa ausência de ofertas no mercado.

## Candidato internacional revisado

Em **27/10/2026, 15:36:53 UTC**, a página [eBay 840059639965](https://www.ebay.com/itm/840059639965), do vendedor **advbroadcastsystems**, mostrava um MacBook Pro 16″ de 2021 com M1 Max, GPU 32, RAM 64 GB e SSD 1 TB, usado, por **US$ 1.350,00** na opção de compra direta. O registro está em `src/data/offer-candidates.ts`, separado das ofertas brasileiras.

O anúncio informa a GPU, RAM e SSD; a CPU de 10 núcleos e a diagonal de 16,2″ são confirmadas pela [ficha oficial Apple do modelo](https://support.apple.com/en-us/111901). A frequência de 4,50 GHz informada pelo vendedor é inconsistente e não foi utilizada. O frete exibido era para um destino americano, CEP 50307. Envio ao Brasil, frete brasileiro, impostos e custo final não foram confirmados. O preço permanece em USD, sem conversão ou participação no ranking em reais, e é ocultado após 24 horas; o link permanece para conferência.

## Descoberta nos marketplaces

OLX, Mercado Livre, eBay, Shopee e Google Shopping possuem links externos de pesquisa para a configuração selecionada. A opção inicial inclui todas as condições, com filtros de novos ou usados/seminovos. A busca integrada opcional na Tavily só ocorre após a ação de pesquisar mais ofertas, limitada aos quatro marketplaces. Ela tem cache de cinco minutos, até seis consultas novas por minuto por instância do serviço, limite de resposta e timeout de dez segundos; o token de acesso configurado para pesquisa também protege essa ação.

Títulos com incompatibilidades explícitas de chip, GPU, RAM ou SSD são descartados quando identificáveis. Ausência desses dados não prova correspondência: o resultado continua rotulado como candidato a conferir. Nenhum número de um resumo de busca se transforma em preço verificado, e nenhuma URL descoberta recebe permissão de atualização automática. No GitHub Pages, estão disponíveis apenas os links externos e os candidatos revisados incluídos na publicação.

## Capacidades de SSD documentadas

As opções abaixo refletem as seções de armazenamento das fichas Apple consultadas. Configurações padrão e alternativas de encomenda podem se sobrepor; a tabela não pretende provar que uma configuração fora da lista jamais existiu.

| Família | SSDs documentados | Fonte Apple |
|---|---|---|
| Air M1 | 128, 256, 512 GB; 1, 2 TB | [111883](https://support.apple.com/en-us/111883), inclusive a página atual em português |
| Air M5 13/15 | 512 GB; 1, 2, 4 TB | [Especificações atuais](https://www.apple.com/macbook-air/specs/) |
| Pro 13 M1/M2 | 256, 512 GB; 1, 2 TB | [M1](https://support.apple.com/pt-br/111893), [M2](https://support.apple.com/pt-br/111869) |
| Pro Intel 13 2019, quatro portas | 256, 512 GB; 1, 2 TB | [111997](https://support.apple.com/pt-br/111997) |
| Pro Intel 13 2020, quatro portas | 512 GB; 1, 2, 4 TB | [111339](https://support.apple.com/pt-br/111339) |
| Pro Intel 15 2019 | 256, 512 GB; 1, 2, 4 TB, dependendo da configuração inicial | [111941](https://support.apple.com/pt-br/111941) |
| Pro Intel 16 2019 | i7: 512 GB; 1, 2, 4, 8 TB. i9 2,3 GHz: 1, 2, 4, 8 TB | [111932](https://support.apple.com/pt-br/111932) |
| M1 Pro 14/16 | 512 GB; 1, 2, 4, 8 TB | [14″](https://support.apple.com/pt-br/111902), [16″](https://support.apple.com/pt-br/111901) |
| M1 Max 16 | 1, 2, 4, 8 TB na seção própria do chip | [111901](https://support.apple.com/pt-br/111901) |
| M2 Pro 14/16 | 512 GB; 1, 2, 4, 8 TB | [14″](https://support.apple.com/en-us/111340), [16″](https://support.apple.com/en-us/111838) |
| M2 Max 14/16 | 1, 2, 4, 8 TB na seção própria do chip | [14″](https://support.apple.com/en-us/111340), [16″](https://support.apple.com/en-us/111838) |
| M3 Pro / M4 Pro | 512 GB; 1, 2, 4 TB | [M3](https://support.apple.com/en-us/117736), [M4](https://support.apple.com/pt-br/121553) |
| M3 Max / M4 Max | 1, 2, 4, 8 TB | [M3](https://support.apple.com/en-us/117736), [M4](https://support.apple.com/pt-br/121553) |
| Pro M5 básico | 512 GB; 1, 2, 4 TB | [125405](https://support.apple.com/en-us/125405) |
| M5 Pro | 1, 2, 4 TB | [126318](https://support.apple.com/en-us/126318) |
| M5 Max | 2, 4, 8 TB | [126318](https://support.apple.com/en-us/126318) |
