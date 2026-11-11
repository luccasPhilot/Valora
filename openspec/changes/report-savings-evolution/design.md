## Context

O histórico de receitas e despesas já entrega receitas, despesas e resultado por mês. Falta transformar isso em "estou guardando?": a fatia da renda que sobrou e o acumulado. São contas simples sobre os mesmos totais mensais, então não há consulta nova.

## Goals / Non-Goals

**Goals:**
- Taxa de poupança e sobra acumulada calculadas no servidor, em inteiros, testáveis sem banco.
- Os números de receitas, despesas e resultado iguais aos do Início e do histórico.

**Non-Goals:**
- Previsão, metas de poupança, saldo e patrimônio.

## Decisions

**1. Definições, todas sobre os totais mensais do Início.**
- `resultCents = incomeCents − expenseCents` (despesa positiva, como no histórico).
- `savingsRatePercent = round(resultCents × 1000 ÷ incomeCents) ÷ 10`, ou `null` quando as receitas do mês são zero. Pode ser negativa (gastou mais do que ganhou).
- `cumulativeResultCents`: soma dos resultados desde o **primeiro mês da lista** até o mês da linha. Não é saldo nem patrimônio: é só a soma do que sobrou ou faltou no período. A tela diz isso.
- Totais do período: `incomeCents`, `expenseCents`, `resultCents`, `savingsRatePercent` (`Σ resultado ÷ Σ receitas`, nulo se a soma das receitas é zero), `surplusMonths` e `closedMonths`. Os dois últimos contam só **meses fechados** (anteriores ao mês atual em São Paulo): `surplusMonths` é quantos tiveram resultado maior que zero. O mês em andamento fica de fora para não parecer um mês ruim por estar incompleto.
- *Alternativa:* média das taxas mensais. Descartada: um mês de renda baixa pesaria como um de renda alta; soma sobre soma é a taxa real do período.

**2. Mesma lista de meses do histórico.**
- Reaproveita a regra: começa na primeira transação guardada, zeros nos meses sem movimento dentro do período, no máximo 60 meses. Mês sem receita e sem despesa tem resultado `0` e taxa `null`.
- Função pura `buildSavingsReport(months, today)`, que recebe os mesmos `MonthTotals` do histórico, sem acesso ao banco.

**3. Endpoint.**
- `GET /reports/savings-evolution?from=&to=` (regras de `parseMonthRange`). Resposta: `from`, `to`, `months` (`month`, `incomeCents`, `expenseCents`, `resultCents`, `savingsRatePercent`, `cumulativeResultCents`) e `totals`. Sem paginação (até 60 linhas), exceção consciente nas Decisões.
- O `ReportsService` chama `findMonthTotals` uma vez e usa `buildSavingsReport`; o histórico de receitas e despesas e este relatório consultam a mesma função.

**4. Gráficos.**
- **Resultado do mês:** barras de série única (slot 1), topo arredondado de 4 px; meses negativos descem da linha do zero. Linha de zero sempre visível. Resultado negativo não usa vermelho: o sinal `−` e o texto do tooltip carregam a informação (vermelho é reservado a estouro, erro e saldo negativo).
- **Taxa de poupança:** linha de 2 px (slot 1), eixo em `%`, linha de referência em 0%; meses sem receita (`null`) quebram a linha em vez de virar zero.
- **Sobra acumulada:** área (slot 1, 15% sumindo para 0) com a linha de zero; pode ficar negativa.
- Cada gráfico tem título, escala própria e resumo para leitor de tela; tooltip com o mês, o valor e, no de resultado, também receitas, despesas e taxa. Mês em andamento marcado em texto. Eixo X abreviado.

**5. Tela.**
- Três números: "Resultado do período" (com sinal, vermelho só se negativo), "Taxa de poupança" (percentual do período, "—" quando não há receita) e "Meses com sobra" ("7 de 10 meses fechados").
- Os três gráficos empilhados no celular e, no computador, resultado em largura cheia e os outros dois lado a lado.
- Tabela ("Ver em tabela"): mês, receitas, despesas, resultado, taxa e sobra acumulada, com linha de total do período; mês em andamento marcado.
- Estados carregando, vazio ("Ainda não há transações neste período" + "Mudar período") e erro; "Ocultar valores" mascara os valores em reais, remove os eixos de valores e mantém os percentuais.

## Risks / Trade-offs

- [Taxa de poupança confunde com rendimento] → O rótulo é "Taxa de poupança" com a explicação "resultado ÷ receitas do mês"; investimentos e saldo não entram.
- [Mês em andamento distorce a taxa] → Marcado como em andamento e fora da contagem de meses com sobra.
- [Receita irregular deixa a taxa mensal instável] → A taxa do período (soma sobre soma) é o número de destaque; a mensal é só o detalhe.
- [Transferência mal classificada vira "resultado" falso] → Mesma regra do Início; corrigir a categoria da transferência corrige os dois.

## Open Questions

Nenhuma.
