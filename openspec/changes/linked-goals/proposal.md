## Why

Hoje o valor acumulado de uma meta é informado à mão, aporte por aporte. Quem guarda a reserva de emergência num CDB ou numa conta já tem o número exato no banco: digitá-lo de novo é trabalho e fica desatualizado. Na Fase 3 a meta passa a poder acompanhar sozinha o saldo de contas e investimentos.

## What Changes

- Uma meta pode ser **vinculada a uma ou mais contas e investimentos**. O valor acumulado dela passa a ser a **soma dos saldos atuais** dos itens vinculados (saldo inteiro, sem descontar nada) e muda sozinho a cada sincronização.
- Cria a tabela `goal_links` (um vínculo por linha: `goal_id` + uma conta **ou** um investimento) e `isLinked`, `links` e `manualSavedCents` no item de `GET /api/v1/goals`.
- `POST` e `PUT /goals` aceitam `links` (até 10 itens). Vínculo e valor inicial não convivem: criar uma meta vinculada com `initialCents` é recusado.
- Numa meta vinculada, aporte e retirada manuais são recusados (409 `GOAL_IS_LINKED`). O histórico de aportes já registrado **não é apagado**: fica guardado e volta a valer se a meta for desvinculada.
- O **ritmo** da meta vinculada vem da variação dos saldos vinculados nas fotos diárias dos últimos 90 dias (janela de 30 a 90 dias, como na meta manual), e o prazo e a situação usam a mesma conta da meta manual.
- O formulário de meta ganha a escolha "Eu informo" / "Vinculada" com a lista de contas e investimentos; o cartão e o painel da meta mostram os itens vinculados, escondem "Registrar aporte" e "Registrar retirada" e avisam quando um item é de um banco arquivado (ele deixa de contar).
- Corrige `docs/04-modelo-de-dados.md`, que previa `goals.linked_account_id` e `goals.linked_investment_id`: com vários itens por meta, o vínculo vira a tabela `goal_links`.

Itens do roadmap cobertos (Fase 3):
- **Metas vinculadas** a um investimento ou conta, que se atualizam sozinhas.

**Contradiz um documento, decidido com você:** `docs/04-modelo-de-dados.md` prevê duas colunas em `goals` (uma conta ou um investimento por meta). Você escolheu **vários itens por meta**, o que exige a tabela `goal_links`. O documento é atualizado nesta change.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `savings-goals`: cadastro com vínculos, aportes recusados em meta vinculada, valor acumulado automático, ritmo da meta vinculada e a tela.
- `database-schema`: tabela `goal_links`.

## Impact

- **Banco:** tabela `goal_links` (migration), documentada em `docs/04-modelo-de-dados.md`. Nenhuma coluna nova em `goals` e nenhum dado existente muda.
- **Código novo:** `backend/src/modules/goals/goal-linked-pace.ts`, `frontend/src/features/goals/link-picker.tsx` e o texto dos vínculos.
- **Código alterado:** `goal-pace.ts` (extrai a parte comum do prazo estimado, sem mudar comportamento), `goals.service.ts`, `goals.repository.ts`, `goals.routes.ts`; `goal-form.tsx`, `goal-card.tsx`, `goal-detail.tsx` e os schemas de `frontend/src/lib/api/goals.ts`.
- **API:** `GET/POST /api/v1/goals`, `PUT /api/v1/goals/:id`, `POST` e `DELETE` de aportes (recusa em meta vinculada). O front reaproveita `GET /accounts` e `GET /investments` para listar o que dá para vincular.
- **Depende de:** `investments-screen` (a lista de investimentos) e `savings-goals`.
- **Alimenta:** `home-planning-summary` sem mudar nada: o Início usa o valor acumulado calculado.

## Fora do escopo

- Percentual do saldo ou "só o que cresceu desde o vínculo": o valor é sempre o saldo inteiro dos itens.
- Dividir um mesmo investimento entre metas: o mesmo item pode estar em mais de uma meta e conta inteiro em cada uma (o formulário avisa).
- Vincular cartão de crédito, a conta "Dinheiro" ou investimento de banco arquivado.
- Aporte ou lembrete automático e qualquer movimentação de dinheiro: o app continua só leitura.
- Converter os aportes antigos em outra coisa ao vincular.
- Itens da seção "Fora do escopo" de `docs/01-produto.md`: nenhum é tocado.
