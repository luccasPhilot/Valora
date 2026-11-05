## Context

A tabela `budgets` já existe (`setup-api-foundation`), com um limite por categoria e mês e o mês sempre no dia 1. O Design System define as cores, ícones e textos dos três status e a barra de orçamento. A Fase 2 vai usar estes status nos alertas.

## Goals / Non-Goals

**Goals:**
- Status exatos nos limites (80% e 100%), sem erro de arredondamento.
- O mesmo gasto aqui, no Início e nas Transações filtradas.

**Non-Goals:**
- Alertas, previsões e orçamentos recorrentes automáticos.

## Decisions

**1. Gasto líquido calculado no SQL.**
- `GREATEST(0, -SUM(amount_cents))` por categoria, no mês, de todas as origens e status.
- Como os orçamentos só existem para categorias `expense`, transferências ficam de fora naturalmente.
- *Alternativa:* contar só os valores negativos ignoraria estornos e inflaria o gasto.

**2. Status por comparação de inteiros.**
- `spent * 100 < limit * 80` → `ok`; `spent <= limit` → `warning`; senão `exceeded`.
- O `percent` devolvido (para exibir) é calculado depois e só serve para a tela.
- *Alternativa:* comparar percentuais em ponto flutuante arriscaria erro nos limites exatos.

**3. Função pura para o status.**
`budgetStatus(spentCents, limitCents)` fica em `backend/src/modules/budgets/`, como função pura, e o Início reutiliza a mesma função. O front recebe o status pronto da API e não recalcula.

**4. Mês na rota como `AAAA-MM`.**
O schema Zod valida o formato e converte para o dia 1 do mês; `firstDayOfMonth` vem de `backend/src/shared/dates.ts`.

**5. Copiar do mês anterior com `INSERT ... SELECT ... ON CONFLICT DO NOTHING`.**
Uma query só, filtrando categorias ativas. O retorno conta as linhas inseridas.

**6. Tela.**
- Barras com o componente `Progress`, trilho `track` e preenchimento `status-ok`, `status-warning` ou `status-critical`.
- Painel de edição adaptado ao tamanho da tela.
- O limite usa o `MoneyInput` de `manual-transactions`.
- "Ver transações" navega para Transações com `categoryId`, `from` e `to` na URL.

## Risks / Trade-offs

- [Pendentes do cartão entram no gasto e podem mudar ou sumir] → Elas são compras reais em andamento; se sumirem, a sincronização as apaga e o gasto se corrige.
- [Transação sem categoria não entra em nenhum orçamento] → O Início e a lista de Transações mostram "Sem categoria", incentivando a correção.

## Open Questions

Nenhuma.
