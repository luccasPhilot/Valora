## 1. API

- [ ] 1.1 Schema Zod da resposta do Início no backend e o schema correspondente no frontend, que valida a resposta
- [ ] 1.2 Saldo total, evolução diária pelas fotos e variação no mês (nula sem foto anterior a hoje)
- [ ] 1.3 Receitas e despesas do mês e dos 6 meses (com zero nos meses vazios), sem transferências, com manuais e pendentes
- [ ] 1.4 Gastos por categoria: 5 maiores + "Outros", "Sem categoria" incluída, percentual do total
- [ ] 1.5 Orçamentos perto do limite (3, com `budgetStatus`) e últimas 5 transações
- [ ] 1.6 `GET /api/v1/dashboard` (mês atual por padrão)
- [ ] 1.7 Testes de integração: variação no mês, variação nula, pagamento de fatura fora, gasto em dinheiro dentro, 6 meses em ordem, mais e menos de 5 categorias, mesmos números das telas de Contas e Orçamentos

## 2. Tela Início

- [ ] 2.1 Carregar `/frontend-design:frontend-design` e `/ui-ux-pro-max`; reler o Design System (Dashboard, Gráficos, Gastos por categoria, Responsividade) e o moodboard
- [ ] 2.2 Instalar `recharts` e os componentes de gráfico do shadcn/ui
- [ ] 2.3 Card de saldo: valor em `display`, variação, gráfico de área pequeno (slot 1, preenchimento a 15%)
- [ ] 2.4 Atalhos: "Adicionar receita" e "Registrar despesa" abrem o formulário com o tipo escolhido; "Transações" e "Orçamentos" navegam
- [ ] 2.5 Receitas e despesas do mês lado a lado
- [ ] 2.6 Gráfico receitas x despesas: barras agrupadas (slots 1 e 2), legenda, eixo compacto, meses abreviados no celular, tooltip, resumo para leitor de tela
- [ ] 2.7 Lista de gastos por categoria em barras de HTML numa cor só, "Outros" em `chart-other`, toque abre Transações filtradas
- [ ] 2.8 Orçamentos perto do limite com status por ícone e texto; estado vazio com "Criar orçamento"
- [ ] 2.9 Últimas 5 transações com o item de transação e "Ver todas"
- [ ] 2.10 Grade responsiva (1, 2 e 12 colunas) com a ordem do DOM igual à do celular
- [ ] 2.11 Estados: carregando por bloco, erro, primeiro uso, vazios por bloco; valores ocultos inclusive nos tooltips
- [ ] 2.12 Recarregar o Início depois de salvar pelo formulário
- [ ] 2.13 Testes de componente: ordem dos blocos (sem saudação), atalhos abrem o formulário certo, "Outros" na lista, valores ocultos, primeiro uso

## 3. Conferência visual

- [ ] 3.1 Conferir em 320, 390, 768, 1024 e 1440 px, nos dois temas, sem rolagem horizontal e sem valor cortado
- [ ] 3.2 Revisar com `/ui-ux-pro-max` (hierarquia, gráficos, acessibilidade) comparando com o moodboard

## 4. Documentação

- [ ] 4.1 Atualizar o Design System se algum detalhe de gráfico ou grade mudou na implementação
- [ ] 4.2 Marcar como `[x]` os itens do Início da Fase 1 em `docs/07-roadmap.md`
