## Context

- `PATCH /transactions/:id` aceita, numa transação do Open Finance, só `categoryId` e `applyAlways`; o resto vira 409 `OPEN_FINANCE_READ_ONLY` (`shared/errors.ts`).
- A sincronização faz upsert pelo id do Pluggy e só atualiza as colunas que vêm do Pluggy; a troca pendente → postada (`pending-replacement.ts`) leva a categoria `user` e o vínculo com previsão.
- `transaction-filter-conditions.ts` monta os filtros da lista e do resumo; a busca compara com `description_normalized`.
- A normalização de texto (sem acento, minúscula) já existe para descrições (`normalizeDescription`).

## Goals / Non-Goals

**Goals:**
- Guardar contexto numa transação sem inventar categoria.
- Filtrar por esse contexto em Transações e nos relatórios.
- Nada do que o usuário escreveu se perde numa sincronização.

**Non-Goals:**
- Dividir transação, anexos, etiqueta automática.

## Decisions

### 1. Modelo

- `transactions.note text null`, `CHECK (char_length(note) <= 500)`. Texto vazio é gravado como nulo.
- `tags`: `id uuid`, `name text` (até 40, sem espaço nas pontas), `name_normalized text unique` (pela mesma normalização das descrições, então "Viagem" e "viagem" são a mesma), `created_at`.
- `transaction_tags`: `(transaction_id, tag_id)` chave primária, `ON DELETE CASCADE` nos dois; índice em `tag_id` para o filtro.
- **Por que tabela e não `text[]`:** renomear uma etiqueta muda em todas as transações de uma vez, e o filtro usa índice.

### 2. API

- `GET /tags` (todas, por nome, com `transactionCount`; uma pessoa tem dezenas, sem paginação), `POST /tags` (`name`; 409 `TAG_ALREADY_EXISTS` com nome igual normalizado), `PATCH /tags/:id`, `DELETE /tags/:id` (204; tira das transações).
- `PATCH /transactions/:id` aceita `note` (string até 500 ou nulo) e `tagIds` (até 10, a lista inteira que a transação passa a ter) em **qualquer** origem. Etiqueta inexistente: 400 `VALIDATION_ERROR` com `tagIds` em `details`.
- DTO da transação ganha `note` e `tags: [{ id, name }]`, lidos com um `left join` agregado (sem N+1).
- Filtro `tagId` em `GET /transactions`, `GET /transactions/summary`, `GET /reports/income-expense` e `GET /reports/category-spending`: `exists (select 1 from transaction_tags where …)`.
- Busca: `description_normalized like … or note_normalized like …`, com `note` normalizada na hora da consulta (`unaccent(lower(note))` não está disponível sem extensão; a normalização é feita em TS ao gravar numa coluna `note_normalized`, como a descrição).

### 3. Sincronização e duplicatas

- O upsert da sincronização não lista `note` nem as etiquetas: nunca as toca.
- Troca pendente → postada: na mesma operação que leva a categoria, a postada recebe a `note` da pendente (se a postada não tiver uma) e a união das etiquetas.
- "Juntar" (`merge`): a do banco recebe a nota da manual (se não tiver uma) e a união das etiquetas, antes de a manual ser apagada.

### 4. Tela

- Detalhe: campo "Nota" (salva ao sair do campo, com "Salvo"), "Etiquetas" com chips removíveis e "Adicionar etiqueta" (busca; "Criar 'viagem'" quando não existe).
- Lista: ícone de nota e até 2 chips de etiqueta na linha (no celular, só o ícone), sem empurrar o valor.
- Filtro "Etiqueta" no popover/painel de filtros e chip "Etiqueta: viagem".
- Aba "Etiquetas" em "Categorias e regras": lista com a contagem, renomear e excluir (com confirmação que diz quantas transações perdem a etiqueta).
- Relatórios: seletor de etiqueta junto do período.

## Risks / Trade-offs

- **Etiquetas como categorias paralelas:** o usuário pode recriar o problema das categorias falsas com etiquetas. → É o uso pretendido: etiqueta não entra em orçamento nem em gasto por categoria, só filtra.
- **Regra 9 mais larga:** abre a porta para outros campos. → A spec lista exatamente os campos aceitos no Open Finance; qualquer outro continua 409.
