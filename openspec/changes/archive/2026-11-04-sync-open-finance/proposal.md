## Why

O coração do Valora é ter as contas, transações e investimentos chegando sozinhos pelo Open Finance, sem duplicar nada e sem perder histórico, já que o Open Finance só devolve 12 meses. Sem a sincronização, nenhuma tela da v1 tem dados.

## What Changes

- Cria o `PluggyClient`, único ponto de contato com o Pluggy. Ele:
  - autentica com as credenciais do `.env`;
  - valida as respostas com Zod;
  - converte valores para centavos e normaliza o sinal (negativo = saída).
- Sincroniza cada banco do Meu Pluggy:
  - status da conexão;
  - contas e cartões;
  - transações: 12 meses na primeira vez, depois uma janela de 30 dias;
  - investimentos.
- Grava a foto diária do saldo de cada conta e de cada investimento.
- Grava e atualiza tudo pelo id do Pluggy, sem duplicar, e apaga transações pendentes que sumiram na janela.
- **Nunca altera nem apaga transações manuais** (`source = 'manual'`).
- Isola as falhas: um banco com erro não trava os outros.
- Agenda a sincronização diária (`SYNC_CRON`, fuso de São Paulo) e cria o disparo manual `POST /api/v1/sync-runs`, com bloqueio contra execução dupla.
- Registra cada execução em `sync_runs` e expõe `GET /api/v1/sync-runs/latest` e `GET /api/v1/connections`.
- Grava a descrição normalizada das transações, usada depois pelas regras de categoria.
- Inclui um script de desenvolvimento, fora dos testes, para gravar respostas reais anonimizadas do Pluggy como fixtures.

As transações novas ficam com a categoria sugerida pelo Pluggy em `pluggy_category` e sem categoria efetiva (`category_source = 'none'`). A change `transaction-categorization` liga a categorização à sincronização.

Itens do roadmap cobertos (Fase 1 → Sincronização):
- `PluggyClient` com o `pluggy-sdk`.
- Confirmar com dados reais a convenção de sinal do Pluggy.
- Sincronização de conexões, contas e transações.
- Fotos diárias de saldo.
- Investimentos e fotos diárias já gravados.
- Agendamento diário, `POST /api/v1/sync-runs` e lock.
- Registro em `sync_runs`.
- Testes de integração com respostas gravadas e anonimizadas.

## Capabilities

### New Capabilities

- `open-finance-sync`: leitura dos dados do Meu Pluggy, gravação sem duplicar, fotos diárias, isolamento de falhas, agendamento, disparo manual e histórico de execuções.

### Modified Capabilities

Nenhuma.

## Impact

- **Código novo:** `backend/src/modules/sync/` (`PluggyClient`, `SyncService`, repositories, rotas), `backend/src/modules/connections/`, `normalizeDescription` em `backend/src/shared/`.
- **Dependências:** `pluggy-sdk`, `croner` (agendamento).
- **Configuração:** `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET`, `PLUGGY_ITEM_IDS` e `SYNC_CRON` no `.env.example`.
- **API:** `POST /api/v1/sync-runs`, `GET /api/v1/sync-runs/latest`, `GET /api/v1/connections`.
- **Documentação:**
  - convenção de sinal do Pluggy registrada em `docs/04-modelo-de-dados.md`;
  - como obter os ids dos itens em `docs/02-open-finance.md`.

## Fora do escopo

- Categorização (`transaction-categorization`) e detecção de possível duplicata (`manual-transactions`).
- Telas: o status da sincronização no topo e a tela de Contas ficam com `accounts-screen`.
- Faturas do cartão e alertas (Fase 2).
- Webhooks do Pluggy: a decisão de arquitetura é sincronização agendada.
- Qualquer escrita no banco do cliente: o acesso ao Open Finance é só de leitura.
