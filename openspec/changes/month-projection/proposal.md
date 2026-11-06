## Why

Com as faturas (`credit-card-bills`) e as previsões (`planned-entries`) no banco, falta responder a pergunta que motiva a Fase 2: **"como vou chegar ao fim do mês?"** A projeção junta o saldo de hoje com o que já está comprometido até o último dia do mês e mostra se o saldo vai ficar negativo antes disso.

## What Changes

- Cria `GET /api/v1/projection` com a projeção do mês atual: saldo de hoje, receitas previstas pendentes, despesas previstas pendentes, faturas de cartão que vencem até o fim do mês, saldo projetado e o ponto mais baixo do saldo dia a dia.
- Define a conta (veja o design): `saldo de hoje + receitas previstas − despesas previstas − faturas que vencem`.
- Mostra a projeção na tela de Planejamento: cartão com o saldo projetado, o gráfico do saldo dia a dia até o fim do mês e a linha do tempo dos lançamentos que a compõem.
- Avisa na tela quando o saldo projetado, ou algum dia do caminho, fica negativo.

Itens do roadmap cobertos (Fase 2):
- **Projeção do fim do mês:** saldo de hoje + receitas previstas − despesas previstas − parcelas que vencem.

**Ajuste de redação no roadmap, a confirmar:** o roadmap diz "parcelas que vencem". Esta change subtrai as **faturas** de cartão que vencem no mês, e não as parcelas soltas: a fatura já contém as parcelas do mês, e descontar as duas contaria a mesma saída duas vezes. Se você aprovar, a linha do roadmap muda na mesma change.

## Capabilities

### New Capabilities

- `month-projection`: cálculo da projeção do fim do mês, o endpoint e o bloco de projeção na tela de Planejamento.

### Modified Capabilities

Nenhuma.

## Impact

- **Código novo:** `backend/src/modules/projection/` e `frontend/src/features/planning/projection/`.
- **API:** `GET /api/v1/projection`.
- **Reutiliza:** saldo total de `accounts-view` (`calculateAccountTotals`), ocorrências de `planned-entries` e faturas de `credit-card-bills`; o gráfico segue a paleta de gráficos do Design System.
- **Depende de:** `credit-card-bills`, `planned-entries`, `accounts-view`.
- **Alimenta:** `home-planning-summary`.

## Fora do escopo

- Prever gastos variáveis (mercado, lazer) pela média histórica: a projeção cobre só o que está previsto e as faturas. A tela diz isso.
- Projeção de meses futuros ou de vários meses.
- Cenários ("e se eu gastar X?").
- Gastos no cartão ainda fora de fatura fechada: entram no mês seguinte, na fatura que vencer nele.
- Alerta de saldo projetado negativo no sino.
- Itens da seção "Fora do escopo" de `docs/01-produto.md`: nenhum é tocado (a projeção é regra escrita no código, sem IA).
