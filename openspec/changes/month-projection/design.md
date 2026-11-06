## Context

O saldo total já tem uma definição única (`calculateAccountTotals`): contas corrente e poupança não ocultas, sem cartão e sem "Dinheiro". As ocorrências previstas vêm de `planned-entries` e as faturas de `credit-card-bills`. Esta change só combina as três fontes; não cria tabelas.

## Goals / Non-Goals

**Goals:**
- Uma conta simples e explicável, igual no Planejamento e no Início.
- Nenhuma saída contada duas vezes.
- Mostrar o ponto mais baixo do mês, não só o saldo final.

**Non-Goals:**
- Estimar gastos variáveis ou meses futuros.

## Decisions

**1. A conta.**

`saldo projetado = saldo de hoje + receitas previstas pendentes − despesas previstas pendentes − faturas em aberto que vencem de hoje até o último dia do mês`

- **Saldo de hoje:** o `totalBalanceCents` de Contas (mesma função).
- **Previstas pendentes:** ocorrências do mês atual com situação `pending`. Realizadas (com ou sem vínculo) e puladas ficam de fora: o dinheiro delas já está no saldo, ou não vai acontecer.
- **Pendente com data já passada** entra, no dia de hoje: se não foi realizada nem pulada, ainda pode acontecer. A tela marca essas ocorrências como "Atrasada" para você resolver. *Alternativa:* ignorar atrasadas. Descartada: esconderia um gasto provável.
- **Faturas:** a parte não paga (`total_cents − paid_cents`, mínimo zero) de cada fatura com situação `open` ou `overdue` cujo vencimento cai até o fim do mês. Fatura vencida entra em hoje. Faturas dos cartões ocultos ficam de fora, como no saldo.
- **Pagamento da fatura já feito** está no saldo de hoje e na `paid_cents`; por isso só a parte não paga entra.
- **Cartão sem faturas gravadas:** usa a fatura atual do fallback de `credit-card-bills`, se tiver vencimento (real ou estimado) no mês; sem vencimento, não entra e a tela avisa "Fatura do cartão X sem vencimento informado".

**2. Linha do tempo dia a dia.**
- Eventos: cada ocorrência pendente (na data prevista, ou hoje se atrasada) e cada fatura (no vencimento, ou hoje se vencida).
- A série diária começa em hoje com o saldo atual e aplica os eventos de cada dia. `lowestBalanceCents` e `lowestBalanceDate` vêm dessa série.
- Receita antes da despesa no mesmo dia seria otimista: no mesmo dia, as **despesas vêm primeiro**. A convenção é conservadora e fica registrada nos testes.

**3. Função pura `projectEndOfMonth(input)`.**
- Entrada: `today`, `balanceCents`, ocorrências pendentes, faturas não pagas. Saída: totais, série diária, eventos e ponto mais baixo.
- O service busca os dados nas fontes e chama a função. O fuso é o de São Paulo.

**4. API.**
- `GET /projection` sem parâmetros (só o mês atual). Resposta: `date`, `startBalanceCents`, `plannedIncomeCents`, `plannedExpenseCents`, `billsDueCents`, `projectedBalanceCents`, `lowestBalanceCents`, `lowestBalanceDate`, `daily` (série), `events` (tipo `planned_income`, `planned_expense` ou `bill`, data, descrição, valor, `isOverdue`) e `warnings` (textos de dados faltando).
- O `ProjectionService` chama os services de contas, previsões e faturas; não reescreve nenhuma regra delas.
- Listas pequenas e limitadas ao mês: sem paginação, exceção consciente a registrar nas Decisões.

**5. Tela.**
- Bloco no topo da tela de Planejamento: saldo projetado em destaque (usando os rótulos e números de destaque do guia visual), três linhas de composição (hoje, previstas, faturas) e o gráfico de linha em Recharts, primeira cor da paleta de gráficos, com marcador no ponto mais baixo. Texto nunca na cor da série.
- Saldo negativo no ponto mais baixo ou no fim usa `destructive` com ícone e texto ("Saldo negativo em 20/11"). Esse é um dos usos permitidos do vermelho.
- Texto fixo: "Considera só o que está previsto e as faturas. Gastos do dia a dia não entram."
- Todos os gráficos têm a opção de ver em tabela quando fizer sentido (os relatórios da v3 exigem; aqui o gráfico traz uma tabela de eventos ao lado).

## Risks / Trade-offs

- [Projeção otimista por não prever gastos variáveis] → O texto fixo e o nome "projeção do que está previsto" deixam isso claro; a média histórica é uma ideia para depois, se fizer falta.
- [Previsões esquecidas distorcem o número] → A marcação "Atrasada" e a lista de pendentes da tela puxam a decisão.
- [Hoje, no banco de desenvolvimento, um dos três cartões tem fatura de R$ 859,73 e nenhum vencimento] → Sem as faturas do Pluggy, a projeção não inclui esse cartão e mostra o aviso; ele só entra quando o vencimento (real ou estimado) existir. Vencimento **estimado** entra na conta e vem marcado como estimado.
- [Fatura com `paid_cents` desatualizado] → Pode superestimar a saída por até um dia, até a próxima sincronização; aceito.

## Open Questions

- O ajuste de "parcelas" para "faturas" no roadmap (veja a proposta): a aprovação é do usuário.
