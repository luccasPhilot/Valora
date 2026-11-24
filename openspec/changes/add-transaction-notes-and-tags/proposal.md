## Why

Uma transação não guarda contexto (`docs/08-revisao-e-proximas-fases.md`, "Lacunas", item 2): não há onde dizer que uma compra foi da viagem, da reforma, que é reembolsável ou que é despesa dedutível no IR. Hoje o único jeito é criar categorias falsas ("Viagem", "Reembolso"), que bagunçam orçamentos e relatórios.

É o item "Notas e etiquetas" da Fase 4. Ele também prepara a folha do IR da Fase 6 (`add-tax-support`), que vai listar as despesas com uma etiqueta escolhida (por exemplo, "Dedutível").

**Decisão do usuário em 24/11/2026:** numa transação do Open Finance, além da categoria, nota e etiquetas passam a ser editáveis.

## What Changes

- **Nota:** texto livre de até 500 caracteres por transação (`transactions.note`), do Open Finance e manual. Aparece no detalhe e, resumida, na linha da lista.
- **Etiquetas:** tabela `tags` (nome único sem diferenciar maiúsculas e acentos, até 40 caracteres) e `transaction_tags` (várias por transação). Criadas na hora, no detalhe da transação ("Adicionar etiqueta" com busca e "Criar 'viagem'"), e gerenciadas numa aba "Etiquetas" de "Categorias e regras" (renomear, excluir; excluir tira a etiqueta das transações, sem apagar transação).
- **Editar no Open Finance:** `PATCH /transactions/:id` passa a aceitar `note` e `tagIds` também em transações do Open Finance. Valor, data, descrição e conta continuam recusados com `OPEN_FINANCE_READ_ONLY`.
- **Sincronização:** nunca mexe em nota nem em etiqueta. Quando uma pendente vira postada com outro id, a postada herda a nota e as etiquetas junto com a categoria (a mesma troca da `fix-sync-data-loss`). "Juntar" uma possível duplicata leva a nota e as etiquetas da manual para a do banco.
- **Filtro:** `tagId` em `GET /transactions` e no resumo, com o filtro "Etiqueta" na tela de Transações, e nos relatórios de receitas e despesas e de gasto por categoria. A busca passa a procurar também na nota.
- **Possível duplicata e regras:** etiquetas e nota não entram na detecção de duplicata nem nas regras de categorização.

### Contraria documentos (decisão do usuário, tomada em 24/11/2026)

- `CLAUDE.md`, regra 9: "Numa transação do Open Finance, só a categoria é editável" passa a "só a categoria, a nota e as etiquetas são editáveis".
- `docs/01-produto.md` ("Numa transação do Open Finance, só a categoria muda") e a spec `manual-transactions` ("Editar transação manual").

### Fora do escopo

- Dividir uma transação em várias categorias (adiado em `docs/08`).
- Anexos e recibos (adiado em `docs/08`).
- Etiquetas sugeridas ou automáticas, etiqueta em regra de categorização.
- A folha do IR (`add-tax-support`).
- Etiqueta em massa: a seleção múltipla da `add-review-inbox` pode ganhar "Adicionar etiqueta" depois; aqui não.
- Nenhum item da seção "Fora do escopo" de `docs/01-produto.md` é afetado.

### Roadmap

Não está em `docs/07-roadmap.md`: é o item "Notas e etiquetas" da Fase 4 em `docs/08` (change nº 6 da "Ordem sugerida"). Ao arquivar, o item é marcado como feito e sai de "Decisões que dependem de você".

## Capabilities

### New Capabilities

- `transaction-notes-and-tags`: nota e etiquetas por transação, gestão das etiquetas e filtro.

### Modified Capabilities

- `manual-transactions`: o `PATCH` numa transação do Open Finance aceita `note` e `tagIds`; "Juntar" leva nota e etiquetas.
- `transactions-view`: filtro por etiqueta e busca também na nota.
- `open-finance-sync`: a postada que substitui uma pendente herda a nota e as etiquetas.
- `reports`: receitas e despesas e gasto por categoria aceitam `tagId`.

## Impact

- **Banco:** `transactions.note text null` (com `CHECK` de até 500 caracteres), `tags (id, name, name_normalized unique, created_at)` e `transaction_tags (transaction_id, tag_id)` com chave nos dois e `ON DELETE CASCADE` nos dois lados. Migration nova; `docs/04-modelo-de-dados.md`.
- **Backend:** `modules/tags/` (CRUD), `modules/transactions/` (PATCH, DTO com `note` e `tags`, filtro `tagId`, busca na nota), `modules/sync/` (herdar na troca pendente → postada), `possible-duplicates.repository.ts` (juntar), `modules/reports/` (`tagId`).
- **Frontend:** detalhe da transação (nota e etiquetas), linha da lista, filtro "Etiqueta", aba "Etiquetas" em "Categorias e regras", filtro nos relatórios, schemas em `lib/api/`.
- **Testes:** integração do PATCH no Open Finance (aceita nota e etiquetas, recusa o resto), das etiquetas, do filtro, da troca pendente → postada e do juntar; telas com carregando, vazio e erro.
- **Documentação:** `CLAUDE.md` (regra 9), `docs/01-produto.md`, `docs/03-arquitetura.md`, `docs/04-modelo-de-dados.md` e `docs/08-revisao-e-proximas-fases.md`.
- **Dependências:** nenhuma nova.
