## Why

O Valora hoje só avisa de um banco fora do ar por uma faixa na tela. Orçamento em 80% ou estourado só aparece se você abrir a tela de Orçamentos. A Fase 2 pede um lugar único de avisos, o **sino de alertas** no topo, e as regras que o alimentam. Esta change monta a estrutura (tabela, avaliação, API e sino) e os dois tipos de alerta que já têm dados prontos: **orçamento** e **conexão**. Os detectores que analisam transações (cobrança duplicada e assinatura) vêm na change `alerts-transaction-patterns`.

## What Changes

- Cria a tabela `alerts` (com os cinco tipos previstos no modelo de dados, para a change seguinte não precisar de nova migration), uma chave de deduplicação e a data de resolução.
- Cria o **avaliador de alertas** com dois detectores:
  - **Orçamento em 80%** (`budget_warning`) e **estourado** (`budget_exceeded`), por categoria e mês, usando o mesmo `budgetStatus` da tela de Orçamentos;
  - **Conexão com banco caída ou consentimento expirado** (`connection_error`), a partir do status da conexão.
- Roda o avaliador no fim de cada sincronização e depois das ações que mudam o gasto ou o limite (lançamento manual, troca de categoria, limite do orçamento).
- Um alerta nasce **uma vez** por situação, some sozinho quando a situação acaba e não volta se você o dispensou.
- Cria `GET /api/v1/alerts`, `POST /api/v1/alerts/:id/read`, `POST /api/v1/alerts/read-all` e `POST /api/v1/alerts/:id/dismiss`.
- Cria o **sino de alertas** no topo: contador de não lidos, painel com a lista, ação de ler, dispensar e ir para a tela relacionada.

Itens do roadmap cobertos (Fase 2):
- **Alertas** (`alerts`): orçamento em 80% e estourado; conexão com banco caída ou consentimento expirado.
- **Sino de alertas no topo** (a parte do sino; o resumo de metas e projeção no Início é da `home-planning-summary`).

## Capabilities

### New Capabilities

- `alerts`: tabela e ciclo de vida dos alertas, avaliador, detectores de orçamento e de conexão, API e sino no topo.

### Modified Capabilities

Nenhuma. A faixa de aviso de banco que não sincroniza (`accounts-view`) continua como está; o alerta no sino é um aviso a mais, não a substitui.

## Impact

- **Banco:** tabela `alerts` (migration), com `dedupe_key` e `resolved_at` além das colunas documentadas.
- **Código novo:** `backend/src/modules/alerts/` e `frontend/src/features/alerts/`.
- **Código alterado:**
  - `sync.service.ts` (chama o avaliador no fim);
  - os services de orçamentos e de transações (chamam o avaliador de orçamento depois de gravar);
  - o cabeçalho do app em `frontend/src/components/layout/`.
- **API:** `GET /api/v1/alerts`, `POST /api/v1/alerts/:id/read`, `POST /api/v1/alerts/read-all`, `POST /api/v1/alerts/:id/dismiss`.
- **Reutiliza:** `budgetStatus`, o gasto líquido de `budgets` e o status das conexões.
- **Depende de:** `budgets`, `open-finance-sync`, `web-shell`.
- **Alimenta:** `alerts-transaction-patterns`.

## Fora do escopo

- Cobrança duplicada e assinatura detectada (`alerts-transaction-patterns`).
- Notificação no celular ou push, e-mail e WhatsApp: ficam em "Ideias para depois" do roadmap.
- Tela própria de histórico de alertas: o sino mostra os ativos.
- Alerta de saldo projetado negativo, de fatura vencendo ou de meta atrasada.
- Configurar quais alertas receber ou os percentuais (80% e 100% são fixos).
- Itens da seção "Fora do escopo" de `docs/01-produto.md`: nenhum é tocado.
