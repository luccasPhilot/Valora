# Modelo de dados

Proposta inicial para o PostgreSQL. Os nomes de tabelas e colunas ficam em inglês, em `snake_case`. Os campos podem mudar quando os dados reais do Pluggy chegarem na Fase 1. As regras da seção [Regras](#regras) não mudam.

## Regras

- **Dinheiro em centavos, como inteiro.** Colunas `*_cents` do tipo `bigint`. O Pluggy devolve reais com casas decimais; a conversão (`Math.round(valor * 100)`) acontece uma vez, no `PluggyClient`. A formatação em R$ só acontece no front.
- **Sinal:** negativo é saída de dinheiro, positivo é entrada. O `PluggyClient` normaliza, seja qual for a convenção do Pluggy para conta ou cartão.
- **Datas:** a data da transação é `date` (dia, sem hora), no fuso `America/Sao_Paulo`. Horários de sistema são `timestamptz`.
- **Ids:** `uuid` interno como chave primária. O id do Pluggy fica numa coluna `pluggy_*_id` com índice único, e é por ela que a sincronização grava ou atualiza.
- **JSON bruto:** toda linha que vem do Pluggy guarda a resposta original em `raw jsonb`.
- **Categoria:** a categoria do Pluggy (`pluggy_category`) e a categoria efetiva (`category_id` + `category_source`) ficam separadas. A sincronização **nunca** altera uma transação com `category_source = 'user'`.
- **Transações manuais** (`source = 'manual'`) não têm id do Pluggy nem `raw`, têm sempre `category_source = 'user'` e a sincronização nunca as altera nem apaga. Regras de uso em [produto](01-produto.md#lançamento-manual).
- **Conta "Dinheiro"** (`type = 'cash'`): criada na primeira execução, sem conexão e sem saldo. Recebe só transações manuais e fica fora do saldo total. As transações dela entram normalmente em receitas, despesas, orçamentos e relatórios.
- **Transferências internas não são receita nem despesa.** Pagamento da fatura do cartão e transferência entre contas suas aparecem duas vezes (sai de uma conta, entra em outra ou quita a fatura). Elas usam uma categoria do tipo `transfer` e ficam fora de todos os totais.

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

Transação manual tem sempre `status = 'posted'`.

**`categories`**

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | uuid | |
| `name` | text | único |
| `kind` | text | `expense`, `income`, `transfer` |
| `icon` | text | nome do ícone Lucide |
| `is_archived` | boolean | |

Categorias não têm cor própria. O motivo está no [Design System](06-design-system.md#gastos-por-categoria).

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
| `total_cents` | bigint | |
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

Como marcar uma previsão como realizada (ligar a uma transação real) fica para definir na v2.

**`goals`**: metas.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | uuid | |
| `name` | text | |
| `icon` | text | ícone Lucide |
| `target_cents` | bigint | valor desejado |
| `saved_cents` | bigint | valor acumulado, informado à mão na v2 |
| `target_date` | date | pode ser nulo |
| `linked_account_id` | uuid | v3; pode ser nulo |
| `linked_investment_id` | uuid | v3; pode ser nulo |
| `created_at` | timestamptz | |

O prazo estimado é calculado (pelo ritmo de aporte), não guardado.

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
