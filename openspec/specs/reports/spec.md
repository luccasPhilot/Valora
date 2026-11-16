# reports Specification

## Purpose
Área Relatórios: período compartilhado, "Ver em tabela", marca do mês em andamento e o relatório de receitas e despesas (histórico mensal).

## Requirements

### Requirement: Área Relatórios
A área "Relatórios" (`/relatorios`) MUST aparecer no menu lateral, depois de "Investimentos", com o item ativo em qualquer `/relatorios/*` e o título "Relatórios" no topo. `/relatorios` MUST abrir o primeiro relatório (`/relatorios/receitas-e-despesas`). Um endereço desconhecido dentro de `/relatorios` MUST mostrar a página "não encontrado". A navegação entre relatórios MUST listar só os relatórios que existem e MUST aparecer só quando houver 2 ou mais.

#### Scenario: Menu
- **WHEN** o app abre
- **THEN** o menu lateral tem "Relatórios" depois de "Investimentos"

#### Scenario: Abrir a área
- **WHEN** o usuário abre `/relatorios`
- **THEN** o app mostra o relatório de receitas e despesas em `/relatorios/receitas-e-despesas`

#### Scenario: Endereço desconhecido
- **WHEN** o usuário abre `/relatorios/inexistente`
- **THEN** a página "404 Página não encontrada" é mostrada, sem o menu lateral

#### Scenario: Um relatório só
- **WHEN** existe apenas um relatório
- **THEN** a navegação entre relatórios não aparece

### Requirement: Período dos relatórios
Os relatórios MUST oferecer os períodos "6 meses", "12 meses" (padrão), "24 meses" e "Este ano" (de janeiro ao mês atual), terminando no mês atual em São Paulo. O período MUST ser guardado na URL (`?periodo=6m|12m|24m|ano`), MUST ser mantido ao trocar de relatório e, quando o valor da URL for inválido, MUST cair no padrão. A API MUST receber o período como `from` e `to` (`AAAA-MM`).

#### Scenario: Padrão
- **WHEN** o usuário abre um relatório sem `?periodo=`
- **THEN** o período é "12 meses"

#### Scenario: Escolher o período
- **WHEN** o usuário escolhe "6 meses"
- **THEN** a URL ganha `?periodo=6m` e o relatório mostra os últimos 6 meses

#### Scenario: Manter o período ao trocar de relatório
- **WHEN** o usuário está em "24 meses" e abre outro relatório pela navegação
- **THEN** o período continua "24 meses"

#### Scenario: Este ano
- **WHEN** hoje é 10/11/2026 e o usuário escolhe "Este ano"
- **THEN** o período vai de janeiro a novembro de 2026

#### Scenario: Valor inválido
- **WHEN** a URL tem `?periodo=abc`
- **THEN** o período é "12 meses"

### Requirement: Ver em tabela
Todo relatório MUST ter o controle "Gráfico" / "Tabela" (`?visao=tabela`; padrão "Gráfico"). A tabela MUST mostrar os mesmos números do gráfico, com legenda (`caption`), cabeçalhos, valores com `−` tipográfico e linha de total, e o gráfico MUST NOT aparecer ao mesmo tempo. No celular (abaixo de 640 px) cada mês MUST virar um bloco com o nome da coluna ao lado de cada valor, sem rolagem horizontal; a partir daí, se faltar largura, a tabela MUST rolar só dentro do próprio bloco, com a coluna do mês fixa, sem rolagem horizontal da página. O gráfico MUST ter um resumo em texto para leitor de tela.

#### Scenario: Alternar para a tabela
- **WHEN** o usuário escolhe "Tabela"
- **THEN** a tabela aparece com os mesmos meses e valores e o gráfico some

#### Scenario: Leitor de tela
- **WHEN** a tabela é lida por um leitor de tela
- **THEN** ela tem uma legenda que descreve o relatório e o período

#### Scenario: Celular estreito
- **WHEN** a largura é 320 px e a tabela tem 4 colunas
- **THEN** a página e a tabela não têm rolagem horizontal, e cada mês aparece como um bloco com receitas, despesas e resultado

### Requirement: Mês em andamento
O mês atual MUST ser marcado como parcial em todo relatório mensal: na tabela com o texto "em andamento" ao lado do mês, e no gráfico com marca visual e o texto "em andamento" na legenda ou no tooltip, nunca só pela cor.

#### Scenario: Tabela
- **WHEN** o período inclui o mês atual
- **THEN** a linha do mês atual mostra "em andamento"

#### Scenario: Gráfico
- **WHEN** o usuário passa o mouse na barra do mês atual
- **THEN** o tooltip diz que o mês está em andamento

### Requirement: Histórico de receitas e despesas
`GET /api/v1/reports/income-expense?from=&to=` MUST devolver `months` (cada um com `month` `AAAA-MM`, `incomeCents`, `expenseCents` positivo e `resultCents` igual a receitas menos despesas) e `totals` (`incomeCents`, `expenseCents`, `resultCents` do período). MUST usar a mesma regra de receitas e despesas do Início: sem transferências internas, com lançamentos manuais e pendentes, e uma despesa sem categoria contando como despesa. A lista MUST começar no mês da primeira transação guardada quando ela for posterior a `from`, MUST trazer zeros nos meses sem movimento dentro do período e MUST vir do mês mais antigo para o mais recente. `from` e `to` MUST seguir as regras de intervalo (padrão 12 meses, máximo 60, 400 `VALIDATION_ERROR` com o campo em `details`).

#### Scenario: Mesmo número do Início
- **WHEN** o Início mostra receitas de R$ 5.000,00 e despesas de R$ 3.200,00 em outubro
- **THEN** o mês `2026-10` do relatório tem `incomeCents` `500000`, `expenseCents` `320000` e `resultCents` `180000`

#### Scenario: Transferência fora
- **WHEN** há um pagamento de fatura de R$ 1.000,00 em outubro
- **THEN** ele não entra nas receitas nem nas despesas

#### Scenario: Mês sem movimento
- **WHEN** não há nenhuma transação em agosto, e há em julho e setembro
- **THEN** agosto aparece com receitas e despesas `0`

#### Scenario: Antes da primeira transação
- **WHEN** o período pedido é de 24 meses e a primeira transação é de 12 meses atrás
- **THEN** `months` começa nesse mês, sem 12 meses vazios antes

#### Scenario: Resultado negativo
- **WHEN** as despesas do mês passam das receitas
- **THEN** `resultCents` é negativo

#### Scenario: Totais do período
- **WHEN** o período tem 12 meses
- **THEN** `totals` são a soma dos meses de `months`

#### Scenario: Sem transações
- **WHEN** não há nenhuma transação guardada
- **THEN** `months` é vazio e os totais são `0`

#### Scenario: Intervalo inválido
- **WHEN** `from` é depois de `to`
- **THEN** a API responde 400 `VALIDATION_ERROR` com `from` em `details`

### Requirement: Tela de receitas e despesas
O relatório `/relatorios/receitas-e-despesas` MUST mostrar os três números do período (Receitas com `+` em `positive`, Despesas com `−` na cor normal, Resultado com sinal, vermelho só se negativo) e o gráfico de barras agrupadas receitas (série 1) × despesas (série 2) com legenda e tooltip com os dois valores e o resultado, ou a tabela. MUST ter os estados carregando, vazio ("Ainda não há transações neste período", com "Mudar período") e erro ("Tentar de novo"), funcionar de 320 px a 1440 px nos dois temas sem rolagem horizontal e respeitar "Ocultar valores" (mascara os valores e remove o eixo vertical do gráfico).

#### Scenario: Gráfico
- **WHEN** o período tem 12 meses com movimento
- **THEN** o gráfico mostra 12 pares de barras, com legenda "Receitas" e "Despesas"

#### Scenario: Sem transações
- **WHEN** não há transações no período
- **THEN** a tela mostra o estado vazio com "Mudar período"

#### Scenario: Valores ocultos
- **WHEN** "Ocultar valores" está ligado
- **THEN** os três números e a tabela aparecem mascarados e o eixo vertical do gráfico some

#### Scenario: Erro
- **WHEN** a API falha
- **THEN** a tela mostra o erro em linguagem simples com "Tentar de novo"

### Requirement: Gasto por categoria e mês
`GET /api/v1/reports/category-spending?from=&to=` MUST devolver `months`, `series` e `totals`. O gasto de uma categoria num mês MUST ser o gasto líquido da regra dos orçamentos e do Início (`max(0, −soma dos valores)` do mês, estornos reduzem, sem transferências internas, com lançamentos manuais e pendentes, e uma saída sem categoria contando em "Sem categoria"). O total de uma categoria no período MUST ser a soma dos gastos dos meses dela. `series` MUST ter no máximo 6 itens: as 5 maiores categorias do período (por total, desempate pelo nome), com "Sem categoria" disputando vaga, e "Outros" com a soma do resto quando houver. Cada série MUST trazer `kind` (`category`, `uncategorized` ou `other`), `categoryId`, `name`, `icon`, `totalCents`, `percent` (fatia do total do período, uma casa decimal) e `monthlyCents` alinhado a `months`. `months` MUST seguir a regra do histórico de receitas e despesas (começa na primeira transação guardada, zeros nos meses sem gasto) e `from` e `to` MUST seguir as regras de intervalo.

#### Scenario: Mesmo gasto do Início
- **WHEN** o Início mostra R$ 3.200,00 de gasto líquido em outubro somando todas as categorias
- **THEN** `totals.monthlyCents` de `2026-10` é `320000`

#### Scenario: Estorno reduz o mês
- **WHEN** uma compra de R$ 200,00 em Compras tem estorno de R$ 50,00 no mesmo mês
- **THEN** o gasto de Compras nesse mês é `15000`

#### Scenario: Estorno em outro mês
- **WHEN** a compra de R$ 200,00 é de janeiro e o estorno de R$ 50,00 é de março
- **THEN** o gasto de janeiro é `20000`, o de março é `0` e o total da categoria no período é `20000`

#### Scenario: Cinco maiores e Outros
- **WHEN** o período tem 8 categorias com gasto
- **THEN** `series` traz as 5 maiores, "Outros" com a soma das 3 restantes mês a mês, e a soma dos `percent` é 100 (com a tolerância do arredondamento)

#### Scenario: Sem categoria disputa vaga
- **WHEN** a soma das saídas sem categoria é a terceira maior
- **THEN** "Sem categoria" (`kind` `uncategorized`) aparece na terceira posição

#### Scenario: Transferência fora
- **WHEN** há um pagamento de fatura de R$ 1.000,00 no mês
- **THEN** ele não entra em nenhuma série

#### Scenario: Receita não é gasto
- **WHEN** uma categoria de receita tem R$ 5.000,00 no mês
- **THEN** ela não aparece em `series`

#### Scenario: Sem gastos
- **WHEN** não há nenhum gasto no período
- **THEN** `series` é vazio e `totals.totalCents` é `0`

#### Scenario: Desempate
- **WHEN** duas categorias têm o mesmo total no período
- **THEN** a de nome menor em ordem alfabética (pt-BR) vem antes

### Requirement: Tela de gasto por categoria
O relatório `/relatorios/categorias` ("Por categoria" na navegação entre relatórios) MUST mostrar um gráfico de colunas empilhadas por mês, com uma série por item de `series` nos slots da paleta de gráficos em ordem sem pular e "Outros" na cor cinza da paleta, legenda e tooltip com o total do mês e cada categoria com valor maior que zero. MUST mostrar a lista ranqueada de barras horizontais numa cor só (`primary`; "Outros" cinza) com ícone, nome, total e percentual, e a tabela ("Ver em tabela") com um mês por linha, uma coluna por série, a coluna "Total" e a linha de total do período. MUST NOT usar rosca nem uma cor fixa por categoria. O texto MUST NOT usar a cor da série. MUST marcar o mês em andamento em texto, ter os estados carregando, vazio ("Nenhum gasto neste período", com "Mudar período") e erro ("Tentar de novo"), funcionar de 320 px a 1440 px nos dois temas sem rolagem horizontal da página e respeitar "Ocultar valores" (mascara os valores, remove o eixo vertical e mantém os percentuais).

#### Scenario: Cores em ordem
- **WHEN** o período tem 3 categorias com gasto
- **THEN** a maior usa o slot 1 da paleta, a segunda o slot 2 e a terceira o slot 3

#### Scenario: Outros em cinza
- **WHEN** existe a série "Outros"
- **THEN** ela usa a cor cinza da paleta e aparece por último

#### Scenario: Legenda por nome
- **WHEN** o gráfico é mostrado
- **THEN** a legenda traz o nome de cada série, sem depender só da cor

#### Scenario: Lista ranqueada
- **WHEN** a tela é aberta
- **THEN** a lista mostra cada categoria com ícone, nome, total e percentual, da maior para a menor

#### Scenario: Tabela
- **WHEN** o usuário escolhe "Tabela"
- **THEN** a tabela traz um mês por linha, uma coluna por série, "Total" por mês e o total do período no fim

#### Scenario: Sem gastos
- **WHEN** não há gasto no período
- **THEN** a tela mostra "Nenhum gasto neste período" com "Mudar período"

#### Scenario: Valores ocultos
- **WHEN** "Ocultar valores" está ligado
- **THEN** valores e tabela aparecem mascarados, o eixo vertical some e os percentuais continuam visíveis

#### Scenario: Celular estreito
- **WHEN** a largura é 320 px e há 24 meses
- **THEN** a página não tem rolagem horizontal e a tabela rola só dentro do bloco

### Requirement: Evolução financeira
`GET /api/v1/reports/savings-evolution?from=&to=` MUST devolver `months` e `totals`. Cada mês MUST trazer `month`, `incomeCents`, `expenseCents` (positivo), `resultCents` (receitas menos despesas), `savingsRatePercent` e `cumulativeResultCents`. `savingsRatePercent` MUST ser `round(resultado × 1000 ÷ receitas) ÷ 10`, ou nulo quando as receitas do mês são zero, e MAY ser negativa. `cumulativeResultCents` MUST ser a soma dos resultados desde o primeiro mês da lista até o mês da linha. `totals` MUST trazer `incomeCents`, `expenseCents`, `resultCents`, `savingsRatePercent` (soma dos resultados ÷ soma das receitas, nulo se a soma das receitas é zero), `surplusMonths` e `closedMonths`, contando só meses anteriores ao mês atual em São Paulo. As receitas e despesas MUST seguir a regra do Início e a lista de meses MUST seguir a do histórico de receitas e despesas (começa na primeira transação guardada, zeros nos meses sem movimento). `from` e `to` MUST seguir as regras de intervalo.

#### Scenario: Resultado e taxa
- **WHEN** um mês tem receitas de R$ 5.000,00 e despesas de R$ 3.500,00
- **THEN** `resultCents` é `150000` e `savingsRatePercent` é `30`

#### Scenario: Gastou mais do que ganhou
- **WHEN** um mês tem receitas de R$ 4.000,00 e despesas de R$ 4.500,00
- **THEN** `resultCents` é `-50000` e `savingsRatePercent` é `-12.5`

#### Scenario: Mês sem receita
- **WHEN** um mês tem despesas e nenhuma receita
- **THEN** `savingsRatePercent` é nulo e o resultado é negativo

#### Scenario: Mês sem movimento
- **WHEN** um mês dentro do período não tem transações
- **THEN** receitas, despesas, resultado são `0` e a taxa é nula

#### Scenario: Sobra acumulada
- **WHEN** os resultados dos três primeiros meses são R$ 1.000,00, −R$ 300,00 e R$ 500,00
- **THEN** `cumulativeResultCents` é `100000`, `70000` e `120000`

#### Scenario: Taxa do período
- **WHEN** o período tem receitas totais de R$ 10.000,00 e resultado total de R$ 2.000,00
- **THEN** `totals.savingsRatePercent` é `20`, calculado sobre as somas e não pela média das taxas mensais

#### Scenario: Meses com sobra
- **WHEN** o período tem 9 meses fechados, 6 com resultado maior que zero, e o mês atual está em andamento
- **THEN** `closedMonths` é `9` e `surplusMonths` é `6`

#### Scenario: Mesmo número do Início
- **WHEN** o Início mostra receitas de R$ 5.000,00 e despesas de R$ 3.200,00 em outubro
- **THEN** o mês `2026-10` tem `resultCents` `180000`

#### Scenario: Transferência fora
- **WHEN** há um pagamento de fatura de R$ 1.000,00 no mês
- **THEN** ele não entra nas receitas nem nas despesas

#### Scenario: Intervalo inválido
- **WHEN** o intervalo tem mais de 60 meses
- **THEN** a API responde 400 `VALIDATION_ERROR`

### Requirement: Tela de evolução financeira
O relatório `/relatorios/evolucao-financeira` ("Evolução financeira" na navegação entre relatórios) MUST mostrar três números do período (resultado com sinal e vermelho só se negativo, taxa de poupança com "—" quando não há receita, e "N de M meses fechados com sobra") e três gráficos, cada um com a sua escala e nunca dois eixos num gráfico: barras do resultado do mês (série 1, com a linha do zero), linha da taxa de poupança (série 1, com referência em 0% e interrupção nos meses sem receita) e área da sobra acumulada (série 1, com a linha do zero). Resultado negativo MUST ser indicado pelo sinal `−` e por texto, nunca só pela cor, e MUST NOT usar vermelho nas barras. MUST ter a tabela ("Ver em tabela") com mês, receitas, despesas, resultado, taxa e sobra acumulada e a linha de total do período. MUST marcar o mês em andamento em texto, ter os estados carregando, vazio e erro, funcionar de 320 px a 1440 px nos dois temas sem rolagem horizontal da página e respeitar "Ocultar valores" (mascara os valores em reais, remove os eixos de valores e mantém os percentuais).

#### Scenario: Mês negativo
- **WHEN** um mês tem resultado de −R$ 500,00
- **THEN** a barra desce da linha do zero e o tooltip e a tabela mostram "− R$ 500,00", sem depender da cor

#### Scenario: Mês sem receita
- **WHEN** um mês não tem receitas
- **THEN** a linha da taxa de poupança é interrompida nesse mês e a tabela mostra "—"

#### Scenario: Sobra acumulada negativa
- **WHEN** a soma dos resultados fica abaixo de zero
- **THEN** a área desce da linha do zero e o número do período aparece em vermelho com o sinal `−`

#### Scenario: Tabela
- **WHEN** o usuário escolhe "Tabela"
- **THEN** a tabela mostra receitas, despesas, resultado, taxa e sobra acumulada de cada mês, o total do período e os gráficos somem

#### Scenario: Mês em andamento
- **WHEN** o período inclui o mês atual
- **THEN** ele é marcado "em andamento" e não entra na contagem de meses com sobra

#### Scenario: Valores ocultos
- **WHEN** "Ocultar valores" está ligado
- **THEN** os valores em reais aparecem mascarados, os eixos de valores somem e as taxas continuam visíveis

#### Scenario: Sem transações
- **WHEN** não há transações no período
- **THEN** a tela mostra "Ainda não há transações neste período" com "Mudar período"

#### Scenario: Celular estreito
- **WHEN** a largura é 320 px
- **THEN** os gráficos ficam em uma coluna, a página não tem rolagem horizontal e a tabela rola só dentro do bloco

### Requirement: Evolução do patrimônio
O relatório `/relatorios/patrimonio` ("Patrimônio" na navegação entre relatórios) MUST usar `GET /api/v1/net-worth` com o período do relatório (`from` e `to`) e MUST mostrar três números: "Patrimônio hoje" (vermelho só se negativo), "Variação no período" (do primeiro ao último ponto, em reais e percentual, com ícone, `+` ou `−` e o texto "desde" com a data do primeiro ponto, ou "—" com menos de 2 pontos) e "Em investimentos" (percentual da soma de contas e investimentos, "—" quando a soma é zero). MUST mostrar o gráfico de área do patrimônio total (série 1) e o gráfico de colunas por mês com a composição nos slots da paleta em ordem — Contas (1), Investimentos (2) e Faturas em aberto (3, valores negativos abaixo do zero) —, com legenda e tooltip com as três cifras e o patrimônio do mês. Os gráficos MUST ser desenhados só com 2 ou mais pontos; com menos, MUST mostrar o texto que diz desde quando há histórico. MUST ter a tabela ("Ver em tabela") com mês, Contas, Investimentos, Faturas em aberto (com `−`) e Patrimônio, sem linha de total, e MUST marcar o mês em andamento em texto. MUST trazer a nota da fórmula, de que bancos removidos do Valora saem a partir do dia do arquivamento e de que gastos no cartão fora de fatura fechada não entram. MUST NOT usar cor de série em texto. MUST ter os estados carregando, vazio (sem nenhuma foto, com "Ver contas") e erro ("Tentar de novo"), funcionar de 320 px a 1440 px nos dois temas sem rolagem horizontal da página e respeitar "Ocultar valores" (mascara os valores em reais, remove os eixos de valores e mantém os percentuais).

#### Scenario: Mesmo número do cartão
- **WHEN** o cartão de patrimônio da tela Investimentos mostra R$ 17.500,00 para o mês atual
- **THEN** o ponto do mês atual na tabela do relatório tem Patrimônio R$ 17.500,00

#### Scenario: Variação no período
- **WHEN** o primeiro ponto é R$ 10.000,00 em 04/11 e o último é R$ 10.500,00
- **THEN** a variação mostra "+ R$ 500,00 (+5%)" e "desde 04/11", com ícone

#### Scenario: Composição com fatura
- **WHEN** um mês tem Contas R$ 5.000,00, Investimentos R$ 12.000,00 e Faturas em aberto R$ 1.500,00
- **THEN** as colunas do mês mostram as duas primeiras acima do zero e a fatura abaixo, e o tooltip mostra o patrimônio R$ 15.500,00

#### Scenario: Histórico curto
- **WHEN** existe um ponto só e a primeira foto é de 04/11
- **THEN** não há gráficos, o texto diz "O histórico começa em 04/11" e a tabela mostra o ponto

#### Scenario: Sem fotos
- **WHEN** não há nenhuma foto guardada
- **THEN** a tela mostra o estado vazio com "Ver contas"

#### Scenario: Tabela
- **WHEN** o usuário escolhe "Tabela"
- **THEN** a tabela mostra Contas, Investimentos, Faturas em aberto e Patrimônio de cada mês, e os gráficos somem

#### Scenario: Período
- **WHEN** o usuário escolhe "24 meses"
- **THEN** o relatório pede `from` e `to` de 24 meses e mostra só os meses que têm fotos

#### Scenario: Valores ocultos
- **WHEN** "Ocultar valores" está ligado
- **THEN** os valores em reais, a tabela e os eixos de valores aparecem mascarados ou somem, e o percentual em investimentos continua visível

#### Scenario: Celular estreito
- **WHEN** a largura é 320 px
- **THEN** os gráficos ficam em uma coluna, a página não tem rolagem horizontal e a tabela rola só dentro do bloco

#### Scenario: Erro
- **WHEN** a API falha
- **THEN** a tela mostra o erro em linguagem simples com "Tentar de novo"
