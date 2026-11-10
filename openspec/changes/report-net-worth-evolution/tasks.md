## 1. Relatório de patrimônio

- [ ] 1.1 Carregar `/frontend-design:frontend-design` e `/ui-ux-pro-max`; reler o Design System (gráficos, paleta, composição com valores negativos, tabelas, responsividade)
- [ ] 1.2 Reaproveitar os schemas e a consulta de `frontend/src/lib/api/net-worth.ts` com `from`/`to` vindos do período do relatório; "Patrimônio" em `report-definitions.ts` e a rota `patrimonio`
- [ ] 1.3 Funções de apresentação com testes: variação no período (reais e percentual, base zero, menos de 2 pontos) e parte em investimentos (soma zero)
- [ ] 1.4 Três números do topo (patrimônio hoje, variação no período com ícone e "desde", em investimentos)
- [ ] 1.5 Gráfico de área do patrimônio total e gráfico de colunas de composição (slots 1, 2 e 3 em ordem, fatura abaixo do zero, legenda, tooltip com as cifras e o patrimônio), só com 2 ou mais pontos; resumos para leitor de tela e mês em andamento em texto
- [ ] 1.6 Estado de histórico curto ("O histórico começa em …"), tabela com `ReportTable` (sem linha de total) e a nota da fórmula, dos bancos arquivados e do cartão
- [ ] 1.7 Estados carregando, vazio ("Ver contas") e erro; "Ocultar valores" (eixos somem, percentuais ficam)
- [ ] 1.8 Link "Ver relatório completo" no cartão de patrimônio da tela Investimentos
- [ ] 1.9 Testes de componente: variação e percentual, composição com fatura abaixo do zero, histórico curto sem gráficos, tabela, período, vazio, valores ocultos, link do cartão; teste de que o ponto do mês atual do relatório é igual ao do cartão

## 2. Conferência visual

- [ ] 2.1 Conferir em 320, 390, 768, 1024 e 1440 px, nos dois temas, sem rolagem horizontal da página (inclusive 24 meses e R$ 1.234.567,89)
- [ ] 2.2 Revisar com `/ui-ux-pro-max`

## 3. Documentação

- [ ] 3.1 `docs/01-produto.md`: relatório de patrimônio (composição, variação no período, o que não entra)
- [ ] 3.2 `docs/06-design-system.md`: gráfico de composição com valores negativos; `docs/07-roadmap.md`: marcar "Evolução do patrimônio" nos relatórios e o item "Relatórios" inteiro; conferir os dois critérios de "Pronto quando" da Fase 3
