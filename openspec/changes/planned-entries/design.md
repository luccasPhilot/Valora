## Context

`docs/04-modelo-de-dados.md` já descreve `planned_entries` (valor com sinal, dia do mês, repetição, mês de início e fim, ativa) e deixa em aberto como ligar uma previsão a uma transação real. O lançamento manual já tem as regras de categoria por tipo, o `MoneyInput` e o painel de formulário que esta tela reaproveita.

## Goals / Non-Goals

**Goals:**
- Uma previsão recorrente gerar uma ocorrência por mês sem gravar uma linha por mês.
- Realizar uma ocorrência sem nunca juntar nada sozinho.
- Mês futuro e mês passado mostrarem o mesmo cálculo.

**Non-Goals:**
- Projeção do saldo e alertas.

## Decisions

**1. Ocorrências são calculadas; só a decisão do usuário é gravada.**
- Uma previsão `monthly` vale em todo mês entre `start_month` e `end_month` (inclusive; nulo = sem fim). `yearly` vale no mesmo mês de `start_month` a cada ano. `none` vale só em `start_month`.
- O dia previsto é `day_of_month`, limitado ao último dia do mês (dia 31 em fevereiro cai no 28 ou 29). Função pura `expandOccurrences(entry, month)`.
- A tabela `planned_entry_occurrences` guarda só o que o usuário decidiu: (`planned_entry_id`, `month`) como chave primária, `status` (`realized` ou `skipped`), `transaction_id` (opcional, `ON DELETE SET NULL`) e `decided_at`. Sem linha, a ocorrência está `pending`.
- *Alternativa:* gerar uma linha por mês adiantado. Descartada: exige rotina de geração e deixa lixo quando a previsão muda.

**2. Mexer na previsão mexe nos meses seguintes, não nos decididos.**
- Editar valor, dia ou categoria vale para todas as ocorrências, inclusive as já realizadas (a transação real é a fonte do que aconteceu). A tela deixa claro que o ajuste vale para todos os meses.
- Para mudar só de agora em diante, o caminho é encerrar a previsão (`end_month`) e criar outra. O texto do formulário diz isso.
- `DELETE` remove a previsão e suas decisões (`ON DELETE CASCADE`). `is_active = false` pausa sem apagar: ocorrências de previsão pausada não aparecem nem entram na projeção.

**3. Sugestão de transação para vincular.**
- Candidata: transação do mesmo mês da ocorrência, mesmo sinal da previsão, categoria igual à da previsão **ou** valor dentro de ±20% do previsto, e data a até 7 dias do dia previsto; ainda não vinculada a outra ocorrência.
- Ordenada por proximidade de valor e depois de data; devolve até 5.
- Função pura `rankMatchCandidates`. Nenhuma ligação é feita sozinha: a API só grava o vínculo quando você pede.
- Uma transação só vincula a uma ocorrência (índice único em `transaction_id` onde não é nulo).

**4. Valores e categoria.**
- `amount_cents` com sinal (negativo = despesa), como no resto do app; o formulário pede tipo (receita ou despesa) e valor positivo e converte.
- Categoria obrigatória, ativa, do tipo `income` ou `expense` conforme o sinal. Categoria `transfer` é recusada.

**5. Realizar sem vincular.**
- `status = 'realized'` com `transaction_id` nulo. A projeção trata como feita (o dinheiro já está no saldo).

**6. API.**
- `GET /planned-entries?month=AAAA-MM` devolve as ocorrências do mês (e os totais previstos por situação) em uma lista só, sem paginação: o volume é de dezenas de previsões no máximo, uma exceção consciente à regra de paginar, a registrar na tabela de Decisões.
- `PUT /planned-entries/:id/occurrences/:month` com `action`: `realize` (`transactionId` opcional) ou `skip`. `DELETE` no mesmo caminho desfaz.
- Códigos de erro novos: `TRANSACTION_ALREADY_LINKED` (409) e `TRANSACTION_NOT_COMPATIBLE` (422, sinal diferente ou outro mês).

**7. Tela de Planejamento.**
- Rota `/planejamento`, ícone `CalendarClock`, no grupo "daily" do menu, depois de Orçamentos.
- Três blocos por mês: "Para acontecer" (pendentes), "Realizadas" e "Puladas", com totais previstos de receitas e despesas no topo.
- Painel adaptado ao tamanho da tela para criar e editar, reaproveitando o padrão de painel das telas existentes; "Vincular transação" abre a lista de candidatas.
- Estados carregando, vazio ("Planeje o mês") e erro; "Ocultar valores" vale aqui também.
- Previsão `monthly` ou `yearly` mostra a repetição em texto ("Todo mês, dia 5").

## Risks / Trade-offs

- [Editar uma previsão muda o histórico dos meses já realizados] → Aceito: o valor previsto é só uma estimativa e o realizado vem da transação; o aviso no formulário evita surpresa.
- [Ocorrências pendentes de meses passados ficam acumulando] → A tela do mês passado mostra o que ficou pendente com a ação "Pular"; a projeção só olha o mês atual.
- [Sugestão errada] → Nunca vincula sozinha e mostra data e valor da candidata para você conferir.

## Open Questions

- Previsão pendente com data já passada no mês atual deve entrar na projeção? Esta change só expõe a situação; a decisão é da `month-projection`, que assume que **entra** (ver o design dela).
