## Context

`goals.saved_cents` é a soma de `goal_contributions`, mantida na mesma transação de cada aporte (decisão da Fase 2). O ritmo, o prazo e a situação são funções puras sobre esse valor e os aportes (`goal-progress.ts`, `goal-pace.ts`, `goal-status.ts`). O valor de um item vinculado, ao contrário, já existe: `accounts.balance_cents`, `investments.balance_cents` e as fotos diárias.

## Goals / Non-Goals

**Goals:**
- O valor da meta vinculada nunca divergir do saldo mostrado em Contas e Investimentos.
- Reaproveitar progresso, prazo e situação sem duplicar regra.
- Não destruir o histórico manual ao vincular.

**Non-Goals:**
- Fatias de um investimento, "só o que cresceu desde o vínculo" e qualquer automação de aporte.

## Decisions

**1. Tabela `goal_links`, não colunas em `goals`.**
- Colunas: `id`, `goal_id` (`ON DELETE CASCADE`), `account_id` e `investment_id` (ambas `ON DELETE CASCADE`, só uma preenchida: `CHECK` de exclusividade), `created_at`.
- Índices únicos parciais `(goal_id, account_id)` onde `account_id` não é nulo e `(goal_id, investment_id)` onde `investment_id` não é nulo: o mesmo item não entra duas vezes na mesma meta. Índice em `goal_id`.
- *Alternativa:* duas colunas em `goals` (o que o modelo de dados previa). Descartada: você pediu vários itens por meta.

**2. Uma meta é vinculada quando tem pelo menos um vínculo. Sem coluna de modo.**
- `isLinked = links.length > 0`. Não há estado a sincronizar: apagar o último vínculo (`links: []`) devolve a meta ao modo manual.

**3. Valor acumulado = soma dos saldos dos itens ativos, calculado na leitura.**
- `savedCents = max(0, Σ saldo atual dos itens de bancos ativos)`. Saldo negativo (cheque especial) não deixa o valor abaixo de zero, como no valor manual.
- Item de **banco arquivado** continua listado (`isArchived: true`), mas conta zero: o banco saiu do Valora, e o valor dele já não aparece no saldo nem no patrimônio.
- `goals.saved_cents` **não é tocado** enquanto a meta é vinculada: continua sendo a soma dos aportes manuais. A resposta traz `manualSavedCents` (esse valor) além de `savedCents` (o que vale agora). Meta manual: os dois são iguais.
- Progresso, `remainingCents` e situação usam `savedCents` com as funções que já existem.

**4. O que dá para vincular.**
- Contas `checking` e `savings` de bancos ativos (inclusive ocultas dos totais: vincular é escolha explícita) e investimentos de bancos ativos. Cartão de crédito, "Dinheiro", itens de banco arquivado e ids inexistentes: 400 `VALIDATION_ERROR` com `links` em `details`. Até 10 itens por meta.
- `POST /goals` com `links` e `initialCents` maior que zero: 400 com `initialCents` em `details`.
- `PUT /goals/:id`: `links` ausente mantém os vínculos; `links: []` desvincula; uma lista substitui o conjunto inteiro.
- O formulário não precisa de endpoint novo: lista os itens de `GET /accounts` e `GET /investments` (que já filtram bancos arquivados e posições zeradas).

**5. Aporte e retirada manuais em meta vinculada.**
- `POST /goals/:id/contributions` e `DELETE .../contributions/:id` respondem 409 `GOAL_IS_LINKED`. Os aportes antigos ficam guardados, `GET .../contributions` continua listando, e eles voltam a contar se a meta for desvinculada.

**6. Ritmo da meta vinculada.**
- Para cada item vinculado de banco ativo, a variação é `saldo atual − primeira foto dele na janela`. A janela cobre os últimos 90 dias; `windowDays = clamp(hoje − dia da foto mais antiga usada, 30, 90)`.
- `monthlyRateCents = max(0, floor(Σ variações × 30 ÷ windowDays))`, em inteiros.
- Sem nenhuma foto antes de hoje na janela, ou variação não positiva: ritmo zero e situação "Sem ritmo ainda".
- Item que só tem a foto de hoje (acabou de aparecer) soma variação zero: o dinheiro novo não vira "ritmo" até haver histórico dele.
- A parte final (prazo, data, teto de 600 meses) sai de `estimateGoalPace` para `estimateFromRate(remaining, rate, today)`, usada pelas duas metas. É uma extração sem mudança de comportamento, protegida pelos testes que já existem.
- Aviso na tela: o ritmo mistura aporte e rendimento (a variação do saldo não separa os dois).
- *Alternativa:* inferir aportes pelas transações da conta. Descartada: é heurística frágil (Pix, transferências, rendimento).

**7. Camadas.**
- `GoalsRepository` ganha leitura e gravação dos vínculos e uma consulta, sem N+1, com o saldo atual dos itens vinculados e as fotos da janela de 90 dias (contas e investimentos). `GoalsService` valida os vínculos (tipos, banco ativo, limite) e monta o item; `goal-linked-pace.ts` é a função pura do ritmo.
- Criar ou editar a meta e gravar os vínculos acontece numa transação do banco.

**8. Tela.**
- Formulário: controle segmentado "Eu informo" / "Vinculada". Em "Vinculada", o campo de valor inicial some e aparece a lista com caixas de seleção, em dois grupos ("Contas" e "Investimentos"): nome, instituição e saldo atual, e "Soma atual: R$ X" embaixo. Aviso quando o item já está em outra meta. Ao vincular uma meta com aportes, avisa que os aportes (R$ X) deixam de contar; ao desvincular, que o valor volta a ser o dos aportes (`manualSavedCents`).
- Cartão: selo "Vinculada" com ícone `Link2` e a quantidade de itens; o resto igual.
- Painel de detalhe: seção "Itens vinculados" com o saldo de cada um (item de banco arquivado marcado "Banco removido do Valora: não conta"), no lugar de "Registrar aporte" e "Registrar retirada"; texto "O valor acompanha o saldo e muda na sincronização diária"; e a linha do ritmo explica de onde ele vem. Se houver aportes guardados, uma linha informa o valor e que não contam enquanto a meta está vinculada.
- Estados, "Ocultar valores", responsividade e cor-nunca-sozinha seguem a tela de Metas.

## Risks / Trade-offs

- [O ritmo inclui rendimento] → Aviso na tela; para metas em renda fixa o rendimento é parte do que "chega lá" mesmo.
- [Mesmo item em duas metas conta inteiro em cada uma] → Aviso no formulário; a divisão por percentual ficou fora do escopo.
- [Item vinculado desaparece (investimento resgatado e sumido do Pluggy)] → A sincronização zera a posição (change `investments-screen`), a meta cai junto e o item aparece com saldo `R$ 0,00`; dá para tirá-lo da meta.
- [Fotos curtas no começo] → Com poucos dias de histórico o ritmo é conservador (janela mínima de 30 dias) ou inexistente; a situação "Sem ritmo ainda" é honesta.

## Open Questions

Nenhuma.
