## Context

Depende de `transactions-screen` (lista, detalhe e `PATCH` de categoria) e de `sync-open-finance` (onde a detecção de duplicata entra). As regras de produto estão em `docs/01-produto.md` (Lançamento manual), e o formulário está descrito no Design System (Nova transação). O banco já tem `source`, `possible_duplicate_of_id` e o tipo de conta `cash`.

## Goals / Non-Goals

**Goals:**
- Lançar um gasto em dinheiro em poucos segundos, com uma mão.
- Transações do banco continuam sendo a fonte da verdade e só têm a categoria editável.
- Nenhuma duplicata entra nos totais sem você saber, e nenhuma é juntada sem você decidir.

**Non-Goals:**
- Saldo de dinheiro, transações recorrentes, transferências manuais.

## Decisions

**1. Uma conta `cash` garantida pelo banco.**
- Índice único parcial `accounts (type) WHERE type = 'cash'`.
- O seed cria a conta se ela não existir; o nome "Dinheiro" pode ser editado no futuro sem quebrar o seed, que procura pelo tipo.

**2. Valor no formulário como sequência de dígitos.**
- O estado do campo é uma string de dígitos (máximo 10, ou seja, até R$ 99.999.999,99).
- Os centavos são `parseInt(digitos, 10)`; a exibição usa `formatCurrency`.
- Nunca existe um `number` com casas decimais no caminho.
- O campo usa `inputMode="numeric"`.
- *Alternativa:* um campo de texto com máscara e conversão de "89,90" para número abriria espaço para erro de arredondamento e de vírgula.

**3. Mesma rota de `PATCH`, com regra por origem.**
- O service lê a transação.
- Se for `open_finance` e o corpo tiver qualquer campo além de `categoryId` e `applyAlways`, lança `ConflictError('OPEN_FINANCE_READ_ONLY')`.
- O schema Zod do corpo é o mesmo para as duas origens; a regra de origem fica no service, não no controller.

**4. Detecção de duplicata no `SyncService`, só na inserção.**
- A gravação idempotente devolve quais linhas foram **inseridas** (`xmax = 0` no `RETURNING` do PostgreSQL).
- Só essas passam pela detecção.
- Como a detecção roda uma vez por transação do banco, "São diferentes" só precisa limpar a marcação; não é necessária coluna extra.
- A busca usa `account_id`, `amount_cents`, `source = 'manual'` e `date BETWEEN d - 3 AND d + 3`, excluindo manuais já apontadas por outra transação.

**5. Resolução atômica.**
- "Juntar" roda numa transação de banco: copia a categoria da manual para a do banco (`category_source = 'user'`), apaga a manual e limpa a marcação.
- A chave estrangeira `possible_duplicate_of_id` usa `ON DELETE SET NULL`: se você excluir a manual por fora, a marcação some sozinha.

**6. Formulário global.**
- Um `NewTransactionProvider` no shell expõe `openNewTransaction({ type, transaction? })`.
- A tela de Transações (botão no topo), o detalhe (editar) e, depois, os atalhos do Início usam o mesmo formulário.
- O componente de painel muda pelo tamanho da tela, como no detalhe.

**7. Contagem de duplicatas para a faixa.**
Usa a própria lista com `possibleDuplicate=true&limit=1` e lê `pagination.total`, sem criar endpoint novo.

## Risks / Trade-offs

- [Duas compras reais iguais em dias próximos serem marcadas como duplicata] → É só um aviso; "São diferentes" resolve, e o par não volta.
- [Você lançar à mão numa conta conectada e o banco trazer com valor um pouco diferente (por exemplo, com IOF)] → Nenhum aviso aparece e as duas ficam. A lista mostra as duas, com o badge "Manual", e você pode excluir a manual.
- [Transação manual em conta conectada inflar o total enquanto a do banco não chega] → É o comportamento esperado: o lançamento manual existe justamente para registrar antes.

## Migration Plan

- Uma migration: índice único parcial da conta `cash` e `ON DELETE SET NULL` em `possible_duplicate_of_id`.
- O seed da conta "Dinheiro" roda depois das migrations.

## Open Questions

Nenhuma.
