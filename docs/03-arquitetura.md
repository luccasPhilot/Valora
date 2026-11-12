# Arquitetura

## Visão geral

```
Seus bancos ──Open Finance──▶ Meu Pluggy (atualiza 1x/dia)
                                    │
                                    │ API do Pluggy (SDK pluggy-sdk)
                                    ▼
┌─ Servidor em casa (Docker Compose, infra/compose.yml) ───────┐
│                                                               │
│  frontend (nginx)  ← única porta publicada: 127.0.0.1:3000    │
│   ├─ entrega o front React já compilado                       │
│   └─ repassa /api para o backend                              │
│                     │                                         │
│                     ▼                                         │
│  backend (Node + Fastify)                                     │
│   ├─ API REST em /api/v1                                      │
│   │    Controller → Service → Repository                      │
│   └─ sincronização: agendada 1x/dia + botão "sincronizar"     │
│        busca contas, transações, faturas, investimentos       │
│        grava no banco, aplica regras de categoria             │
│                     │                                         │
│                     ▼                                         │
│  db (PostgreSQL, dados num volume do disco)                   │
│                                                               │
│  backup semanal (pg_dump) ─────────────────────────────────────────▶ outro disco
└───────────────────────────────────────────────────────────────┘
                     ▲
                     │ Tailscale (HTTPS, só os seus aparelhos)
              celular / notebook (PWA)
```

O app **lê sempre do seu banco de dados**. O Pluggy só abastece esse banco. Se ele cair, mudar de preço ou um consentimento expirar, o histórico continua com você.

Os [lançamentos manuais](01-produto.md#lançamento-manual) (dinheiro em espécie ou uma transação que o Open Finance não trouxe) entram pela API, direto no mesmo banco.

## Stack

| Parte | Escolha | Por quê |
|---|---|---|
| Linguagem | TypeScript (modo `strict`) nas duas pontas | Uma linguagem só para manter |
| Repositório | Um repositório git com `backend/`, `frontend/` e `infra/` independentes (como no CellCare) | Cada parte se instala, testa e vira imagem sozinha |
| Pacotes | npm (vem com o Node) | Nada a instalar, inclusive no Docker |
| Back-end | Node + Fastify | Leve e rápido; validação por schema nas rotas |
| Validação | Zod | Toda entrada externa (request e respostas do Pluggy) passa por schema |
| Banco | PostgreSQL | Robusto, com `jsonb` para guardar o JSON bruto do Pluggy |
| Acesso a dados | Drizzle ORM | Leve, tipado, próximo do SQL, migrations em SQL legível |
| Integração | `pluggy-sdk` (SDK oficial do Pluggy para Node) | Menos código para autenticar e paginar |
| Agendamento | Agendador dentro do próprio app (cron) | Não precisa de outro container nem de webhook |
| Front-end | React + Vite | App de página única; não precisa de renderização no servidor |
| Visual | Tailwind CSS + shadcn/ui | Componentes copiados para o projeto, ajustados ao [Design System](06-design-system.md) |
| Ícones | Lucide | Pedido do guia de identidade; é o padrão do shadcn/ui |
| Gráficos | Recharts (base dos gráficos do shadcn/ui) | Combina com o resto dos componentes |
| Dados no front | TanStack Query | Cache, recarregamento e estados de carregando e erro |
| Rotas no front | React Router | Padrão e suficiente para poucas telas |
| App no celular | PWA (`vite-plugin-pwa`) | Instala pelo navegador; uma base para celular e computador |
| Testes | Vitest + Testcontainers (PostgreSQL real) | Unitários nos services; integração com banco de verdade |
| Deploy | Docker Compose num PC com Linux + Tailscale; front servido por nginx | Veja [deploy](05-deploy.md) |

## Estrutura do repositório

Um único repositório git, com três partes independentes, como no CellCare. A raiz não é um projeto Node: só guarda as configurações comuns e a documentação.

```
valora/
├── backend/                         projeto Node independente (@valora/backend)
│   ├── src/
│   │   ├── modules/
│   │   │   ├── accounts/            controller, service, repository, schemas
│   │   │   ├── transactions/
│   │   │   ├── categories/          categorias + regras
│   │   │   ├── budgets/
│   │   │   ├── dashboard/           consultas agregadas para a tela inicial
│   │   │   └── sync/                cliente Pluggy + rotina de sincronização
│   │   ├── db/                      schema Drizzle + migrations
│   │   ├── shared/                  erros, logger, config, datas, centavos
│   │   └── server.ts
│   ├── test/
│   ├── package.json, package-lock.json, tsconfig.json, eslint.config.js, vitest.config.ts
│   ├── README.md, CLAUDE.md         como rodar / regras só do backend
│   ├── .env.example, drizzle.config.ts, drizzle/ (migrations)
│   └── Dockerfile
├── frontend/                        projeto Node independente (@valora/frontend)
│   ├── src/
│   │   ├── components/ui/           componentes do shadcn/ui, já com os tokens
│   │   ├── components/              componentes do Valora (saldo, item de transação...)
│   │   ├── features/                uma pasta por área (dashboard, transactions...)
│   │   ├── hooks/                   consultas do TanStack Query
│   │   ├── lib/                     formatação BRL/datas, cliente da API
│   │   │   └── api/                 schemas Zod das respostas da API
│   │   └── styles/                  tokens do Design System
│   ├── package.json, package-lock.json, tsconfig.json, eslint.config.js, vitest.config.ts
│   ├── README.md, CLAUDE.md         como rodar / regras só do frontend
│   ├── nginx.conf
│   └── Dockerfile
├── infra/                          Docker Compose e scripts do servidor
│   ├── compose.dev.yml              PostgreSQL para desenvolvimento
│   ├── compose.yml                  produção: frontend, backend, db
│   ├── README.md, CLAUDE.md
│   ├── .env.example
│   └── scripts/                     backup e conferência da restauração
├── docs/  openspec/  docs/design/
├── .editorconfig  .gitattributes  .gitignore  .nvmrc  .prettierrc.json  .prettierignore
└── CLAUDE.md  README.md
```

## Contrato da API

O backend e o frontend **não dividem código**: o front nunca importa nada de `backend/`.

- **O backend é o dono do contrato.** Os schemas Zod das rotas validam a entrada, e os DTOs definem a saída.
- **O frontend valida o que recebe** com os próprios schemas Zod, em `frontend/src/lib/api/`. Se a API mandar algo fora do esperado, o front mostra o estado de erro em vez de quebrar.
- **Mudou um endpoint, mudam os dois lados na mesma change** do OpenSpec, com testes nos dois.
- **Utilitários pequenos usados dos dois lados** (fuso de São Paulo, centavos) existem uma vez em cada parte, cada um com os próprios testes.

## Camadas da API

```
Route/Controller  →  Service  →  Repository  →  PostgreSQL
                        │
                        └──────→  PluggyClient  →  API do Pluggy
```

- **Controller:** recebe a requisição, valida com Zod, chama o service e devolve a resposta. Sem regra de negócio.
- **Service:** toda a regra de negócio (categorização, orçamento, projeção, sincronização). Não conhece HTTP.
- **Repository:** único ponto de acesso ao banco. Sem regra de negócio.
- **PluggyClient:** único ponto de contato com o Pluggy. Valida as respostas com Zod e converte para os tipos do Valora (por exemplo, reais para centavos).

As respostas usam DTOs próprios; tabela do banco e JSON do Pluggy nunca saem direto na API. As listagens são paginadas.

## Endpoints da v1 (proposta inicial)

Tudo sob `/api/v1`.

| Método e rota | Para quê |
|---|---|
| `GET /health` | Verificar se o app e o banco estão de pé |
| `GET /connections?archived=` | Bancos ativos (ou, com `archived=true`, os arquivados): `id`, `institutionName`, `institutionLogoUrl`, `status`, `statusDetail`, `lastSyncedAt`, `isConfigured` (o id está no `PLUGGY_ITEM_IDS`), `archivedAt` e `accounts` (`id`, `name`, `type`, `lastDigits`). Nunca expõe o id do item do Pluggy |
| `PATCH /connections/:id` | `{ isArchived }`: arquiva ou reativa o banco inteiro. Nada é apagado; repetir não muda a primeira data de arquivamento. `NOT_FOUND` se não existe |
| `POST /sync-runs` | Disparar uma sincronização agora |
| `GET /sync-runs/latest` | Resultado da última sincronização |
| `GET /accounts` | Todas as contas e cartões, inclusive "Dinheiro" (sem saldo e sem conexão), sem paginação. Cada conta traz `id`, `name`, `type`, `lastDigits`, `balanceCents` (no cartão, a fatura atual), `creditLimitCents`, `availableLimitCents`, `isHidden` e `connection` (`id`, `institutionName`, `status`, `statusDetail`, `lastSyncedAt`, ou nulo em "Dinheiro"). Traz também `totals`: `totalBalanceCents`, `openCreditCardBillsCents` e `availableCreditCents`. Nunca expõe o `raw` |
| `PATCH /accounts/:id` | Ocultar ou mostrar a conta nos totais (`isHidden`). Devolve a conta atualizada. Para "Dinheiro", 400 `VALIDATION_ERROR` |
| `GET /transactions` | Lista paginada (`limit` padrão 50, máximo 100; sem `from` e `to`, o mês atual); filtros `from`, `to`, `categoryId`, `type`, `accountId`, `source` (`open_finance` ou `manual`), `possibleDuplicate=true` (só as do banco com possível duplicata pendente), `search`, `page`, `limit`. `type` é decidido pela categoria (`transfer`) e, fora dela, pelo sinal do valor. Cada item traz `source` e `possibleDuplicateOfId` |
| `GET /transactions/:id` | Detalhe de uma transação |
| `POST /transactions` | Lançamento manual (receita ou despesa): `type`, `amountCents` (inteiro positivo), `description` (1 a 120 caracteres), `date` (até hoje), `categoryId` (ativa e do mesmo tipo) e `accountId`. Responde 201 |
| `PATCH /transactions/:id` | Trocar a categoria (opcionalmente criando uma regra com `applyAlways`). Numa transação manual, também muda `type`, `amountCents`, `description`, `date` e `accountId` (edição parcial, com as mesmas validações do lançamento). Na do Open Finance, qualquer campo além de `categoryId` e `applyAlways` responde 409 `OPEN_FINANCE_READ_ONLY` |
| `DELETE /transactions/:id` | Excluir uma transação manual (204). Na do Open Finance, 409 `OPEN_FINANCE_READ_ONLY` |
| `POST /transactions/:id/duplicate-resolution` | Chamado na transação do Open Finance, com `action`: `merge` (juntar: a do banco recebe a categoria da manual com `category_source = 'user'`, a manual é apagada, tudo numa transação do banco de dados) ou `keep_both` (são diferentes: só limpa a marcação). Sem duplicata pendente, 409 `NO_DUPLICATE_PENDING` |
| `GET/POST/PUT /categories`, `POST /categories/:id/archive` | Categorias. Não existe exclusão: a categoria é arquivada e continua nas transações antigas |
| `GET/POST/PUT/DELETE /category-rules` | Regras de categorização |
| `GET /pluggy-category-mappings`, `PUT /pluggy-category-mappings/:pluggyCategory` | Mapeamento das categorias do Pluggy para as do Valora (`categoryId` nulo limpa) |
| `GET /budgets?month=` | Orçamento do mês (`AAAA-MM`; sem `month`, o mês atual em São Paulo): por categoria, `limitCents`, `spentCents`, `percent` e `status` (`ok`, `warning`, `exceeded`), do maior percentual para o menor, mais os totais |
| `PUT /budgets/:categoryId?month=` / `DELETE /budgets/:categoryId?month=` | Definir (`limitCents` inteiro maior que zero, só categoria de despesa ativa) ou remover (204) o limite do mês |
| `POST /budgets/copy-previous?month=` | Copia os limites do mês anterior para as categorias ativas sem limite no mês; responde `{ "copied": n }` |
| `GET /planned-entries?month=` | Ocorrências do mês (`AAAA-MM`; sem `month`, o mês atual em São Paulo), calculadas na hora, sem paginação. Cada uma traz `plannedEntryId`, `month`, `date` (a prevista, limitada ao último dia do mês), `entry` (a previsão, com `amountCents` com sinal), `status` (`pending`, `realized`, `skipped`), `decidedAt`, `transaction` (a vinculada, ou nulo) e, nas pendentes, até 5 `candidates` para vincular. Traz também `totals` (`incomeCents` e `expenseCents` por situação) e `pausedEntries` (as previstas pausadas, que não geram ocorrência) |
| `POST /planned-entries`, `PUT/DELETE /planned-entries/:id` | Cadastrar (201), substituir e excluir (204) uma previsão: `description` (1 a 120), `type`, `amountCents` (inteiro positivo), `categoryId` (ativa e do mesmo tipo; `transfer` é recusada), `dayOfMonth` (1 a 31), `recurrence` (`none`, `monthly`, `yearly`), `startMonth`, `endMonth` (opcional, não anterior ao início) e `isActive` (`false` pausa). Excluir apaga as decisões junto |
| `PUT /planned-entries/:id/occurrences/:month` | Decidir a ocorrência do mês: `action` `realize` (com `transactionId` opcional) ou `skip`. O vínculo exige transação do mesmo mês, do mesmo sinal e livre: 422 `TRANSACTION_NOT_COMPATIBLE` ou 409 `TRANSACTION_ALREADY_LINKED`. 404 se a previsão não tem ocorrência naquele mês |
| `DELETE /planned-entries/:id/occurrences/:month` | Desfazer a decisão (204); a ocorrência volta a pendente. 404 se não havia decisão |
| `GET /projection` | Projeção do mês atual (São Paulo), sem parâmetros: `date` (hoje), `startBalanceCents` (o saldo total de Contas), `plannedIncomeCents`, `plannedExpenseCents` e `billsDueCents` (positivos), `projectedBalanceCents`, `lowestBalanceCents` e `lowestBalanceDate` (o ponto mais baixo), `daily` (o saldo no fim de cada dia, de hoje ao último dia do mês), `events` (`type` `planned_income`, `planned_expense` ou `bill`, `date`, `description`, `amountCents` com sinal, `isOverdue`, `isEstimatedDate`) e `warnings` (cartão sem vencimento). Atrasados caem em hoje; no mesmo dia, as saídas vêm antes das entradas |
| `GET /goals` | Todas as metas, sem paginação, já com as contas feitas: `progressPercent`, `status` (`completed`, `no_pace`, `on_track`, `behind`), `remainingCents`, `monthlyRateCents` (o ritmo usado), `requiredMonthlyCents` (com prazo), `estimatedDate` (nulo sem ritmo, concluída ou acima de 50 anos), `isEstimateTooFar` e os 10 aportes mais recentes (`recentContributions`). Meta vinculada: `isLinked`, `links` (`type` `account` ou `investment`, `id`, `name`, `institutionName`, `balanceCents`, `isArchived`) e `manualSavedCents` (a soma dos aportes guardada; `savedCents` é o valor que vale agora, o mesmo em meta manual). Ordem: não concluídas pelo prazo mais próximo (sem prazo por último), concluídas no fim |
| `POST /goals`, `PUT/DELETE /goals/:id` | Criar (201; `initialCents` opcional vira um aporte `initial`), substituir e excluir (204, os aportes e os vínculos saem junto) uma meta: `name` (1 a 80), `icon`, `targetCents` (inteiro maior que zero) e `targetDate` (opcional). `links` (até 10 `{ type, id }`) vincula a meta a contas corrente e poupança e investimentos de bancos ativos; item inválido, repetido ou mais de 10: 400 `VALIDATION_ERROR` com `links` em `details`; `links` com `initialCents` maior que zero: 400 com `initialCents` em `details`. No `PUT`, `links` ausente mantém os vínculos e `[]` desvincula |
| `POST /goals/:id/contributions` | Registrar um aporte ou uma retirada (`type` `deposit` ou `withdrawal`, `amountCents` sempre positivo, `date` até hoje) e atualizar `saved_cents` na mesma transação. Retirada acima do acumulado: 400 `VALIDATION_ERROR`. Meta vinculada: 409 `GOAL_IS_LINKED`. Responde a meta atualizada (201) |
| `DELETE /goals/:id/contributions/:contributionId` | Remover um aporte e desfazer o efeito dele no acumulado; responde a meta atualizada. 409 `CONFLICT` se o acumulado ficaria abaixo de zero (há retiradas depois dele); 409 `GOAL_IS_LINKED` em meta vinculada |
| `GET /goals/:id/contributions?page=&limit=` | Histórico completo da meta, do mais recente ao mais antigo, paginado |
| `GET /alerts?page=&limit=` | Alertas ativos (nem dispensados nem resolvidos), do mais recente ao mais antigo, paginados (`limit` padrão 20, máximo 50). Traz `unreadCount` (total, não só da página) e, em cada item, `id`, `type`, `message`, `createdAt`, `readAt` e `target` (`{ screen: 'budgets', month, categoryId }`, `{ screen: 'accounts' }`, `{ screen: 'transactions', from, to, search }` ou nulo). Nunca expõe a chave de deduplicação nem referências internas |
| `POST /alerts/:id/read`, `POST /alerts/read-all`, `POST /alerts/:id/dismiss` | Marcar como lido, marcar todos como lidos e dispensar. Todos respondem 204 e são idempotentes (repetir mantém a primeira data). Id inexistente: 404 `NOT_FOUND` |
| `GET /investments` | Posições dos investimentos de bancos ativos, sem paginação, agrupadas por `type` do Pluggy: `totals` (`totalCents`, `positionsCount`, `closedCount`: as posições com saldo zero ficam fora da lista e só são contadas) e `groups` (`type`, `totalCents`, `percent` e `items` com `id`, `name`, `subtype`, `balanceCents`, `percent` e `institutionName`). `percent` é a fatia do total, com uma casa decimal. Grupos do maior para o menor total e itens do maior para o menor saldo. Nunca expõe o `raw` nem o id do Pluggy |
| `GET /net-worth?from=&to=` | Patrimônio de hoje e a evolução mensal (`from` e `to` em `AAAA-MM`; sem `to`, o mês atual; sem `from`, 12 meses até `to`; `to` no futuro vira o mês atual; `from` depois de `to`, formato inválido ou mais de 60 meses: 400 `VALIDATION_ERROR` com o campo em `details`). Traz `current` (`date`, `accountsCents`, `investmentsCents`, `openBillsCents` positivo e `netWorthCents`, das posições atuais de bancos ativos), `points` (um por mês com foto, do mais antigo ao mais recente: `month`, `date` de referência e as mesmas quatro cifras, das fotos diárias), `monthChange` (`cents` e `percent` desde a primeira foto do mês, só com bancos ativos; nulo sem foto de um dia anterior a hoje) e `firstSnapshotDate` (a foto mais antiga guardada; nulo sem fotos). Sem paginação: no máximo 60 pontos |
| `GET /credit-card-bills` | Um item por cartão não oculto, sem paginação: `accountId`, `accountName`, `lastDigits`, `institutionName`, `currentBill` (a primeira fatura não paga com vencimento de hoje em diante; sem ela, a vencida não paga mais recente), `upcomingBills` (até 3, em ordem de vencimento) e `futureInstallments` (parcelas já conhecidas, somadas por mês, do mês atual a 12 meses). Cada fatura traz `id`, `dueDate`, `isEstimatedDueDate`, `closingDate`, `totalCents`, `paidCents` e `status` (`open`, `paid`, `overdue`, calculado na leitura). O Pluggy só devolve faturas fechadas: sem fatura fechada pendente, a `currentBill` é montada do saldo da conta, com vencimento estimado (um mês depois da última fatura ou, sem faturas, o dia do vencimento velho dos dados da conta repetido). Nunca expõe o `raw` |
| `GET /dashboard?month=` | Todos os números da tela inicial numa resposta (`month` `AAAA-MM`; sem ele, o mês atual em São Paulo): `totalBalanceCents` (a mesma regra de Contas), `balanceEvolution` (soma diária das fotos de saldo dessas contas) e `balanceChange` (`cents` e `percent`, nulo sem foto de um dia anterior a hoje no mês); `netWorth` (`totalCents`, `investmentsCents`, `openBillsCents` e `change`, os mesmos valores de `current` e `monthChange` de `GET /net-worth`; nulo quando `month` não é o mês atual); `monthIncomeCents` e `monthExpenseCents` (sem transferências, com manuais e pendentes; despesa positiva); `incomeVsExpense` (6 meses até o pedido, com zero nos meses vazios); `spendingByCategory` (5 maiores, "Sem categoria" disputando vaga, e "Outros" com o resto, cada item com `kind`, `amountCents` e `percent` do gasto líquido total); `budgetsNearLimit` (3 de maior percentual, com `status`) `latestTransactions` (5 mais recentes, de qualquer período, tipo e origem); `projection` (resumo de `GET /projection`: `projectedBalanceCents`, `lowestBalanceCents`, `lowestBalanceDate` e `hasPlannedItems`; nulo quando `month` não é o mês atual) e `goals` (até 3 metas não concluídas na ordem da tela de Metas, cada uma com `percent`, `status`, valores e estimativa, mais `activeCount` com o total de não concluídas). Os três blocos vêm dos services de projeção, metas e patrimônio (`NetWorthService.summary()`, que lê só as fotos do mês atual), sem recalcular regra nenhuma |

Os erros seguem o formato `{ "error": { "code", "message", "details" } }`. Os códigos novos do lançamento manual são `OPEN_FINANCE_READ_ONLY` (409) e `NO_DUPLICATE_PENDING` (409); erros de campo (`date`, `categoryId`, `amountCents`...) vêm como `VALIDATION_ERROR` com o nome do campo em `details`.

## Sincronização

Roda uma vez por dia no horário do `SYNC_CRON` (padrão 07:00, fuso `America/Sao_Paulo`) e também pelo botão "sincronizar agora". Um lock no PostgreSQL impede duas sincronizações ao mesmo tempo.

Para cada item (banco) do Meu Pluggy:

1. **Conferir o status do item.** Se houver erro ou consentimento expirado, marcar a conexão e seguir para o próximo banco. Um banco com problema não pode travar os outros.
2. **Contas:** gravar ou atualizar usando o id do Pluggy como chave. Gravar a **foto do saldo do dia** em `balance_snapshots`.
3. **Transações:**
   - na primeira vez, buscar os **12 meses** disponíveis;
   - nas próximas, buscar os **últimos 30 dias**. A janela é maior que um dia de propósito, porque transações pendentes do cartão mudam ou somem antes de serem confirmadas;
   - gravar ou atualizar pelo id do Pluggy, de modo que rodar duas vezes nunca duplica nada;
   - transação **pendente** que sumiu dentro da janela é apagada;
   - **transações manuais (`source = 'manual'`) nunca são alteradas nem apagadas** pela sincronização.
4. **Categorizar** só as transações sem categoria do usuário, nesta ordem: regra do usuário → mapeamento da categoria do Pluggy → "Sem categoria". **Uma categoria escolhida por você nunca é sobrescrita.**
5. **Possíveis duplicatas:** só quando uma transação do Open Finance é **inserida** pela primeira vez, procurar uma transação manual na mesma conta, com o mesmo valor e data até 3 dias de diferença. Se achar, marcar `possible_duplicate_of_id` na transação do banco. **Nunca juntar sozinho:** quem decide é você.
   - **Juntar:** a manual é apagada e a do banco fica, herdando a categoria da manual se ela tinha uma escolhida por você.
   - **São diferentes:** a marcação é limpa e as duas ficam. Como a checagem só roda na inserção, o par não volta.
6. **Investimentos:** gravar a posição (com `type` e `subtype`) e a **foto do dia** em `investment_snapshots`. Começou na Fase 1, antes de haver tela, porque histórico não volta depois. O que o banco **deixou de devolver** foi resgatado: a posição vai a zero, com a foto do dia `0` (inclusive com a lista vazia), para um valor velho não inflar o total.
7. **Faturas do cartão:** buscar as faturas de cada cartão e gravar pelo id do Pluggy (`credit_card_bills`), sem duplicar. Fatura é complemento: se a busca falhar para um cartão, o banco sincroniza mesmo assim e `billsFailed` registra a falha.
8. **Alertas:** no fim da execução, depois de todos os bancos e em qualquer resultado (`success`, `partial` ou `failed`: conexão com erro é justamente o caso), o `AlertEvaluator` calcula as situações ativas de orçamento e de conexão, cria os alertas que faltam e resolve os que acabaram. Falha na avaliação não muda o resultado da sincronização: o log guarda só o tipo do erro e `alertsFailed` vale 1 nas estatísticas. O avaliador de orçamento também roda depois das gravações do usuário que mudam gasto ou limite (lançamento manual, troca de categoria, juntar duplicata, limites), sempre pelo service e sem nunca falhar a operação principal.
9. Registrar o resultado em `sync_runs`: horário, quantidades e erro, se houver.

O Pluggy usa convenções de sinal diferentes para conta e cartão: no cartão, a compra vem positiva. O `PluggyClient` normaliza para a regra do Valora (**negativo = saída**) pelo `type` da transação. Isso foi confirmado com dados reais e está detalhado nas [convenções do Pluggy](04-modelo-de-dados.md#convenções-do-pluggy).

Cada banco é gravado numa transação própria do banco de dados, e os dados dele são buscados inteiros no Pluggy antes de abrir essa transação. Se a resposta vier inválida ou a gravação falhar, nada daquele banco fica gravado: a conexão fica com `status = 'error'` e a execução termina como `partial`.

## Testes

- **Unitários (Vitest)** nos services: categorização, cálculo de orçamento, projeção, normalização de valores do Pluggy, detecção de possível duplicata. Meta de 80% de cobertura nos services.
- **Integração (Vitest + Testcontainers):** repositories e a sincronização completa contra um PostgreSQL de verdade. O Pluggy é mockado com respostas gravadas e anonimizadas (fixtures em JSON).
- **Front-end:** testes de componentes só onde houver lógica (formatação, filtros).

## Decisões

| Decisão | Motivo |
|---|---|
| Dados via Meu Pluggy | É o único caminho gratuito; aceita o limite de 5 conexões e a atualização diária |
| Servidor em casa com Tailscale | Custo zero; extratos não ficam em servidor de terceiros; nada fica exposto na internet |
| Sem tela de login na v1 | Só os seus aparelhos na Tailscale alcançam o app. Se um dia expor fora da Tailscale, login vira obrigatório |
| Sincronização agendada, sem webhook | O Meu Pluggy só atualiza 1x/dia; webhook exigiria um endereço público |
| Sincronização dentro do app | Um container a menos; o mesmo service atende o agendamento e o botão |
| Ocorrências de previsão calculadas na leitura | Uma previsão recorrente vale em muitos meses sem gravar uma linha por mês: só a sua decisão (`realized` ou `skipped`) é gravada, então mudar a previsão nunca deixa lixo e mês futuro e passado usam o mesmo cálculo |
| Vínculo previsão × transação sempre manual | Como na possível duplicata, o app sugere e você escolhe: juntar sozinho erraria em silêncio. Uma transação realiza no máximo uma ocorrência (índice único) |
| `GET /planned-entries` sem paginação | Exceção consciente à regra de paginar: são dezenas de previsões no máximo, e a tela precisa do mês inteiro de uma vez |
| Projeção calculada na leitura, sem tabela | `ProjectionService` só combina o saldo total (`calculateAccountTotals`), as ocorrências pendentes (`planned-entries`) e as faturas (`credit-card-bills`), sem reescrever a regra de nenhuma; o cálculo é a função pura `projectEndOfMonth` (`backend/src/modules/projection/month-projection.ts`). Desconta a fatura e não as parcelas soltas, porque a fatura já contém as parcelas do mês |
| `GET /projection` sem paginação | Exceção consciente à regra de paginar: a resposta cobre só o mês atual, no máximo um ponto por dia e algumas dezenas de lançamentos |
| Aportes como fonte da verdade da meta | Só um `saved_cents` editável não tem datas, e sem datas não há ritmo. `goal_contributions` guarda cada aporte e retirada; `goals.saved_cents` é a soma, mantida na **mesma transação do banco** (um `UPDATE` condicionado a não ficar abaixo de zero), então os dois nunca divergem. O valor inicial é um aporte `initial` e fica fora do ritmo |
| Ritmo e prazo da meta calculados na leitura | Funções puras (`goal-progress.ts`, `goal-pace.ts`, `goal-status.ts` em `backend/src/modules/goals/`), em inteiros e sem IA. Nada de prazo guardado: mudar um aporte nunca deixa um número velho |
| Meta vinculada: vínculo em tabela, valor calculado na leitura, aportes preservados | Uma meta pode acompanhar vários itens, então o vínculo é a tabela `goal_links` (e não colunas em `goals`); meta vinculada = ter ao menos um vínculo, sem coluna de modo para sincronizar. O valor (`savedCents`) é a soma dos saldos atuais dos itens de bancos ativos, calculada em cada leitura, então nunca diverge de Contas e Investimentos. `goals.saved_cents` não é tocado enquanto a meta é vinculada: os aportes antigos ficam guardados e voltam a valer na desvinculação. O ritmo vem da variação dos saldos nas fotos diárias dos últimos 90 dias (`goal-linked-pace.ts`) e reaproveita o prazo de `goal-pace.ts` (`estimateFromRate`). Aporte e retirada manuais em meta vinculada: 409 `GOAL_IS_LINKED` |
| Avaliador de alertas idempotente | `AlertEvaluator` calcula o conjunto de situações ativas e reconcilia com a tabela (cria o que falta com `ON CONFLICT DO NOTHING`, resolve o que sumiu), em vez de reagir a eventos. Rodar duas vezes seguidas não muda nada, e qualquer caminho (sincronização, lançamento manual, limite) pode chamá-lo sem coordenação. A avaliação de orçamento olha só o mês atual; alertas de meses que acabaram saem do conjunto e são resolvidos |
| Dispensar não recria o alerta | O índice único parcial só libera a `dedupe_key` quando `resolved_at` é preenchido. Dispensar (`dismissed_at`) não resolve: enquanto a causa continuar, o alerta dispensado segura o índice e nada volta a aparecer. Se a causa acaba e volta, nasce um alerta novo |
| Alertas de evento só inserem | Cobrança duplicada e assinatura detectada são detectores de evento: `AlertEvaluator.evaluateTransactionPatterns()` só insere (`ON CONFLICT DO NOTHING` pela `dedupe_key`) e nunca resolve. Como `resolved_at` fica nulo, o índice parcial segura a chave para sempre: o alerta fica até ser dispensado e um alerta dispensado não renasce. Os detectores são funções puras (`backend/src/modules/alerts/detectors/`) sobre as saídas postadas do Open Finance dos últimos 7 meses; rodam no fim da sincronização, não em gravações do usuário |
| `GET /goals` sem paginação | Exceção consciente à regra de paginar: são poucas dezenas de metas no máximo, e a tela mostra todas de uma vez. O histórico completo de cada meta é paginado em `GET /goals/:id/contributions` |
| `GET /investments` sem paginação | Exceção consciente à regra de paginar: são poucas dezenas de posições no máximo (até 5 conexões), e a tela agrupa tudo de uma vez. O agrupamento e os percentuais são a função pura `groupInvestments` (`backend/src/modules/investments/investment-groups.ts`) |
| Investimento que sumiu da resposta é zerado | O Pluggy pode remover um título resgatado em vez de devolvê-lo com saldo zero, e o último saldo gravado ficaria somando para sempre. Para um banco sincronizado com sucesso, o que não voltou vira posição `0` com foto `0`. O risco é uma resposta parcial do Pluggy zerar uma posição por um dia; a sincronização seguinte restaura |
| Investimentos agrupados pelo `type` do Pluggy | Os subtipos (CDB, LCI, Tesouro...) são dezenas e deixariam a lista longa; o tipo dá o panorama e o subtipo identifica cada linha. Os rótulos em português ficam no front, a API manda os códigos |
| Patrimônio de um dia calculado por item, com tolerância de 7 dias | Cada conta e cada investimento vale a foto mais recente até o dia, com no máximo 7 dias. Somar só as fotos do dia faria uma foto que faltou derrubar o total e abrir um degrau que não existiu; 7 dias cobrem uma falha curta da sincronização sem inventar saldo de um item que sumiu há semanas. São funções puras (`valueOnDay`, `buildNetWorthSeries`, `buildMonthChange` em `backend/src/modules/net-worth/net-worth-calculations.ts`) sobre as fotos lidas em duas consultas, sem N+1 |
| Um ponto de patrimônio por mês, no último dia com foto | O roadmap pede "mês a mês" e o Início já mostra a curva diária do saldo. O mês atual vai até hoje e muda a cada sincronização. Mês sem foto não gera ponto |
| Banco arquivado deixa um degrau na curva do patrimônio | Os itens dele contam só nos dias anteriores ao dia do arquivamento (fuso de São Paulo), igual à curva "evolução do saldo". A variação do mês usa só bancos ativos nas duas pontas |
| Utilitários de mês em `shared/` | `monthsEndingAt`, `monthsBetween` (`months.ts`), `parseMonthRange` (`month-range.ts`) e `buildValueChange` (`value-change.ts`) saíram do módulo `dashboard`, para os relatórios e o patrimônio usarem sem depender do Início |
| `GET /credit-card-bills` sem paginação | Exceção consciente à regra de paginar: são no máximo 5 conexões, então poucos cartões, e a tela precisa de todos de uma vez |
| Parcelas futuras calculadas na leitura | O Pluggy não manda parcelas por vir de forma confiável. Agrupa pela descrição e pelo total de parcelas (o valor fica fora da chave, porque as parcelas variam em centavos) e projeta a partir da parcela de maior número |
| Uma sincronização por vez com `pg_try_advisory_lock` | O lock fica na sessão do PostgreSQL: some sozinho se o processo cair e valeria até com mais de um processo. Uma flag em memória não teria nenhuma das duas coisas. O disparo manual responde 409 (`SYNC_IN_PROGRESS`) e o agendamento só registra que pulou |
| Ids dos bancos no `.env` (`PLUGGY_ITEM_IDS`) | Listar os itens pela API do Pluggy só existe nos planos pagos. Para até 5 bancos que quase nunca mudam, editar o `.env` e reiniciar basta |
| Um endpoint agregado para o Início | Uma requisição só evita o efeito cascata de carregamento e mantém as regras no servidor. O `DashboardService` não reescreve nada: chama os services de contas (saldo total), orçamentos (gasto líquido e `budgetStatus`) e transações (últimas), e usa o filtro de tipo compartilhado para receitas e despesas, então o Início e as outras telas mostram sempre o mesmo número |
| CI no GitHub, deploy chamado à mão no servidor | O CI (typecheck, lint, formatação, testes e build) roda nos runners da GitHub, onde há Docker para o Testcontainers e o i5 de 8 GB do servidor não é usado. O deploy é o `infra/scripts/deploy.sh`, rodado no servidor: faz o backup antes de atualizar e espera os healthchecks. Um runner self-hosted foi descartado: executaria código vindo do GitHub numa máquina com dados financeiros, num repositório público. `main` é produção; o trabalho fica na `develop` |
| Lista de contas sem paginação, com os totais calculados na API | O número de contas é limitado pelas 5 conexões do Meu Pluggy (algumas dezenas de linhas, no máximo): outra exceção consciente à regra de paginar. A regra do saldo total mora em `calculateAccountTotals` (`backend/src/modules/accounts/account-totals.ts`), para a tela de Contas e o Início mostrarem sempre o mesmo número; somar no front espalharia a regra |
| Acompanhar a sincronização por consulta periódica | Depois de disparar, o front consulta `GET /sync-runs/latest` a cada 3 segundos até a execução sair de `running` (e desiste depois de 2 minutos, com aviso). SSE ou WebSocket seriam exagero para uma ação que leva segundos e acontece poucas vezes por dia |
| Arquivar o banco em vez de apagar | `connections.archived_at`: o banco sai das contas, do saldo, das faturas, da projeção, da faixa e dos alertas, e a sincronização o pula (mesmo com o id no `.env`, que o app não edita). Transações, faturas, investimentos e fotos ficam, por causa da regra "histórico perdido não volta". O critério "banco ativo" vive num ponto só (`active-connection.ts`). O banco que sai do `PLUGGY_ITEM_IDS` é detectado na leitura (`isConfigured`, sem coluna, porque mudar o `.env` exige reiniciar a API); o que o Pluggy não conhece mais vira o status `item_not_found`, reconhecido pelo `PluggySdk` no corpo de erro `code: 404`. A curva do saldo soma o banco arquivado só nos dias anteriores ao arquivamento, e a variação do mês usa só os bancos ativos |
| `GET /connections` sem paginação | O Meu Pluggy permite no máximo 5 conexões. É uma exceção consciente à regra de paginar listagens, como a lista de contas |
| Categorias, regras e mapeamentos sem paginação | São dezenas de categorias, no máximo algumas centenas de regras e pouco mais de cem categorias do Pluggy. Mais uma exceção consciente à regra de paginar listagens |
| Categorização por função pura em lote | `decideCategory` não acessa o banco; o `Categorizer` carrega regras e mapeamentos uma vez e aplica em lotes de 1.000. Roda dentro da transação de cada banco na sincronização e de novo sempre que uma regra ou um mapeamento muda |
| Categorias padrão achadas por `seed_key` | O seed procura pela chave estável, não pelo nome: uma categoria renomeada ou arquivada por você não é recriada, e o mapeamento inicial do Pluggy só é criado junto com a categoria, então um mapeamento que você limpou não volta |
| Agendamento com `croner` | Suporte nativo a fuso (`America/Sao_Paulo`), escrito em TypeScript e sem dependências |
| JSON bruto guardado | Permite reprocessar quando as regras mudarem, sem buscar tudo de novo |
| Dinheiro em centavos (inteiro) | Evita erro de arredondamento do ponto flutuante |
| Fotos diárias de saldo e investimentos desde a Fase 1 | O Open Finance devolve a posição atual; a evolução só existe se for guardada |
| PWA em vez de app nativo | Uma base de código; instala no celular pelo navegador |
| Cache de leitura da API, sem fila de escrita | O service worker (`vite-plugin-pwa`, `generateSW`) guarda o app e as respostas `GET /api/v1/*` (menos `sync-runs` e `health`) com `NetworkFirst`: com rede usa a rede; sem rede ou acima de 5 s, mostra a última resposta, e o cabeçalho `X-Valora-Cached-At` diz de quando ela é. Escritas nunca são guardadas nem reenviadas: as mutações usam `networkMode: 'always'` e falham na hora, para um lançamento nunca ser enviado horas depois sem o usuário perceber. A versão nova do app espera o toque em "Atualizar" (`registerType: 'prompt'`) |
| Página "não encontrado" em tela cheia | Rota coringa (`*`) **fora** do `AppShell`, depois da rota do shell: sem menu nem topo, só a mensagem e um botão para o Início. Não usa `errorElement`, que também pegaria erros de renderização e de carregamento. O nginx continua respondendo 200 com o app para endereços desconhecidos |
| React + shadcn/ui em vez de Angular | Caminho mais curto para um visual caprichado e totalmente ajustável |
| Fontes servidas pelo próprio app | Funciona sem internet e não faz requisição para terceiros |
| Sem IA | Escolha de produto (veja [produto](01-produto.md#fora-do-escopo)) |
| Lançamento manual só como complemento | Cobre dinheiro em espécie e o que o Open Finance não trouxer. "Dinheiro" é uma conta sem saldo, não uma carteira |
| Possível duplicata é sugerida, nunca juntada sozinha | Um par parecido pode ser de duas compras reais; a decisão fica com você |
| Um repositório com `backend/`, `frontend/` e `infra/` independentes | Mesma organização do CellCare; cada parte se instala, testa e vira imagem sozinha. Monorepo com pacote compartilhado foi descartado |
| README.md e CLAUDE.md em cada parte | O README diz como rodar; o CLAUDE.md guarda só as regras daquela pasta e é carregado pelo Claude Code quando se trabalha nela. O CLAUDE.md da raiz fica com o que vale para tudo, o que economiza contexto |
| Nomes das pastas | `backend/` e `frontend/` como no CellCare; `infra/` em vez de `deploy/` porque guarda também o banco de desenvolvimento; guia visual em `docs/design/`. Pastas em inglês, minúsculas, sem espaço e sem prefixo `valora-` (o repositório e os pacotes `@valora/*` já identificam o projeto) |
| Back e front sem código compartilhado | Cada parte se entende sozinha. O custo é repetir alguns schemas e utilitários; o front valida as respostas da API com os dele |
| Front servido por nginx, em container próprio | Como no CellCare; o nginx entrega o front e repassa `/api` para o backend, que não publica porta |
| npm em vez de pnpm | O npm já vem com o Node, inclusive no Docker; o Node 26 não traz mais o Corepack |
| Menu lateral em vez de barra inferior | O app passa de dez áreas nas fases 2 e 3; o mesmo menu serve celular (abre por cima) e computador (fixo). Detalhes no [Design System](06-design-system.md#layout-e-navegação) |
