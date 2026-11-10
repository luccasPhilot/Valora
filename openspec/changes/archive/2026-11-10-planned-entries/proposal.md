## Why

O Valora mostra o que já aconteceu. Para planejar o mês é preciso registrar o que **vai** acontecer: o salário que cai no dia 5, o aluguel do dia 10, o seguro anual. Receitas e despesas previstas são a base da projeção do fim do mês (`month-projection`) e o diferencial do Valora frente ao Pierre ([produto](../../../docs/01-produto.md#referência-pierre)).

## What Changes

- Cria a tabela `planned_entries` e as ocorrências mensais de cada previsão (tabela `planned_entry_occurrences`, nova, que resolve o ponto em aberto do roadmap: **como marcar uma previsão como realizada**).
- Cria o CRUD da previsão: descrição, valor, categoria, dia do mês, repetição (`none`, `monthly`, `yearly`), mês de início e de fim.
- Cria `GET /api/v1/planned-entries?month=` com as **ocorrências do mês** (previsões avulsas e recorrentes expandidas), cada uma com situação `pending`, `realized` ou `skipped`, e os totais previstos.
- Realizar uma ocorrência é sempre uma ação sua:
  - **Vincular a uma transação:** o app sugere candidatas (mesmo tipo, categoria compatível, valor próximo, perto do dia previsto) e você escolhe;
  - **Marcar como realizada sem vincular**, para o caso de a transação não ter vindo;
  - **Pular o mês** (a conta não vai acontecer);
  - **Desfazer**.
- Cria a tela **Planejamento** (`/planejamento`), com seletor de mês, lista de ocorrências por situação, formulário de previsão e as ações acima. A área entra no menu lateral.

Itens do roadmap cobertos (Fase 2):
- **Receitas e despesas previstas** (`planned_entries`), avulsas ou recorrentes. Definir como marcar uma previsão como realizada.

## Capabilities

### New Capabilities

- `planned-entries`: previsões avulsas e recorrentes, ocorrências por mês, realização (vínculo, manual, pular) e a tela de Planejamento.

### Modified Capabilities

Nenhuma.

## Impact

- **Banco:** tabelas `planned_entries` e `planned_entry_occurrences` (migration). A segunda é nova em relação a `docs/04-modelo-de-dados.md` e entra lá.
- **Código novo:** `backend/src/modules/planned-entries/` e `frontend/src/features/planning/`.
- **Código alterado:** `frontend/src/lib/areas.ts` e as rotas (nova área "Planejamento").
- **API:** `GET/POST /api/v1/planned-entries`, `PUT/DELETE /api/v1/planned-entries/:id`, `PUT/DELETE /api/v1/planned-entries/:id/occurrences/:month`.
- **Reutiliza:** `MoneyInput`, `MonthSelector`, `CategorySelect` e as regras de categoria por tipo do lançamento manual.
- **Depende de:** `manual-transactions`, `transaction-categorization`.
- **Alimenta:** `month-projection`.

## Fora do escopo

- A projeção do saldo (change `month-projection`).
- Vincular automaticamente a transação à previsão: a escolha é sempre sua, como na possível duplicata.
- Previsões de transferência entre contas ou de pagamento de fatura (categoria `transfer`): a fatura entra pela change `credit-card-bills`.
- Alertas de previsão atrasada.
- Orçamento por previsão: o orçamento por categoria continua separado.
- Itens da seção "Fora do escopo" de `docs/01-produto.md`: nenhum é tocado.
