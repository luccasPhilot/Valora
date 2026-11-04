## 1. API de consulta

- [ ] 1.1 Schemas Zod de filtros e resposta no backend, e o schema da resposta no frontend (limite padrão 50, máximo 100, `type` em `income`, `expense`, `transfer`)
- [ ] 1.2 Repository de consulta com filtros, ordenação, paginação e a função compartilhada do filtro de tipo
- [ ] 1.3 Busca com `normalizeDescription` + `ILIKE` parametrizado, escapando `%` e `_`
- [ ] 1.4 `GET /api/v1/transactions` (mês atual por padrão, no fuso de São Paulo) e `GET /api/v1/transactions/:id`, com DTOs sem `raw`
- [ ] 1.5 Testes de integração: período padrão, cada filtro, busca sem acento, ordenação, paginação, limite acima do máximo, 404

## 2. Trocar a categoria

- [ ] 2.1 `PATCH /api/v1/transactions/:id` com `categoryId` e `applyAlways`, gravando `category_source = 'user'` e recusando categoria arquivada
- [ ] 2.2 Com `applyAlways`, chamar `learnFromCorrection`
- [ ] 2.3 Testes: correção simples sem regra; "Aplicar sempre" cria a regra e muda as outras transações; correção sobrevive a uma sincronização; categoria arquivada recusada

## 3. Tela de Transações

- [ ] 3.1 Carregar `/frontend-design:frontend-design` e `/ui-ux-pro-max`; reler o Design System (item de transação, cabeçalho de dia, filtros, responsividade)
- [ ] 3.2 Lista agrupada por dia, com cabeçalho e total do dia sem transferências, e rolagem infinita com `useInfiniteQuery`
- [ ] 3.3 Item de transação: ícone, descrição com reticências, "categoria · conta", valor com `<Money signed>`, badge de parcela, estilo de transferência, "Sem categoria"
- [ ] 3.4 Linha com colunas a partir de 1024 px
- [ ] 3.5 Filtros: período com atalhos, categoria, tipo, conta, busca com espera de 300 ms, chips removíveis, painel "Filtros" abaixo de 768 px, filtros na URL
- [ ] 3.6 Detalhe adaptado ao tamanho (`Sheet` de baixo, `Sheet` lateral, `Dialog`) com troca de categoria por `Command` e "Aplicar sempre"
- [ ] 3.7 Atualização otimista com volta em caso de erro, e aviso de confirmação
- [ ] 3.8 Estados: carregando (skeleton), vazio do período, vazio da busca com "Limpar filtros", erro
- [ ] 3.9 Testes de componente: agrupamento e total do dia, cores e sinais, valores ocultos, chips de filtro

## 4. Conferência visual

- [ ] 4.1 Conferir em 320, 390, 768, 1024 e 1440 px, nos dois temas, sem rolagem horizontal
- [ ] 4.2 Revisar com `/ui-ux-pro-max` (foco visível, áreas de toque, leitura por leitor de tela)

## 5. Documentação

- [ ] 5.1 Atualizar os endpoints em `docs/03-arquitetura.md`, se algo mudou
- [ ] 5.2 Marcar como `[x]` em `docs/07-roadmap.md` o item "Aplicar sempre" (Categorias) e os itens de Transações (Telas)
