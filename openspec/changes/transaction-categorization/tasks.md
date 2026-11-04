## 1. Banco e seed

- [ ] 1.1 Migration: coluna `categories.seed_key` (única, pode ser nula)
- [ ] 1.2 Obter a lista de categorias do Pluggy (pelo script de fixtures) e escrever `seed/pluggy-category-map.ts`
- [ ] 1.3 Seed idempotente das categorias padrão (com `seed_key`) e do mapeamento inicial, rodando depois das migrations
- [ ] 1.4 Teste de integração: seed duas vezes não duplica; categoria renomeada ou arquivada não é recriada

## 2. Regras de decisão

- [ ] 2.1 Implementar `decideCategory` (função pura): usuário → regra (maior prioridade, empate pela mais recente) → Pluggy → sem categoria
- [ ] 2.2 Normalizar o padrão da regra com `normalizeDescription` antes de comparar
- [ ] 2.3 Testes unitários: `contains`, `starts_with`, `equals`, padrão com acento, prioridade, empate, regra vence Pluggy, usuário vence regra, sem mapeamento → sem categoria

## 3. Service

- [ ] 3.1 `categorizeConnection(connectionId)` em lote, chamado pelo `SyncService` ao final de cada item
- [ ] 3.2 Reaplicação ao histórico ao criar ou alterar regra (lotes de 1.000, só `category_source` diferente de `user`)
- [ ] 3.3 `learnFromCorrection(transactionId, categoryId)`: regra `equals` com a descrição normalizada, atualiza a regra se já existir, aplica ao histórico
- [ ] 3.4 Recategorização completa das transações já sincronizadas na primeira subida desta change
- [ ] 3.5 Testes de integração: sincronização categoriza as novas; regra nova muda o histórico sem tocar em `user`; aprender com correção cria e depois atualiza a mesma regra

## 4. API

- [ ] 4.1 Categorias: `GET`, `POST`, `PUT`, `POST /:id/archive` (409 `CATEGORY_NAME_TAKEN`; 409 `CATEGORY_IN_USE` ao mudar o tipo de categoria com transações)
- [ ] 4.2 Regras: `GET`, `POST`, `PUT`, `DELETE`
- [ ] 4.3 Mapeamentos: `GET` e `PUT /:pluggyCategory`
- [ ] 4.4 Schemas Zod e DTOs de saída no backend; schemas das respostas no frontend
- [ ] 4.5 Testes de rota para validação, conflitos e arquivamento

## 5. Tela "Categorias e regras"

- [ ] 5.1 Carregar `/frontend-design:frontend-design` e `/ui-ux-pro-max`; reler o Design System
- [ ] 5.2 Aba Categorias: lista por tipo com ícone, criar, editar, arquivar, escolha de ícone Lucide
- [ ] 5.3 Aba Regras: lista com padrão, comparação, categoria e prioridade; criar, editar, excluir
- [ ] 5.4 Aba Pluggy: categorias do Pluggy com a categoria do Valora escolhida
- [ ] 5.5 Estados carregando, vazio e erro nas três abas; nota curta sobre "Saque" e transferências
- [ ] 5.6 Conferir em 320, 390, 768, 1024 e 1440 px, nos dois temas, sem rolagem horizontal

## 6. Documentação

- [ ] 6.1 Registrar `seed_key` e as categorias padrão em `docs/04-modelo-de-dados.md`
- [ ] 6.2 Acrescentar "Aplicação e resgate" à lista de categorias padrão do roadmap
- [ ] 6.3 Marcar como `[x]` os itens de "Categorias" da Fase 1 em `docs/07-roadmap.md`, exceto "Aplicar sempre" (fica com `transactions-screen`)
