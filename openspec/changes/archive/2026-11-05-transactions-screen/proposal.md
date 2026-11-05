## Why

A tela de Transações é onde você confere o que aconteceu com o seu dinheiro e corrige categorias. Sem ela, a categorização não tem como aprender com você, e nada do que a sincronização trouxe fica visível.

## What Changes

- Cria `GET /api/v1/transactions`:
  - lista paginada, ordenada da mais recente para a mais antiga;
  - filtros de período, categoria, tipo (receita, despesa, transferência), conta e busca na descrição.
- Cria `GET /api/v1/transactions/:id` com o detalhe.
- Cria `PATCH /api/v1/transactions/:id` para trocar a categoria, com a opção "Aplicar sempre", que cria uma regra pela função de aprendizado da categorização.
- Cria a tela de Transações:
  - lista agrupada por dia, com o total de cada dia;
  - filtros e busca;
  - detalhe em painel;
  - troca de categoria com "Aplicar sempre para '<descrição>'".
- No computador, a lista vira uma linha por transação, com colunas.

Itens do roadmap cobertos:
- Fase 1 → Categorias: "Ao corrigir uma categoria, opção 'Aplicar sempre para <descrição>', que cria a regra".
- Fase 1 → Telas → Transações: lista agrupada por dia e paginada; filtros por período, categoria, tipo e conta; pesquisa; detalhe; troca de categoria.

## Capabilities

### New Capabilities

- `transactions-view`: consulta paginada e filtrada de transações, detalhe, troca de categoria com aprendizado, e a tela de Transações.

### Modified Capabilities

Nenhuma.

## Impact

- **Código novo:** `backend/src/modules/transactions/` (rotas, service, repository de consulta) e `frontend/src/features/transactions/`.
- **API:** `GET /api/v1/transactions`, `GET /api/v1/transactions/:id`, `PATCH /api/v1/transactions/:id`.
- **Depende de:** `transaction-categorization` (função de aprendizado e lista de categorias) e `setup-web-foundation`.

## Fora do escopo

- Lançar, editar por inteiro ou excluir transações manuais, filtro de origem e possíveis duplicatas (`manual-transactions`). Nesta change, `PATCH` só aceita a categoria.
- Excluir transações do Open Finance: não é permitido em nenhuma change.
- Exportar CSV (ideia para depois).
- Faturas e parcelas futuras (Fase 2).
