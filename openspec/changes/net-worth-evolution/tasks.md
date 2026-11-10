## 1. Utilitários compartilhados

- [ ] 1.1 Mover `monthsEndingAt` para `backend/src/shared/months.ts` e `buildBalanceChange` para `backend/src/shared/value-change.ts` (como `buildValueChange`), mantendo o comportamento; o Início passa a importar de lá e os testes existentes continuam passando
- [ ] 1.2 `parseMonthRange({ from, to }, today)` em `backend/src/shared/month-range.ts` (padrão de 12 meses, `to` limitado ao mês atual, `from` ≤ `to`, máximo 60 meses) e o schema Zod da query; testes: padrão, invertido, 61 meses, formato inválido, `to` no futuro, virada de ano

## 2. Regras do patrimônio

- [ ] 2.1 `valueOnDay`: foto mais recente por item com tolerância de 7 dias, itens ocultos e "Dinheiro" fora, banco arquivado só antes do arquivamento, cartão como fatura; testes de cada regra e dos limites (7 dias, dia do arquivamento)
- [ ] 2.2 `pickReferenceDay` e `buildNetWorthSeries`: último dia com foto do mês, mês sem foto sem ponto, mês atual até hoje, ordem; testes
- [ ] 2.3 Variação no mês só com itens ativos (percentual com duas casas, base zero, sem foto anterior a hoje); testes

## 3. Banco e API

- [ ] 3.1 `NetWorthRepository`: fotos de contas e de investimentos da janela (com `type`, ocultação e dia de arquivamento da conexão) e `min(date)` das fotos, sem N+1
- [ ] 3.2 `NetWorthService`: `current` a partir de `AccountsService.overview()` e da soma dos investimentos de bancos ativos; junta pontos, variação e `firstSnapshotDate`
- [ ] 3.3 Rota `GET /net-worth` com a query validada e DTO sem campos internos
- [ ] 3.4 Testes de integração (Testcontainers): patrimônio atual confere com contas + investimentos − faturas, o último ponto confere com `current`, foto faltando num dia, banco arquivado (degrau na série, sem queda na variação), conta oculta, mês sem fotos, banco de dados sem fotos
- [ ] 3.5 Teste de rota com `app.inject()`: parâmetros padrão e erros 400

## 4. Cartão de patrimônio

- [ ] 4.1 Carregar `/frontend-design:frontend-design` e `/ui-ux-pro-max`; reler o Design System (card de saldo, gráficos, paleta, estados, responsividade)
- [ ] 4.2 Schemas Zod em `frontend/src/lib/api/net-worth.ts` e consulta do TanStack Query com o intervalo calculado pelo período escolhido
- [ ] 4.3 Cartão "Patrimônio" no topo de `/investimentos`: total, variação, as três partes, nota da fórmula e controle "6 meses" / "12 meses"
- [ ] 4.4 Gráfico de área mensal (série 1, 2 px, preenchimento 15%, eixo X abreviado, eixo Y discreto que some com valores ocultos, tooltip) e resumo para leitor de tela
- [ ] 4.5 Estado de histórico curto ("O histórico começa em …"), carregando (skeleton) e erro isolado
- [ ] 4.6 Testes de componente: histórico curto sem gráfico, gráfico com 3 pontos, troca de período, valores ocultos, erro isolado, patrimônio negativo em vermelho

## 5. Conferência visual

- [ ] 5.1 Conferir em 320, 390, 768, 1024 e 1440 px, nos dois temas, sem rolagem horizontal (inclusive com R$ 1.234.567,89)
- [ ] 5.2 Revisar com `/ui-ux-pro-max`

## 6. Documentação

- [ ] 6.1 `docs/01-produto.md`: seção "Patrimônio" com a fórmula, o que entra e o que não entra (fatura x gastos fora de fatura, bancos arquivados, histórico só desde a primeira foto)
- [ ] 6.2 `docs/03-arquitetura.md`: endpoint `GET /net-worth` e as decisões (tolerância de 7 dias por item, um ponto por mês, degrau do banco arquivado)
- [ ] 6.3 `docs/06-design-system.md`: cartão de patrimônio e o gráfico mensal; `docs/07-roadmap.md`: marcar o item "Evolução do patrimônio"
