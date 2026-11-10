## Why

Planejamento, projeção e metas ficam em telas próprias, mas o Início é onde você abre o app todo dia. O roadmap da Fase 2 pede o resumo de metas e a projeção no Início, para que "como estou indo no mês" e "quanto falta para a viagem" apareçam sem precisar entrar em outra tela.

## What Changes

- O `GET /api/v1/dashboard` ganha dois blocos, calculados pelos services de `month-projection` e `savings-goals` (o `DashboardService` não reescreve nenhuma regra):
  - `projection`: o resumo da projeção do fim do mês (saldo projetado, menor saldo e a data, se há saldo negativo no caminho, e se há algo previsto). É `null` quando o mês pedido não é o atual;
  - `goals`: as até 3 metas não concluídas mais próximas do prazo, cada uma com progresso, valores e situação, mais o total de metas em andamento.
- O Início ganha dois cartões:
  - **Projeção do fim do mês**: saldo projetado em destaque, aviso de saldo negativo (ícone e texto), link "Ver planejamento"; sem nada previsto, mostra o estado vazio "Planeje o mês";
  - **Metas**: até 3 barras de progresso com a situação de cada uma e o link "Ver metas"; sem metas, mostra o estado vazio "Criar meta".
- O front atualiza o schema Zod da resposta do Início e os testes dos dois lados.

Itens do roadmap cobertos (Fase 2):
- **Resumo de metas e projeção no Início.** (O sino de alertas no topo é da change `alerts-center`.)

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `home-dashboard`: a resposta do endpoint e a tela Início ganham a projeção e o resumo de metas. Os requisitos novos são acrescentados; nenhum existente muda de comportamento.

## Impact

- **Código alterado:** `backend/src/modules/dashboard/` (service, DTO, schema da resposta) e `frontend/src/features/dashboard/` (cartões novos, grade, schemas em `frontend/src/lib/api/dashboard.ts`).
- **API:** `GET /api/v1/dashboard` (campos novos `projection` e `goals`; os existentes não mudam).
- **Banco:** nenhuma tabela nova.
- **Depende de:** `month-projection`, `savings-goals`, `home-dashboard`. Por consequência, também de `planned-entries` e `credit-card-bills`.

## Fora do escopo

- Gráfico da projeção no Início: o gráfico fica no Planejamento; o Início mostra só o número e o aviso.
- Lista de alertas no Início: o alerta tem o sino.
- Seletor de metas favoritas ou ordem personalizada.
- Projeção de meses que não sejam o atual.
- Itens da seção "Fora do escopo" de `docs/01-produto.md`: nenhum é tocado.
