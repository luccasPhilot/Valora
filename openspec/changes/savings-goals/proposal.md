## Why

Orçamento controla o gasto do mês; falta um lugar para o que você quer juntar: a reserva de emergência, a viagem, a entrada do apartamento. Metas dão um objetivo visível, o progresso e uma estimativa honesta de quando você chega lá, no ritmo em que está guardando.

## What Changes

- Cria a tabela `goals` e a tabela `goal_contributions` (nova, com os aportes e retiradas que alimentam o ritmo).
- Cria o CRUD de metas: nome, ícone Lucide, valor desejado, prazo opcional e valor já acumulado na criação.
- Registra o valor acumulado **à mão**, por **aportes** e **retiradas** com data. O valor acumulado da meta é a soma deles.
- Calcula, em centavos e sem IA:
  - **progresso** (percentual do valor desejado, limitado a 100%);
  - **ritmo de aporte**: média mensal líquida dos últimos 90 dias;
  - **prazo estimado**: quantos meses faltam nesse ritmo;
  - **situação** frente ao prazo informado: no ritmo, atrasada ou sem ritmo.
- Cria `GET /api/v1/goals` e as rotas de criar, editar, excluir meta e de registrar e remover aportes.
- Cria a tela **Metas** (`/metas`), com cartões de progresso, painel de detalhe com histórico de aportes e a ação "Registrar aporte". A área entra no menu lateral.

Itens do roadmap cobertos (Fase 2):
- **Metas** (`goals`): nome, ícone, valor desejado, valor acumulado informado à mão, progresso, prazo estimado pelo ritmo de aporte.

**Ajuste ao modelo de dados, a confirmar:** `docs/04-modelo-de-dados.md` prevê só `saved_cents` na meta. O prazo "pelo ritmo de aporte" precisa saber **quando** cada valor entrou, então esta change adiciona o histórico em `goal_contributions` e mantém `saved_cents` como a soma dele. As colunas `linked_account_id` e `linked_investment_id` são da v3 e **não** são criadas agora.

## Capabilities

### New Capabilities

- `savings-goals`: metas, aportes e retiradas, progresso, ritmo, prazo estimado e a tela de Metas.

### Modified Capabilities

Nenhuma.

## Impact

- **Banco:** tabelas `goals` e `goal_contributions` (migration), documentadas em `docs/04-modelo-de-dados.md`.
- **Código novo:** `backend/src/modules/goals/` e `frontend/src/features/goals/`.
- **Código alterado:** `frontend/src/lib/areas.ts` e as rotas (nova área "Metas").
- **API:** `GET/POST /api/v1/goals`, `PUT/DELETE /api/v1/goals/:id`, `POST /api/v1/goals/:id/contributions`, `DELETE /api/v1/goals/:id/contributions/:contributionId`.
- **Reutiliza:** `MoneyInput`, o seletor de ícones de categorias (`category-icons`), `Progress` e os padrões de painel.
- **Depende de:** `web-shell` e `value-formatting`. Não depende de faturas nem previsões.
- **Alimenta:** `home-planning-summary`.

## Fora do escopo

- Meta vinculada a investimento ou conta, com valor automático (v3).
- Lembrete ou aporte automático: o app é só leitura e não movimenta dinheiro.
- Transformar o aporte em transação ou em previsão.
- Metas compartilhadas ou em mais de uma moeda.
- Itens da seção "Fora do escopo" de `docs/01-produto.md`: nenhum é tocado.
