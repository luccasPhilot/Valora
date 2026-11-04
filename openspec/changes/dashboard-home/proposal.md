## Why

O Início é a primeira tela que você vê. Ele precisa responder em segundos quanto você tem, quanto entrou e saiu no mês, para onde foi o dinheiro e se algum orçamento está perto do limite. Também é de lá que saem os atalhos para lançar receitas e despesas.

## What Changes

- Cria `GET /api/v1/dashboard?month=` com os números do Início:
  - saldo total, variação no mês e evolução diária;
  - receitas e despesas do mês, e receitas x despesas dos últimos 6 meses;
  - gastos por categoria (5 maiores + Outros);
  - os 3 orçamentos mais perto do limite;
  - as 5 últimas transações.
- Cria a tela Início, na ordem do Design System:
  1. card de saldo com gráfico pequeno;
  2. atalhos;
  3. receitas e despesas do mês;
  4. gráfico receitas x despesas;
  5. lista de gastos por categoria;
  6. orçamentos perto do limite;
  7. últimas transações.
- Os atalhos "Adicionar receita" e "Registrar despesa" abrem o formulário de lançamento manual; "Transações" e "Orçamentos" navegam.
- Layout: uma coluna no celular, duas no tablet e grade de 12 colunas no computador.
- Mostra um estado de primeiro uso quando ainda não há dados sincronizados.

Itens do roadmap cobertos (Fase 1 → Telas → Início):
- card de saldo;
- atalhos (Adicionar receita, Registrar despesa, Transações, Orçamentos);
- receitas e despesas do mês;
- receitas x despesas (6 meses);
- gastos por categoria (lista de barras);
- orçamentos perto do limite;
- últimas transações.

## Capabilities

### New Capabilities

- `home-dashboard`: números agregados do Início, os gráficos e a tela inicial com atalhos.

### Modified Capabilities

Nenhuma.

## Impact

- **Código novo:** `backend/src/modules/dashboard/` e `frontend/src/features/dashboard/`, com os componentes de gráfico.
- **API:** `GET /api/v1/dashboard`.
- **Dependência nova:** `recharts` (pelos gráficos do shadcn/ui).
- **Reutiliza:**
  - service de totais de `accounts-screen`;
  - `budgetStatus` de `budgets`;
  - filtro de tipo de `transactions-screen`;
  - formulário de `manual-transactions`.
- **Depende de:** `accounts-screen`, `budgets`, `manual-transactions`, `transactions-screen`.

## Fora do escopo

- Projeção do fim do mês, resumo de metas e alertas (Fase 2).
- Evolução do patrimônio com investimentos (Fase 3): o card de saldo mostra só as contas.
- Rosca colorida por categoria: o Design System define a lista de barras numa cor só.
- Saudação no Início: a tela vai direto para o saldo.
