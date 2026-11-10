## 1. API

- [x] 1.1 Acrescentar ao `DashboardService` as chamadas a `ProjectionService` e `GoalsService`, reduzindo as respostas ao resumo; `projection` nulo fora do mês atual
- [x] 1.2 Atualizar o schema e o DTO da resposta com `projection` e `goals`, mantendo os campos existentes
- [x] 1.3 Testes de integração (Testcontainers): resumo igual ao das rotas completas, mês passado sem projeção, cinco metas cortadas em três, só metas concluídas, nada previsto

## 2. Cartões do Início

- [x] 2.1 Carregar `/frontend-design:frontend-design` e `/ui-ux-pro-max`; reler o Design System (grade do Início, números de destaque, uso do vermelho, responsividade)
- [x] 2.2 Atualizar os schemas Zod de `frontend/src/lib/api/dashboard.ts`
- [x] 2.3 Cartão "Projeção do fim do mês": saldo projetado, aviso de saldo negativo (ícone e texto), link para o Planejamento, estado vazio "Planeje o mês"
- [x] 2.4 Cartão "Metas": até 3 linhas com barra e situação (ícone e texto), link para Metas, estado vazio "Criar meta"
- [x] 2.5 Posicionar na grade do Início (1, 2 e 12 colunas) e no skeleton de carregamento; "Ocultar valores"
- [x] 2.6 Testes de componente: aviso de negativo com ícone e texto, sem vermelho quando positivo, cartão ausente com `projection` nulo, estados vazios, situação de meta atrasada

## 3. Conferência visual

- [x] 3.1 Conferir o Início em 320, 390, 768, 1024 e 1440 px, nos dois temas, sem rolagem horizontal
- [x] 3.2 Revisar com `/ui-ux-pro-max`

## 4. Documentação

- [x] 4.1 Atualizar o endpoint `GET /dashboard` em `docs/03-arquitetura.md` e a linha do Início da v2 em `docs/01-produto.md`
- [x] 4.2 Marcar o item "resumo de metas e projeção no Início" em `docs/07-roadmap.md`
