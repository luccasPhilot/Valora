## MODIFIED Requirements

### Requirement: Saldo total e evolução
`GET /api/v1/dashboard?month=AAAA-MM` MUST devolver:
- `totalBalanceCents`, com a mesma definição da tela de Contas (corrente + poupança não ocultas, de bancos ativos);
- `balanceEvolution`: um ponto para cada dia do mês que tiver foto de alguma dessas contas, com o saldo do dia calculado conta a conta: cada conta vale a sua foto mais recente até o dia, com no máximo 7 dias. Entram também as contas corrente e poupança não ocultas de bancos arquivados, só nos dias **anteriores** ao dia do arquivamento (fuso de São Paulo);
- `balanceChange` (`cents` e `percent`): a diferença entre o saldo de hoje e o saldo do primeiro dia do mês com foto, calculado pela mesma regra de foto mais recente, **só com os bancos ativos**. MUST ser nulo se não houver foto de um dia anterior a hoje no mês, ou se `month` não for o mês atual.

Sem `month`, MUST usar o mês atual no fuso de São Paulo.

#### Scenario: Variação no mês
- **WHEN** a primeira foto de novembro soma R$ 4.000,00 e o saldo de hoje é R$ 4.850,32
- **THEN** `balanceChange.cents` é `85032`

#### Scenario: Primeiro dia com dados
- **WHEN** a única foto do mês é a de hoje
- **THEN** `balanceChange` é nulo

#### Scenario: Banco que falhou no dia 1
- **WHEN** a conta A tem R$ 1.000,00 nas fotos de 31/10 e de 2 a 24/11, sem foto em 01/11, a conta B tem R$ 3.000,00 em todas as fotos, e o saldo de hoje é R$ 4.000,00
- **THEN** o ponto de 01/11 vale R$ 4.000,00 e `balanceChange.cents` é `0`, sem os R$ 1.000,00 da conta A como ganho

#### Scenario: Foto antiga demais
- **WHEN** a última foto da conta A antes de 10/11 é de 01/11
- **THEN** a conta A fica fora do ponto de 10/11

#### Scenario: Passado do banco arquivado
- **WHEN** um banco com R$ 1.000,00 em todas as fotos de novembro é arquivado no dia 10
- **THEN** a evolução soma esses R$ 1.000,00 nos dias 1 a 9 e não soma a partir do dia 10

#### Scenario: Variação sem o banco arquivado
- **WHEN** um banco com R$ 1.000,00 é arquivado no dia 10 e o saldo dos bancos ativos foi de R$ 4.000,00 (dia 1) a R$ 4.850,32 (hoje)
- **THEN** `balanceChange.cents` é `85032`, sem uma queda de R$ 1.000,00

#### Scenario: Mês passado
- **WHEN** a requisição pede `month=2026-10` em novembro de 2026
- **THEN** `balanceEvolution` traz os dias de outubro com foto e `balanceChange` é nulo

### Requirement: Receitas e despesas
A resposta MUST trazer:
- `monthIncomeCents` e `monthExpenseCents` do mês;
- `incomeVsExpense` com os mesmos dois valores para cada um dos 6 meses até o mês pedido, inclusive.

Os totais MUST incluir transações do Open Finance e manuais (inclusive pendentes) e MUST excluir categorias do tipo `transfer`. Despesa MUST ser toda transação numa categoria do tipo `expense`, qualquer que seja o sinal, e toda saída sem categoria; uma entrada numa categoria de despesa (estorno) MUST reduzir a despesa e MUST NOT contar como receita. Receita MUST ser toda entrada numa categoria do tipo `income` ou sem categoria. Despesas MUST vir como valor positivo, sem mínimo de zero no total do mês.

#### Scenario: Pagamento de fatura fora
- **WHEN** o mês tem R$ 2.000,00 de compras no cartão e o pagamento da fatura de R$ 1.500,00 em "Pagamento de fatura"
- **THEN** `monthExpenseCents` é `200000`

#### Scenario: Gasto em dinheiro
- **WHEN** existe uma despesa manual de R$ 12,50 em "Dinheiro" no mês
- **THEN** ela está somada em `monthExpenseCents`

#### Scenario: Estorno
- **WHEN** o mês tem uma compra de R$ 200,00 e um estorno de R$ 50,00 em "Compras", e um salário de R$ 5.000,00 em "Salário"
- **THEN** `monthExpenseCents` é `15000` e `monthIncomeCents` é `500000`

#### Scenario: Entrada sem categoria
- **WHEN** chega uma entrada de R$ 300,00 sem categoria
- **THEN** ela soma em `monthIncomeCents`

#### Scenario: Seis meses
- **WHEN** o mês pedido é novembro de 2026
- **THEN** `incomeVsExpense` traz junho a novembro de 2026, em ordem, com zero nos meses sem transações
