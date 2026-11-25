## MODIFIED Requirements

### Requirement: Histórico de receitas e despesas
`GET /api/v1/reports/income-expense?from=&to=` MUST devolver `months` (cada um com `month` `AAAA-MM`, `incomeCents`, `expenseCents` positivo e `resultCents` igual a receitas menos despesas) e `totals` (`incomeCents`, `expenseCents`, `resultCents` do período). MUST usar a mesma regra de receitas e despesas do Início: sem transferências internas, com lançamentos manuais e pendentes, uma despesa sem categoria contando como despesa e uma entrada numa categoria de despesa (estorno) reduzindo a despesa, nunca como receita. A lista MUST começar no mês da primeira transação guardada quando ela for posterior a `from`, MUST trazer zeros nos meses sem movimento dentro do período e MUST vir do mês mais antigo para o mais recente. `from` e `to` MUST seguir as regras de intervalo (padrão 12 meses, máximo 60, 400 `VALIDATION_ERROR` com o campo em `details`).

#### Scenario: Mesmo número do Início
- **WHEN** o Início mostra receitas de R$ 5.000,00 e despesas de R$ 3.200,00 em outubro
- **THEN** o mês `2026-10` do relatório tem `incomeCents` `500000`, `expenseCents` `320000` e `resultCents` `180000`

#### Scenario: Transferência fora
- **WHEN** há um pagamento de fatura de R$ 1.000,00 em outubro
- **THEN** ele não entra nas receitas nem nas despesas

#### Scenario: Estorno reduz a despesa
- **WHEN** outubro tem R$ 3.200,00 de despesas e um estorno de R$ 200,00 em "Compras"
- **THEN** o mês tem `expenseCents` `300000`, a receita não muda e `resultCents` é o mesmo que seria com o estorno como receita

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
