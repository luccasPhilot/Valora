## Why

O Valora guarda a foto diária de cada conta e de cada investimento desde a Fase 1 justamente para mostrar, um dia, quanto o patrimônio cresceu. O "Saldo total" só olha corrente e poupança; não diz quanto você tem de fato (investimentos) nem desconta o que deve no cartão. Falta o número do patrimônio e a curva dele mês a mês.

## What Changes

- Define o **patrimônio**: contas corrente e poupança + investimentos − faturas em aberto dos cartões, tudo dos bancos ativos e sem as contas ocultas.
- Cria `GET /api/v1/net-worth?from=&to=` com:
  - `current`: o patrimônio de hoje e as três partes (contas, investimentos, faturas em aberto), calculado das posições atuais;
  - `points`: um ponto por mês (`AAAA-MM`), calculado das fotos diárias, com as mesmas três partes;
  - `monthChange`: a variação desde a primeira foto do mês (usada no Início pela change `home-net-worth`);
  - `firstSnapshotDate`: o dia da foto mais antiga, para a tela dizer desde quando há histórico.
- Calcula o valor de cada dia **por item** (cada conta e cada investimento usa a foto mais recente até o dia, com tolerância de 7 dias), para uma foto que faltou num dia não abrir um buraco no gráfico.
- Mostra, no topo da tela **Investimentos**, o cartão **Patrimônio**: total, variação no mês, as três partes e o gráfico de área mês a mês (6 ou 12 meses).
- Cria os utilitários compartilhados de intervalo de meses (`from`/`to` em `AAAA-MM`, padrão 12 meses, no máximo 60) e move `monthsEndingAt` e `buildBalanceChange` (hoje dentro do módulo `dashboard`) para `backend/src/shared/`, para os relatórios usarem sem depender do Início.

Itens do roadmap cobertos (Fase 3):
- **Evolução do patrimônio:** contas + investimentos − fatura em aberto, mês a mês, a partir das fotos diárias.

## Capabilities

### New Capabilities

- `net-worth`: definição e cálculo do patrimônio, pontos mensais, variação no mês e o cartão de patrimônio.

### Modified Capabilities

Nenhuma. (A leitura de `balance_snapshots` e `investment_snapshots` não muda requisito de `open-finance-sync`; a mudança de comportamento do Início fica na change `home-net-worth`.)

## Impact

- **Banco:** nenhuma tabela nem coluna nova. Lê `balance_snapshots`, `investment_snapshots`, `accounts`, `investments` e `connections`.
- **Código novo:** `backend/src/modules/net-worth/`, `backend/src/shared/month-range.ts`, `backend/src/shared/value-change.ts` e `frontend/src/features/investments/net-worth-card.tsx` (com o gráfico).
- **Código alterado:** `dashboard-calculations.ts` (importa os utilitários movidos, sem mudar comportamento); `investments-page.tsx` (cartão no topo).
- **API:** `GET /api/v1/net-worth`.
- **Reutiliza:** `calculateAccountTotals`, o critério de banco ativo (`active-connection.ts`), `ChartContainer` e `ChartTooltipCard`, `SegmentedControl`, "Ocultar valores".
- **Depende de:** `investments-screen` (a tela que recebe o cartão) e do `database-schema` já existente.
- **Alimenta:** `home-net-worth` e `report-net-worth-evolution`.

## Fora do escopo

- Reconstruir o histórico **anterior** à primeira foto a partir das transações. O gráfico mostra só o que foi guardado desde a Fase 1.
- Ponto diário ou semanal: o roadmap pede "mês a mês". O Início já mostra a curva diária do saldo.
- Patrimônio por tipo de investimento ao longo do tempo (renda fixa, fundos...).
- Imóveis, veículos e outros bens que não vêm do Open Finance; dívidas que não sejam fatura de cartão (financiamentos, empréstimos).
- Gastos no cartão ainda fora de uma fatura fechada: o Pluggy só informa a fatura, e a tela avisa isso.
- Itens da seção "Fora do escopo" de `docs/01-produto.md`: nenhum é tocado.
