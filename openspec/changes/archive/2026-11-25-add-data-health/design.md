## Context

- `PluggyItemOverview.consentExpiresAt` já existe (`item-status.ts`, `pluggy-client.ts`) e só decide se o status é `consent_expired`.
- `balance_snapshots` tem uma foto por conta e dia, gravada na sincronização (07:00 e o botão). `transactions` tem `date`, `status` (`pending`, `posted`), `amount_cents` com sinal e `source`.
- `sync_runs` guarda cada execução com `trigger`, `status`, datas, `stats` (contagens) e `error_message`. Só existe `GET /sync-runs/latest`.
- Os alertas reconciliados (orçamento, conexão) seguem o molde de `alert-situations.ts` + `AlertEvaluator.reconcile`.

## Goals / Non-Goals

**Goals:**
- Saber do consentimento a vencer com um mês de folga.
- Ver no app quando um saldo não fecha com as transações.
- Ver as sincronizações recentes sem abrir o banco de dados.

**Non-Goals:**
- Corrigir nada sozinho; conciliar cartão.

## Decisions

### 1. Consentimento

- `connections.consent_expires_at` gravado pela sincronização a cada leitura do item (inclusive quando o banco falha depois da leitura do item), com o valor do Pluggy ou nulo.
- Alerta `consent_expiring`, reconciliado, para conexão ativa com `consent_expires_at` entre agora e 30 dias. Chave `consent_expiring:<connectionId>:<limiar>`, com limiar `30` (de 30 a 8 dias) ou `7` (7 dias ou menos). Ao cruzar os 7 dias, o de 30 é resolvido e nasce o de 7, mesmo que o de 30 tenha sido dispensado: é o segundo aviso. Vencido, quem avisa é o `connection_error` que já existe.
- Texto: "O consentimento do {banco} vence em {dd/mm}. Renove a conexão no Meu Pluggy." Destino: Contas.

### 2. Conciliação (função pura `reconcileBalances`)

- Entrada, por conta corrente ou poupança de banco ativo: as fotos dos últimos 60 dias e as transações **postadas** do Open Finance da conta no mesmo período. Manuais ficam de fora (a conta "Dinheiro" não tem foto, e manual em conta do banco é justamente o complemento).
- Para cada par de fotos seguidas `(d1, d2)` com `d2 <= hoje − 3`: `esperado = foto(d2) − foto(d1)`, `real = soma das transações com data em [d1, d2)`. Se `esperado ≠ real`, é uma divergência `{ accountId, from: d1, to: d2, differenceCents: esperado − real }`.
- **A janela `[d1, d2)`** supõe que a foto das 07:00 de um dia ainda não tem as transações daquele dia. A tarefa 1 confere isso **só com contagens** na cópia do backup de produção (quantos pares batem com `[d1, d2)` e quantos com `(d1, d2]`) antes de fixar a regra. Se nenhuma janela bater na maioria dos pares, a conciliação passa a comparar semanas em vez de dias.
- **Conferido em 24/11/2026 (tarefa 1)** na cópia do backup de 17/11 (só contagens): 44 pares de fotos seguidas, todos de dias consecutivos, em 4 contas correntes (nenhuma poupança com foto ainda), de 05/11 a 17/11. Sem juntar nada, `[d1, d2)` bate 39 pares e `(d1, d2]` bate 40; nos 11 pares com transação, 6 e 7. Juntando os pares seguidos com diferença, `[d1, d2)` fica com 5 pares num bloco só que soma zero (**0 divergências**) e `(d1, d2]` fica com **2 divergências**. **Vale `[d1, d2)`**, com a junção dos pares seguidos; continua diária. A amostra é curta (13 dias): se houver falso positivo com mais histórico, rever.
- **Por que 3 dias:** transação lançada com atraso (data anterior à da chegada) muda o passado; 3 dias deixa assentar.
- Divergências de dias seguidos da mesma conta com diferenças que se anulam (uma chegou no dia errado) são juntadas num período só ou descartadas quando a soma é zero.

### 3. Conta parada (função pura)

Conta `checking` ou `credit_card`, não oculta, de banco ativo com `status = 'ok'`, cuja transação mais recente tem 10 dias ou mais (ou nenhuma transação e conta criada há 10 dias ou mais). Poupança fica de fora: ficar parada é normal.

- `accounts` não tem data de criação: a **primeira foto de saldo** da conta é o dia em que ela apareceu. Sem transação e sem foto, a conta não aparece.
- Só contam transações do Open Finance: a manual não diz nada sobre o banco ainda mandar dados.

### 4. API

- `GET /api/v1/data-health` → `{ consents: [{ connectionId, institutionName, expiresAt, daysLeft }], divergences: [{ accountId, accountName, from, to, differenceCents }], staleAccounts: [{ accountId, accountName, lastTransactionDate, daysWithoutTransactions }] }`. Listas curtas por natureza (até 5 bancos), sem paginação; as divergências limitadas às 50 mais recentes.
- `GET /api/v1/sync-runs?page=&limit=` paginado (padrão 30, máximo 100), mais recente primeiro, com o mesmo DTO de `latest`.

### 5. Tela

`/ajustes/saude-dos-dados`, com link em Ajustes ("Saúde dos dados") e em Contas. Quatro seções com o estado "Tudo certo" cada. A divergência mostra o valor pelo `Money` (respeita "Ocultar valores") e leva a Transações filtrada pela conta e pelas datas. O histórico mostra data e hora, "Agendada"/"Botão", o resultado com ícone e texto (nunca só cor) e "12 novas, 3 atualizadas".

## Risks / Trade-offs

- **Falsos positivos na conciliação:** horário da foto, transação com data diferente da do extrato, rendimento automático da poupança que não vem como transação. → A conferência com dados reais (tarefa 1) decide a janela; o texto diz "possível", e nada é corrigido sozinho.
- **Banco sem `consentExpiresAt`:** alguns conectores podem não mandar. → Sem data, a seção diz "O banco não informou o vencimento".
