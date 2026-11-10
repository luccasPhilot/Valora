## 1. Banco de dados

- [x] 1.1 Coluna `connections.archived_at` (`timestamptz`, nula) em `backend/src/db/schema.ts` e o valor `item_not_found` no `CHECK` de `connections.status`; gerar a migration com `npm run db:generate` (sem editar migration já versionada)
- [x] 1.2 Teste de integração da migration (`migrations.test.ts`): coluna criada, conexões existentes ficam ativas, `item_not_found` é aceito e um status inválido continua recusado

## 2. Conexões (backend)

- [x] 2.1 `ConnectionsRepository`: `archivedAt` no registro, busca de ativas e de arquivadas (com as contas de cada uma, sem `raw`), `setArchived(id, isArchived)` que mantém a primeira data ao arquivar de novo, e o status `item_not_found` nos enums
- [x] 2.2 Critério único de "banco ativo" (`archived_at is null`) em um ponto reutilizável do backend, usado por conexões, contas, faturas, alertas e sincronização; a conta "Dinheiro" (sem conexão) é sempre ativa
- [x] 2.3 `ConnectionsService` com `config.pluggyItemIds`: `isConfigured` calculado na leitura, `archive`/`reactivate` com `NotFoundError` que cita o id, e a lista de ativas e de arquivadas
- [x] 2.4 Rotas: `PATCH /api/v1/connections/:id` (`{ isArchived }`, validado com Zod, DTO sem `pluggyItemId` nem `raw`) e `GET /api/v1/connections` com `isConfigured`, `archivedAt`, `accounts` e `?archived=true`
- [x] 2.5 Testes: service (arquivar, arquivar de novo mantém a data, reativar, inexistente, `isConfigured` com e sem o id) e integração das rotas (Testcontainers), incluindo que a resposta não expõe `pluggyItemId`

## 3. Sincronização

- [x] 3.1 Conferir uma vez, contra o sandbox e só com leitura, o corpo de erro que o SDK devolve para um item inexistente; guardar a resposta anonimizada em `backend/test/fixtures/pluggy/` (sem credenciais nem ids reais)
- [x] 3.2 `PluggySdk`/`PluggyClient`: reconhecer o erro de item inexistente e lançar `PluggyItemNotFoundError` tipado; o `PluggyClient` continua o único ponto de contato com o Pluggy
- [x] 3.3 `SyncService.syncItem`: pular conexão arquivada antes de qualquer chamada (resultado `skipped`, sem mudar o status) e gravar `item_not_found` com a mensagem fixa quando o item não existir; o resumo da execução ignora `skipped`
- [x] 3.4 Testes de integração do sync (Pluggy falso): arquivado com o id na lista não chama o Pluggy e não vira `partial`; conexão arquivada não é recriada; 404 vira `item_not_found` e os outros bancos seguem; falha qualquer continua `error`; banco com `item_not_found` volta a `ok` quando responde

## 4. Efeitos nos números

- [x] 4.1 `AccountsRepository` (lista e busca por id) e faturas (`credit-card-bills`) ignoram contas de bancos arquivados; os totais, a fatura em aberto e a projeção do mês acompanham pela mesma lista
- [x] 4.2 `AlertEvaluator.evaluateConnections` olha só bancos ativos e inclui `item_not_found`; confirmar que o alerta existente é resolvido ao arquivar e não volta
- [x] 4.3 `DashboardRepository`: evolução do saldo somando as contas ativas e, das contas corrente e poupança não ocultas de bancos arquivados, só as fotos anteriores ao dia do arquivamento (fuso de São Paulo); `balanceChange` calculado só com as fotos dos bancos ativos
- [x] 4.4 Testes de integração: banco arquivado fora de `GET /accounts`, do saldo total, das faturas e da projeção; transações dele continuam em Transações e contando em receitas, despesas, categorias e orçamentos de meses passados e do atual; curva do saldo com o passado intacto e sem o banco depois do arquivamento; variação do mês sem queda; reativar traz tudo de volta
- [x] 4.5 Teste de integração de ponta a ponta do caso real: conexão em `error` com o id fora do `PLUGGY_ITEM_IDS` mostra `isConfigured: false`, é arquivada e deixa de gerar faixa e alerta

## 5. Interface

- [x] 5.1 Carregar `/frontend-design:frontend-design` e `/ui-ux-pro-max`; reler o Design System (estados de tela, faixas, confirmação, responsividade)
- [x] 5.2 Schemas Zod em `frontend/src/lib/api/` (`connections` com `isConfigured`, `archivedAt`, `accounts` e o status `item_not_found`; `accounts`) e as funções de API do `PATCH` e da lista de arquivados
- [x] 5.3 Selo de status "Removido do Meu Pluggy" e a faixa `ConnectionAlert` com a causa e o botão "Remover do Valora" (fora do link da faixa), reaproveitando o `ConfirmDialog`
- [x] 5.4 Tela Contas: botão "Remover do Valora" em cada banco, explicação da causa nos bancos órfãos, e depois de arquivar ou reativar consultar de novo contas, conexões, faturas, projeção, Início e alertas
- [x] 5.5 Seção recolhida "Arquivados" no fim da tela Contas (nome, contas, última sincronização e "Reativar"), com carregamento e erro próprios, e sem aparecer quando não há arquivados
- [x] 5.6 Testes de componente: faixa com cada causa, confirmar e cancelar, botão em banco saudável, seção "Arquivados" (aparece, recolhida, reativar, vazia), estados de carregamento e erro, e que o botão não fica dentro do link

## 6. Conferência visual

- [x] 6.1 Conferir a faixa, a confirmação e a tela Contas com a seção "Arquivados" em 320, 390, 768, 1024 e 1440 px, nos dois temas, sem rolagem horizontal
- [x] 6.2 Revisar com `/ui-ux-pro-max`
- [ ] 6.3 Passo manual com o seu caso real: abrir o app com a conexão órfã, arquivar pela faixa e conferir que faixa, alerta, contas e saldo dela saem, e que "Reativar" a traz de volta

## 7. Documentação

- [x] 7.1 `docs/02-open-finance.md`: completar a seção "Ids dos itens no Valora" (tirar o id do `.env` só para a leitura; para tirar o banco das telas, arquivar no app; o id pode ficar no `.env`)
- [x] 7.2 `docs/04-modelo-de-dados.md`: `connections.archived_at` e o status `item_not_found`; `docs/03-arquitetura.md`: rotas de conexões e a decisão "arquivar em vez de apagar"; `docs/05-deploy.md`: o que fazer com o `.env`
- [x] 7.3 `docs/01-produto.md` (Contas, o degrau da curva do saldo) e `docs/06-design-system.md` (a faixa de banco removido e a seção "Arquivados")
- [x] 7.4 Acrescentar o item "Arquivar banco removido do Meu Pluggy" à Fase 2 em `docs/07-roadmap.md`, já marcado
