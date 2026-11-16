## Context

`balance_snapshots` guarda uma linha por conta e dia, e `investment_snapshots` uma por investimento e dia, desde a primeira sincronização (4 de novembro de 2026). No cartão, `balance_cents` é a fatura atual (positiva). O Início já soma fotos para o saldo (`findBalanceEvolution`), mas só dos dias que têm foto e sem tolerância a falhas: se uma conta não tem foto num dia, a soma daquele dia cai. Para o patrimônio, que mistura 5 bancos e dezenas de investimentos, isso criaria buracos falsos no gráfico.

## Goals / Non-Goals

**Goals:**
- O patrimônio de hoje conferir com a soma dos bancos e corretoras ativos.
- A curva mensal usar só o que foi guardado e não ter degraus falsos por foto faltando.
- A mesma regra de bancos arquivados, contas ocultas e "Dinheiro" do saldo total.

**Non-Goals:**
- Reconstruir histórico, granularidade diária, patrimônio por tipo de investimento (ver proposta).

## Decisions

**1. Fórmula e o que entra.**
- `patrimônio = contas + investimentos − faturas em aberto`.
- Contas: corrente e poupança não ocultas. Faturas em aberto: `balance_cents` dos cartões não ocultos (o saldo do cartão é a fatura). Investimentos: todos. "Dinheiro" (`cash`) não tem foto nem saldo e fica de fora.
- Hoje (`current`): vem das posições atuais, não das fotos: `calculateAccountTotals` (saldo total e faturas) + soma dos investimentos de conexões ativas. Assim o número do topo é sempre o que a tela de Contas e a de Investimentos mostram.

**2. Valor de um item num dia = a foto mais recente até o dia, com tolerância de 7 dias.**
- Cada conta e cada investimento é uma série própria de fotos. No dia `D`, o item vale a foto mais recente com `D − 7 ≤ data ≤ D`; se não houver, não conta naquele dia.
- Os 7 dias cobrem uma falha curta da sincronização sem inventar saldo de um item que sumiu há semanas (por exemplo, um investimento removido do Pluggy antes de a regra de zerar existir).
- *Alternativa:* somar só as fotos do dia (como o saldo do Início). Descartada: um dia sem a foto de uma conta derrubaria o total e geraria um degrau que não existiu.

**3. Banco arquivado: degrau, como no saldo do Início.**
- Itens de conexão arquivada contam só em dias **anteriores** ao dia do arquivamento (fuso de São Paulo). A série mensal tem um degrau no mês em que o banco saiu, igual à curva "evolução do saldo" ([produto](../../../docs/01-produto.md#remover-um-banco-do-valora)).
- A variação do mês usa **só os itens de bancos ativos** nas duas pontas, para não mostrar uma queda que não aconteceu.

**4. Um ponto por mês, no último dia com foto.**
- Para cada mês do intervalo, o dia de referência é o último dia do mês (ou hoje, no mês atual) que tem pelo menos uma foto de algum item contado. Mês sem nenhuma foto não gera ponto: o gráfico mostra só o que foi guardado, sem zeros inventados.
- O ponto traz `month`, o `date` de referência e as quatro cifras (`accountsCents`, `investmentsCents`, `openBillsCents` positivo, `netWorthCents`).
- *Limitação conhecida:* o ponto do mês atual muda a cada sincronização, e o do mês anterior é o do último dia dele.

**5. Variação no mês.**
- `monthChange = patrimônio de hoje (só ativos) − patrimônio (só ativos) na primeira foto do mês`, nula se não há foto de um dia anterior a hoje no mês. Percentual sobre o valor absoluto da base, com duas casas, nulo quando a base é zero. É a mesma conta de `buildBalanceChange`, que passa a morar em `shared/value-change.ts` (função pura, mesmos testes) para o módulo novo não importar do Início.

**6. Intervalo e custo.**
- `from` e `to` (`AAAA-MM`); sem `to`, o mês atual; sem `from`, 11 meses antes de `to` (12 pontos). `from` depois de `to` ou mais de 60 meses: 400 `VALIDATION_ERROR` com o campo em `details`. `to` no futuro é limitado ao mês atual. O parser vive em `shared/month-range.ts` e será reaproveitado pelos relatórios; `monthsEndingAt` muda para lá.
- O repositório lê as fotos da janela (do começo do primeiro mês menos 7 dias até hoje) para as contas e os investimentos relevantes e o cálculo é uma função pura (`buildNetWorthSeries`). No pior caso (60 meses, ~70 itens) são poucas dezenas de milhares de linhas por consulta.
- Duas consultas de fotos (contas e investimentos), sem N+1, e uma de `min(date)` para `firstSnapshotDate`.

**7. Camadas e arquivos.**
- `net-worth.repository.ts` (leitura das fotos e do `min`), `net-worth.service.ts` (junta o saldo atual, os investimentos atuais e a série) e `net-worth.routes.ts` (valida `from`/`to` com Zod). Regras em `net-worth-calculations.ts`: `valueOnDay`, `pickReferenceDay` e `buildNetWorthSeries`, puras.
- O service recebe `AccountsService.overview()` para o saldo e as faturas, e o repositório de investimentos para a soma atual, sem reescrever regra de nenhum.

**8. Tela.**
- Cartão `secondary` no topo de `/investimentos`, antes do resumo de investimentos: rótulo "Patrimônio", total em `display` (vermelho só se negativo), variação no mês com ícone (mesma apresentação do saldo), as três partes em linhas ("Contas", "Investimentos", "Faturas em aberto" com `−`) e o gráfico.
- Gráfico de área (série 1, 2 px, preenchimento 15% sumindo para 0), eixo X com meses abreviados ("nov."), eixo Y discreto (some com os valores ocultos), tooltip com o mês e o patrimônio. Controle segmentado "6 meses" / "12 meses" (padrão 12).
- Desenha só com 2 ou mais pontos. Com menos, no lugar do gráfico: "O histórico começa em 04/11. O gráfico aparece quando houver dois meses de dados." Nota fixa: "Patrimônio = contas + investimentos − faturas em aberto. Gastos no cartão ainda fora de fatura fechada não entram."
- Resumo para leitor de tela com o primeiro e o último ponto. Estados carregando, erro ("Tentar de novo", sem derrubar o resto da tela) e "Ocultar valores".
- Os dados vêm do mesmo endpoint e o cartão é independente do resto da tela: o erro de um não derruba o outro.

## Risks / Trade-offs

- [Histórico curto no começo] → Hoje há poucos dias de fotos. A tela explica desde quando há dados e não inventa o passado; a variação do mês aparece já no segundo dia.
- [Tolerância de 7 dias esconde uma falha longa de sincronização] → Após 7 dias sem foto o item some do total; o aviso de conexão caída (alertas) já cobre o problema de fundo.
- [Fatura em aberto não é toda a dívida do cartão] → Documentado na nota da tela e em `docs/01-produto.md`.
- [Degrau do banco arquivado] → Comportamento já aceito no saldo do Início, repetido de propósito para as duas curvas contarem a mesma história.

## Open Questions

Nenhuma.
