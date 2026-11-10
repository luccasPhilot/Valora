## ADDED Requirements

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
