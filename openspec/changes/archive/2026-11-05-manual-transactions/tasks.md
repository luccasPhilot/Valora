## 1. Banco e seed

- [x] 1.1 Migration: índice único parcial `accounts (type) WHERE type = 'cash'` e `ON DELETE SET NULL` em `transactions.possible_duplicate_of_id`
- [x] 1.2 Seed idempotente da conta "Dinheiro" (`type = 'cash'`, sem conexão, `balance_cents` nulo)
- [x] 1.3 Teste de integração: seed repetido mantém uma única conta `cash`; segunda conta `cash` é recusada pelo banco

## 2. Escrita de transações manuais

- [x] 2.1 Schemas Zod no backend (validação da entrada) e no frontend (validação do formulário) para lançar e editar (`amountCents` inteiro > 0, descrição de 1 a 120 caracteres, data até hoje em São Paulo, `type` em `income` e `expense`)
- [x] 2.2 `POST /api/v1/transactions`: valida categoria ativa e do mesmo tipo, grava `source = 'manual'`, `status = 'posted'`, `category_source = 'user'`, sinal pelo tipo e descrição normalizada
- [x] 2.3 Estender o `PATCH`: edição completa nas manuais; 409 `OPEN_FINANCE_READ_ONLY` para campos além da categoria nas do banco
- [x] 2.4 `DELETE /api/v1/transactions/:id`: 204 nas manuais; 409 `OPEN_FINANCE_READ_ONLY` nas do banco
- [x] 2.5 Testes: gasto em dinheiro, transação em conta conectada, data futura, categoria do tipo errado, valor zero, editar valor, editar campo de transação do banco, excluir manual, excluir do banco

## 3. Duplicatas

- [x] 3.1 Fazer a gravação idempotente do `SyncService` devolver quais transações foram inseridas
- [x] 3.2 Implementar a detecção (mesma conta, mesmo valor, até 3 dias, manual ainda livre, data mais próxima, empate pela lançada primeiro)
- [x] 3.3 `POST /api/v1/transactions/:id/duplicate-resolution` com `merge` (atômico, copia a categoria, apaga a manual) e `keep_both`; 409 `NO_DUPLICATE_PENDING`
- [x] 3.4 Filtros `source` e `possibleDuplicate` na lista e os campos `source` e `possibleDuplicateOfId` nos itens
- [x] 3.5 Testes de integração: marcação criada; valor diferente e mais de 3 dias não marcam; atualização de transação existente não dispara; "Juntar" e "São diferentes"; nada pendente; manual intacta depois da sincronização

## 4. Interface

- [x] 4.1 Carregar `/frontend-design:frontend-design` e `/ui-ux-pro-max`; reler o Design System (Nova transação, badges, responsividade)
- [x] 4.2 Componente `MoneyInput`: dígitos da direita para a esquerda, máximo de 10 dígitos, `inputMode="numeric"`, com testes (digitar `8990`, apagar um dígito)
- [x] 4.3 `NewTransactionProvider` e formulário (tipo, valor, descrição, categoria filtrada pelo tipo, conta com "Dinheiro" escolhida, data com Hoje, Ontem e Escolher data), com erros por campo e aviso ao salvar
- [x] 4.4 Painel adaptado ao tamanho (`Sheet` de baixo, `Sheet` lateral, `Dialog`), com o botão "Salvar" acima da área segura
- [x] 4.5 Botão "Nova transação" no topo da tela de Transações
- [x] 4.6 Editar (mesmo formulário) e excluir (com confirmação) no detalhe de transações manuais
- [x] 4.7 Badges "Manual" e "Possível duplicata"; faixa com a quantidade de duplicatas; detalhe lado a lado com "Juntar" e "São diferentes"
- [x] 4.8 Filtro de origem junto dos outros filtros
- [x] 4.9 Testes de componente: validação do formulário, categorias filtradas pelo tipo, faixa de duplicatas

## 5. Conferência visual

- [x] 5.1 Conferir formulário, detalhe e faixa em 320, 390, 768, 1024 e 1440 px, nos dois temas, sem rolagem horizontal
- [x] 5.2 Revisar com `/ui-ux-pro-max` (velocidade de preenchimento com uma mão, foco, leitor de tela)

## 6. Documentação

- [x] 6.1 Registrar em `docs/04-modelo-de-dados.md` o índice único da conta `cash` e o `ON DELETE SET NULL`
- [x] 6.2 Registrar em `docs/03-arquitetura.md` os endpoints e códigos de erro novos, se algo mudou
- [x] 6.3 Marcar como `[x]` os itens de "Lançamento manual" da Fase 1 em `docs/07-roadmap.md`
