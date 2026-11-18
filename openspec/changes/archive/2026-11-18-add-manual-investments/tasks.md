## 1. Banco

- [x] 1.1 Em `backend/src/db/schema.ts`, adicionar a `investments` as colunas `source` (padrão `open_finance`), `institution_name` e `balance_updated_on`; tornar `connection_id` e `pluggy_investment_id` opcionais; criar os `CHECK` de `source` e de coerência por origem (design, decisão 1)
- [x] 1.2 Gerar a migration com `npm run db:generate` e conferir o SQL (linhas existentes ficam `open_finance` e passam no `CHECK`)
- [x] 1.3 Teste de integração do schema: o `CHECK` recusa linha `open_finance` sem conexão e linha `manual` com conexão ou sem instituição

## 2. Backend: consultas que já leem investimentos

- [x] 2.1 Criar `investmentIsOfActiveConnection` em `modules/connections/active-connection.ts`, ao lado de `accountIsOfActiveConnection`
- [x] 2.2 `modules/investments/investments.repository.ts`: `leftJoin(connections)`, critério novo, `institutionName` com `coalesce` e `source` e `balanceUpdatedOn` no resultado; ajustar `investment-groups.ts` para carregar os dois campos
- [x] 2.3 `modules/net-worth/net-worth.repository.ts`: `findInvestmentSnapshots` com `leftJoin` (posição manual com `archivedOn` nulo)
- [x] 2.4 `modules/goals/goals.repository.ts`: `investmentItemColumns` e as três consultas de investimentos com `leftJoin`, `institutionName` com `coalesce` e `isArchived` falso sem conexão
- [x] 2.5 Testes de integração: posição manual aparece na lista, no `current` do patrimônio, no patrimônio por dia e como candidata e vínculo de meta, com um banco arquivado ao lado (cenários das specs `investments-view`, `net-worth` e `savings-goals`)

## 3. Backend: cadastro, edição e exclusão

- [x] 3.1 `InvestmentsRepository`: `createManual`, `updateManual` e `deleteManual`, com `db.transaction` gravando a foto de hoje junto (como `GoalsRepository`); busca por id para decidir 404 e 409
- [x] 3.2 `InvestmentsService`: regras (só posição manual é editável, `balance_updated_on` só muda quando o valor vem no pedido, "hoje" por `shared/dates.ts`); erros `NotFoundError` com o id e `OpenFinanceReadOnlyError` (`shared/errors.ts`)
- [x] 3.3 `investments.routes.ts`: `POST`, `PATCH` e `DELETE` com Zod (nome e instituição de 1 a 60, `type` fechado, `centsSchema`), `source` e `balanceUpdatedOn` no schema de resposta do `GET`; `raw` e id do Pluggy continuam fora
- [x] 3.4 Testes unitários do service (cenários de `manual-investments`: valor zero, tipo desconhecido, renomear sem mexer na data, encerrar e reabrir)
- [x] 3.5 Testes de integração das rotas com `app.inject()`: 201, 400 com o campo em `details`, 404, 409 `OPEN_FINANCE_READ_ONLY`, exclusão com vínculo de meta (a meta e os aportes ficam)

## 4. Backend: foto diária e sincronização

- [x] 4.1 `InvestmentsRepository.saveManualSnapshots(date)`: upsert da foto de hoje de todas as posições manuais, inclusive as de saldo zero
- [x] 4.2 `InvestmentsService.snapshotManualPositions()` e a chamada em `SyncService.execute`, depois de `syncAllItems` e antes de `evaluateAlerts`, capturando falha e registrando só o tipo do erro; ligar a dependência em `sync.module.ts` e `app.ts`
- [x] 4.3 Testes: foto gravada com um banco em falha, sem posições manuais não grava nada, falha no passo não impede os alertas nem muda o resultado dos bancos
- [x] 4.4 Teste de integração da sincronização: banco com lista de investimentos vazia não altera nem zera a posição manual (`zeroVanished`)

## 5. Frontend: contrato e dados

- [x] 5.1 `frontend/src/lib/api/`: schemas Zod de `source` e `balanceUpdatedOn` na lista e das três chamadas novas, com testes
- [x] 5.2 `features/investments/investments-queries.ts`: mutações de criar, atualizar e excluir que invalidam `investments`, `net-worth`, `goals` e o patrimônio do Início
- [x] 5.3 `investment-labels.ts`: rótulo "Criptomoedas" para `CRYPTO`, `OTHER` em "Outros", linha sem separador solto quando não há subtipo; constante nomeada para os 30 dias de "Desatualizado" e função pura que calcula o texto, com testes

## 6. Frontend: tela Investimentos

Antes de começar, carregar as skills `/frontend-design:frontend-design` e `/ui-ux-pro-max`; o Design System ([docs/06-design-system.md](../../../docs/06-design-system.md)) vence qualquer sugestão delas.

- [x] 6.1 Painel de formulário no `FormPanel` (criar e editar): nome, instituição, tipo (controle segmentado) e valor atual no mesmo campo de valor do lançamento manual; erro de API mantém o painel aberto e o que foi digitado; "Ocultar valores" respeitado no campo
- [x] 6.2 Botão "Adicionar investimento" na tela e no estado vazio (ao lado de "Ver contas")
- [x] 6.3 Linha da posição manual: selo "Manual", "Atualizado em dd/mm/aaaa", "Desatualizado" em texto na cor normal, e área clicável que abre o painel de edição (posição do Open Finance continua sem ação)
- [x] 6.4 Edição: "Atualizar valor" em destaque, "Salvar", "Encerrar posição" (zera o valor e guarda o histórico) e "Excluir" com confirmação que avisa que o histórico sai do patrimônio
- [x] 6.5 Conferir o seletor de vínculo das metas com uma posição manual (lista, instituição, aviso de saldo compartilhado) sem mudar o layout
- [x] 6.6 Testes de tela: adicionar, editar valor, excluir com confirmação, erro ao salvar, estado vazio com as duas ações, selo e "Desatualizado", posição do Open Finance sem painel, valores ocultos
- [x] 6.7 Conferir a tela e o painel em 320, 390, 768, 1024 e 1440 px, nos dois temas, sem rolagem horizontal (nome longo truncado, saldo visível, folha inferior no celular), e `npm run check:tokens` sem cor em hex

## 7. Documentação

- [x] 7.1 `CLAUDE.md`: reescrever a regra 9 para incluir a posição manual de investimento de instituição fora do Open Finance (não é carteira com saldo; a sincronização nunca a altera nem zera; só leitura continua valendo)
- [x] 7.2 `docs/01-produto.md`: seção "Lançamento manual" (terceira situação), seção "Investimentos" (posições manuais, selo, "Desatualizado", tipo Criptomoedas, sem rentabilidade) e "O que não entra" do patrimônio (tirar "bens que não vêm do Open Finance" e dizer que a posição manual entra); tabela de funcionalidades
- [x] 7.3 `docs/02-open-finance.md`: em "Fica de fora", apontar para a posição manual (cripto e corretoras sem conector)
- [x] 7.4 `docs/03-arquitetura.md`: endpoints `POST`, `PATCH` e `DELETE /investments`, passo de foto das posições manuais na sincronização e linhas na tabela "Decisões" (reuso de `investments` com `source`; foto diária no fim da sincronização; critério único de banco ativo para investimentos)
- [x] 7.5 `docs/04-modelo-de-dados.md`: colunas novas e `CHECK` de `investments`, `type` `CRYPTO` e `OTHER` manuais, regra "a sincronização nunca altera nem zera posição manual"
- [x] 7.6 `docs/06-design-system.md`: só se o selo "Manual" ou o texto "Desatualizado" virarem padrão novo (registrar token e contraste)
- [x] 7.7 `docs/07-roadmap.md`: incluir o item "Investimentos manuais" na Fase 3 e marcar `[x]` ao arquivar

## 8. Fechamento

- [x] 8.1 `typecheck`, `lint`, `format:check` e `test` no backend (com o Docker rodando para a integração) e no frontend
- [x] 8.2 Conferência em ambiente de desenvolvimento: cadastrar INCO e Binance, atualizar o valor, rodar a sincronização manual (`POST /api/v1/sync-runs`) e ver a foto do dia, o patrimônio e uma meta vinculada somando a posição
- [x] 8.3 `/opsx:archive add-manual-investments`
