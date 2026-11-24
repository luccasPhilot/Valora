# Revisão do código e próximas fases

Varredura completa feita em 18/11/2026, com as Fases 0 a 3 do [roadmap](07-roadmap.md) praticamente concluídas. Ela inclui as mudanças ainda não commitadas da change `add-manual-investments`.

O documento tem três partes:

1. [Melhorias no que já existe](#parte-1--melhorias-no-que-já-existe): erros, riscos e dívidas encontrados no código, na infra e nos testes.
2. [Próximas fases](#parte-2--próximas-fases): funcionalidades novas que o uso real deixou claras.
3. [Ordem sugerida](#parte-3--ordem-sugerida): como transformar tudo isso em changes do OpenSpec.

**Como foi feita.** Cinco revisões em paralelo, só de leitura: sincronização e modelo de dados, módulos de domínio do backend, frontend, infra e segurança, e produto. Os achados de severidade **Alta** foram conferidos de novo no código. Os marcados **"a confirmar"** dependem de dados reais ou do servidor.

**Como usar.** Nada aqui está aprovado. Cada item vira uma change do OpenSpec (`/opsx:propose`) quando for a vez dele. Os itens que contrariam um documento estão na seção [Decisões que dependem de você](#decisões-que-dependem-de-você).

---

## Resumo

O código está em bom estado: camadas respeitadas, cálculos em funções puras e bem testadas, dinheiro sempre em centavos, idempotência da sincronização bem feita, nenhum `any` e mais de 1.600 testes. Os problemas que importam não são de estilo. São **caminhos raros em que um dado se perde em silêncio**, e num app em que "histórico perdido não volta" eles valem mais que qualquer funcionalidade nova.

As dez prioridades:

| # | O quê | Por quê | Onde |
|---|---|---|---|
| 1 | ~~Backup sem sobrescrever~~ (feito em 23/11/2026); cópia fora de casa pendente | Hoje fica só na mesma casa, e um rollback no mesmo dia **apaga o backup bom** | [I1–I3](#infra-backup-e-segurança) |
| 2 | ~~Avisar fora do app quando backup ou sincronização falham~~ (feito em 23/11/2026) | Uma falha do backup ou da sincronização diária hoje passa sem ninguém saber | [I4](#infra-backup-e-segurança) |
| 3 | ~~Janela da sincronização a partir da última sincronização~~ (feito em 24/11/2026) | Banco parado mais de 30 dias **perde transações para sempre** | [S1](#sincronização-e-integridade-dos-dados) |
| 4 | ~~Não apagar a categoria escolhida quando a pendente vira postada~~ (feito em 24/11/2026) | Quebra a regra 3 por um caminho indireto | [S2](#sincronização-e-integridade-dos-dados) |
| 5 | ~~Não zerar investimentos numa coleta parcial do Pluggy~~ (feito em 24/11/2026) | Grava foto 0 no histórico do patrimônio | [S4](#sincronização-e-integridade-dos-dados) |
| 6 | ~~Recuperar a foto diária quando o cron das 07:00 não roda~~ (feito em 24/11/2026); o aviso de 31/12 sem foto também (24/11/2026, `add-year-end-snapshot-check`) | Um deploy ou reinício no horário deixa o dia sem foto | [S5](#sincronização-e-integridade-dos-dados) |
| 7 | ~~Curva e variação do saldo do Início com a foto que faltou~~ (feito em 24/11/2026) | Um banco que falhou no dia 1 vira "ganho no mês" | [D1](#regras-de-negócio-e-cálculos) |
| 8 | ~~Error boundary nas rotas~~ (feito em 24/11/2026) | Um chunk que falha deixa a PWA numa tela em inglês sem saída | [F1](#frontend) |
| 9 | ~~Invalidações do TanStack Query depois de regra e categoria~~ (feito em 24/11/2026) | Início e orçamentos mostram números velhos | [F2–F3](#frontend) |
| 10 | ~~Garantir a foto de 31/12/2026~~ (feito em 24/11/2026; **o deploy precisa sair antes de 31/12/2026**) | É a base dos bens e direitos no IR 2027 e só pode ser gravada naquele dia | [Fase 4](#fase-4--confiança-e-rotina) |

---

## Parte 1 — Melhorias no que já existe

Severidade: **Alta** = perda ou corrupção de dado, ou número errado em destaque. **Média** = número errado em caso de borda, risco operacional ou dívida que já atrapalha. **Baixa** = acabamento, desempenho futuro ou higiene.

### Sincronização e integridade dos dados

| Id | Achado | Sev. | Onde | O que fazer |
|---|---|---|---|---|
| S1 | **Resolvido em 24/11/2026** (`fix-sync-data-loss`). **Banco parado mais de 30 dias perde transações.** A janela é 365 dias só quando `lastSyncedAt` é nulo; nos outros casos, sempre 30. Um consentimento vencido por 70 dias ou um banco reativado depois de meses volta buscando só 30 dias, e o resto nunca entra. A execução termina como `success`. | Alta | `sync.service.ts`, `windowFor` | `from = max(hoje − 365, min(hoje − 30, dia(lastSyncedAt) − margem))`. Teste: `should_fetch_since_last_sync_when_bank_was_down_for_more_than_30_days`. |
| S2 | **Resolvido em 24/11/2026** (`fix-sync-data-loss`). **Pendente categorizada por você some com a categoria.** `deleteMissingPending` protege as manuais, mas não olha `category_source`. No cartão, a pendente costuma virar postada com **outro id**: a pendente (com a sua categoria) é apagada e a postada nasce com categoria automática. Vínculos com previsões e alertas viram `NULL`. | Alta | `sync/transactions.repository.ts`, `deleteMissingPending` | Antes de apagar, transferir a categoria `user` para a postada equivalente (mesma conta, mesmo valor, data próxima, inserida nesta execução) ou não apagar pendentes com `category_source = 'user'`. Teste primeiro. |
| S3 | **Resolvido em 24/11/2026** (`fix-sync-data-loss`). **Aviso de duplicata perdido na troca pendente → postada.** A ordem é upsert → marcar duplicatas → apagar pendentes. A manual ainda está "ocupada" pela pendente quando a postada é checada; depois a pendente some e ninguém checa de novo. Manual e postada contam em dobro, sem aviso. | Média | `sync.service.ts`, `saveTransactions` | Apagar as pendentes que sumiram **antes** de marcar duplicatas (mesma transação do banco, então é seguro). |
| S4 | **Resolvido em 24/11/2026** (`fix-sync-data-loss`). **Coleta parcial zera investimentos e grava foto 0.** "Lista vazia = tudo resgatado" vale também para item `PARTIAL_SUCCESS`, `statusDetail.investments.isUpdated = false` ou leitura durante `UPDATING`. O `executionStatus` é validado, mas nunca usado. | Média | `sync/investments.repository.ts`, `item-status.ts`, `pluggy.schemas.ts` | Zerar só quando o produto de investimentos foi coletado com sucesso. Em `syncing`, não zerar nada. |
| S5 | **Resolvido em 24/11/2026** (`fix-sync-data-loss`). **Foto diária depende de um único disparo do cron.** O `croner` não recupera disparos perdidos. Servidor desligado, deploy às 07:00 ou falha passageira de um banco deixam o dia sem foto. | Média | `sync.schedule.ts`, `server.ts` | Ao subir a API, se não houver sincronização bem-sucedida hoje (fuso SP), disparar uma. Opcional: segunda tentativa à tarde só para os bancos que falharam. |
| S6 | **Renovar consentimento como item novo pode duplicar 12 meses** (a confirmar). Ids de conta e transação seriam novos, e a primeira sincronização busca 365 dias. Arquivar a conexão antiga não resolve, porque as transações dela continuam nos totais. | Média | `sync.service.ts`, `connections.repository.ts` | Confirmar no sandbox ou com o suporte do Pluggy. Se for o caso, limitar o `from` da conexão nova ao dia seguinte à última transação da arquivada da mesma instituição. |
| S7 | **Conta que some do Pluggy fica com o saldo antigo para sempre.** Investimentos que somem são zerados; contas não. Um cartão cancelado continua no saldo total. | Média | `sync/accounts.repository.ts` | Decisão de produto: marcar a conta como encerrada quando não vier numa sincronização bem-sucedida do banco e registrar no `stats`. |
| S8 | **Resolvido em 24/11/2026** (`fix-sync-data-loss`). **Erro de banco de dados fora do `attempt` derruba a execução inteira.** `connections.ensure`, `updateConnectionStatus` e o `updateStatus` do `catch` não estão isolados por banco. Se `syncRuns.finish` falhar, as estatísticas reais viram `failed`. | Baixa | `sync.service.ts` | try/catch por item em volta de todo o `syncItem`; não sobrescrever o resultado quando só o `finish` falhar. |
| S9 | **Diagnóstico pobre nos erros do SDK.** O SDK rejeita com objeto simples, então todo erro HTTP do Pluggy vira `'unknown'`. O SDK também faz `console.error` com o corpo da resposta, fora do logger e da redação. | Baixa | `sync.service.ts` (`errorTypeOf`), `pluggy-sdk/dist/baseApi.js` | Registrar o `code` numérico. Documentar ou silenciar o `console.error` do SDK. |
| S10 | **Sem CHECK de forma em `transactions` e `accounts`.** Nada no banco impede uma linha `open_finance` sem `pluggy_transaction_id` (escaparia da idempotência) ou uma manual com `raw`/`pending`. `investments` já tem o seu. | Baixa | `db/schema.ts` | `transactions_source_shape_check` e o equivalente em `accounts` (`type = 'cash'` ⇔ sem conexão), no molde de `investments_source_shape_check`. |
| S11 | **Índices faltando.** `transactions.possible_duplicate_of_id`, `alerts.transaction_id`, `category_rules.learned_from_transaction_id` (cada `DELETE` em transações varre essas tabelas) e `date` em `balance_snapshots`/`investment_snapshots` (filtros só por data varrem a tabela; as fotos crescem para sempre). | Baixa | `db/schema.ts` | Índices parciais nos FKs e índice em `date` nas fotos. Nada urgente com o volume de um usuário. |
| S12 | **Nome do banco vira "MeuPluggy"** quando o item não tem conta BANK (só cartão, ou lista vazia por falha passageira). | Baixa | `sync.service.ts` | Sem conta BANK, manter o nome atual ou usar o do primeiro cartão. |
| S13 | **Pontos menores:** `merge` de duplicata com regra de negócio no repository; `Categorizer` reprocessa todo o histórico da conexão a cada sincronização; `dateTo` talvez interpretado em UTC pelo Pluggy (a confirmar: transações da noite só na sincronização seguinte). | Baixa | `possible-duplicates.repository.ts`, `categorization.repository.ts`, `pluggy-sdk.ts` | Mover a regra do merge para o `DuplicatesService`; limitar a recategorização às linhas novas ou alteradas; conferir o `dateTo` numa sincronização no fim do dia. |

### Regras de negócio e cálculos

| Id | Achado | Sev. | Onde | O que fazer |
|---|---|---|---|---|
| D1 | **Resolvido em 24/11/2026** (`fix-balance-history-gaps`). **Curva e variação do saldo do Início não preenchem a foto que faltou.** O saldo do dia é `sum(balance_cents) group by date`. Se um banco falha no dia 1, a variação do mês trata o saldo inteiro dele como ganho. O patrimônio já resolve isso com tolerância de 7 dias, e o próprio doc 03 registra o risco. | Alta | `dashboard.repository.ts`, `dashboard.service.ts` | Calcular a curva com as funções do patrimônio (`valueOnDay`), só com a parte das contas. Resolve também a duplicação de "arquivado antes do dia" (D9). |
| D2 | **Resolvido em 24/11/2026** (`fix-balance-history-gaps`): o estorno reduz a despesa. **Estorno conta como receita no Início e nos relatórios, mas reduz o gasto nas categorias.** Compra de R$ 200 e estorno de R$ 50: despesa do mês 200, receita +50, gastos por categoria 150. Infla a receita e a taxa de poupança. | Média | `transaction-type-filter.ts`, `transaction-totals.repository.ts` | **Decisão sua** (muda a definição "tipo pelo sinal" do doc 03): entrada positiva em categoria `expense` reduz a despesa, ou manter e explicar na tela. |
| D3 | **Projeção de parcelas futuras: duas compras iguais viram uma.** A chave da compra é descrição + total de parcelas. Conferido com dados reais: a descrição **não** traz o número da parcela e o `date` avança mês a mês (a data da compra fica à parte, em `creditCardMetadata.purchaseDate`), então as suposições do código valem. Sobra só o caso raro de duas compras com a mesma descrição e o mesmo número de parcelas, que contam como uma. | Baixa | `credit-card-bills/installment-projection.ts` | Incluir a `purchaseDate` do `raw` na chave quando houver. Fazer quando o arquivo for tocado. |
| D4 | **`GET /dashboard` faz mais de 20 consultas, várias repetidas.** `accounts.overview()` 3 vezes; projeção carrega transações do mês para sugestões de vínculo que descarta; 24 meses de parcelas que não usa; metas inteiras para mostrar 3. | Média | `dashboard.service.ts`, `projection.service.ts`, `planned-entries.service.ts`, `credit-card-bills.service.ts` | Ler o overview uma vez e passar adiante; métodos enxutos (`pendingOccurrences(month)`, `currentBills()`). Cache não é necessário. |
| D5 | **Uma cobrança no meio apaga a assinatura detectada.** Qualquer intervalo fora de 25–35 dias reinicia a sequência, inclusive duplicata (intervalo 0). A assinatura some de "Cobranças recorrentes" por uns 2 meses. | Média | `alerts/detectors/subscriptions.ts` | Ignorar intervalos menores que 25 dias em vez de reiniciar. Teste "duplicata no meio não quebra a assinatura". |
| D6 | **Resolvido em 24/11/2026** (`fix-balance-history-gaps`): `balanceChange` nulo fora do mês atual. **`/dashboard?month=` de mês passado é incoerente** (saldo de hoje comparado com a foto daquele mês). O front não manda `month`. | Baixa | `dashboard.service.ts` | `balanceChange: null` fora do mês atual, ou remover o parâmetro. |
| D7 | **Alertas e assinaturas ainda olham bancos arquivados**, embora o produto diga que o banco arquivado sai dos alertas. | Baixa | `alerts/alert-charges.repository.ts` | Filtrar por conexão ativa (`active-connection.ts`). |
| D8 | **Alerta de orçamento dispensado pode renascer no mesmo mês** (estorno baixa o gasto, depois sobe de novo). O produto diz que não volta. | Baixa | `alerts/alerts.repository.ts`, `resolveActiveExcept` | Não resolver os dispensados de orçamento, ou checar `dismissedAt` antes de criar. |
| D9 | **Resolvido em 24/11/2026** (`fix-balance-history-gaps`): `shared/percent.ts` e `shared/categories.ts`. **Lógica duplicada:** "arquivado antes do dia" em SQL e em TS; percentual com uma casa em 3 módulos; `'Sem categoria'` em 2. | Baixa | `dashboard.repository.ts`, `net-worth-calculations.ts`, `investment-groups.ts`, `category-spending-report.ts`, `category-insights-calculations.ts` | Extrair para `shared/`. A primeira some junto com D1. |
| D10 | **Metas vinculadas leem 90 dias de fotos para usar uma.** A janela também difere da meta manual (91 contra 90 dias). | Baixa | `goals.repository.ts`, `goal-linked-pace.ts`, `goal-pace.ts` | `DISTINCT ON (item) … ORDER BY item, date` e alinhar a janela. |
| D11 | **Excluir uma posição manual desvincula metas em silêncio** (`ON DELETE CASCADE` em `goal_links`). A meta volta a somar aportes antigos sem aviso. | Baixa | `investments.repository.ts` | Informar quantas metas perdem o vínculo e avisar na confirmação. |
| D12 | **Reforço na posição manual:** `updateManual` e `deleteManual` filtram só por `id`; a garantia de "é manual" fica só no service. | Baixa | `investments.repository.ts` | `eq(investments.source, 'manual')` no `where`. |
| D13 | **Regras do projeto:** `as` desnecessário em `planned-entries.repository.ts`; `catch {}` mudo em `health.repository.ts`; funções bem acima de 20 linhas (`DashboardService.overview`, `GoalsRepository.findLinks`, `registerModules`). | Baixa | vários | Ajustar quando o arquivo for tocado. |

### Frontend

| Id | Achado | Sev. | Onde | O que fazer |
|---|---|---|---|---|
| F1 | ~~**Nenhum error boundary.** Exceção de render ou chunk `lazy` que falha (aba aberta durante deploy, cache do SW apagado pelo iOS) cai na tela padrão do React Router, em inglês e com stack. Na PWA não há botão de recarregar.~~ **Resolvido em 24/11/2026** (`harden-frontend-data`). | — | `app/router.tsx` | — |
| F2 | ~~**Regra e mapeamento não atualizam os totais.** Salvar regra ou mapeamento roda `recategorizeAll()` no backend, mas o front só invalida a lista e `['transactions']`. Início, orçamentos, relatórios, análise de categorias e alertas ficam velhos por até 60 s.~~ **Resolvido em 24/11/2026** (`harden-frontend-data`). | — | `categories/categories-queries.ts`, `useInvalidate` | — |
| F3 | ~~**Outras invalidações faltando:** metas não invalidam o Início (que traz `goals`); previsões não invalidam o Início (que traz `projection`); lançar transação não invalida previsões nem faturas. `['category-rules']` está declarada duas vezes.~~ **Resolvido em 24/11/2026** (`harden-frontend-data`). | — | `goals-queries.ts`, `planning-queries.ts`, `transactions-queries.ts` | — |
| F4 | ~~**Testes de relatórios frágeis.** Falham por timeout com a máquina fria (4 de 9 arquivos numa execução, todos passam na seguinte). Causas: rotas do shell sem stub, `retry: 1` com timer real vazando para o teste seguinte, `fetchMock.mock.calls.at(-1)`, app inteiro renderizado em cada teste, sem `unstubAllGlobals`.~~ **Resolvido em 24/11/2026** (`harden-frontend-data`). | — | `test/helpers/stub-routes.ts`, `test/setup.ts`, `*-report.test.tsx` | — |
| F5 | **Faixa offline com estado global "última leitura vence".** Um GET fresco esconde a faixa com dados velhos na tela; um backend lento (> 5 s) devolve cache de até 7 dias e a faixa diz "Sem conexão" estando online. | Média | `lib/pwa/connectivity.ts`, `vite.config.ts` (`networkTimeoutSeconds: 5`) | Guardar `cachedAt` por query e mostrar a idade da mais antiga visível; cair no cache só quando a rede falha de fato. |
| F6 | **Início travado em endpoint fora do cache e fetch sem timeout** (a confirmar no aparelho). O Início espera `sync-runs/latest`; com a Tailscale ligada e o servidor fora, o skeleton fica até o timeout do sistema. Escritas sem timeout deixam o botão em "salvando". | Média | `dashboard-page.tsx`, `api-client.ts` | Só esperar o `latestSyncRun` quando o dashboard vier vazio; `AbortSignal.timeout(15 s)` nas escritas, com "pode ter sido salvo, confira". |
| F7 | **Resolvido em 24/11/2026** (`refine-transactions-ux`). **"Ocultar valores" incompleto.** Formulários de edição (orçamento, transação, meta, previsão) mostram o valor real; a cor verde/vermelha ainda revela o sinal (`transaction-item`, `planned-amount`, `result-money`, `projection-events`, saldo negativo no `balance-card`). Só o painel novo de investimento manual mascara. | Média | vários | Hook `useAmountTone(cents)` com cor neutra quando oculto, e o padrão "em branco mantém o valor" em todos os formulários de edição. |
| F8 | **Resolvido em 24/11/2026** (`refine-transactions-ux`). **Botão "Fechar" do Sheet com 16 px.** Todos os formulários no celular usam o Sheet; o do Dialog já tem `size-11`. Já estava nas pendências da crítica de Transações. | Média | `components/ui/sheet.tsx` | Copiar a classe do `dialog.tsx`. |
| F9 | **Sem lint de hooks.** Falta `eslint-plugin-react-hooks` (26 `useEffect`), `@tanstack/eslint-plugin-query` e `jsx-a11y`. Algumas funções públicas sem tipo de retorno explícito. | Média | `eslint.config.js` | Adicionar os plugins (dependências novas, justificadas) e corrigir o que aparecer. |
| F10 | **Nova versão da PWA demora a ser detectada.** O iOS não recarrega a PWA retomada, e o `useRegisterSW` não chama `update()`. | Baixa | `components/update-prompt.tsx` | `registration.update()` no `visibilitychange`. |
| F11 | ~~**Painel de investimento manual:** erros sem `aria-describedby`; "Encerrar posição" e "Excluir" funcionam offline e "Encerrar" não pede confirmação; `saveErrorMessage` ignorado.~~ **Corrigido em 18/11/2026**, antes de arquivar a change. | — | `manual-investment-panel.tsx`, `use-manual-investment-actions.ts` | — |
| F12 | **Duplicação:** `FieldError` em 5 arquivos; `PHONE_QUERY`/`TABLET_QUERY` em 8; `useSync` e `useStartSync` repetem a mutation. | Baixa | vários | `components/field-error.tsx` e `lib/breakpoints.ts` com `useIsPhone()`. |
| F13 | ~~**Retry genérico:** `retry: 1` também para 4xx e respostas fora do contrato, atrasando o erro em 1 s.~~ **Resolvido em 24/11/2026** (`harden-frontend-data`). | — | `app/query-client.ts` | — |
| F14 | **Bundle e precache:** 22 fontes `woff2` (~450 KB) com subsets cirílico, grego e vietnamita no precache; Recharts num chunk compartilhado de 342 KB cujo hash muda com código do app. | Baixa | `globals.css`, `vite.config.ts` | Importar só o subset latin; `manualChunks` com `vendor-recharts`. |
| F15 | **Resolvido em 24/11/2026** (`refine-transactions-ux`). **Acessibilidade pontual:** "Vincular" com 32 px; nomes de ícones do Lucide em inglês no `aria-label`; `aria-label` da linha de regra e categoria esconde o conteúdo visível. | Baixa | `occurrence-panel.tsx`, `icon-picker.tsx`, `rules-tab.tsx`, `categories-tab.tsx` | Alvo de 44 px; rótulos em pt-BR; `aria-label` só no botão, não na linha. |
| F16 | **Bordas:** girar o iPad com o painel aberto troca Dialog por Sheet e perde o que foi digitado; trocar a categoria com filtro de categoria ativo mantém o item na lista. | Baixa | `form-panel.tsx`, `transactions-queries.ts` | Fixar o tipo de painel enquanto aberto; invalidar a lista quando o filtro de categoria estiver ativo. |
| F17 | **Resolvido em 24/11/2026** (`refine-transactions-ux`). **Pendências da crítica de Transações (26/40):** corte em 320 px; estado dos filtros dividido; linha de resumo discreta; total do dia "R$ 0,00" com filtro de transferência (decidido: mostrar a contagem, "3 transferências"). | Média | `features/transactions` | Uma change de acabamento. |

### Infra, backup e segurança

| Id | Achado | Sev. | Onde | O que fazer |
|---|---|---|---|---|
| I1 | **Resolvido em 23/11/2026** (`harden-backups`). **Rollback no mesmo dia apaga o backup bom.** O arquivo é `valora-AAAA-MM-DD.dump` e o `mv` sobrescreve. Deploy (backup do estado bom) → bug corrompe dados → `deploy.sh <anterior>` faz backup do banco ruim **por cima** → "restaure o mais recente" restaura o ruim. | Alta | `infra/scripts/backup.sh`, `deploy.sh` | Nome com hora e origem (`valora-predeploy-AAAA-MM-DD_HHMMSS.dump`, `valora-weekly-…`) e `mv -n`. |
| I2 | ~~**O cron do backup talvez nunca rode.**~~ **Conferido em 18/11/2026: o cron roda.** Há dumps de 08/11 e 15/11 às 03:00 (domingos), além dos backups de antes de cada deploy. | — | `backup.sh` | Nada a fazer. Se um dia a linha do cron mudar, conferir que o arquivo de log continua gravável pelo usuário. |
| I3 | **Resolvido em parte em 23/11/2026** (`harden-backups`): retenção em camadas e `chmod 600`. A cópia fora de casa continua pendente, por escolha. **Backup na mesma casa, em texto claro, com retenção curta.** Fonte queimada, roubo ou ransomware levam os dois discos. Cerca de 4 cópias: um erro notado depois de um mês não tem volta. A frequência semanal fica como está: é uma escolha consciente para um app pessoal, aceitando até 7 dias de perda do que não volta. | Alta | `backup.sh`, `docs/05-deploy.md` | Manter o semanal. Retenção em camadas (por exemplo, 8 semanais + 12 mensais); cópia off-site criptografada (`restic` ou `rclone crypt`) com a senha fora do servidor; `chmod 600`. |
| I4 | **Resolvido em 23/11/2026** (`harden-backups`). Avisos pelo healthchecks.io do backup, da sincronização agendada e do disco. **Ninguém fica sabendo quando a sincronização ou o backup falham.** Também não há aviso de disco cheio, container `unhealthy` ou servidor desligado. | Média | `sync.schedule.ts`, `backup.sh` | Dead-man's switch (healthchecks.io ou `ntfy` próprio): ping de ok/falha no fim do backup, do restore-check e da sincronização (só o status, nunca valores); cron diário de `df`. O aviso chega quando o ping **não** chega. |
| I5 | **Resolvido em 23/11/2026** (`harden-backups`). Restore-check semanal com seis tabelas e restauração com o backend parado. **Restauração não é verificada de forma automática**, e o `restore-check` compara só 3 tabelas. O procedimento da doc roda `pg_restore --clean` com o backend no ar. | Média | `restore-check.sh`, `docs/05-deploy.md` | `backup.sh && restore-check.sh` no cron; incluir as tabelas de fotos e `investments`; `compose stop backend` antes de restaurar. |
| I6 | **Imagens base nunca recebem correções.** O deploy não faz `pull`; Postgres, Node e nginx ficam na versão do primeiro download. Tags sem digest. | Média | `deploy.sh`, `compose.yml`, Dockerfiles | `compose pull db` e `build --pull` no deploy; fixar por digest e deixar o Dependabot atualizar. |
| I7 | **Sem Dependabot e sem auditoria no CI.** `npm audit --omit=dev` está limpo; o completo do frontend mostra 22 vulnerabilidades de ferramentas de build (ReDoS), sem efeito no bundle. | Média | `.github/` | `dependabot.yml` (npm, docker, github-actions), semanal e agrupado; `npm audit --omit=dev --audit-level=high` no CI. |
| I8 | **Resolvido em 23/11/2026** (`harden-backups`). **Logs dos containers sem rotação.** O backend loga toda requisição, inclusive o healthcheck a cada 10 s (~8.640 linhas/dia). Disco cheio derruba o Postgres. | Média | `compose.yml`, `shared/request-log.ts` | `logging` com `max-size: 10m` e `max-file: 5` nos três serviços; não logar `/api/v1/health`. |
| I9 | **Backend conecta no Postgres como superusuário.** Uma injeção ou dependência comprometida ganha `COPY … TO PROGRAM` e `DROP DATABASE`. | Média | `compose.yml` | Papel `valora_app` dono do schema, sem `SUPERUSER`/`CREATEDB`. |
| I10 | **nginx sem headers de segurança** (CSP, `nosniff`, `Referrer-Policy`, `frame-ancestors`, `Permissions-Policy`) e com `server_tokens` ligado. | Média | `frontend/nginx.conf` | `include security-headers.conf` em **cada** `location` (um `add_header` no `location` anula os do `server`). Validar a CSP com o SW e o Recharts. |
| I11 | **POSTs sem corpo aceitam requisição de outro site** (CSRF): `/sync-runs`, `/alerts/read-all`, `/alerts/:id/dismiss`, `/budgets/copy-previous`, `/categories/:id/archive`. Impacto baixo. A tailnet não tem ACL, e Portainer e Dozzle no mesmo host dão acesso aos `.env` (a confirmar). | Baixa | rotas citadas, Tailscale | Hook `onRequest` que recusa não-GET com `Sec-Fetch-Site` de outro site; ACL da Tailscale; conferir a exposição do Portainer. |
| I12 | **Sem desligamento gracioso.** Node como PID 1 ignora o SIGTERM: cada deploy espera 10 s pelo `SIGKILL` e mata uma sincronização em curso. | Baixa | `server.ts`, `compose.yml` | `init: true` e handler de `SIGTERM` com `app.close()` e parada do `Cron`. |
| I13 | **Rollback exige rebuild** (sem tag de versão nas imagens) e o `prune` do deploy é global, atingindo os outros apps do servidor. | Baixa | `deploy.sh` | `image: valora-backend:${VALORA_SHA}` com as 3 últimas; `prune` filtrado pelo projeto do Compose. |
| I14 | **CI não faz build das imagens Docker**; actions fixadas por tag, não por SHA; proteção da `main` não verificada. | Baixa | `.github/workflows/ci.yml` | Job de `docker build` sem push; actions por SHA; exigir CI verde na `main`. |
| I15 | **Sem limite de memória** num servidor de 8 GB compartilhado, e sem plano de upgrade de major do Postgres. | Baixa | `compose.yml`, `docs/05-deploy.md` | `mem_limit` por serviço; seção "Atualizar o PostgreSQL" (dump, volume novo, restore, restore-check). |

### Documentação e processo

| Id | Achado | Sev. | O que fazer |
|---|---|---|---|
| P1 | ~~O `CLAUDE.md` da raiz ainda diz "Fase 0 do roadmap em andamento".~~ **Feito em 18/11/2026.** | — | — |
| P2 | ~~A change `add-manual-investments` está implementada, mas não arquivada.~~ **Arquivada em 18/11/2026**, com F11 corrigido; a Fase 3 está concluída. | — | Falta só o commit. |
| P4 | **Testes que falham por tempo com a suíte inteira.** Parte do front **resolvida em 24/11/2026** (`harden-frontend-data`): três rodadas seguidas sem falha, sem aumentar o `testTimeout`. Em 18/11/2026, `npm test` do backend teve 5 falhas em `test/api/*` (primeiro teste de cada arquivo, que sobe o app, passou dos 5 s), e o frontend teve 4 nos relatórios (F4). Os dois conjuntos passam quando rodam sozinhos. Suíte que falha ao acaso ensina a ignorar falha. | Média | Backend: `testTimeout` maior no projeto `api` ou subir o app uma vez por arquivo (`beforeAll`). Frontend: F4. |
| P3 | As fixtures do Pluggy vêm do sandbox. A Fase 6 depende de saber como os dados **reais** de renda fixa chegam (taxa, indexador, vencimento). Parcelas e status de investimento já foram conferidos no backup de produção ([conferência](#conferência-com-dados-reais)). | Média | Restaurar um backup de produção em `dumps-Producao/` (ignorada pelo git) numa base separada e conferir só com contagens; fixtures novas continuam anonimizadas. |

### Conferência com dados reais

Em 18/11/2026, o backup de produção de 17/11 foi restaurado numa base separada e os itens "a confirmar" foram conferidos só com contagens (nenhum valor ou descrição saiu da base). O banco de produção tinha 13 dias de uso, 4 conexões, 925 transações e 77 posições de investimento.

| Item | O que os dados mostram | Conclusão |
|---|---|---|
| S1 | Nenhum banco ficou mais de 30 dias sem sincronizar; todos sincronizaram em 17/11. | O risco continua no código, mas ainda não aconteceu. Corrigir antes do primeiro consentimento vencido. |
| S2 | Há 10 transações pendentes, e 2 delas têm categoria escolhida por você. | Exposição real: se elas virarem postadas com outro id, as 2 categorias se perdem. Mantém **Alta**. |
| S4 | 55 das 77 posições estão zeradas, mas todas vieram com `status = TOTAL_WITHDRAWAL` do próprio Pluggy (resgate total). Nenhuma posição foi zerada pela sincronização e voltou depois. | O risco continua no código, sem ocorrência. As posições resgatadas ganham foto 0 todo dia: inofensivo, só volume. |
| S5 | Houve sincronização agendada bem-sucedida em todos os dias de 06/11 a 17/11, e todas as contas e posições têm foto em todos os dias. | O risco continua no código, sem ocorrência. |
| S6 | Nenhuma transação aparece repetida entre conexões diferentes (mesma data, valor e descrição). | Não aconteceu. Confirmar de novo na primeira renovação de consentimento. |
| D2 | 41 transações de entrada estão em categorias de despesa (17 nos últimos 6 meses). | Estorno é comum nos seus dados. A decisão sobre D2 afeta números reais do Início. |
| D3 | 19 transações parceladas (8 compras): descrição igual em todas as parcelas, sem o número da parcela; `date` avança cerca de 30 dias a cada parcela. | As suposições do código valem. Rebaixado para **Baixa**. |

### O que está bom (não mexer)

- **Idempotência da sincronização:** upsert pelo id do Pluggy com índices únicos parciais, ids repetidos removidos antes do `ON CONFLICT`, `IS DISTINCT FROM` para contar só o que mudou e `xmax = 0` para saber o que é inserção.
- **Categoria do usuário protegida em duas camadas:** na decisão e no `WHERE` do `UPDATE`, inclusive em corrida com uma edição.
- **Isolamento por banco:** busca tudo, valida com Zod e só então abre uma transação por banco. Logs só com ids, tipos de erro e contagens, com teste que garante isso.
- **Lock de sessão** (`pg_try_advisory_lock`) num client dedicado, solto pelo Postgres se o processo morre, e `failInterruptedRuns` na subida.
- **Dinheiro e sinal num lugar só** (`toCents`, normalização pelo tipo de conta) e datas sempre por `shared/dates.ts`.
- **Cálculos em funções puras** (`month-projection`, `net-worth-calculations`, `goal-pace`, detectores de alerta) com testes de limite: virada de ano, 31/01 + 1 mês, tolerância de 7 dias.
- **Contrato da API consistente:** DTOs como lista branca, erro padronizado, `404` em `DELETE` repetido, `409 OPEN_FINANCE_READ_ONLY`.
- **Frontend:** um único `api-client` com toda resposta validada por Zod, `Money` como único caminho para dinheiro (tooltips e `sr-only` respeitam "Ocultar valores"), code splitting por rota, atualização otimista com rollback, `noUncheckedIndexedAccess`, nenhum `any`, `check:tokens` barrando hex.
- **Infra:** só o nginx publica porta, presa ao `127.0.0.1`; containers sem root; segredos só no `.env`; scripts com `set -euo pipefail` e dump em arquivo temporário; migrations do Drizzle numa transação só; deploy com checkout limpo, backup antes e `--wait` com healthcheck real.
- **Testes:** mais de 1.600 (backend e frontend), no padrão AAA, com Testcontainers no CI.

---

## Parte 2 — Próximas fases

As fases seguem a ordem de valor por esforço. Esforço: **P** (um dia ou dois), **M** (uma change média), **G** (uma change grande ou várias). Todas respeitam as regras do [CLAUDE.md](../CLAUDE.md): só leitura, sem IA conversacional, um único usuário.

### Lacunas que o uso real deixou claras

1. **Não há rotina diária de revisão.** Ver o que chegou desde a última visita depende de lembrar onde parou, e a categoria só se corrige uma transação por vez.
2. **Uma transação não guarda contexto:** sem nota nem etiqueta para "viagem", "reembolsável" ou "dedutível no IR".
3. **Regras só nascem com "Aplicar sempre".** Corrigir a mesma descrição três vezes não sugere nada.
4. **O consentimento só avisa depois que vence.** O `consentExpiresAt` é lido, mas não é gravado em `connections`.
5. **Ninguém confere se os dados batem.** O `raw` traz o saldo depois de cada transação, e há fotos diárias, mas nada compara uma coisa com a outra.
6. **A projeção olha só até o fim do mês**, embora as parcelas futuras e as previsões anuais já existam.
7. **Investimentos sem rentabilidade, liquidez, indexador nem emissor**, embora o `raw` traga `issuer` e `issuerCNPJ`.
8. **Do cartão, só a fatura:** nada de melhor dia de compra nem de limite comprometido por parcelas, embora as datas de fechamento estejam gravadas.
9. **Alertas só no sino.** Um orçamento estourado só aparece quando você abre o app.
10. **Não há saída de dados legível.** O backup é um `pg_dump`.
11. **Ajustes só tem o tema.** Não há tela com a saúde dos dados nem o histórico das sincronizações.

### Fase 4 — Confiança e rotina

**Resultado:** dois minutos por dia deixam tudo revisado, e você confia que os números batem com o banco.

| Item | O que é | Esforço | Dados |
|---|---|---|---|
| ~~**Foto de 31/12 garantida**~~ (feito em 24/11/2026) | Checagem que avisa se 31/12 terminar sem foto de saldo e de investimentos. Base dos bens e direitos no IR. A sincronização recupera o dia ao subir e tenta de novo 3 horas depois (`fix-sync-data-loss`); o sino avisa no próprio dia 31/12, enquanto ainda dá para sincronizar, e em janeiro, se o dia terminou sem foto (`add-year-end-snapshot-check`). **O deploy precisa sair antes de 31/12/2026.** | P | Fotos existentes. |
| **Caixa de entrada "Para revisar"** | Fila com as transações novas desde a última revisão, as sem categoria e as possíveis duplicatas; "Ok", "Trocar categoria" e "Marcar tudo como revisado"; contador no Início. É o hábito que sustenta apps como YNAB e Copilot. | M | `transactions.reviewed_at`; a carga atual entra como revisada. |
| **Categoria em massa** | Seleção múltipla na lista e na caixa de entrada. Grava `category_source = 'user'`. | M | Existentes. |
| **Regra sugerida pelas correções** | Depois de 2 ou mais correções da mesma descrição para a mesma categoria, sem regra que cubra, o app oferece "Criar regra?". Regra fixa, sem IA. | P | `category_source`, `description_normalized`. |
| **Notas e etiquetas** | Nota livre e etiquetas por transação, com filtro em Transações e nos relatórios. Cobre viagem, reforma, reembolso e despesas dedutíveis sem criar categorias falsas. | M | `transactions.note`, `tags`, `transaction_tags`. **Contraria a regra 9** (ver decisões). |
| **Saúde dos dados** | Em Contas ou Ajustes: consentimento a vencer (aviso 30 e 7 dias antes); conciliação "saldo de hoje = foto anterior + transações", com "possível transação faltando entre dd/mm e dd/mm"; conta sem transações há 10 dias ou mais; histórico das sincronizações. | M | `connections.consent_expires_at`; `sync_runs.stats`. |
| **Push no iPhone** | Web Push (VAPID) no PWA instalado, pelo HTTPS do `tailscale serve`. Dispara nos alertas existentes, no consentimento a vencer e na caixa de entrada cheia. **Sem valor nem descrição no conteúdo**, porque passa pelo servidor da Apple. | M | `push_subscriptions`. |
| **Exportar** | CSV das transações do filtro atual e "Baixar meus dados" (zip com um CSV por tabela). Backup legível. | P | Existentes. |
| ~~**Acabamento de Transações**~~ (feito em 24/11/2026) | Pendências da crítica (F17) e F8, com F7 e F15 (`refine-transactions-ux`). | P | — |

**Pronta quando:** a caixa de entrada chega a zero depois da sincronização; o consentimento avisa 30 dias antes; uma transação apagada à mão no banco de teste aparece como divergência; um alerta chega como push com o app fechado; o CSV abre no Excel com acentos e valores certos.

### Fase 5 — Cartões e fluxo de caixa

**Resultado:** você sabe como vão estar os próximos 90 dias, e não só o mês atual.

| Item | O que é | Esforço | Dados |
|---|---|---|---|
| **Parcelas como compromisso** | Por cartão: limite ocupado por parcelas futuras e quanto da renda de cada mês já está comprometido. O parcelado sem juros é o vilão invisível. | P | Parcelas futuras já calculadas (depende de D3). |
| **Melhor dia de compra** | "Compras a partir de 08/12 caem na fatura que vence em 15/01", dizendo quando a data é estimada. | P | `credit_card_bills.closing_date`, `accounts.raw`. |
| **Fluxo de caixa de 30, 60 e 90 dias** | Estende a projeção do mês com previsões mensais e anuais, faturas conhecidas e parcelas futuras. Opcional: faixa separada "gasto do dia a dia estimado (média de 3 meses)", que nunca se mistura com o confirmado. | G | `planned_entries`, módulo `projection`. A faixa estimada é decisão nova. |
| **Calendário de contas** | Visão do mês com previsões e vencimentos de fatura (e de renda fixa, depois da Fase 6). | P/M | Existentes. |
| **Despesas anuais ("caixinhas")** | IPVA, IPTU, IR a pagar, matrícula, seguro: você informa o valor anual e o app diz quanto separar por mês e quanto falta, acompanhando por uma meta vinculada. | M | Previsões anuais + `goals`/`goal_links`. |
| **Orçamento com sobra que rola** | Opcional por categoria: o que sobrou ou estourou passa para o mês seguinte. Junto, "preencher pelo gasto médio de 3 meses". | M | **Contraria o doc 01** ("um mês novo começa vazio"). |
| **Cenário "e se"** | Previsão hipotética, ligada ou desligada, que muda a projeção sem gravar nada ("e se eu parcelar a TV em 10x?"). | P/M | Nenhum dado novo. |

**Pronta quando:** o fluxo de 90 dias confere à mão com previsões e faturas; o IPVA de 2027 aparece com o valor mensal a separar; a tela do cartão mostra o limite comprometido mês a mês.

### Fase 6 — Patrimônio de verdade

**Resultado:** você sabe se o dinheiro rende acima do CDI e da inflação, onde ele está e se está protegido.

| Item | O que é | Esforço | Dados |
|---|---|---|---|
| **Índices de mercado** | CDI diário, Selic e IPCA mensal do SGS do Banco Central (API pública; nenhum dado seu sai do servidor). | P | `market_indices`. |
| **Alocação** | Por classe (existe), liquidez e vencimento, indexador (CDI, IPCA+, pré) e emissor, com aviso acima de **R$ 250 mil por instituição no FGC**. | M | `issuer`/`issuerCNPJ` no `raw`; taxa e vencimento a confirmar com dados reais (P3). |
| **Aportes × rendimento × CDI** | Separa a variação em aportes líquidos e rendimento estimado e compara com o CDI do período. Aproximação, e a tela diz isso. | G | Transações em "Aplicação e resgate"; endpoint de movimentações do Pluggy a confirmar. |
| **Reserva de emergência** | "Você cobre X meses de despesas", com contas e investimentos marcados como líquidos. | P | Despesa média dos relatórios. |
| **Independência financeira** | Patrimônio investido contra o "número" (despesa anual ÷ taxa de retirada escolhida). Conta determinística. | P/M | Existentes. |
| **Inflação pessoal** | Seu custo de vida em 12 meses, por categoria, contra o IPCA do período. | M | `market_indices`. |
| **Apoio à declaração do IR** | Saldos e posições em 31/12 por instituição e CNPJ (bens e direitos) e despesas com a etiqueta "dedutível". Folha de consulta: não calcula imposto nem gera arquivo da Receita. **Pronto até março de 2027.** | M | Foto de 31/12; etiquetas da Fase 4. |
| **Passivos** | Empréstimos e financiamentos do Pluggy entram como dívida no patrimônio. | M | Depende de confirmar a API. |
| **FGTS e previdência** | Orientar o cadastro como posição manual (nenhum dos dois vem pelo Open Finance). | P | Só documentação. |

**Pronta quando:** a renda fixa aparece por vencimento e indexador; o aviso do FGC aparece com dados de teste; a folha do IR de 2026 bate com os informes dos bancos.

### Fase 7 — Olhar para trás

**Resultado:** o histórico vira decisão.

| Item | O que é | Esforço |
|---|---|---|
| **Retrospectiva do ano** | Receitas, despesas, taxa de poupança, mês mais caro, maior alta por categoria, assinaturas no ano, estabelecimentos mais frequentes, patrimônio de 1º/1 a 31/12. 2026 é o primeiro ano completo. | M |
| **Comparação entre períodos** | Este ano contra o anterior; um mês contra o mesmo mês do ano passado. | M |
| **Resumo da semana** | Tela determinística com as regras da análise de categorias e um push "seu resumo está pronto", sem valores. | P |
| **Relatório por estabelecimento** | A partir de `description_normalized`. | P |
| **Importar OFX ou CSV antigos** | Único jeito de ter mais que 12 meses: extratos antigos baixados do banco, gravados com `source = 'import'` e passando pelo fluxo de possível duplicata. **Amplia a regra 9.** | G |

**Pronta quando:** a retrospectiva de 2026 abre em janeiro com números que batem com os relatórios.

### Ideias descartadas ou adiadas

| Ideia | Decisão e motivo |
|---|---|
| Resumo por Telegram ou WhatsApp | **Descartada.** O doc 01 exclui canais de chat. |
| Resumo por e-mail com valores | **Adiada.** Os extratos iriam para um servidor de terceiros. Push sem valores resolve. |
| Perguntar sobre os gastos, categorizar ou gerar insights com IA (mesmo com modelo local) | **Descartada.** Regra 10 e o princípio "Previsível". |
| Pagar boleto, Pix agendado, "mover para a caixinha" | **Descartada.** Regra 8. |
| Orçamento de casal, compartilhar com a família | **Descartada.** Regra 11; o Meu Pluggy só aceita o mesmo titular. |
| Dividir uma transação em várias categorias | **Adiada (G).** Quebra "uma transação, uma categoria" em orçamentos, relatórios e análise. Volta se, depois das etiquetas, compras mistas ainda distorcerem os orçamentos. |
| Anexos e recibos | **Adiada.** Armazenamento e backup maiores num servidor de 8 GB; nota e etiqueta cobrem quase tudo. |
| Cotação automática de cripto e ações nas posições manuais | **Adiada.** A regra atual diz que a posição manual não busca cotação; precisaria de API externa e quantidades. |
| Webhook do Pluggy ou sincronizar várias vezes por dia | **Descartada.** O Meu Pluggy atualiza a cada 24 h, e webhook exige endereço público. |
| Login e acesso fora da Tailscale | **Adiada.** Só se o app for exposto; aí o login vem antes. |
| Score de crédito | **Descartada.** Não vem pelo Open Finance e não ajuda no dia a dia. |
| Medalhas, sequências, gamificação | **Descartada.** Não combina com "qualidade de fintech"; a caixa de entrada zerada já é a recompensa. |

---

## Parte 3 — Ordem sugerida

Cada linha é uma change do OpenSpec, nesta ordem. As três primeiras protegem dados que não voltam e vêm antes de qualquer funcionalidade nova.

| # | Change (sugestão de nome) | Conteúdo | Quando |
|---|---|---|---|
| 0 | `add-manual-investments` | ~~Commitar, ajustar F11 e arquivar.~~ Arquivada em 18/11/2026; falta o commit. | Feito |
| 1 | `harden-backups` | ~~I1, I3, I5, I8 e o aviso de I4.~~ Arquivada em 23/11/2026; a cópia fora de casa ficou de fora, por escolha. | Feito |
| 2 | `fix-sync-data-loss` | ~~S1, S2, S3, S4, S5 e a foto de 31/12, com os testes que faltam.~~ Arquivada em 24/11/2026, com o S8. A parte de tela da "Foto de 31/12 garantida" (aviso e repetição no dia 1º) continua na Fase 4. | Feito |
| 2a | `add-year-end-snapshot-check` | ~~Parte de tela da "Foto de 31/12 garantida": alerta no próprio dia 31/12 e depois da virada.~~ Arquivada em 24/11/2026; falta o deploy, **antes de 31/12/2026**. | Feito |
| 3 | `fix-balance-history-gaps` | ~~D1, D9 e D2 (decidida: o estorno reduz a despesa), mais a D6.~~ Arquivada em 24/11/2026; falta o deploy. | Feito |
| 4 | `harden-frontend-data` | ~~F1, F2, F3, F4, F13 e `query-keys.ts`.~~ Arquivada em 24/11/2026; falta o deploy. | Feito |
| 5 | `refine-transactions-ux` | ~~F7, F8, F17 e F15.~~ Arquivada em 24/11/2026; falta o deploy. | Feito |
| 6 | Fase 4 em 5 changes | `add-review-inbox` (caixa de entrada + categoria em massa + regra sugerida), `add-data-health`, `add-data-export`, `add-transaction-notes-and-tags` e `add-push-notifications`. Propostas em 24/11/2026. | Dezembro a fevereiro |
| 7 | `add-tax-support` e `add-investment-allocation` | Folha do IR e alocação da Fase 6, antecipadas pelo calendário do IR. | Até março de 2027 |
| 8 | `add-year-in-review` | Retrospectiva de 2026. | Janeiro |
| 9 | `harden-infra` | I6, I7, I9, I10, I11, I12, I13, I14, I15. Proposta em 24/11/2026, em grupos independentes. | Em paralelo, aos poucos |
| 10 | Fase 5, resto da Fase 6 e Fase 7 | Conforme o uso pedir. | Depois |

Os itens de severidade Baixa entram quando o arquivo for tocado por outra change, sem change própria.

### Decisões que dependem de você

Estes itens contrariam um documento ou uma regra. Se aprovar, o documento muda na mesma change.

| Item | O que muda | Onde |
|---|---|---|
| Notas e etiquetas | **Aprovado em 24/11/2026** (`add-transaction-notes-and-tags`): numa transação do Open Finance, além da categoria, nota e etiquetas passam a ser editáveis. | Regra 9 do CLAUDE.md, doc 01 |
| Conta que some do Pluggy (S7) | A conta passa a ser marcada como encerrada e sai do saldo total. | Doc 01, saldo total |
| Orçamento com sobra que rola | Um mês novo deixa de começar vazio para as categorias que você escolher. | Doc 01, orçamentos |
| Faixa de gasto estimado no fluxo de caixa | A projeção ganha uma faixa estimada, sempre separada do confirmado. | Doc 01 e doc 03, projeção |
| Importar OFX ou CSV | Uma terceira origem de transação (`source = 'import'`). | Regra 9 do CLAUDE.md, doc 04 |
| Push e pings de monitoramento | **Pings decididos e feitos em 23/11/2026:** o healthchecks.io recebe só ok ou falha (`harden-backups`). **Push aprovado em 24/11/2026** (`add-push-notifications`): passa pelo servidor da Apple, com texto fixo por tipo, sem nenhum dado. | Doc 03, segurança |
