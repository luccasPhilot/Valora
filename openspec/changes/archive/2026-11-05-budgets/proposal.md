## Why

Saber o que já foi gasto não basta: você quer saber se está dentro do que planejou para cada categoria. O orçamento por categoria transforma as transações categorizadas em limites mensais, com aviso antes de estourar.

## What Changes

- Cria `GET /api/v1/budgets?month=` com o orçamento do mês: limite, quanto foi gasto, percentual e status de cada categoria, mais os totais.
- O gasto é calculado sobre transações do Open Finance e manuais, inclusive pendentes. Estornos reduzem o gasto, e transferências ficam de fora.
- Define os status:
  - **Dentro:** abaixo de 80% do limite;
  - **Atenção:** de 80% a 100%;
  - **Estourou:** acima de 100%.
- Cria `PUT /api/v1/budgets/:categoryId?month=` para definir o limite e `DELETE` para remover, só em categorias de despesa.
- Cria `POST /api/v1/budgets/copy-previous?month=` para copiar os limites do mês anterior.
- Cria a tela de Orçamentos:
  - seletor de mês e resumo do mês;
  - barras com status por ícone e texto;
  - criar, editar e remover limite;
  - atalho para ver as transações da categoria;
  - copiar do mês anterior.

Itens do roadmap cobertos (Fase 1 → Telas):
- Orçamentos: limite por categoria e mês, consumo, status com ícone e texto, "copiar do mês anterior".

## Capabilities

### New Capabilities

- `budgets`: limites mensais por categoria de despesa, cálculo do gasto e do status, cópia do mês anterior e a tela de Orçamentos.

### Modified Capabilities

Nenhuma.

## Impact

- **Código novo:** `backend/src/modules/budgets/` e `frontend/src/features/budgets/`.
- **API:** `GET /api/v1/budgets`, `PUT` e `DELETE /api/v1/budgets/:categoryId`, `POST /api/v1/budgets/copy-previous`.
- **Reutiliza:**
  - `MoneyInput` de `manual-transactions`;
  - o filtro de tipo compartilhado de `transactions-screen`;
  - o link para Transações filtradas.
- **Depende de:** `transaction-categorization`, `transactions-screen`, `manual-transactions`.

## Fora do escopo

- Alertas no sino quando chegar a 80% ou estourar (Fase 2, `alerts`).
- Receitas e despesas previstas e projeção (Fase 2).
- Orçamento para categorias de receita ou de transferência.
- Orçamento que se repete sozinho todo mês: o mês novo usa "Copiar do mês anterior".
