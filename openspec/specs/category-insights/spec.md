# category-insights Specification

## Purpose
Análise de despesas de um mês por categoria: comparação com o período anterior, tendência de seis meses, orçamento, cobranças recorrentes e pontos de atenção, e a área "Categorias" do menu principal com os cartões e o detalhe de cada categoria.
## Requirements
### Requirement: Análise do mês por categoria
`GET /api/v1/category-insights?month=AAAA-MM` MUST devolver a análise de despesas do mês pedido: `month`, `previousMonth`, `isInProgress`, `totals`, `months`, `categories`, `changes`, `recurring` e `attention`. Sem `month`, MUST usar o mês atual no fuso de São Paulo. Um `month` mal formado ou posterior ao mês atual MUST ser recusado com 400 `VALIDATION_ERROR` com `month` em `details`. O gasto de cada categoria MUST ser o gasto líquido do mês, o mesmo de Orçamentos e de `/relatorios/categorias`: soma dos valores com o sinal invertido, com mínimo de zero, estornos reduzem, com lançamentos manuais e pendentes e **sem** transferências (`kind = 'transfer'`). Uma despesa sem categoria MUST contar como "Sem categoria"; uma entrada sem categoria é receita e MUST ficar de fora.

#### Scenario: Mês atual por padrão
- **WHEN** hoje é 17/11/2026 e a requisição não traz `month`
- **THEN** a resposta é de `2026-11`, com `previousMonth` `2026-10` e `isInProgress` verdadeiro

#### Scenario: Mês passado
- **WHEN** `month` é `2026-09`
- **THEN** `isInProgress` é falso e `previousMonth` é `2026-08`

#### Scenario: Mês no futuro
- **WHEN** hoje é 17/11/2026 e `month` é `2026-12`
- **THEN** a API responde 400 `VALIDATION_ERROR` com `month` em `details`

#### Scenario: Mês mal formado
- **WHEN** `month` é `novembro`
- **THEN** a API responde 400 `VALIDATION_ERROR` com `month` em `details`

#### Scenario: Transferência fora
- **WHEN** há um pagamento de fatura de R$ 1.000,00 no mês
- **THEN** ele não entra em nenhuma categoria nem em `totals`

#### Scenario: Total confere com o relatório
- **WHEN** `/relatorios/categorias` do período `2026-10` a `2026-10` mostra total de R$ 3.200,00
- **THEN** `totals.spentCents` de `2026-10` é `320000`

#### Scenario: Mês sem gasto
- **WHEN** o mês não tem nenhuma despesa
- **THEN** `categories` é vazio e `totals.spentCents` é `0`

### Requirement: Comparação com o mês anterior
`totals` MUST trazer `spentCents`, `previousSpentCents`, `variationPercent` e `comparedThroughDay`. Para um mês encerrado, a comparação MUST ser com o mês anterior inteiro e `comparedThroughDay` MUST ser nulo. Para o mês em andamento, a comparação MUST ser com o mesmo trecho do mês anterior, do dia 1 até o dia de hoje (limitado ao último dia daquele mês), e `comparedThroughDay` MUST ser esse dia. `variationPercent` MUST ser `(gasto − anterior) ÷ anterior × 100`, com uma casa decimal, e MUST ser nulo quando o anterior é `0`.

#### Scenario: Mês encerrado
- **WHEN** setembro teve R$ 3.000,00, agosto teve R$ 2.500,00 e `month` é `2026-09`
- **THEN** `previousSpentCents` é `250000`, `variationPercent` é `20` e `comparedThroughDay` é nulo

#### Scenario: Mês em andamento
- **WHEN** hoje é 17/11, novembro tem R$ 1.800,00 e outubro teve R$ 1.500,00 até o dia 17 (R$ 3.200,00 no mês todo)
- **THEN** `previousSpentCents` é `150000`, `variationPercent` é `20` e `comparedThroughDay` é `17`

#### Scenario: Dia 31 sobre mês de 30 dias
- **WHEN** hoje é 31/10 e o mês anterior, setembro, tem 30 dias
- **THEN** a comparação vai do dia 1 ao dia 30 de setembro e `comparedThroughDay` é `30`

#### Scenario: Sem gasto no mês anterior
- **WHEN** o mês anterior não teve nenhuma despesa
- **THEN** `variationPercent` é nulo

#### Scenario: Gasto caiu
- **WHEN** o gasto foi de R$ 900,00 e o anterior de R$ 1.000,00
- **THEN** `variationPercent` é `-10`

### Requirement: Todas as categorias do mês
`categories` MUST listar **todas** as categorias de despesa com gasto maior que zero no mês, mais "Sem categoria" quando houver despesa sem categoria, sem agrupar em "Outros". Cada item MUST trazer `kind` (`category` ou `uncategorized`), `categoryId` e `icon` (nulos em "Sem categoria"), `name`, `spentCents`, `percent` (fatia do total do mês, uma casa decimal), `previousSpentCents`, `variationPercent` (nulo sem base de comparação), `budget` (nulo sem limite no mês) e os dados de tendência. A lista MUST vir do maior gasto para o menor, e em empate por nome. Categorias arquivadas MUST aparecer se tiverem gasto no mês.

#### Scenario: Mais de cinco categorias
- **WHEN** o mês tem gasto em 9 categorias
- **THEN** `categories` traz as 9, sem "Outros"

#### Scenario: Ordem
- **WHEN** Mercado gastou R$ 900,00, Lazer R$ 400,00 e Assinaturas R$ 400,00
- **THEN** a ordem é Mercado, Assinaturas, Lazer (empate pelo nome)

#### Scenario: Fatia do total
- **WHEN** o total é R$ 2.000,00 e Mercado gastou R$ 900,00
- **THEN** o `percent` de Mercado é `45`

#### Scenario: Sem categoria
- **WHEN** há R$ 150,00 em despesas sem categoria
- **THEN** `categories` tem um item `uncategorized` com `spentCents` `15000`

#### Scenario: Só estornos
- **WHEN** a categoria só tem um estorno no mês
- **THEN** ela não aparece em `categories`

#### Scenario: Categoria arquivada
- **WHEN** "Educação" foi arquivada mas tem R$ 200,00 de gasto no mês
- **THEN** ela aparece em `categories`

#### Scenario: Orçamento da categoria
- **WHEN** Mercado tem limite de R$ 1.000,00 no mês e gastou R$ 900,00
- **THEN** o `budget` de Mercado é `{ limitCents: 100000, percent: 90, status: "warning" }`

#### Scenario: Sem orçamento
- **WHEN** Lazer não tem limite no mês
- **THEN** o `budget` de Lazer é nulo

#### Scenario: Orçamento sem gasto
- **WHEN** Saúde tem limite no mês e nenhum gasto
- **THEN** Saúde não aparece em `categories`

### Requirement: Tendência de seis meses
`months` MUST listar até 6 meses (`AAAA-MM`), terminando no mês pedido, do mais antigo para o mais recente, começando no mês da primeira transação guardada quando ela for posterior ao início da janela. Cada item de `categories` MUST trazer `monthlyCents` alinhado a `months` (zero nos meses sem gasto), `averageCents` (média dos meses anteriores ao pedido dentro da janela, arredondada ao centavo, nula sem nenhum) e `peak` com `month` e `cents` do maior mês da janela (o mais recente em caso de empate).

#### Scenario: Seis meses de histórico
- **WHEN** há transações desde 12 meses atrás e `month` é `2026-11`
- **THEN** `months` é de `2026-06` a `2026-11`

#### Scenario: Histórico curto
- **WHEN** a primeira transação é de `2026-09` e `month` é `2026-11`
- **THEN** `months` é `["2026-09", "2026-10", "2026-11"]`

#### Scenario: Mês sem gasto na categoria
- **WHEN** Lazer não gastou nada em `2026-08`
- **THEN** o `monthlyCents` de Lazer tem `0` na posição de `2026-08`

#### Scenario: Média dos meses anteriores
- **WHEN** Mercado gastou R$ 800,00, R$ 900,00 e R$ 1.000,00 nos 3 meses anteriores e esses são os únicos da janela
- **THEN** `averageCents` de Mercado é `90000`

#### Scenario: Primeiro mês de histórico
- **WHEN** `months` tem só o mês pedido
- **THEN** `averageCents` é nulo

#### Scenario: Maior mês
- **WHEN** Lazer gastou R$ 300,00 em agosto e R$ 500,00 em outubro, e o mês pedido é novembro
- **THEN** o `peak` de Lazer é `{ month: "2026-10", cents: 50000 }`

### Requirement: O que mudou
`changes` MUST trazer `increases` e `decreases`: até 3 itens cada, com `kind`, `categoryId`, `name`, `icon` e `differenceCents` (gasto do mês menos o do período de comparação, positivo em `increases` e negativo em `decreases`). Os itens MUST vir da maior diferença absoluta para a menor. Uma categoria que gastou no período de comparação e não gastou nada no mês MUST contar como queda do valor inteiro. Diferença zero MUST ficar de fora.

#### Scenario: Maiores altas
- **WHEN** Lazer subiu R$ 300,00, Mercado R$ 200,00, Transporte R$ 150,00 e Saúde R$ 50,00
- **THEN** `increases` traz Lazer, Mercado e Transporte, nessa ordem

#### Scenario: Categoria que zerou
- **WHEN** Educação gastou R$ 400,00 no mês anterior e nada neste mês
- **THEN** `decreases` traz Educação com `differenceCents` `-40000`

#### Scenario: Categoria nova
- **WHEN** Viagem gastou R$ 600,00 neste mês e nada no anterior
- **THEN** `increases` traz Viagem com `differenceCents` `60000`

#### Scenario: Nada mudou
- **WHEN** nenhuma categoria tem diferença
- **THEN** `increases` e `decreases` vêm vazios

### Requirement: Cobranças recorrentes
`recurring` MUST trazer `items`, `monthlyTotalCents` e `yearlyTotalCents`, com a situação de **hoje**, independente do mês pedido. Uma cobrança recorrente MUST seguir exatamente a regra do alerta de assinatura detectada: 3 ou mais saídas postadas do Open Finance com a mesma descrição normalizada e o mesmo valor, com 25 a 35 dias entre cobranças consecutivas e a última com até 45 dias, olhando os últimos 7 meses; parcelas, transferências, valores abaixo de R$ 5,00, pendentes e lançamentos manuais ficam de fora. A regra MUST ter uma única implementação, usada pelo alerta e por esta análise. Cada item MUST trazer `description` (da cobrança mais recente), `amountCents` (positivo), `chargesCount` e `lastChargeDate`, e MUST vir do maior valor para o menor. `monthlyTotalCents` MUST ser a soma dos valores dos itens e `yearlyTotalCents` MUST ser esse total vezes 12.

#### Scenario: Assinatura detectada
- **WHEN** há cobranças de R$ 39,90 de "STREAMING EXEMPLO" em 05/08, 04/09 e 05/10 e hoje é 10/10
- **THEN** `items` traz "STREAMING EXEMPLO" com `amountCents` `3990`, `chargesCount` `3` e `lastChargeDate` `2026-10-05`

#### Scenario: Total por mês e por ano
- **WHEN** há duas assinaturas, de R$ 39,90 e R$ 20,10
- **THEN** `monthlyTotalCents` é `6000` e `yearlyTotalCents` é `72000`

#### Scenario: Ordem
- **WHEN** há assinaturas de R$ 20,00 e R$ 55,00
- **THEN** a de R$ 55,00 vem primeiro

#### Scenario: Mesma regra do alerta
- **WHEN** o alerta de assinatura detectada existe para uma descrição e um valor
- **THEN** essa cobrança aparece em `items`, e quando o alerta não detecta, `items` também não traz

#### Scenario: Assinatura fora da categoria Assinaturas
- **WHEN** a cobrança recorrente está na categoria "Lazer"
- **THEN** ela aparece em `items` do mesmo jeito

#### Scenario: Independe do mês pedido
- **WHEN** `month` é `2026-03` e hoje é 17/11/2026
- **THEN** `recurring` traz as cobranças ativas de hoje, as mesmas de uma requisição sem `month`

#### Scenario: Sem cobranças recorrentes
- **WHEN** nenhuma cobrança atende à regra
- **THEN** `items` é vazio e os totais são `0`

### Requirement: Pontos de atenção
`attention` MUST listar, em ordem fixa, os pontos que pedem uma decisão, com regras determinísticas e sem texto livre de modelo:
1. `budget_exceeded`: uma entrada por categoria com status `exceeded` no mês, trazendo `categoryId`, `name`, `limitCents` e `spentCents`;
2. `category_surge`: uma entrada por categoria cuja variação seja de **+30% ou mais** e cuja diferença seja de **R$ 50,00 ou mais**, até 3, da maior diferença para a menor, trazendo `categoryId`, `name`, `differenceCents` e `variationPercent`;
3. `uncategorized_high`: uma entrada quando "Sem categoria" tem **10% ou mais** do gasto do mês, trazendo `spentCents` e `percent`.

Categoria sem base de comparação (anterior zero) MUST NOT gerar `category_surge`.

#### Scenario: Orçamento estourado
- **WHEN** Lazer tem limite de R$ 300,00 e gastou R$ 350,00
- **THEN** `attention` traz `budget_exceeded` de Lazer com `limitCents` `30000` e `spentCents` `35000`

#### Scenario: Subiu muito
- **WHEN** Assinaturas foi de R$ 100,00 para R$ 150,00
- **THEN** `attention` traz `category_surge` de Assinaturas com `differenceCents` `5000` e `variationPercent` `50`

#### Scenario: Subiu pouco em valor
- **WHEN** uma categoria foi de R$ 10,00 para R$ 20,00 (+100%)
- **THEN** não há `category_surge` para ela, por ficar abaixo de R$ 50,00

#### Scenario: Subiu pouco em percentual
- **WHEN** uma categoria foi de R$ 1.000,00 para R$ 1.200,00 (+20%)
- **THEN** não há `category_surge` para ela

#### Scenario: Categoria nova não é alta
- **WHEN** uma categoria gastou R$ 600,00 neste mês e nada no anterior
- **THEN** não há `category_surge` para ela

#### Scenario: Muita coisa sem categoria
- **WHEN** o total é R$ 2.000,00 e R$ 250,00 estão sem categoria (12,5%)
- **THEN** `attention` traz `uncategorized_high` com `spentCents` `25000` e `percent` `12.5`

#### Scenario: Pouca coisa sem categoria
- **WHEN** R$ 100,00 de R$ 2.000,00 estão sem categoria (5%)
- **THEN** não há `uncategorized_high`

#### Scenario: Nada a decidir
- **WHEN** nenhuma regra dispara
- **THEN** `attention` é vazio

### Requirement: Tela Categorias
A área "Categorias" (`/categorias`) MUST aparecer no menu lateral, no grupo "Dia a dia", depois de "Orçamentos", com o título "Categorias" no topo, e MUST abrir direto na análise do mês (sem abas). A tela MUST ter o seletor de mês de Orçamentos (padrão o mês atual, guardado na URL em `?month=AAAA-MM`, valor inválido ou futuro cai no mês atual) e, na ordem, MUST mostrar:
1. o cartão-herói "Gasto no mês" com o total com `−`, a variação contra o período de comparação (ícone de seta e texto, nunca só cor) e a categoria de maior gasto;
2. os pontos de atenção, quando houver;
3. o cartão "Para onde foi o dinheiro";
4. o cartão "O que mudou";
5. o cartão "Cobranças recorrentes".

No mês em andamento, o texto da variação MUST dizer o trecho comparado (por exemplo, "até o dia 17, contra o mesmo trecho de outubro"). A tela MUST ter os estados carregando (skeleton), vazio ("Nenhum gasto neste mês", com o seletor de mês continuando visível) e erro ("Tentar de novo"), MUST respeitar "Ocultar valores" (mascara os valores; os percentuais continuam visíveis) e MUST funcionar de 320 px a 1440 px, nos dois temas, sem rolagem horizontal da página.

#### Scenario: Menu
- **WHEN** o app abre
- **THEN** o menu lateral tem "Categorias" no grupo "Dia a dia", depois de "Orçamentos", e "Categorias e regras" só no rodapé

#### Scenario: Abrir a área
- **WHEN** o usuário abre `/categorias`
- **THEN** a tela mostra a análise do mês atual, e o item "Categorias" do menu fica ativo

#### Scenario: Escolher o mês
- **WHEN** o usuário escolhe outubro de 2026
- **THEN** a URL ganha `?month=2026-10` e a tela mostra a análise de outubro

#### Scenario: Mês inválido
- **WHEN** a URL tem `?month=2099-01`
- **THEN** a tela mostra o mês atual

#### Scenario: Variação no mês em andamento
- **WHEN** hoje é 17/11 e o gasto subiu 20% contra o mesmo trecho de outubro
- **THEN** o herói mostra uma seta para cima e "20% a mais" com o texto do trecho comparado

#### Scenario: Gasto caiu
- **WHEN** o gasto do mês encerrado caiu 10%
- **THEN** o herói mostra uma seta para baixo e "10% a menos", sem usar vermelho

#### Scenario: Sem base de comparação
- **WHEN** o mês anterior não teve gasto
- **THEN** o herói não mostra variação e diz que não há mês anterior para comparar

#### Scenario: Estado vazio
- **WHEN** o mês escolhido não tem despesas
- **THEN** a tela mostra "Nenhum gasto neste mês" e o seletor de mês continua visível

#### Scenario: Erro
- **WHEN** a API falha
- **THEN** a tela mostra a mensagem de erro com "Tentar de novo" e o resto do app continua funcionando

#### Scenario: Valores ocultos
- **WHEN** "Ocultar valores" está ligado
- **THEN** valores em reais aparecem mascarados e os percentuais continuam visíveis

#### Scenario: Celular estreito
- **WHEN** a largura é 320 px
- **THEN** a página não tem rolagem horizontal e cada cartão cabe na largura

### Requirement: Cartão "Para onde foi o dinheiro"
O cartão MUST listar todas as categorias de `categories`, na ordem da API, sem limite de itens e sem rolagem própria (a página é a única área com rolagem). Cada linha MUST mostrar ícone, nome, valor com `−`, percentual do gasto, uma barra horizontal **numa cor só** (`primary`) proporcional ao percentual, a variação contra o período de comparação ("+ 50%", "− 10%", "Novo" quando não havia gasto antes) com seta e texto, um mini-gráfico de linha dos meses de `months` (só com 2 ou mais pontos, com resumo para leitor de tela) e, quando há limite, o status do orçamento com ícone e texto ("Dentro do orçamento", "Perto do limite", "Orçamento estourado"). Categorias MUST NOT ter cor própria. Variação para cima MUST NOT usar vermelho; a cor de status crítico (`status-critical`, a mesma de Orçamentos) só marca orçamento estourado. Tocar numa linha MUST abrir o detalhe da categoria.

#### Scenario: Todas as categorias
- **WHEN** o mês tem gasto em 9 categorias
- **THEN** o cartão mostra as 9 linhas e nenhuma "Outros"

#### Scenario: Categoria nova
- **WHEN** a categoria não gastou nada no período de comparação
- **THEN** a linha mostra "Novo" no lugar do percentual de variação

#### Scenario: Orçamento estourado
- **WHEN** a categoria passou do limite
- **THEN** a linha mostra o ícone e o texto "Orçamento estourado", e só esse status usa a cor de status crítico

#### Scenario: Variação para cima
- **WHEN** uma categoria subiu 50%
- **THEN** a linha mostra a seta para cima e "+ 50%" na cor normal do texto

#### Scenario: Mini-gráfico com pouco histórico
- **WHEN** `months` tem só 1 mês
- **THEN** a linha não mostra o mini-gráfico

#### Scenario: Sem categoria
- **WHEN** há despesas sem categoria
- **THEN** a linha "Sem categoria" aparece com o ícone de etiqueta e abre as transações sem categoria do mês

#### Scenario: Sem rolagem própria
- **WHEN** a lista tem 15 categorias
- **THEN** o cartão cresce com a lista e a página rola, sem barra de rolagem dentro do cartão

### Requirement: Cartão "O que mudou"
O cartão MUST mostrar as `increases` e as `decreases` da API em barras divergentes, cada grupo com o seu título ("Subiram", "Caíram"), ícone, nome e a diferença em reais com sinal (`+` ou `−`) e seta. As barras MUST usar uma cor só e MUST NOT usar vermelho. Quando os dois grupos estão vazios, o cartão MUST dizer "Nenhuma categoria mudou em relação ao período anterior". Quando o mês anterior não teve gasto, o cartão MUST ser omitido.

#### Scenario: Altas e quedas
- **WHEN** Lazer subiu R$ 300,00 e Educação caiu R$ 400,00
- **THEN** "Subiram" mostra "Lazer +R$ 300,00" e "Caíram" mostra "Educação −R$ 400,00"

#### Scenario: Nada mudou
- **WHEN** os dois grupos vêm vazios
- **THEN** o cartão mostra "Nenhuma categoria mudou em relação ao período anterior"

#### Scenario: Sem mês anterior
- **WHEN** o mês anterior não teve gasto
- **THEN** o cartão não aparece

### Requirement: Cartão "Cobranças recorrentes"
O cartão MUST mostrar o total por mês e por ano de `recurring` em destaque, a quantidade de cobranças e a lista de itens (descrição, valor mensal, data da última cobrança), com uma nota que diz que ele mostra as cobranças de **hoje** e não do mês escolhido, e que só detecta cobranças de mesmo valor. Quando não há cobranças, MUST mostrar "Nenhuma cobrança recorrente detectada".

#### Scenario: Totais
- **WHEN** `monthlyTotalCents` é `6000`
- **THEN** o cartão mostra "R$ 60,00 por mês" e "R$ 720,00 por ano"

#### Scenario: Mês passado escolhido
- **WHEN** o usuário escolhe um mês de meses atrás
- **THEN** o cartão continua mostrando as cobranças de hoje, com a nota dizendo isso

#### Scenario: Sem cobranças
- **WHEN** `items` é vazio
- **THEN** o cartão mostra "Nenhuma cobrança recorrente detectada"

### Requirement: Pontos de atenção na tela
Cada ponto de `attention` MUST aparecer com ícone e texto em português (nunca só cor), com o valor e o nome da categoria, e MUST levar a algo útil: `budget_exceeded` e `category_surge` abrem o detalhe da categoria; `uncategorized_high` abre as transações sem categoria do mês. Só `budget_exceeded` MAY usar a cor de status crítico. Sem pontos, a seção MUST ser omitida.

#### Scenario: Orçamento estourado
- **WHEN** Lazer estourou o limite
- **THEN** a seção mostra "Lazer passou do orçamento: R$ 350,00 de R$ 300,00" e tocar nela abre o detalhe de Lazer

#### Scenario: Sem categoria
- **WHEN** `uncategorized_high` dispara
- **THEN** a seção mostra o valor e o percentual sem categoria e leva às transações sem categoria do mês

#### Scenario: Nada a decidir
- **WHEN** `attention` é vazio
- **THEN** a seção não aparece

### Requirement: Detalhe da categoria
Tocar numa categoria MUST abrir um painel (`FormPanel`: de baixo no celular, lateral no tablet, janela no computador) com: nome e ícone; o gasto do mês e a variação; o gráfico de colunas dos meses de `months` (série 1 da paleta, o mês escolhido destacado e o mês em andamento marcado como parcial com hachura e texto "em andamento", mais uma tabela equivalente para leitor de tela); a média dos meses anteriores e o maior mês; o orçamento com status, quando há; e o link "Ver transações" para as transações da categoria no mês (`/transacoes?period=custom&from=…&to=…&category=…`). O painel MUST ser a única área com rolagem e MUST fechar com Esc e pelo botão de fechar.

#### Scenario: Abrir o detalhe
- **WHEN** o usuário toca na linha de Mercado
- **THEN** o painel abre com o gasto do mês, o gráfico dos meses, a média e o maior mês

#### Scenario: Ver transações
- **WHEN** o usuário toca em "Ver transações" no detalhe de Mercado de novembro de 2026
- **THEN** o app abre `/transacoes` com o período de 01/11/2026 a 30/11/2026 e a categoria Mercado

#### Scenario: Mês em andamento no gráfico
- **WHEN** o mês escolhido é o atual
- **THEN** a coluna dele leva hachura e o tooltip diz "(em andamento)"

#### Scenario: Primeiro mês de histórico
- **WHEN** `averageCents` é nulo
- **THEN** o painel não mostra a média e o gráfico não aparece, com a frase "O histórico desta categoria começa neste mês"

#### Scenario: Fechar
- **WHEN** o usuário aperta Esc
- **THEN** o painel fecha e o foco volta para a linha da categoria

