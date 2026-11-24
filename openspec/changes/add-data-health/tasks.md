## 1. Conferência com dados reais

- [ ] 1.1 Na cópia do backup de produção (base separada, só contagens, nenhum valor ou descrição sai dela): quantos pares de fotos seguidas batem com as transações em `[d1, d2)` e quantos em `(d1, d2]`; anotar no design qual janela vale

## 2. Consentimento

- [ ] 2.1 `connections.consent_expires_at` e `consent_expiring` em `alerts_type_check`; migration com `npm run db:generate`
- [ ] 2.2 Testes de integração primeiro: a sincronização grava o vencimento (inclusive quando a busca dos dados falha depois) e grava nulo sem informação
- [ ] 2.3 Testes primeiro das situações: 31 dias (nada), 30 dias, 8 dias, 7 dias (o de 30 resolvido, o de 7 nasce mesmo com o de 30 dispensado), renovado, vencido, arquivado
- [ ] 2.4 Gravar no `modules/sync/` e criar a situação em `alert-situations.ts`, avaliada com os alertas de conexão

## 3. Conciliação e contas paradas

- [ ] 3.1 Testes unitários primeiro de `reconcileBalances`: bate, falta, período recente fora, diferenças que se anulam, pendentes e manuais fora, conta sem fotos
- [ ] 3.2 Testes unitários primeiro das contas paradas: 9 e 10 dias, sem transação e criada há 10 dias, poupança fora, oculta fora, banco com erro fora
- [ ] 3.3 Funções puras em `modules/data-health/`

## 4. API

- [ ] 4.1 Testes de integração primeiro de `GET /data-health` (bancos arquivados fora, limite de 50 divergências) e de `GET /sync-runs` paginado
- [ ] 4.2 Módulo `data-health` (rotas, service, repository) e a listagem de `sync_runs`

## 5. Tela

- [ ] 5.1 Carregar `/frontend-design:frontend-design` e `/ui-ux-pro-max`; o Design System vence
- [ ] 5.2 Schemas em `lib/api/` com testes; tela `/ajustes/saude-dos-dados` com as quatro seções, "Tudo certo", carregando, vazio e erro; links em Ajustes e Contas; ícone e rótulo do alerta `consent_expiring` no sino
- [ ] 5.3 Testes de tela (divergência leva a Transações filtrada; resultado da sincronização com texto) e conferência em 320, 390, 768, 1024 e 1440 px, nos dois temas, com valores visíveis e ocultos

## 6. Conferência

- [ ] 6.1 Rodar `typecheck`, `lint`, `format:check` e `test` no `backend/` e no `frontend/`; conferir que nenhum log novo leva valores

## 7. Documentação

- [ ] 7.1 `docs/01-produto.md` (saúde dos dados), `docs/02-open-finance.md` (vencimento do consentimento), `docs/03-arquitetura.md` (rotas e Decisões: janela da conciliação), `docs/04-modelo-de-dados.md` (`consent_expires_at`, tipo de alerta)
- [ ] 7.2 Ao arquivar: marcar "Saúde dos dados" como feita em `docs/08-revisao-e-proximas-fases.md`
