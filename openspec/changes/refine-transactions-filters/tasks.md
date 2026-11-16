## 1. Resumo do filtro na API

- [x] 1.1 Exportar `buildConditions` de `transactions.repository.ts` (ou movê-lo para um arquivo próprio da pasta `modules/transactions/`) sem mudar o comportamento da lista; os testes atuais da lista continuam passando
- [x] 1.2 `TransactionTotalsRepository.summarize(filters)`: `incomeCents`, `expenseCents` (positivo) e `count`, reaproveitando `buildConditions` e `transactionTypeCondition`; transferências fora de receita e despesa e dentro de `count`
- [x] 1.3 `TransactionsService.summarize` e rota `GET /transactions/summary` com a mesma validação Zod dos filtros da lista (sem `page` e `limit`), DTO de saída e erro no formato padrão; teste de rota com `app.inject()` (filtro inválido responde 400 `VALIDATION_ERROR`)
- [x] 1.4 Testes de integração (Testcontainers): resumo do mês, filtro de categoria, filtro `type=transfer` (receita e despesa zero, `count` certo), transferência fora dos totais, manual e pendente dentro, busca sem acento, e `count` igual a `pagination.total` da lista com os mesmos filtros
- [x] 1.5 Teste de integração: receita e despesa do mês atual sem outros filtros iguais a `monthIncomeCents` e `monthExpenseCents` de `GET /dashboard`

## 2. Resumo do filtro na tela

- [x] 2.1 Carregar `/frontend-design:frontend-design` e `/ui-ux-pro-max`; reler o Design System (valores financeiros, estados, responsividade) e o `DESIGN.md`
- [x] 2.2 Schema Zod e consulta do resumo em `frontend/src/lib/api/transactions.ts`, com a chave de consulta dos mesmos parâmetros dos filtros e a invalidação junto com a lista quando uma transação muda
- [x] 2.3 Linha-resumo acima da lista, abaixo dos filtros e chips: "N transações", receitas com `+` em `positive` e despesas com `−` na cor normal, via `Money` (respeita "ocultar valores")
- [x] 2.4 Estados do resumo: carregando (skeleton de uma linha), erro ("Tentar de novo", sem derrubar a lista), vazio (some) e `type=transfer` (só a contagem e a nota de que transferências não entram nos totais)
- [x] 2.5 Testes de componente: resumo com valores, categoria filtrada, `type=transfer`, valores ocultos (contagem continua), erro com a lista funcionando, sem transações

## 3. Barra de filtros enxuta

- [x] 3.1 Barra com busca, Período e botão "Filtros" sempre à vista; a partir de 768 px o botão abre um `Popover` com categoria, tipo, origem e conta; abaixo de 768 px o painel vindo de baixo continua com período e os quatro filtros
- [x] 3.2 Contagem de filtros ativos no botão ("Filtros (2)", só categoria, tipo, origem e conta) e chips dos filtros ativos mantidos (inclusive possíveis duplicatas)
- [x] 3.3 Garantir que nenhum seletor mostre texto cortado em 768, 1024 e 1440 px (largura mínima ou rótulo curto) e que o foco volte ao botão ao fechar o popover
- [x] 3.4 Atualizar os testes de `transactions-page.test.tsx` e `transaction-filters.test.ts` para o novo fluxo (abrir "Filtros", escolher categoria e tipo, contagem, remover chip, limpar filtros)

## 4. Status da sincronização

- [x] 4.1 `sync-status.tsx`: área de toque abaixo de 640 px de 40 para 44 px (`after:-inset-y-3.5`), sem mudar o visual; teste conferindo a classe ou a altura da área de toque

## 5. Conferência visual

- [x] 5.1 Conferir Transações em 320, 390, 768, 1024 e 1440 px, nos temas claro e escuro, sem rolagem horizontal: barra, popover, painel, resumo (com valores ocultos, `type=transfer` e erro) e o status da sincronização
- [x] 5.2 Revisar com `/ui-ux-pro-max` e rodar `/impeccable critique` de novo na tela para comparar com a nota 24/36

## 6. Documentação

- [x] 6.1 `docs/03-arquitetura.md`: endpoint `GET /transactions/summary` na tabela de endpoints e a decisão de reutilizar `buildConditions` e o `TransactionTotalsRepository`
- [x] 6.2 `docs/06-design-system.md`: a barra de filtros (o que fica à vista, popover no computador), a linha-resumo e a área de toque de 44 px do status da sincronização; `docs/01-produto.md`: a frase dos filtros e do resumo, se a descrição atual ficar desatualizada
- [x] 6.3 `docs/07-roadmap.md`: sem item novo a marcar (os itens de Transações já estão `[x]`); confirmar e registrar no `CHANGELOG.md` se o projeto o atualiza por change
