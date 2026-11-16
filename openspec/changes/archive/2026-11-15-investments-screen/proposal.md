## Why

Desde a Fase 1 o Valora grava cada investimento e a foto diária da posição, mas não mostra nada disso: o dinheiro que está em CDB, Tesouro e fundos some do app. Sem a tela, o patrimônio (próximas changes) não tem onde morar e a meta vinculada a um investimento não tem o que escolher.

## What Changes

- Cria `GET /api/v1/investments`: as posições dos bancos e corretoras **ativos**, agrupadas por tipo, com o total e o percentual de cada grupo e de cada posição.
- Cria a tela **Investimentos** (`/investimentos`): card com o total, lista de barras por tipo (uma cor só) e as posições de cada tipo, com instituição e subtipo (CDB, Tesouro Direto...). Posições zeradas (resgatadas) ficam fora da lista e são contadas numa linha de rodapé. A área entra no menu lateral, depois de Contas.
- Adiciona a coluna `investments.subtype` (o Pluggy manda `type` e `subtype`; hoje só o `type` é gravado), preenchida pela sincronização e, nas linhas que já existem, a partir do `raw`.
- Muda a sincronização: investimento que o Pluggy **deixou de devolver** para um banco sincronizado com sucesso passa a ter posição `0` (e a foto do dia `0`). Sem isso, um investimento resgatado e removido pelo banco ficaria com o último valor para sempre e o total (e o patrimônio) ficaria inflado.
- Troca o endereço de exemplo da página "não encontrado": `/investimentos` passa a existir, então o teste e o cenário usam `/patrimonio`.

Itens do roadmap cobertos (Fase 3):
- **Investimentos:** posição de cada um, agrupada por tipo, e o total.

## Capabilities

### New Capabilities

- `investments-view`: API de posições, agrupamento por tipo, total e a tela de Investimentos.

### Modified Capabilities

- `open-finance-sync`: grava o `subtype` e zera a posição do investimento que sumiu da resposta do banco.
- `database-schema`: coluna `investments.subtype`.
- `web-shell`: o cenário da página "não encontrado" deixa de usar `/investimentos`.

## Impact

- **Banco:** coluna `investments.subtype` (migration, com preenchimento a partir de `raw->>'subtype'`), documentada em `docs/04-modelo-de-dados.md`.
- **Código novo:** `backend/src/modules/investments/` e `frontend/src/features/investments/`.
- **Código alterado:** `pluggy.schemas.ts`, `pluggy-client.ts`, `sync.types.ts` e `investments.repository.ts` (sincronização); `frontend/src/lib/areas.ts` e `router.tsx`; `not-found-page.test.tsx`.
- **API:** `GET /api/v1/investments`.
- **Reutiliza:** `Money`, `EmptyState`, `ErrorState`, skeletons, a lista de barras do Início e "Ocultar valores".
- **Depende de:** `open-finance-sync` (investimentos e fotos já gravados) e `web-shell`.
- **Alimenta:** `net-worth-evolution` e `linked-goals`.

## Fora do escopo

- Rentabilidade, ganho ou perda e comparação com benchmarks: o Valora guarda só a posição, e a variação dela mistura aporte e rendimento.
- Detalhe ou histórico de um investimento individual (o histórico do total entra em `net-worth-evolution`).
- Cotação em tempo real, preço médio, quantidade de cotas e vencimento: não são gravados.
- Investimentos em moeda que não seja BRL.
- Itens da seção "Fora do escopo" de `docs/01-produto.md`: nenhum é tocado. Continua só leitura, sem comprar nem resgatar.
