## 1. Regras e API

- [x] 1.1 `NetWorthService.summary()`: patrimônio de hoje e variação no mês, lendo só as fotos do mês atual e reaproveitando as funções puras de `net-worth-evolution`; teste de que o resultado é igual ao `current` e ao `monthChange` de `GET /net-worth`
- [x] 1.2 `DashboardService` recebe `netWorth: Pick<NetWorthService, 'summary'>` e devolve o bloco `netWorth` (`null` fora do mês atual); montagem em `dashboard-planning.ts` ou arquivo irmão, sem regra nova
- [x] 1.3 DTO da rota do dashboard com o campo novo e nenhum campo antigo removido; teste de rota com `app.inject()`
- [x] 1.4 Testes de integração (Testcontainers): com investimentos e fatura, sem eles, mês passado (`null`), sem foto de dia anterior (`change` nulo) e `totalBalanceCents` intacto

## 2. Início

- [x] 2.1 Carregar `/frontend-design:frontend-design` e `/ui-ux-pro-max`; reler o Design System (card de saldo, valores financeiros, responsividade)
- [x] 2.2 Schema Zod do dashboard em `frontend/src/lib/api/dashboard.ts` com `netWorth` anulável
- [x] 2.3 Linha "Patrimônio" em `balance-card.tsx`: valor, variação (reaproveitando o componente da variação do saldo), link "Ver patrimônio" e a regra de só aparecer com investimento ou fatura
- [x] 2.4 "Ocultar valores" e estado sem variação
- [x] 2.5 Testes de componente: com e sem investimentos, sem variação, valor negativo, valores ocultos, link para `/investimentos`; atualizar o teste do Início que usa o dashboard de exemplo

## 3. Conferência visual

- [x] 3.1 Conferir o card em 320, 390, 768, 1024 e 1440 px, nos dois temas, sem rolagem horizontal
- [x] 3.2 Revisar com `/ui-ux-pro-max`

## 4. Documentação

- [x] 4.1 `docs/01-produto.md`: tabela de áreas ("Variação do patrimônio no card de saldo" no lugar de "Evolução do patrimônio" no Início)
- [x] 4.2 `docs/03-arquitetura.md`: campo `netWorth` em `GET /dashboard`; `docs/06-design-system.md`: linha de patrimônio no card de saldo (Dashboard); `docs/07-roadmap.md`: marcar o item da variação do patrimônio
