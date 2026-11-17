## 1. Regra compartilhada de assinatura

- [x] 1.1 Extrair de `detectSubscriptions` a função `findActiveSubscriptions(rows, today)` (devolve a cobrança mais recente, a quantidade de cobranças e o valor de cada assinatura ativa); `detectSubscriptions` passa a chamá-la e só converte em `AlertSituation`
- [x] 1.2 Mover `PATTERN_LOOKBACK_MONTHS` de `alert-evaluator.ts` para o módulo dos detectores, para o alerta e a análise usarem a mesma janela de 7 meses
- [x] 1.3 Testes: os testes atuais do detector continuam passando sem alteração; novos testes de `findActiveSubscriptions` (três cobranças mensais, só duas, intervalo irregular, valor que muda, assinatura encerrada, quarta cobrança, parcela, Pix para pessoa, valor abaixo de R$ 5,00)

## 2. Cálculo e API da análise

- [x] 2.1 Cálculos puros em `category-insights-calculations.ts` com constantes nomeadas (`SURGE_MIN_VARIATION_PERCENT`, `SURGE_MIN_DIFFERENCE_CENTS`, `UNCATEGORIZED_ALERT_PERCENT`, `MAX_LISTED_CHANGES`): tabela de diferenças (união das categorias do mês e do período de comparação), variação em uma casa decimal (nula sem base), percentual do total, ordem com desempate pelo nome, `monthlyCents` alinhado a `months`, média dos meses anteriores e maior mês
- [x] 2.2 Testes dos cálculos, incluindo fronteiras: 29,9% e 30%; R$ 49,99 e R$ 50,00; 9,9% e 10%; categoria que zerou em "Caíram"; categoria nova em "Subiram" e fora de `category_surge`; estorno que deixa a categoria em zero; empate no ranking; média sem meses anteriores
- [x] 2.3 `CategoryInsightsService.analyze(query)`: validar `month` (formato e não futuro), janela de 6 meses cortada na primeira transação, período de comparação (mês anterior inteiro, ou o trecho do dia 1 até hoje no mês em andamento, limitado ao último dia do mês anterior), limites de orçamento com `budgetStatus` e `budgetPercent`, cobranças recorrentes com `findActiveSubscriptions`, totais por mês e por ano
- [x] 2.4 Rota `GET /api/v1/category-insights` com schema Zod de saída (DTO, centavos inteiros, erro padrão `VALIDATION_ERROR` com `month` em `details`) e registro em `app.ts`
- [x] 2.5 Testes de serviço com repositórios simulados: mês encerrado, mês em andamento, dia 31 sobre mês de 30 dias, sem gasto no mês anterior, mês sem gasto, histórico curto, `month` futuro e mal formado
- [x] 2.6 Testes de integração (Testcontainers): total igual ao de `/relatorios/categorias` do mesmo mês, transferência fora, estorno, despesa sem categoria como "Sem categoria", entrada sem categoria fora, lançamento manual e pendente dentro, categoria arquivada com gasto, orçamento com status, assinatura detectada igual à do alerta; rota com `app.inject()` (200 e 400)

## 3. Contrato e dados no front

- [x] 3.1 Schemas Zod e `getCategoryInsights(month)` em `frontend/src/lib/api/category-insights.ts` (cópia do contrato do backend) e o hook `useCategoryInsights(month)` com `placeholderData`
- [x] 3.2 Funções puras de apresentação em `analysis-labels.ts` (rótulo da variação com "Novo", frase do trecho comparado, texto de cada ponto de atenção, resumo para leitor de tela) e o link das transações da categoria no mês, reaproveitando `categoryTransactionsPath`
- [x] 3.3 Testes: schemas aceitam a resposta real e recusam campo faltando; rótulos (alta, queda, zero, nulo, "Novo", mês em andamento e encerrado); link com o período do mês inteiro e "Sem categoria"

## 4. Tela Categorias (análise)

- [x] 4.1 Carregar `/frontend-design:frontend-design` e `/ui-ux-pro-max`; reler o Design System (gastos por categoria, cores de status, paleta de gráficos, tabelas, responsividade, densidade no computador e painéis com rolagem única)
- [x] 4.2 Área "Categorias" (`/categorias`) no grupo "Dia a dia" depois de Orçamentos (`areas.ts`, `router.tsx`, `analysis-page.tsx`); gestão movida para `/categorias-e-regras` no rodapé; seletor de mês de Orçamentos com `?month=` na URL (inválido ou futuro cai no mês atual)
- [x] 4.3 `spending-hero.tsx`: total com `−`, variação com seta e texto (nunca vermelho), trecho comparado, categoria de maior gasto, e a mensagem de "sem mês anterior para comparar"
- [x] 4.4 `attention-list.tsx`: pontos de atenção com ícone e texto, que abrem o detalhe ou as transações sem categoria; seção omitida sem pontos
- [x] 4.5 `category-spending-list.tsx`: todas as categorias, barra numa cor só, variação, selo de orçamento (`budget-status-badge.tsx`) e mini-gráfico de tendência (`category-trend-sparkline.tsx`, só com 2 ou mais pontos, resumo para leitor de tela); sem rolagem própria; linha inteira é botão de 44 px que abre o detalhe
- [x] 4.6 `changes-card.tsx`: barras divergentes em "Subiram" e "Caíram", cor única, mensagem de "nenhuma categoria mudou", omitido sem mês anterior
- [x] 4.7 `recurring-card.tsx`: total por mês e por ano em destaque, lista das cobranças, nota sobre "hoje" e sobre o mesmo valor, estado vazio
- [x] 4.8 `category-detail-panel.tsx` e `category-history-chart.tsx` em `FormPanel`: gasto e variação, colunas dos meses (slot 1, mês escolhido em cor cheia, mês em andamento com hachura e "em andamento", tabela para leitor de tela), média, maior mês, orçamento, "Ver transações"; rolagem única e foco de volta à linha ao fechar
- [x] 4.9 Estados de `analysis-tab.tsx`: carregando (skeleton nos formatos dos cartões), vazio ("Nenhum gasto neste mês", com o seletor visível) e erro ("Tentar de novo"); "Ocultar valores" (valores mascarados, percentuais visíveis, eixo de valor some)
- [x] 4.10 Testes de componente: ordem das seções, todas as categorias sem "Outros", "Novo", seta e texto na variação, vermelho só em orçamento estourado, mini-gráfico oculto com 1 mês, abrir e fechar o detalhe com Esc, vazio com seletor, erro com "Tentar de novo", valores ocultos, menu e endereços (`areas.test.ts`); conferir que `npm run check:tokens` não acha cor em hex

## 5. Conferência visual

- [x] 5.1 Conferir a tela e o detalhe em 320, 390, 768, 1024 e 1440 px (e num monitor largo), nos dois temas, sem rolagem horizontal da página, com nomes longos de categoria e 15 ou mais categorias
- [x] 5.2 Conferir o mês em andamento, um mês encerrado, um mês sem gasto, uma categoria que zerou e uma nova, "Sem categoria" alta, orçamento estourado e "Ocultar valores"
- [ ] 5.3 Revisar com `/ui-ux-pro-max` e `/impeccable`, conferindo que não há rosca, treemap nem cor por categoria e que toda informação em cor também está em ícone e texto

## 6. Documentação e fechamento

- [x] 6.1 `docs/01-produto.md`: tela "Categorias" (análise) (o que mostra, comparação do trecho, pontos de atenção e seus limites, cobranças recorrentes) e a linha do que está em cada tela
- [x] 6.2 `docs/03-arquitetura.md`: endpoint `GET /api/v1/category-insights` e, na tabela "Decisões", a regra de assinatura compartilhada entre o alerta e a análise
- [x] 6.3 `docs/06-design-system.md`: o item "Categorias" no menu e a tela, os cartões, as formas de gráfico e as regras de cor (variação para cima nunca vermelha) e o detalhe da categoria; recalcular o contraste se algum token mudar
- [x] 6.4 `docs/07-roadmap.md`: item novo "Análise de categorias do mês" em Relatórios (Fase 3) já marcado `[x]`; `CLAUDE.md`: atualizar a descrição da tela de categorias se necessário
- [x] 6.5 Rodar `typecheck`, `lint`, `format:check` e `test` no backend e no frontend (com o Docker ligado para os testes de integração) e `openspec validate add-category-insights`
