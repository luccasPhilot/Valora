## 1. Banco

- [x] 1.1 `transactions.note` e `note_normalized` (com `CHECK` de 500), `tags` e `transaction_tags`; migration com `npm run db:generate`

## 2. Etiquetas e nota (backend)

- [x] 2.1 Testes de integração primeiro: CRUD de `/tags` (nome repetido com outra grafia, renomear, excluir sem apagar transação, `transactionCount`)
- [x] 2.2 Testes primeiro do `PATCH /transactions/:id`: nota e etiquetas no Open Finance e na manual, nota vazia vira nulo, 501 caracteres, 11 etiquetas, etiqueta inexistente, `amountCents` no Open Finance continua 409
- [x] 2.3 Módulo `modules/tags/`; `PATCH` e DTO com `note` e `tags` (sem N+1)
- [x] 2.4 Testes primeiro do filtro `tagId` (lista, resumo, dois relatórios) e da busca na nota; implementar em `transaction-filter-conditions.ts` e nos relatórios

## 3. Sincronização e duplicatas

- [x] 3.1 Testes de integração primeiro: sincronização não mexe em nota nem etiqueta; pendente com etiqueta trocada pela postada; pendente só com nota espera o prazo; "Juntar" leva nota e etiquetas
- [x] 3.2 `pending-replacement` e o repository da sincronização consideram nota e etiqueta como decisão do usuário; `merge` leva os dois

## 4. Telas

- [x] 4.1 Carregar `/frontend-design:frontend-design` e `/ui-ux-pro-max`; o Design System vence
- [x] 4.2 Schemas em `lib/api/` com testes
- [x] 4.3 Detalhe: nota (salva ao sair, "Salvo") e etiquetas (chips, busca, "Criar"); linha da lista com indicação e até 2 etiquetas
- [x] 4.4 Filtro "Etiqueta" e chip em Transações; seletor nos dois relatórios
- [x] 4.5 Aba "Etiquetas" em "Categorias e regras" (contagem, renomear, excluir com confirmação)
- [ ] 4.6 Testes de tela e conferência em 320, 390, 768, 1024 e 1440 px, nos dois temas, com valores visíveis e ocultos

## 5. Conferência

- [x] 5.1 Rodar `typecheck`, `lint`, `format:check` e `test` no `backend/` e no `frontend/`; conferir que nenhum log leva nota nem nome de etiqueta

## 6. Documentação

- [x] 6.1 `CLAUDE.md` (regra 9: categoria, nota e etiquetas editáveis no Open Finance), `docs/01-produto.md`, `docs/03-arquitetura.md` (rotas, `PATCH`, Decisões) e `docs/04-modelo-de-dados.md` (`note`, `tags`, `transaction_tags`)
- [ ] 6.2 Ao arquivar: marcar "Notas e etiquetas" como feito e tirar o item de "Decisões que dependem de você" em `docs/08-revisao-e-proximas-fases.md`
