## Why

O card de saldo do Início mostra só corrente e poupança. Quem tem dinheiro em CDB e Tesouro vê um número que não diz quanto realmente tem, e não percebe quando o patrimônio sobe ou cai. A Fase 3 pede a variação do patrimônio ali, sem tirar o "Saldo total" do lugar.

## What Changes

- `GET /api/v1/dashboard` ganha o bloco `netWorth` (`totalCents`, `investmentsCents`, `openBillsCents` e `change`), vindo do `NetWorthService`, só para o mês atual (para qualquer outro mês é `null`, como a projeção). Todos os campos que já existiam continuam.
- O `NetWorthService` ganha `summary()`: patrimônio de hoje e variação no mês, lendo só as fotos do mês corrente (sem a série de 12 meses que o Início não usa).
- O card de saldo ganha uma linha **Patrimônio**: valor, variação no mês (ícone e texto, igual à do saldo) e o link "Ver patrimônio" para `/investimentos`. A linha só aparece quando existe diferença entre o patrimônio e o saldo, ou seja, quando há investimento ou fatura em aberto.
- Ajusta `docs/01-produto.md`: a tabela de áreas dizia "Evolução do patrimônio" no Início na v3; passa a dizer "Variação do patrimônio no card de saldo", como pede o roadmap. A curva do patrimônio fica na tela Investimentos e nos relatórios.

Itens do roadmap cobertos (Fase 3):
- **Variação do patrimônio no card de saldo do Início.**

**Divergência entre documentos, a confirmar:** `docs/01-produto.md` lista "Evolução do patrimônio" como conteúdo do Início na v3, e `docs/07-roadmap.md` pede só a "variação do patrimônio no card de saldo". Esta change segue o roadmap (a variação no card, com o link para a curva) e corrige a tabela do produto. Se você quiser o gráfico de patrimônio também no Início, é uma change à parte.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `home-dashboard`: novo bloco `netWorth` na API e a linha de patrimônio no card de saldo.

## Impact

- **Código alterado:** `backend/src/modules/dashboard/dashboard.service.ts`, `dashboard.routes.ts` (DTO), `backend/src/modules/net-worth/net-worth.service.ts`; `frontend/src/lib/api/dashboard.ts` e `frontend/src/features/dashboard/balance-card.tsx`.
- **API:** `GET /api/v1/dashboard` (campo novo, sem quebrar os existentes).
- **Reutiliza:** o cálculo de `net-worth-evolution` (sem reescrever regra) e o visual da variação do saldo.
- **Depende de:** `net-worth-evolution` e `investments-screen`.

## Fora do escopo

- Gráfico da evolução do patrimônio no Início (a curva fica em Investimentos e nos relatórios).
- Trocar o "Saldo total" por patrimônio: o saldo total continua sendo só corrente e poupança, com a mesma definição de Contas.
- Variação do patrimônio para meses que não são o atual.
- Itens da seção "Fora do escopo" de `docs/01-produto.md`: nenhum é tocado.
