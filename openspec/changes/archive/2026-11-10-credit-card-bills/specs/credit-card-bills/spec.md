## ADDED Requirements

### Requirement: Gravação das faturas na sincronização
A sincronização MUST buscar as faturas de cada cartão e gravá-las em `credit_card_bills` pelo id do Pluggy, atualizando as já existentes. O `PluggyClient` MUST validar a resposta com Zod e converter os valores para centavos. Rodar a sincronização duas vezes MUST NOT duplicar faturas. A falha ao buscar as faturas de um cartão MUST NOT impedir que as contas e as transações do banco sejam gravadas.

#### Scenario: Fatura nova
- **WHEN** o Pluggy devolve uma fatura de R$ 1.234,56 com vencimento em 10/12/2026 e ela ainda não existe no banco
- **THEN** o Valora grava uma fatura com `total_cents` `123456` e `due_date` `2026-12-10`

#### Scenario: Sincronizar de novo
- **WHEN** a mesma fatura chega numa segunda sincronização, agora com R$ 500,00 pagos
- **THEN** continua existindo uma única fatura, com `paid_cents` `50000`

#### Scenario: Banco sem faturas
- **WHEN** o conector não devolve faturas ou a busca falha para um cartão
- **THEN** as contas e as transações daquele banco são gravadas normalmente e as estatísticas da execução registram a falha das faturas

### Requirement: Situação da fatura
A situação de uma fatura MUST ser `paid` quando o valor pago cobrir o total (ou o total for zero ou negativo), `overdue` quando não estiver paga e o vencimento já tiver passado, e `open` nos demais casos. A data de hoje MUST ser a de São Paulo.

#### Scenario: Fatura paga
- **WHEN** o total é `100000` e o valor pago é `100000`
- **THEN** a situação é `paid`

#### Scenario: Pagamento parcial
- **WHEN** o total é `100000`, o valor pago é `30000` e o vencimento é amanhã
- **THEN** a situação é `open`

#### Scenario: Vencida
- **WHEN** a fatura não está paga e venceu ontem
- **THEN** a situação é `overdue`

#### Scenario: Vence hoje
- **WHEN** a fatura não está paga e vence hoje
- **THEN** a situação é `open`

### Requirement: Fatura atual e próximas faturas
`GET /api/v1/credit-card-bills` MUST devolver uma entrada por cartão não oculto, com a fatura atual e até 3 próximas faturas. A fatura atual MUST ser, nesta ordem: a primeira fatura fechada não paga com vencimento de hoje em diante; a última fatura, se já venceu sem pagamento; e, sem nenhuma das duas, a fatura aberta montada a partir do saldo da conta. As próximas MUST ser as faturas fechadas seguintes à atual, em ordem de vencimento. A resposta MUST NOT expor o `raw`.

#### Scenario: Cartão com três faturas
- **WHEN** o cartão tem faturas vencendo em 10/11, 10/12 e 10/01 e hoje é 05/11/2026
- **THEN** a fatura atual é a de 10/11 e as próximas são as de 10/12 e 10/01

#### Scenario: Fatura de hoje já paga
- **WHEN** a fatura que vence hoje está paga e existe outra em 10/12
- **THEN** a fatura atual é a de 10/12

#### Scenario: Cartão oculto
- **WHEN** o cartão está marcado como "Ocultar dos totais"
- **THEN** ele não aparece na resposta

### Requirement: Fatura aberta a partir do saldo da conta
O Pluggy só devolve faturas fechadas. Quando o cartão não tiver fatura fechada pendente (ou não tiver faturas gravadas), a resposta MUST trazer a fatura atual a partir do `balance_cents` da conta. Com faturas gravadas, o vencimento MUST ser estimado em um mês depois do vencimento da última fatura; sem faturas, MUST vir do vencimento informado nos dados do cartão, com `dueDate` nulo se o banco não informar. A resposta MUST NOT inventar próximas faturas.

#### Scenario: Todas as faturas fechadas estão pagas
- **WHEN** o cartão tem saldo de `250000`, a última fatura vence em 10/10/2026 e está paga, e hoje é 06/11/2026
- **THEN** a fatura atual vale `250000` com vencimento estimado em 10/11/2026, `isEstimatedDueDate` verdadeiro, e a lista de próximas fica vazia

#### Scenario: Última fatura vencida sem pagamento
- **WHEN** a última fatura venceu em 10/10/2026 sem nenhum pagamento e hoje é 06/11/2026
- **THEN** a fatura atual é essa fatura, com situação `overdue`

#### Scenario: Pagamento parcial antigo
- **WHEN** uma fatura de agosto tem pagamento parcial, a última fatura está paga e o cartão tem saldo
- **THEN** a fatura de agosto não vira a atual e a atual vem do saldo da conta

#### Scenario: Conector sem faturas e com vencimento
- **WHEN** o cartão tem saldo de `250000` e os dados da conta informam vencimento em 15/11/2026
- **THEN** a fatura atual vale `250000` com vencimento em 15/11/2026 e a lista de próximas fica vazia

#### Scenario: Vencimento desatualizado
- **WHEN** o cartão tem saldo de `250000`, os dados da conta informam vencimento em 10/10/2026 e hoje é 06/11/2026
- **THEN** a fatura atual vale `250000` com vencimento estimado em 10/11/2026 e `isEstimatedDueDate` verdadeiro

#### Scenario: Conector sem vencimento
- **WHEN** o cartão tem saldo de `250000` e nenhum vencimento é informado
- **THEN** a fatura atual vale `250000` com `dueDate` nulo

#### Scenario: Fatura zerada
- **WHEN** o saldo do cartão é zero e não há vencimento válido
- **THEN** a fatura atual vale `0` e a tela não mostra aviso de vencimento

### Requirement: Parcelas futuras
A resposta MUST trazer, por cartão, as parcelas futuras somadas por mês para os próximos 12 meses. As parcelas restantes de uma compra parcelada MUST ser projetadas a partir da parcela de maior número já recebida, uma por mês, no mesmo dia do mês (ou no último dia, em meses mais curtos). Compras com `installment_total` nulo ou 1 MUST NOT gerar parcelas futuras.

#### Scenario: Compra em 3 vezes na parcela 1
- **WHEN** o cartão tem a parcela 1 de 3 de "LOJA X" de R$ 100,00, em 15/11/2026
- **THEN** as parcelas futuras são `10000` em dezembro de 2026 e `10000` em janeiro de 2027

#### Scenario: Última parcela
- **WHEN** a parcela mais recente é 3 de 3
- **THEN** a compra não gera parcelas futuras

#### Scenario: Dia 31 em mês curto
- **WHEN** a parcela 1 de 3 foi em 31/01/2027
- **THEN** a parcela 2 cai em 28/02/2027

#### Scenario: Compra à vista
- **WHEN** a transação não tem parcelas
- **THEN** ela não entra nas parcelas futuras

#### Scenario: Parcelas com centavos diferentes
- **WHEN** a parcela 1 de 3 foi de R$ 60,00 e a parcela 2 de R$ 59,98
- **THEN** as duas pertencem à mesma compra e a parcela 3 é projetada com `5998`

### Requirement: Tela de faturas do cartão
A tela `/contas/:accountId/faturas` MUST mostrar a fatura atual (valor, vencimento, situação com ícone e texto), as próximas faturas e as parcelas futuras por mês. O painel do cartão na tela de Contas MUST ter a ação "Ver faturas". A tela MUST ter os estados carregando, vazio e erro, funcionar de 320 px até 1440 px e respeitar "Ocultar valores".

#### Scenario: Fatura vencida
- **WHEN** a fatura atual está vencida e não paga
- **THEN** a tela mostra a situação "Vencida" com ícone e texto, sem depender só da cor

#### Scenario: Sem parcelas futuras
- **WHEN** o cartão não tem compras parceladas em andamento
- **THEN** a seção de parcelas mostra o estado vazio, não um gráfico zerado

#### Scenario: Erro de carregamento
- **WHEN** a API falha ou devolve uma resposta fora do formato
- **THEN** a tela mostra o estado de erro com a ação "Tentar de novo"
