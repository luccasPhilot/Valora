## Context

**Conferido com os bancos reais (tarefa 1.1, 06/11/2026):** o MeuPluggy devolve as faturas só **depois de fechadas**. Num cartão há 12 faturas, todas passadas e quase todas pagas, e a fatura aberta (o `balance_cents` da conta, com limite usado) não está na lista. Todos os campos vêm preenchidos (`billClosingDate`, `minimumPaymentAmount`, `payments`, `totalAmount`), mas o vencimento vem como `2026-10-10T00:00:00.000Z`: é uma data de calendário e vale o dia em UTC (convertida para São Paulo, viraria o dia anterior). O `balanceDueDate` da conta é o vencimento da última fatura fechada. Dos 3 cartões, um tem faturas, um não tem nenhuma e tem vencimento nulo, e um está zerado.

Conferido no banco de desenvolvimento (3 cartões, 308 transações de cartão, 19 delas parceladas): o `balanceDueDate` dos dados da conta está **desatualizado** (10/10 e 18/10, com hoje em novembro) ou **nulo** (um cartão com fatura de R$ 859,73 sem nenhum vencimento), e `balanceCloseDate` vem nulo nos três. Os valores das parcelas de uma mesma compra **variam em centavos** (R$ 60,00, R$ 59,98, R$ 59,98). Isso muda duas decisões abaixo.

A conta de cartão já guarda o valor da fatura atual em `balance_cents`, e as transações do cartão já trazem `installment_number` e `installment_total`. Faltam o vencimento, as faturas seguintes e a visão de parcelas futuras. O `pluggy-sdk` tem `fetchCreditCardBills(accountId)`. Quanto o conector MeuPluggy devolve de faturas varia por banco, e isso só se sabe com dados reais.

## Goals / Non-Goals

**Goals:**
- Faturas gravadas pelo id do Pluggy, sem duplicar, e sem derrubar a sincronização de um banco que não tem faturas.
- Parcelas futuras calculadas só com o que o banco já informou.
- O mesmo valor de "fatura atual" aqui e na tela de Contas.

**Non-Goals:**
- Prever gastos novos, pagar fatura ou listar as compras de cada fatura.

## Decisions

**1. Tabela `credit_card_bills` com duas colunas além do documentado.**
- `closing_date` (`date`, pode ser nula): data de fechamento que o Pluggy informa.
- `paid_cents` (`bigint`, padrão 0): soma dos pagamentos da fatura (`payments[].amount`).
- Atualizar `docs/04-modelo-de-dados.md` na mesma change.
- *Alternativa:* guardar só o `raw` e calcular na leitura. Descartada: consultas e testes ficariam presos ao formato do Pluggy.

**2. Situação da fatura calculada, não guardada.**
- `paid` quando `paid_cents >= total_cents` e `total_cents > 0`; `overdue` quando não está paga e o vencimento já passou; senão `open`.
- Função pura `billStatus(bill, today)`, com `today` em São Paulo.
- Fatura com `total_cents` zero ou negativo (crédito) vira `paid`: não há o que pagar.

**3. "Fatura atual", nesta ordem:**
1. a primeira fatura fechada **não paga** com vencimento de hoje em diante;
2. a **última** fatura, se já venceu sem pagamento (só a última: um pagamento parcial antigo não conta, porque o valor que sobra costuma ir para a fatura seguinte);
3. a fatura aberta, montada a partir do saldo da conta (decisão 4).
- "Próximas" são as faturas fechadas seguintes à atual, em ordem de vencimento, até 3. O caso 3 não tem próximas.
- *Alternativa:* usar `closing_date`. Descartada porque nem todo conector manda esse campo.
- *Alternativa:* a vencida não paga mais recente, qualquer uma. Descartada com os dados reais: um pagamento parcial de meses atrás faria uma fatura antiga virar a "atual".

**4. A fatura aberta vem do saldo da conta.** Vale quando não há fatura fechada pendente (decisão 3) e quando o cartão não tem faturas gravadas.
- A fatura atual vem de `accounts.balance_cents`.
- **Cartão com faturas gravadas:** o vencimento é **um mês depois** do vencimento da última fatura (10/10 vira 10/11). Se esse dia já passou, o dia do mês se repete a partir de hoje. Sai marcado `isEstimatedDueDate: true`; a tela mostra "Vencimento estimado". Isso supõe que o banco não mudou o dia.
- **Cartão sem faturas gravadas:** o vencimento vem de `raw.creditData.balanceDueDate`, que guarda o da última fatura e fica velho. De hoje em diante, é usado como está. No passado, o dia do mês se repete a partir de hoje, também como estimado.
- Sem `balanceDueDate`: `dueDate` nulo, e a tela mostra "Vencimento não informado pelo banco".
- Fatura zerada (`balance_cents` zero) não precisa de vencimento.
- Nunca se criam próximas faturas a partir do nada.

**5. Parcelas futuras calculadas na leitura, em função pura.**
- Agrupa as transações do cartão com `installment_total > 1` pela chave (conta, descrição normalizada, total de parcelas). O **valor fica fora da chave**: nos dados reais as parcelas de uma compra variam em centavos (R$ 60,00 e R$ 59,98).
- Em cada grupo, a parcela de maior número é a âncora: as parcelas restantes (`total − número`) caem nos meses seguintes ao da âncora, no mesmo dia do mês (limitado ao último dia de meses curtos), com o valor da própria âncora.
- Soma por mês, para os próximos 12 meses. Parcelas que já têm fatura gravada com aquele vencimento não são descontadas: a fatura já fechada é uma estimativa melhor e a tela mostra os dois lados separados ("fechada" e "parcelas previstas").
- Duas compras diferentes na mesma loja, com o mesmo total de parcelas, na mesma conta, viram um grupo só e a mais antiga é ignorada. É raro e o erro é para menos, o lado da cautela.
- *Alternativa:* usar só o `raw` do Pluggy para achar parcelas futuras. Descartada: o conector não manda isso de forma confiável.

**6. Sincronização.**
- `PluggyClient.listCreditCardBills(pluggyAccountId)` valida com Zod (`CreditCardBills` do SDK) e converte valores em reais para centavos com `toCents`.
- Busca as faturas junto com o resto dos dados do banco, antes de abrir a transação do banco de dados (regra atual da sincronização). Falha ao buscar faturas de **um cartão** não derruba o banco: registra `bills_failed` nas estatísticas e segue (as faturas são complemento, o saldo e as transações valem mais).
- Grava por `pluggy_bill_id` com `ON CONFLICT DO UPDATE`.
- O limite de consulta de faturas é de ~1 por dia (`docs/02-open-finance.md`): uma chamada por cartão por sincronização agendada cabe; o botão manual repete, mas respeita o mesmo limite do Pluggy, que devolve o que já tem.

**7. API e tela.**
- `GET /api/v1/credit-card-bills` devolve todos os cartões não ocultos de uma vez, sem paginação (limite de 5 conexões), uma exceção consciente à regra de paginar, a registrar na tabela de Decisões.
- Tela em `/contas/:accountId/faturas`, aberta por um botão "Ver faturas" no painel do cartão. Não entra no menu lateral.
- Valores seguem as regras de formatação do projeto; fatura é despesa futura, então aparece na cor normal, sem vermelho.
- Situação com ícone e texto (cor nunca sozinha).

## Risks / Trade-offs

- [O MeuPluggy pode não devolver faturas de algum banco] → Fallback da decisão 4 e tarefa de gravar as fixtures com dados reais antes de fixar o formato.
- [Agrupar parcelas pela descrição pode juntar compras diferentes] → Improvável com a mesma loja e o mesmo total de parcelas; o pior caso é projetar uma parcela a menos, o lado da cautela.
- [Hoje nenhuma compra parcelada está em aberto no banco de desenvolvimento] → A última (3 de 3) caiu em 01/11. Os testes usam fixtures sintéticas para o caso com parcelas por vir.
- [Fatura vencida e não paga fica "atual" para sempre se o Pluggy não registrar o pagamento] → A situação `overdue` aparece claramente e a próxima fatura vem logo depois na lista.

## Open Questions

- ~~Quais campos de fatura o MeuPluggy devolve?~~ Respondido na tarefa 1.1 (ver Context): só faturas fechadas, com todos os campos, vencimento à meia-noite UTC. Um dos 3 cartões não tem faturas e não tem vencimento nenhum; a projeção do fim do mês (`month-projection`) fica sem a data da fatura aberta dele.
