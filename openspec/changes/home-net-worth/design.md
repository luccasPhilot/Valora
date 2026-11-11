## Context

O Início é montado por um endpoint agregado (`GET /dashboard`) cujo `DashboardService` só chama outros services e nunca reescreve regra (decisão registrada em `docs/03-arquitetura.md`). A projeção e as metas entraram assim na Fase 2, e o patrimônio segue o mesmo caminho. O card de saldo (`balance-card.tsx`) já mostra saldo, variação no mês e a curva diária.

## Goals / Non-Goals

**Goals:**
- O número de patrimônio do Início ser exatamente o de `GET /net-worth`.
- Não confundir o "Saldo total" com o patrimônio: dois números, rotulados.

**Non-Goals:**
- Gráfico de patrimônio no Início; mudar a definição do saldo total.

## Decisions

**1. Bloco `netWorth` calculado pelo `NetWorthService`, sem regra nova no dashboard.**
- Formato: `netWorth: { totalCents, investmentsCents, openBillsCents, change } | null`, com `change` igual ao `monthChange` de `net-worth-evolution` (`{ cents, percent }` ou nulo).
- `null` quando o `month` pedido não é o mês atual, como `projection`: a variação "desde o começo do mês" só tem sentido para o mês corrente.
- `NetWorthService.summary()` devolve só `current` e `monthChange`, consultando as fotos do mês atual, em vez de montar 12 pontos que o Início descartaria. Usa as mesmas funções puras (`valueOnDay`, variação só com bancos ativos), então não há conta nova.
- *Alternativa:* o front chamar `GET /net-worth` à parte. Descartada: é o efeito cascata que o endpoint agregado existe para evitar.

**2. Quando mostrar a linha.**
- A linha de patrimônio aparece quando `investmentsCents !== 0` ou `openBillsCents !== 0`. Sem investimentos nem faturas o patrimônio é igual ao saldo, e repetir o mesmo número só atrapalha.

**3. Visual.**
- Dentro do card de saldo, abaixo da variação e acima do gráfico pequeno: separador sutil, rótulo "Patrimônio" (`type-label`), valor em `type-value-md` com `tabular-nums` (vermelho só se negativo), a variação no mês no mesmo formato do saldo (ícone `TrendingUp`/`TrendingDown`, `+` e `−` tipográfico, "no mês") e o link "Ver patrimônio" (`ChevronRight`) para `/investimentos`.
- Sem variação (sem foto de dia anterior no mês), a linha mostra só o valor e o link.
- "Ocultar valores" mascara o valor e a variação em reais; o percentual continua visível, como no saldo.
- Em 320 px o rótulo, o valor e o link quebram em linhas, sem corte e sem rolagem horizontal.

**4. Falha do bloco.**
- `GET /dashboard` já falha por inteiro quando qualquer parte falha (projeção, metas). O patrimônio segue a mesma regra, porque o custo da consulta é pequeno (fotos de um mês).

## Risks / Trade-offs

- [Dois números parecidos no mesmo card] → Rótulos distintos ("Saldo total" e "Patrimônio"), a linha some quando são iguais e o `docs/06-design-system.md` explica a diferença.
- [A consulta do patrimônio deixar o Início mais lento] → Só as fotos do mês atual; testes de integração cobrem o resultado e o `EXPLAIN` não é necessário nesse volume.

## Open Questions

Nenhuma.
