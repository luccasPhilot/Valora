## 1. Configuração

- [ ] 1.1 Adicionar `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET`, `PLUGGY_ITEM_IDS` e `SYNC_CRON` ao `loadConfig`, ao `backend/.env.example` e ao `infra/.env.example` (sem valores reais)
- [ ] 1.2 Instalar `pluggy-sdk` e `croner`
- [ ] 1.3 Implementar `normalizeDescription` em `backend/src/shared/`, com testes (acentos, espaços, maiúsculas)

## 2. PluggyClient e dados reais

- [ ] 2.1 Criar o script `fixtures:record`: chamar a API real uma vez, conferir a convenção de sinal e os tipos para conta e cartão, anonimizar e gravar as fixtures em `test/fixtures/pluggy/`
- [ ] 2.2 Registrar a convenção de sinal confirmada em `docs/04-modelo-de-dados.md`
- [ ] 2.3 Implementar `PluggyClient` (`getItem`, `listAccounts`, `listTransactions` paginado, `listInvestments`) com schemas Zod
- [ ] 2.4 Implementar `toCents` e `normalizeAmount` (funções puras), com testes: `89.9` → `-8990`, compra e estorno no cartão, débito e crédito na conta
- [ ] 2.5 Implementar o mapeamento de status do item para `ok`, `syncing`, `error` e `consent_expired`, com mensagens em português

## 3. Repositories

- [ ] 3.1 Repository de conexões (criar a partir de `PLUGGY_ITEM_IDS`, atualizar status e `last_synced_at`)
- [ ] 3.2 Repository de contas com gravação idempotente e foto do dia (`balance_snapshots`)
- [ ] 3.3 Repository de transações: gravação idempotente que preserva a categoria do usuário, e remoção de pendentes que sumiram filtrando `source = 'open_finance'`
- [ ] 3.4 Repository de investimentos com gravação idempotente e foto do dia
- [ ] 3.5 Repository de `sync_runs`

## 4. SyncService

- [ ] 4.1 Implementar a execução por item numa transação de banco própria, na ordem: status → contas e fotos → transações → investimentos
- [ ] 4.2 Implementar a janela (365 dias na primeira vez, 30 depois) com `todayInSaoPaulo`
- [ ] 4.3 Implementar o lock com `pg_try_advisory_lock` e o registro da execução (`running` → `success`, `partial` ou `failed`, com quantidades)
- [ ] 4.4 Garantir que `error_message` e os logs não levam valores, descrições ou credenciais

## 5. Rotas e agendamento

- [ ] 5.1 `POST /api/v1/sync-runs` (202 com a execução; 409 `SYNC_IN_PROGRESS`)
- [ ] 5.2 `GET /api/v1/sync-runs/latest` (404 quando não há execução)
- [ ] 5.3 `GET /api/v1/connections`
- [ ] 5.4 Agendamento diário com `croner` no fuso `America/Sao_Paulo`

## 6. Testes de integração (Testcontainers + fixtures, Pluggy mockado)

- [ ] 6.1 Primeira sincronização grava contas, fotos, transações e investimentos das fixtures
- [ ] 6.2 Sincronização repetida não cria linhas novas
- [ ] 6.3 Pendente confirmada vira `posted` sem duplicar; pendente que sumiu é apagada; `posted` que sumiu continua
- [ ] 6.4 Categoria com `category_source = 'user'` não muda na atualização
- [ ] 6.5 Transação manual na janela continua intacta
- [ ] 6.6 Um item com consentimento expirado não impede os outros; execução fica `partial`
- [ ] 6.7 Falha no meio de um item não deixa dados parciais
- [ ] 6.8 Disparo manual durante uma execução responde 409
- [ ] 6.9 Duas sincronizações no mesmo dia deixam uma foto por conta

## 7. Documentação

- [ ] 7.1 Explicar em `docs/02-open-finance.md` como obter os ids dos itens e onde colocá-los
- [ ] 7.2 Atualizar a seção "Comandos" do `CLAUDE.md` (`fixtures:record`, disparar sincronização em desenvolvimento)
- [ ] 7.3 Marcar como `[x]` os itens de "Sincronização" da Fase 1 em `docs/07-roadmap.md`
