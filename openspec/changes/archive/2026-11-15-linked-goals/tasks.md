## 1. Regras

- [x] 1.1 Extrair `estimateFromRate(remaining, rate, today)` de `estimateGoalPace` (`goal-pace.ts`) sem mudar comportamento; os testes atuais de ritmo continuam passando
- [x] 1.2 `estimateLinkedPace` em `goal-linked-pace.ts`: variação por item desde a primeira foto na janela, janela de 30 a 90 dias, piso zero, só foto de hoje, item novo; testes de cada caso e dos limites (30 e 90 dias)
- [x] 1.3 `linkedSavedCents(items)`: soma dos itens de bancos ativos com piso em zero e item arquivado contando zero; testes

## 2. Banco

- [x] 2.1 Tabela `goal_links` no Drizzle e migration (`CHECK` de exclusividade, índices únicos parciais por item, índice em `goal_id`, cascatas)
- [x] 2.2 `GoalsRepository`: ler e gravar vínculos (numa transação com a meta), saldos atuais dos itens vinculados (com banco arquivado e nome da instituição) e fotos da janela de 90 dias em consultas únicas, sem N+1
- [x] 2.3 Testes de integração do schema: vínculo duplo recusado, vínculo vazio recusado, item repetido na meta recusado, mesmo item em duas metas aceito, excluir a meta apaga só os vínculos

## 3. API

- [x] 3.1 Schemas Zod: `links` (até 10, `type` e `id`) em criar e editar; `initialCents` com `links` recusado
- [x] 3.2 `GoalsService`: validar vínculos (tipo de conta, banco ativo, existência, repetição), montar `isLinked`, `links`, `manualSavedCents` e o `savedCents` calculado, e usar o ritmo vinculado; `PUT` com `links` ausente mantém e `[]` desvincula
- [x] 3.3 Recusar `POST` e `DELETE` de aportes em meta vinculada com 409 `GOAL_IS_LINKED`
- [x] 3.4 Testes de integração: soma de dois itens, atualiza com a sincronização, cartão e "Dinheiro" recusados, banco arquivado conta zero, saldo negativo, desvincular volta ao manual, aportes antigos preservados, 409 de aporte, ritmo pela variação das fotos, ordem da lista com meta vinculada, Início continua mostrando o valor calculado

## 4. Tela de Metas

- [x] 4.1 Carregar `/frontend-design:frontend-design` e `/ui-ux-pro-max`; reler o Design System (formulários, controle segmentado, estados, responsividade)
- [x] 4.2 Schemas Zod em `frontend/src/lib/api/goals.ts` (`isLinked`, `links`, `manualSavedCents`, envio de `links`)
- [x] 4.3 `link-picker.tsx`: lista com caixas de seleção de contas e investimentos (de `GET /accounts` e `GET /investments`), soma atual, limite de 10 e aviso de item em outra meta
- [x] 4.4 Formulário de meta com "Eu informo" / "Vinculada", valor inicial escondido, avisos ao vincular e ao desvincular
- [x] 4.5 Selo "Vinculada" no cartão; painel com itens vinculados, aviso de banco arquivado, sem "Registrar aporte" e "Registrar retirada", e os textos do valor automático e do ritmo
- [x] 4.6 Estados carregando, vazio e erro da lista de itens; "Ocultar valores"
- [x] 4.7 Testes de componente: escolher itens e somar, valor inicial escondido, avisos, painel sem aportes, item arquivado em ícone e texto, valores ocultos

## 5. Conferência visual

- [x] 5.1 Conferir em 320, 390, 768, 1024 e 1440 px, nos dois temas, sem rolagem horizontal (inclusive nomes longos e 10 itens marcados)
- [x] 5.2 Revisar com `/ui-ux-pro-max`

## 6. Documentação

- [x] 6.1 `docs/04-modelo-de-dados.md`: tabela `goal_links` e remover o parágrafo das colunas `linked_account_id` e `linked_investment_id`
- [x] 6.2 `docs/03-arquitetura.md`: campos novos de `GET /goals`, `links` em `POST/PUT`, o 409 `GOAL_IS_LINKED` e a decisão (vínculo em tabela, valor calculado na leitura, aportes preservados)
- [x] 6.3 `docs/01-produto.md`: regras da meta vinculada na seção "Metas"; `docs/06-design-system.md`: selo e painel de meta vinculada; `docs/07-roadmap.md`: marcar o item "Metas vinculadas"
