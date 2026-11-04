## Why

Você precisa ver quanto tem em cada conta, quanto deve em cada cartão e se cada banco continua sincronizando. Como o consentimento do Open Finance pode expirar, um banco que parou de sincronizar tem que aparecer na hora, em qualquer tela, e não só quando você nota que faltam transações.

## What Changes

- Cria `GET /api/v1/accounts` com as contas, os cartões, a conexão de cada um e os totais. O saldo total soma contas corrente e poupança não ocultas; ficam de fora cartões e "Dinheiro".
- Cria `PATCH /api/v1/accounts/:id` para ocultar ou mostrar uma conta nos totais.
- Cria a tela de Contas:
  - resumo com saldo total e faturas em aberto;
  - contas e cartões agrupados por instituição;
  - status de cada conexão e última sincronização;
  - limite do cartão.
- Preenche o status da sincronização no topo de todas as telas ("Atualizado hoje, 07:02"). Tocar nele sincroniza na hora, mostra o andamento e confirma com um aviso.
- Cria a faixa de aviso, em todas as telas, quando um banco não sincroniza, com o caminho para reconectar no Meu Pluggy.

Itens do roadmap cobertos (Fase 1 → Telas):
- Contas e cartões: saldo de cada conta, total, limite do cartão, status de cada conexão e última sincronização.
- Faixa de aviso quando um banco não sincroniza.

Esta change define o que é o **saldo total**, que os documentos ainda não definiam: contas corrente e poupança não ocultas. O Início (`dashboard-home`) usa a mesma definição.

## Capabilities

### New Capabilities

- `accounts-view`: consulta de contas e totais, ocultar conta dos totais, tela de Contas, status da sincronização no topo e aviso de conexão com problema.

### Modified Capabilities

Nenhuma.

## Impact

- **Código novo:** `backend/src/modules/accounts/`, `frontend/src/features/accounts/`, `frontend/src/components/sync-status` e `connection-alert`.
- **API:** `GET /api/v1/accounts`, `PATCH /api/v1/accounts/:id`. Usa `POST /api/v1/sync-runs` e `GET /api/v1/sync-runs/latest` de `sync-open-finance`.
- **Documentação:** definição de saldo total em `docs/01-produto.md`.

## Fora do escopo

- Faturas detalhadas e parcelas futuras (Fase 2, `credit_card_bills`).
- Investimentos na tela (Fase 3).
- Conectar banco pelo app: a conexão é feita no Meu Pluggy (docs/02-open-finance.md).
- Saldo de "Dinheiro": não existe (docs/01-produto.md).
