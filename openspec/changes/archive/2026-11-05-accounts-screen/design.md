## Context

Depende de `sync-open-finance`, que grava contas, conexões e execuções e expõe o disparo manual, e de `manual-transactions`, que cria a conta "Dinheiro". O Design System define o status da sincronização no topo, o `Badge` de conexão e a faixa de aviso.

## Goals / Non-Goals

**Goals:**
- Visão rápida e confiável de saldos, faturas e saúde das conexões.
- Problema de conexão impossível de passar despercebido.
- Sincronizar na hora com um toque.

**Non-Goals:**
- Faturas detalhadas, parcelas e investimentos.

## Decisions

**1. Totais calculados na API.**
- A regra de saldo total (corrente + poupança, não ocultas) mora num service.
- Ela é reutilizada por `dashboard-home`, para os dois mostrarem sempre o mesmo número.
- *Alternativa:* somar no front espalharia a regra.

**2. Lista de contas sem paginação.**
- O número de contas é limitado pelas 5 conexões do Meu Pluggy (algumas dezenas de linhas, no máximo).
- É uma exceção consciente à regra de paginar listagens, registrada na tabela de decisões da arquitetura.

**3. Fatura atual = `balance_cents` do cartão.**
- O modelo de dados já define o saldo do cartão como o valor da fatura atual.
- A Fase 2 (`credit_card_bills`) traz o detalhe das faturas.

**4. Acompanhamento da sincronização por consulta periódica.**
- Depois do disparo, o front consulta `GET /sync-runs/latest` a cada 3 segundos até o status sair de `running`.
- Ao terminar, invalida as consultas do TanStack Query, recarregando todas as telas abertas.
- *Alternativa:* SSE ou WebSocket são exagero para uma ação que leva segundos e acontece poucas vezes por dia.

**5. Faixa e status no shell.**
- `SyncStatus` e `ConnectionAlert` ficam no `AppShell`.
- Os dois usam `GET /connections` e `GET /sync-runs/latest`, com `staleTime` de 60 segundos e recarga ao voltar para a aba.

**6. Agrupamento por instituição.**
Um card por conexão, com o nome do banco e o `Badge` de status no cabeçalho, e as contas como linhas dentro do card. Não há card dentro de card.

## Risks / Trade-offs

- [Saldo de cheque especial deixa o total negativo ou menor do que você espera] → O saldo aparece em `destructive`, e a definição do total está documentada.
- [Consulta a cada 3 s durante a sincronização] → Só acontece enquanto a execução está `running`; para ao terminar ou depois de 2 minutos, com aviso.

## Open Questions

Nenhuma.
