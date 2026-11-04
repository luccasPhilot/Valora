## Why

O Open Finance traz quase tudo, mas não traz o que você paga ou recebe em dinheiro, e às vezes deixa de trazer alguma transação. Sem lançamento manual, esses gastos ficam fora das despesas e dos orçamentos. O lançamento manual precisa ser rápido no celular e não pode gerar duplicatas silenciosas.

## What Changes

- Cria a conta "Dinheiro" (tipo `cash`) na primeira execução: sem saldo, sem conexão e fora do saldo total.
- Cria `POST /api/v1/transactions` para lançar uma receita ou despesa manual em "Dinheiro" ou numa conta ou cartão conectado.
- Estende `PATCH /api/v1/transactions/:id`: numa transação manual, também muda valor, data, descrição e conta. Numa transação do Open Finance, qualquer campo além da categoria é recusado.
- Cria `DELETE /api/v1/transactions/:id`, só para transações manuais.
- Detecta possíveis duplicatas na sincronização: transação do Open Finance nova, na mesma conta, com o mesmo valor e até 3 dias de diferença de uma manual. O app nunca junta sozinho.
- Cria `POST /api/v1/transactions/:id/duplicate-resolution`, com as ações "Juntar" e "São diferentes".
- Adiciona o filtro de origem (`source`) e o filtro de possíveis duplicatas na lista de transações.
- Na interface:
  - formulário "Nova transação", com o valor digitado da direita para a esquerda;
  - botão "Nova transação" no topo da tela de Transações;
  - edição e exclusão no detalhe;
  - badges "Manual" e "Possível duplicata";
  - faixa de duplicatas para conferir;
  - comparação lado a lado para resolver.

Itens do roadmap cobertos (Fase 1 → Lançamento manual):
- Conta "Dinheiro".
- Formulário de receita e despesa.
- Editar e excluir transação manual.
- Sincronização nunca altera nem apaga transação manual (com teste).
- Aviso de possível duplicata.
- Filtro de origem na lista de transações.

Os atalhos "Adicionar receita" e "Registrar despesa" do Início usam o formulário desta change, mas são ligados em `dashboard-home`.

## Capabilities

### New Capabilities

- `manual-transactions`: conta "Dinheiro", lançamento, edição e exclusão de transações manuais, proteção das transações do Open Finance, detecção e resolução de possíveis duplicatas, e a interface correspondente.

### Modified Capabilities

Nenhuma. As rotas de `transactions-view` ganham campos e filtros novos, mas os requisitos já especificados continuam valendo.

## Impact

- **Código novo:** `backend/src/modules/transactions/` (comandos de escrita, detecção e resolução de duplicatas), `frontend/src/features/transactions/new-transaction/`, `frontend/src/components/money-input`.
- **Código alterado:** `SyncService` chama a detecção de duplicatas ao inserir transações do Open Finance; os filtros da lista ganham `source` e `possibleDuplicate`.
- **Banco:**
  - índice único parcial para garantir uma só conta `cash`;
  - `ON DELETE SET NULL` em `possible_duplicate_of_id`.
- **Depende de:** `transactions-screen` e `transaction-categorization`.

## Fora do escopo

- Carteira de dinheiro com saldo: "Dinheiro" não tem saldo (docs/01-produto.md).
- Atalhos do Início (`dashboard-home`).
- Transações manuais recorrentes e previsões (Fase 2, `planned_entries`).
- Lançar transferências manuais: o formulário só tem Receita e Despesa.
- Juntar duplicatas sozinho: a decisão é sempre sua.
