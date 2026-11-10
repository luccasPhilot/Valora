## ADDED Requirements

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
Todo relatório MUST ter o controle "Gráfico" / "Tabela" (`?visao=tabela`; padrão "Gráfico"). A tabela MUST mostrar os mesmos números do gráfico, com legenda (`caption`), cabeçalhos, valores com `−` tipográfico e linha de total, e o gráfico MUST NOT aparecer ao mesmo tempo. Em telas estreitas a tabela MUST rolar só dentro do próprio bloco, com a coluna do mês fixa, sem rolagem horizontal da página. O gráfico MUST ter um resumo em texto para leitor de tela.

#### Scenario: Alternar para a tabela
- **WHEN** o usuário escolhe "Tabela"
- **THEN** a tabela aparece com os mesmos meses e valores e o gráfico some

#### Scenario: Leitor de tela
- **WHEN** a tabela é lida por um leitor de tela
- **THEN** ela tem uma legenda que descreve o relatório e o período

#### Scenario: Celular estreito
- **WHEN** a largura é 320 px e a tabela tem 4 colunas
- **THEN** a página não tem rolagem horizontal e a tabela rola dentro do bloco com a coluna do mês fixa

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
