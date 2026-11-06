## 1. Regras

- [ ] 1.1 `goalProgress(saved, target)` em inteiros, com testes: 0%, 50%, 99% com R$ 0,01 faltando, acima de 100%
- [ ] 1.2 `estimateGoalPace(goal, contributions, today)`: janela de 90 dias, janela mínima de 30 para meta nova, valor inicial fora, retiradas, ritmo zero, teto de 600 meses
- [ ] 1.3 `goalStatus(...)`: `completed`, `no_pace`, `on_track`, `behind`, prazo vencido, valor mensal necessário; testes de cada situação e dos limites do prazo

## 2. Banco

- [ ] 2.1 Tabelas `goals` e `goal_contributions` no Drizzle e migration (`ON DELETE CASCADE`; `amount_cents` diferente de zero; índice (`goal_id`, `date`))
- [ ] 2.2 Repository de metas e de aportes

## 3. API

- [ ] 3.1 Schemas Zod: meta (nome, ícone, valor desejado > 0, prazo opcional) e aporte (valor, tipo, data até hoje)
- [ ] 3.2 `GET/POST /goals` e `PUT/DELETE /goals/:id`, com a criação do aporte `initial`
- [ ] 3.3 `POST /goals/:id/contributions` e `DELETE /goals/:id/contributions/:contributionId`, atualizando `saved_cents` na mesma transação; recusar retirada que zera abaixo de zero
- [ ] 3.4 `GET /goals/:id/contributions` paginado
- [ ] 3.5 Testes de integração (Testcontainers): meta com valor inicial, aporte e retirada, retirada acima do acumulado, remover aporte, excluir meta apaga aportes, ordem da lista

## 4. Tela de Metas

- [ ] 4.1 Carregar `/frontend-design:frontend-design` e `/ui-ux-pro-max`; reler o Design System (barra de progresso, cores, painéis, responsividade)
- [ ] 4.2 Schemas Zod em `frontend/src/lib/api/`, consultas e mutações do TanStack Query
- [ ] 4.3 Nova área "Metas" em `areas.ts`, rota `/metas` e item no menu
- [ ] 4.4 Cartões de meta com ícone, barra, valores e linha de situação (ícone e texto)
- [ ] 4.5 Formulário de meta (nome, ícone, valor, prazo, valor inicial) e painel de detalhe com histórico, "Registrar aporte" e "Registrar retirada"
- [ ] 4.6 Excluir meta e remover aporte com confirmação
- [ ] 4.7 Estados carregando, vazio e erro; "Ocultar valores"
- [ ] 4.8 Testes de componente: textos de cada situação, cor nunca sozinha, estado vazio, meta concluída no fim

## 5. Conferência visual

- [ ] 5.1 Conferir em 320, 390, 768, 1024 e 1440 px, nos dois temas, sem rolagem horizontal
- [ ] 5.2 Revisar com `/ui-ux-pro-max`

## 6. Documentação

- [ ] 6.1 Documentar `goals` (sem as colunas da v3) e `goal_contributions` em `docs/04-modelo-de-dados.md`
- [ ] 6.2 Registrar os endpoints e a decisão do histórico de aportes em `docs/03-arquitetura.md`
- [ ] 6.3 Descrever as regras de ritmo e prazo em `docs/01-produto.md` e marcar o item "Metas" em `docs/07-roadmap.md`
