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
| `status` | text | `ok`, `syncing`, `error`, `consent_expired`, `item_not_found` (o Pluggy diz que o item não existe mais) |
| `status_detail` | text | mensagem para mostrar na tela |
| `last_synced_at` | timestamptz | |
| `archived_at` | timestamptz | pode ser nulo. Preenchido quando o usuário remove o banco do Valora: nada é apagado, o banco sai das telas e a sincronização o pula. Nulo = banco ativo |
| `consent_expires_at` | timestamptz | pode ser nulo. Vencimento do consentimento (`consentExpiresAt` do Pluggy), regravado a cada leitura do item, mesmo que a leitura dos dados falhe depois. Nulo quando o Pluggy não manda. Alimenta o alerta `consent_expiring` e a tela Saúde dos dados |
| `created_at`, `updated_at` | timestamptz | |

O que sai quando `archived_at` está preenchido: as contas (e o saldo, as faturas e a projeção), a faixa de aviso e os alertas de conexão. O que fica: todas as transações, faturas, investimentos e fotos de saldo, que continuam contando em receitas, despesas e orçamentos. A curva de saldo do Início soma o banco só nos dias anteriores ao dia do arquivamento. Se o `PLUGGY_ITEM_IDS` não tem mais o id do banco, isso não é gravado: a API calcula `isConfigured` na leitura.

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
| `created_at` | timestamptz | quando a conta entrou no Valora; as contas anteriores à migration ficaram com a data dela. Usado no alerta de 31/12 sem foto |
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
| `note` | text | nota livre do usuário, qualquer origem; `CHECK` de até 500 caracteres; nulo sem nota (texto vazio é gravado como nulo). A sincronização nunca a altera |
| `note_normalized` | text | a nota em maiúsculas e sem acento, para a busca; nulo sem nota |
| `reviewed_at` | timestamptz | quando foi revisada; nulo = na caixa "Para revisar". A sincronização insere nulo e nunca muda numa transação existente; lançar à mão, trocar a categoria e marcar como revisada gravam. A postada que substitui uma pendente herda o valor da pendente |
| `created_at`, `updated_at` | timestamptz | |

Índices: (`account_id`, `date`), (`category_id`, `date`), (`date`), (`source`) e o parcial (`date`) onde `reviewed_at` é nulo (`transactions_unreviewed_idx`). Na migration que criou `reviewed_at`, todas as transações que já existiam ficaram revisadas.

`possible_duplicate_of_id` usa `ON DELETE SET NULL`: se a transação manual apontada for excluída, a marcação some sozinha. A detecção marca só transações do Open Finance **recém-inseridas** e cada manual só pode ser apontada por uma transação.

Transação manual tem sempre `status = 'posted'`.

**`tags`**: etiquetas das transações.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | uuid | |
| `name` | text | até 40 caracteres, sem espaço nas pontas |
| `name_normalized` | text | único; o nome em maiúsculas e sem acento, então "Viagem" e "viagem" são a mesma etiqueta |
| `created_at` | timestamptz | |

**`transaction_tags`**: quais etiquetas cada transação tem (até 10 por transação, regra da API). Chave primária (`transaction_id`, `tag_id`), `ON DELETE CASCADE` nos dois lados (excluir a etiqueta a tira das transações; excluir uma transação manual leva as ligações dela) e índice em `tag_id` para o filtro.

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

**`dismissed_rule_suggestions`**: regras sugeridas que você dispensou ("Agora não" ou "Dispensar").

| Coluna | Tipo | Observação |
|---|---|---|
| `pattern` | text | descrição normalizada, como `description_normalized` |
| `category_id` | uuid | → `categories`; `ON DELETE CASCADE` |
| `dismissed_at` | timestamptz | |

Chave primária (`pattern`, `category_id`): dispensar de novo não muda nada. A sugestão em si não é guardada: é calculada a cada consulta.

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

**`investments`** (gravado desde a Fase 1; tela na v3)

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | uuid | |
| `source` | text | `open_finance` (padrão) ou `manual` |
| `connection_id` | uuid | → `connections`; nulo na posição manual |
| `pluggy_investment_id` | text | único; nulo na posição manual |
| `institution_name` | text | só na posição manual: a instituição que você informou |
| `name` | text | |
| `type` | text | tipo de investimento como o Pluggy informa (`FIXED_INCOME`, `MUTUAL_FUND`, `EQUITY`, `ETF`, `SECURITY`, `COE`); a posição manual usa `FIXED_INCOME`, `MUTUAL_FUND`, `EQUITY`, `ETF`, `CRYPTO` (do Valora, o Pluggy não tem tipo de cripto) ou `OTHER` |
| `subtype` | text | subtipo do Pluggy (`CDB`, `TREASURY`, `MULTIMARKET_FUND`...); pode ser nulo. A migration preencheu as linhas antigas com `raw->>'subtype'` |
| `balance_cents` | bigint | posição atual |
| `balance_updated_on` | date | só na posição manual: o dia do último valor informado |
| `raw` | jsonb | nulo na posição manual |
| `created_at` | timestamptz | quando a posição entrou no Valora; as anteriores à migration ficaram com a data dela. Usado no alerta de 31/12 sem foto |
| `updated_at` | timestamptz | |

**Posição que sumiu = posição zerada, só com coleta completa.** Quando o Pluggy diz que a coleta de investimentos do item terminou (`UPDATED` com `executionStatus = SUCCESS`, ou `PARTIAL_SUCCESS` com `statusDetail.investments.isUpdated = true`) e um investimento deixou de vir (resgatado e removido), a sincronização grava `balance_cents = 0` nele e a foto do dia `0`, inclusive se a lista vier vazia. Numa coleta parcial ou em andamento, a posição ausente fica como estava, sem foto do dia. Sem isso o último saldo ficaria somando para sempre. Se o investimento voltar, o upsert restaura a posição. Banco com erro não tem investimentos alterados.

**Posição manual** (`source = 'manual'`): cadastrada por você para o que o Open Finance não traz (INCO, Binance, corretoras sem conector). Um `CHECK` (`investments_source_shape_check`) garante as duas formas: `open_finance` tem `connection_id` e `pluggy_investment_id` e não tem `institution_name` nem `balance_updated_on`; `manual` é o contrário e não tem `raw`. A sincronização nunca altera, zera nem apaga uma posição manual, e grava a foto diária dela no fim de cada execução, repetindo o último valor informado. Excluir a posição apaga as fotos e os `goal_links` dela (`ON DELETE CASCADE`).

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
- Se a transação vinculada é uma pendente do Open Finance que vira postada com outro id, a sincronização passa o `transaction_id` para a postada equivalente (a mesma regra que leva a categoria: [sincronização](03-arquitetura.md#sincronização)), a menos que a postada já realize outra ocorrência. Não há coluna nova: é a mesma linha, apontando para a transação que substituiu a pendente.

**`goals`**: metas.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | uuid | |
| `name` | text | 1 a 80 caracteres |
| `icon` | text | ícone Lucide |
| `target_cents` | bigint | valor desejado; maior que zero |
| `saved_cents` | bigint | valor acumulado: a **soma de `goal_contributions`**, mantida na mesma transação de cada aporte ou retirada; nunca abaixo de zero. Numa meta vinculada ele **não é tocado** (continua sendo a soma dos aportes) e o valor que vale é calculado na leitura a partir de `goal_links` |
| `target_date` | date | prazo; pode ser nulo |
| `created_at` | timestamptz | |

O vínculo com contas e investimentos não é coluna de `goals`: como uma meta pode acompanhar vários itens, ele fica na tabela `goal_links`, abaixo.

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

**`goal_links`**: os itens que uma [meta vinculada](01-produto.md#metas) acompanha. Uma meta é vinculada quando tem pelo menos uma linha aqui; não há coluna de modo em `goals`.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | uuid | |
| `goal_id` | uuid | → `goals`; `ON DELETE CASCADE` |
| `account_id` | uuid | → `accounts`; `ON DELETE CASCADE`; só conta corrente ou poupança de banco ativo (validado na API) |
| `investment_id` | uuid | → `investments`; `ON DELETE CASCADE` |
| `created_at` | timestamptz | |

Exatamente uma entre `account_id` e `investment_id` é preenchida (`CHECK`). Índices únicos parciais por (`goal_id`, `account_id`) e (`goal_id`, `investment_id`): o mesmo item não entra duas vezes na mesma meta, mas pode estar em metas diferentes. Índice em `goal_id`. Excluir a meta apaga só os vínculos; as contas e os investimentos continuam.

**`alerts`**

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | uuid | |
| `type` | text | `duplicate_charge`, `subscription_detected`, `budget_warning`, `budget_exceeded`, `connection_error`, `year_end_snapshot_pending`, `year_end_snapshot_missing`, `consent_expiring` |
| `transaction_id` | uuid | pode ser nulo |
| `category_id` | uuid | pode ser nulo |
| `connection_id` | uuid | pode ser nulo |
| `message` | text | |
| `created_at` | timestamptz | |
| `dedupe_key` | text | identifica a situação que gerou o alerta: `budget_warning:<categoryId>:AAAA-MM`, `budget_exceeded:<categoryId>:AAAA-MM`, `connection_error:<connectionId>`, `consent_expiring:<connectionId>:30` (de 30 a 8 dias antes) e `consent_expiring:<connectionId>:7` (a partir de 7 dias antes; chave nova, então nasce mesmo com o de 30 dispensado), `year_end_snapshot_pending:AAAA`, `year_end_snapshot_missing:AAAA` (o ano de 31/12) |
| `read_at`, `dismissed_at`, `resolved_at` | timestamptz | podem ser nulos. `resolved_at` marca que a causa acabou (só os alertas de orçamento, conexão, `consent_expiring` e `year_end_snapshot_pending`; `duplicate_charge`, `subscription_detected` e `year_end_snapshot_missing` nunca são resolvidos); `dismissed_at` é você dispensando e **não** resolve |

`type` tem `CHECK` com os sete tipos. Índice **único parcial** em `dedupe_key` onde `resolved_at` é nulo: uma situação ativa tem um alerta só, e depois de resolvida outro pode nascer. Um alerta dispensado continua segurando o índice enquanto a causa durar, por isso a sincronização não o recria. Índice em `created_at`.

**`push_subscriptions`**

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | uuid | |
| `endpoint` | text | único; identifica o aparelho no serviço de push. Nunca vai para o log |
| `p256dh`, `auth` | text | as chaves da inscrição, usadas para cifrar o conteúdo do push |
| `created_at` | timestamptz | |
| `last_success_at` | timestamptz | o último envio aceito pelo serviço de push; pode ser nulo |

Uma linha por aparelho. A inscrição é gravada ou atualizada pelo `endpoint` e apagada quando o usuário desativa ou quando o serviço de push responde 404 ou 410.
