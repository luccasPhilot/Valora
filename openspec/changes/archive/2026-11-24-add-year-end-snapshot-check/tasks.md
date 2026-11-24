## 1. Regras puras

- [x] 1.1 Testes unitários primeiro para `yearEndCheckFor(today)`: 30/12 (`null`), 31/12 (`pending`, 31/12 do mesmo ano), 01/01 e 31/01 (`missing`, 31/12 do ano anterior), 01/02 (`null`), virada de ano bissexto
- [x] 1.2 Testes unitários primeiro para as mensagens: "1 conta", "2 contas", "1 investimento", "2 contas e 1 investimento", contagem zero (sem situação), e conferir que nenhuma mensagem leva valor
- [x] 1.3 Implementar `yearEndCheckFor` e as situações `year_end_snapshot_pending` e `year_end_snapshot_missing` em `alert-situations.ts` (design, decisões 1, 3 e 4)

## 2. Banco e repository

- [x] 2.1 `ALERT_TYPES` e `alerts_type_check` com os dois tipos; `created_at` em `accounts` e `investments`; migration nova com `npm run db:generate`
- [x] 2.2 Testes de integração primeiro para `countMissingSnapshots(date)`: conta sem foto, conta oculta sem foto, conta "Dinheiro" fora, banco arquivado fora, posição zerada fora, posição manual sem foto, conta criada depois da data fora
- [x] 2.3 Implementar o repository (só contagens), com os critérios de `active-connection.ts`

## 3. Avaliação

- [x] 3.1 Testes de integração primeiro (relógio injetado): `should_create_pending_alert_when_a_bank_has_no_snapshot_on_december_31`, `should_resolve_pending_alert_when_snapshots_are_completed_on_december_31`, `should_resolve_pending_and_create_missing_alert_on_january_1`, `should_keep_a_single_missing_alert_during_january`, `should_not_recreate_missing_alert_after_dismissal`, `should_not_check_year_end_on_december_30`, `should_not_check_year_end_on_february_1`, `should_resolve_a_leftover_pending_alert_when_the_first_evaluation_is_in_february`, `should_create_the_other_alerts_when_year_end_evaluation_fails` (a sincronização já isola a falha de `evaluateAll`, em `alerts-wiring.test.ts`)
- [x] 3.2 `AlertEvaluator.evaluateYearEndSnapshots()` dentro de `evaluateAll`; reconciliado em 31/12, de evento em janeiro
- [x] 3.3 `alertTarget`: os dois tipos levam a `{ screen: 'accounts' }`, com teste

## 4. Interface

- [x] 4.1 `alert-presentation.ts`: ícone `CalendarX`, rótulo "Foto de 31/12", tom `critical` (pendente) e `warning` (depois da virada), com teste em `alert-presentation.test.ts`
- [x] 4.2 Conferir o alerta no sino em 320, 390, 768, 1024 e 1440 px, nos dois temas

## 5. Conferência

- [x] 5.1 Rodar `typecheck`, `lint`, `format:check` e `test` no `backend/` e no `frontend/`

## 6. Documentação

- [x] 6.1 `docs/01-produto.md` (alertas: foto de 31/12), `docs/04-modelo-de-dados.md` (tipos de `alerts`)
- [x] 6.2 Ao arquivar: marcar a "Foto de 31/12 garantida" (Fase 4) e a prioridade 10 como feitas em `docs/08-revisao-e-proximas-fases.md`, e lembrar do deploy antes de 31/12/2026
