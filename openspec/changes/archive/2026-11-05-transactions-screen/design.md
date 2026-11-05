## Context

Depende de:
- `transaction-categorization`: `learnFromCorrection` e lista de categorias;
- `setup-web-foundation`: shell, formatação, `<Money>` e estados.

O Design System define o item de transação, o cabeçalho de dia, os filtros, o detalhe e a regra de responsividade. A change `manual-transactions` vai estender o `PATCH`, criar `POST` e `DELETE`, e adicionar o filtro de origem.

## Goals / Non-Goals

**Goals:**
- Conferir e corrigir transações rápido, no celular e no computador.
- Correções que viram regras com um toque.

**Non-Goals:**
- Lançamento manual e duplicatas (`manual-transactions`).
- Exportação.

## Decisions

**1. Paginação por página e limite, com rolagem infinita na tela.**
- A API usa `page` e `limit` (convenção do projeto); a tela usa `useInfiniteQuery`.
- *Alternativa:* paginação por cursor seria mais robusta a inserções durante a rolagem. Com uma sincronização por dia e um único usuário, o risco de páginas deslocadas é desprezível.

**2. Filtro de tipo calculado no SQL.**
- `type=transfer` → categoria com `kind = 'transfer'`.
- `type=expense` → `amount_cents < 0` e categoria nula ou diferente de `transfer`.
- `type=income` → `amount_cents > 0` e categoria nula ou diferente de `transfer`.
- A mesma regra vira uma função compartilhada no repository, reutilizada por `budgets` e `dashboard-home`.

**3. Busca com `ILIKE` em `description_normalized`.**
- O termo passa por `normalizeDescription` e é usado como parâmetro, sem interpolação, com `%` e `_` escapados.
- *Alternativa:* busca textual do PostgreSQL (tsvector) é exagero para descrições curtas.

**4. Total do dia calculado na tela.**
A tela já tem as transações do dia carregadas. O total soma só os itens que não são transferências. Se o dia continuar na próxima página, o total é atualizado quando ela carrega.

**5. Filtros na URL.**
Os filtros ficam nos parâmetros da URL, então voltar, recarregar e compartilhar o link mantêm o filtro.

**6. Detalhe adaptado ao tamanho da tela.**
`Sheet` de baixo (< 768 px), `Sheet` lateral (768 a 1023 px) e `Dialog` (≥ 1024 px). A troca de categoria usa `Command` com busca e uma caixa "Aplicar sempre para '<descrição>'".

**7. Atualização otimista ao trocar a categoria.**
- A lista mostra a nova categoria na hora.
- Se a API falhar, volta a categoria anterior e mostra um aviso de erro.
- Com "Aplicar sempre", a lista é recarregada depois, porque outras transações podem ter mudado.

## Risks / Trade-offs

- [Muitas transações num período longo (por exemplo, "Este ano")] → A paginação limita a 100 por página e o índice `(account_id, date)` mais `(date)` cobre a ordenação.
- [`ILIKE` com `%termo%` não usa índice B-tree] → Para alguns milhares de linhas por ano é rápido. Se um dia pesar, um índice `pg_trgm` resolve.
- [Total do dia incompleto enquanto a próxima página não chega] → O total mostra o que está carregado e se completa ao carregar o resto do dia.

## Open Questions

Nenhuma.
