# Modelo de dados

Proposta inicial para o PostgreSQL. Os nomes de tabelas e colunas ficam em inglês, em `snake_case`. Os campos podem mudar quando os dados reais do Pluggy chegarem na Fase 1. As regras da seção [Regras](#regras) não mudam.

## Regras

- **Dinheiro em centavos, como inteiro.** Colunas `*_cents` do tipo `bigint`. O Pluggy devolve reais com casas decimais; a conversão (`Math.round(valor * 100)`) acontece uma vez, no `PluggyClient`. A formatação em R$ só acontece no front.
- **Sinal:** negativo é saída de dinheiro, positivo é entrada. O `PluggyClient` normaliza, seja qual for a convenção do Pluggy para conta ou cartão (veja [Convenções do Pluggy](#convenções-do-pluggy)).
- **Datas:** a data da transação é `date` (dia, sem hora), no fuso `America/Sao_Paulo`. Horários de sistema são `timestamptz`.
- **Ids:** `uuid` interno como chave primária. O id do Pluggy fica numa coluna `pluggy_*_id` com índice único, e é por ela que a sincronização grava ou atualiza.
- **JSON bruto:** toda linha que vem do Pluggy guarda a resposta original em `raw jsonb`.
- **Categoria:** a categoria do Pluggy (`pluggy_category`) e a categoria efetiva (`category_id` + `category_source`) ficam separadas. A sincronização **nunca** altera uma transação com `category_source = 'user'`.
- **Transações manuais** (`source = 'manual'`) não têm id do Pluggy nem `raw`, têm sempre `category_source = 'user'` e a sincronização nunca as altera nem apaga. Regras de uso em [produto](01-produto.md#lançamento-manual).
- **Conta "Dinheiro"** (`type = 'cash'`): criada na primeira execução, sem conexão e sem saldo. Recebe só transações manuais e fica fora do saldo total. As transações dela entram normalmente em receitas, despesas, orçamentos e relatórios. O banco garante que só existe uma: o índice único parcial `accounts_single_cash_key` (`type` onde `type = 'cash'`) recusa uma segunda conta `cash`, e o seed (a cada subida da API, depois das migrations) procura pelo tipo, não pelo nome, então o nome pode mudar no futuro.
- **Transferências internas não são receita nem despesa.** Pagamento da fatura do cartão e transferência entre contas suas aparecem duas vezes (sai de uma conta, entra em outra ou quita a fatura). Elas usam uma categoria do tipo `transfer` e ficam fora de todos os totais.

## Convenções do Pluggy

Confirmadas com os dados reais em 4 de novembro de 2026: 3 bancos pelo conector MeuPluggy, 885 transações em BRL, de conta corrente e de cartão.

| Assunto | O que o Pluggy manda | O que o Valora grava |
|---|---|---|
| Sinal na conta corrente | `DEBIT` negativo, `CREDIT` positivo | igual |
| Sinal no cartão | invertido: compra (`DEBIT`) positiva, estorno e pagamento (`CREDIT`) negativos | compra negativa, estorno positivo |
| Regra usada | `type`: `DEBIT` = sai da conta, `CREDIT` = entra (a documentação do SDK diz o mesmo) | `amount_cents` = `Math.round(\|valor\| × 100)`, negativo quando `type = DEBIT`. O sinal do `amount` não entra na conta |
| Valor convertido | `amountInAccountCurrency` veio nulo em todas | usa `amountInAccountCurrency` quando vier; senão, `amount` |
| Data | `date` é um instante em UTC: parte vem às 03:00Z (meia-noite em São Paulo), parte com o horário real | o dia em São Paulo (`toSaoPauloDate`) |
| Pendentes | só apareceram no cartão | `status = 'pending'` |
| Saldo do cartão | positivo = valor da fatura em aberto | igual, em centavos (não é uma saída) |
| Nome do banco | `connector.name` é sempre "MeuPluggy" e o logo é o do conector, não o do banco | `institution_name` = nome da primeira conta do tipo `BANK` do item (sem espaços nas pontas); `institution_logo_url` fica nulo |
| Nome do cartão | nome do produto, às vezes com espaços sobrando no fim | sem espaços nas pontas |

Se um banco novo mandar algo diferente, rode `npm run fixtures:record` em `backend/` e confira o resumo antes de mudar a regra.

## Tabelas

### v1

**`connections`**: cada banco conectado (um item do Pluggy).

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | uuid | |
| `pluggy_item_id` | text | único |
| `institution_name` | text | |
| `institution_logo_url` | text | pode ser nulo |
| `status` | text | `ok`, `syncing`, `error`, `consent_expired` |
| `status_detail` | text | mensagem para mostrar na tela |
| `last_synced_at` | timestamptz | |
| `created_at`, `updated_at` | timestamptz | |

**`accounts`**: contas e cartões.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | uuid | |
| `connection_id` | uuid | → `connections`; nulo na conta Dinheiro |
| `pluggy_account_id` | text | único; nulo na conta Dinheiro |
| `type` | text | `checking`, `savings`, `credit_card`, `cash` |
| `name` | text | |
| `number_last_digits` | text | só os últimos dígitos |
| `balance_cents` | bigint | saldo; no cartão, o valor da fatura atual; nulo na conta Dinheiro |
| `credit_limit_cents` | bigint | só cartão |
| `available_limit_cents` | bigint | só cartão |
| `is_hidden` | boolean | conta que você não quer ver nos totais |
| `raw` | jsonb | |
| `updated_at` | timestamptz | |

**`balance_snapshots`**: foto diária do saldo de cada conta. Base da evolução do patrimônio.

| Coluna | Tipo | Observação |
|---|---|---|
| `account_id` | uuid | → `accounts` |
| `date` | date | |
| `balance_cents` | bigint | |
| | | chave primária: (`account_id`, `date`) |

**`transactions`**

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | uuid | |
| `account_id` | uuid | → `accounts` |
| `pluggy_transaction_id` | text | único; nulo em transação manual |
| `source` | text | `open_finance`, `manual` |
| `date` | date | |
| `description` | text | como veio do banco |
| `description_normalized` | text | maiúsculas, sem acento, espaços únicos; usada pelas regras |
| `amount_cents` | bigint | negativo = saída |
| `status` | text | `pending`, `posted` |
| `pluggy_category` | text | categoria sugerida pelo Pluggy |
| `category_id` | uuid | categoria efetiva → `categories`; pode ser nulo |
| `category_source` | text | `user`, `rule`, `pluggy`, `none` |
| `installment_number` | integer | parcela atual (cartão); pode ser nulo |
| `installment_total` | integer | total de parcelas; pode ser nulo |
| `possible_duplicate_of_id` | uuid | → `transactions` (a manual parecida); preenchido só em transação do Open Finance; nulo depois que você resolve |
| `raw` | jsonb | nulo em transação manual |
| `created_at`, `updated_at` | timestamptz | |

Índices: (`account_id`, `date`), (`category_id`, `date`), (`date`), (`source`).

`possible_duplicate_of_id` usa `ON DELETE SET NULL`: se a transação manual apontada for excluída, a marcação some sozinha. A detecção marca só transações do Open Finance **recém-inseridas** e cada manual só pode ser apontada por uma transação.

Transação manual tem sempre `status = 'posted'`.

**`categories`**

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | uuid | |
| `seed_key` | text | única, pode ser nula. Chave estável das categorias padrão (ex.: `credit_card_payment`); categorias criadas por você ficam com nulo |
| `name` | text | único |
| `kind` | text | `expense`, `income`, `transfer` |
| `icon` | text | nome do ícone Lucide |
| `is_archived` | boolean | |

Categorias não têm cor própria. O motivo está no [Design System](06-design-system.md#gastos-por-categoria).

Categorias padrão, criadas na primeira execução (`seed_key` entre parênteses):

| Tipo | Categorias |
|---|---|
| `expense` | Moradia (`housing`), Mercado (`groceries`), Alimentação (`food`), Transporte (`transport`), Saúde (`health`), Educação (`education`), Lazer (`leisure`), Compras (`shopping`), Assinaturas (`subscriptions`), Serviços (`services`), Impostos e taxas (`taxes_and_fees`), Saque (`cash_withdrawal`), Outras despesas (`other_expenses`) |
| `income` | Salário (`salary`), Rendimentos (`investment_income`), Reembolsos (`refunds`), Outras receitas (`other_income`) |
| `transfer` | Pagamento de fatura (`credit_card_payment`), Transferência entre contas (`account_transfer`), Aplicação e resgate (`investment_flow`) |

O mapeamento inicial de `pluggy_category_mappings` fica em `backend/src/modules/categories/seed/pluggy-category-map.ts`. Categorias do Pluggy que misturam entrada e saída (Pix, TED, boleto, empréstimos) ficam sem mapeamento de propósito.

**`category_rules`**: "descrição contém X → categoria Y".

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | uuid | |
| `pattern` | text | comparado com `description_normalized` |
| `match_type` | text | `contains`, `starts_with`, `equals` |
| `category_id` | uuid | → `categories` |
| `priority` | integer | a de maior prioridade vence |
| `learned_from_transaction_id` | uuid | preenchido quando a regra nasceu de uma correção sua |
| `created_at` | timestamptz | |

**`pluggy_category_mappings`**: traduz as categorias do Pluggy para as suas.

| Coluna | Tipo | Observação |
|---|---|---|
| `pluggy_category` | text | chave primária |
| `category_id` | uuid | → `categories` |

**`budgets`**: limite por categoria e mês.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | uuid | |
| `category_id` | uuid | → `categories` |
| `month` | date | sempre o dia 1 do mês |
| `limit_cents` | bigint | |
| | | único: (`category_id`, `month`) |

Um mês sem orçamento pode copiar o do mês anterior com uma ação na tela.

**`investments`** (gravado desde a Fase 1; tela só na v3)

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | uuid | |
| `connection_id` | uuid | → `connections` |
| `pluggy_investment_id` | text | único |
| `name` | text | |
| `type` | text | tipo de investimento como o Pluggy informa |
| `balance_cents` | bigint | posição atual |
| `raw` | jsonb | |
| `updated_at` | timestamptz | |

**`investment_snapshots`**: foto diária de cada investimento.

| Coluna | Tipo | Observação |
|---|---|---|
| `investment_id` | uuid | → `investments` |
| `date` | date | |
| `balance_cents` | bigint | |
| | | chave primária: (`investment_id`, `date`) |

**`sync_runs`**: histórico das sincronizações.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | uuid | |
| `trigger` | text | `schedule`, `manual` |
| `status` | text | `running`, `success`, `partial`, `failed` |
| `started_at`, `finished_at` | timestamptz | |
| `stats` | jsonb | quantidades por tipo (contas, transações novas, atualizadas, removidas) |
| `error_message` | text | sem dados financeiros |

### v2

**`credit_card_bills`**: faturas.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | uuid | |
| `account_id` | uuid | → `accounts` (cartão) |
| `pluggy_bill_id` | text | único |
| `due_date` | date | vencimento |
| `closing_date` | date | fechamento informado pelo Pluggy; pode ser nulo |
| `total_cents` | bigint | |
| `paid_cents` | bigint | soma dos pagamentos da fatura (`payments[].amount`); padrão 0 |
| `minimum_payment_cents` | bigint | |
| `raw` | jsonb | |

**`planned_entries`**: receitas e despesas previstas.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | uuid | |
| `description` | text | |
| `amount_cents` | bigint | negativo = despesa prevista |
| `category_id` | uuid | → `categories` |
| `day_of_month` | integer | dia previsto |
| `recurrence` | text | `none`, `monthly`, `yearly` |
| `start_month` | date | |
| `end_month` | date | pode ser nulo |
| `is_active` | boolean | |

A previsão não grava uma linha por mês: as **ocorrências são calculadas** a partir de `recurrence`, `start_month`, `end_month` e `day_of_month` (dia 31 em fevereiro cai no 28 ou 29). `none` vale só em `start_month`; `monthly`, em todo mês do início ao fim; `yearly`, no mês de `start_month` a cada ano. Previsão pausada (`is_active = false`) não gera ocorrências. Os dois meses são sempre o dia 1.

**`planned_entry_occurrences`**: o que você decidiu sobre uma ocorrência. Sem linha, a ocorrência do mês está pendente.

| Coluna | Tipo | Observação |
|---|---|---|
| `planned_entry_id` | uuid | → `planned_entries`; `ON DELETE CASCADE` |
| `month` | date | dia 1 do mês da ocorrência; chave primária junto com `planned_entry_id` |
| `status` | text | `realized` ou `skipped` |
| `transaction_id` | uuid | → `transactions`; pode ser nulo; `ON DELETE SET NULL`; índice único onde não é nulo |
| `decided_at` | timestamptz | |

**Como realizar uma ocorrência:** é sempre uma ação sua, nunca automática.
- **Vincular** a uma transação do mesmo mês e do mesmo sinal que ainda não realiza outra ocorrência. O app sugere até 5 candidatas (a até 7 dias da data prevista, com a mesma categoria ou valor dentro de 20%).
- **Marcar como realizada sem vincular** (`status = 'realized'`, `transaction_id` nulo), quando a transação não veio.
- **Pular o mês** (`status = 'skipped'`, sem transação).
- **Desfazer** apaga a linha e a ocorrência volta a pendente.
- Excluir a transação vinculada deixa a ocorrência `realized`, sem vínculo. Editar a previsão vale para todos os meses, inclusive os já realizados.

**`goals`**: metas.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | uuid | |
| `name` | text | 1 a 80 caracteres |
| `icon` | text | ícone Lucide |
| `target_cents` | bigint | valor desejado; maior que zero |
| `saved_cents` | bigint | valor acumulado: a **soma de `goal_contributions`**, mantida na mesma transação de cada aporte ou retirada; nunca abaixo de zero |
| `target_date` | date | prazo; pode ser nulo |
| `created_at` | timestamptz | |

As colunas `linked_account_id` e `linked_investment_id` (meta vinculada a uma conta ou investimento, com valor automático) são da v3 e só entram na migration dessa fase.

**`goal_contributions`**: o histórico de aportes e retiradas de uma meta. É a fonte da verdade do valor acumulado e a base do ritmo.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | uuid | |
| `goal_id` | uuid | → `goals`; `ON DELETE CASCADE` |
| `date` | date | dia do aporte; nunca depois de hoje |
| `amount_cents` | bigint | positivo = aporte, negativo = retirada; nunca zero |
| `kind` | text | `initial`, `deposit` ou `withdrawal` (o sinal de `amount_cents` acompanha o tipo) |
| `created_at` | timestamptz | |

Índice em (`goal_id`, `date`). Criar a meta com um valor já guardado grava um aporte `initial`, que **não entra no ritmo**: é o que existia antes de você usar o app. O ritmo e o prazo estimado são calculados, não guardados ([regras](01-produto.md#metas)).

**`alerts`**

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | uuid | |
| `type` | text | `duplicate_charge`, `subscription_detected`, `budget_warning`, `budget_exceeded`, `connection_error` |
| `transaction_id` | uuid | pode ser nulo |
| `category_id` | uuid | pode ser nulo |
| `connection_id` | uuid | pode ser nulo |
| `message` | text | |
| `created_at` | timestamptz | |
| `read_at`, `dismissed_at` | timestamptz | podem ser nulos |
