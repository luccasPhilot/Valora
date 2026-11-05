## 1. Regras

- [x] 1.1 Implementar `budgetStatus(spentCents, limitCents)` em `backend/src/modules/budgets/` com comparação de inteiros
- [x] 1.2 Testes de limite: 799,99 → `ok`; 800,00 → `warning`; 1.000,00 → `warning`; 1.000,01 → `exceeded`; limite com gasto zero

## 2. API

- [x] 2.1 Schema Zod do mês `AAAA-MM` (converte para o dia 1) e do limite (inteiro > 0)
- [x] 2.2 Repository: gasto líquido por categoria no mês (`GREATEST(0, -SUM)`), todas as origens e status
- [x] 2.3 `GET /api/v1/budgets` (mês atual por padrão, ordenado por percentual, com totais)
- [x] 2.4 `PUT` e `DELETE /api/v1/budgets/:categoryId` (só categoria ativa do tipo `expense`)
- [x] 2.5 `POST /api/v1/budgets/copy-previous` (só categorias sem limite no mês e ativas; devolve a quantidade)
- [x] 2.6 Testes de integração: gasto em dinheiro conta, estorno reduz, só estornos dá zero, categoria de receita recusada, atualizar sem duplicar, copiar mês novo, cópia não sobrescreve

## 3. Tela de Orçamentos

- [x] 3.1 Carregar `/frontend-design:frontend-design` e `/ui-ux-pro-max`; reler o Design System (status de orçamento, barra, responsividade)
- [x] 3.2 Seletor de mês e resumo "R$ X de R$ Y"
- [x] 3.3 Barras por categoria com ícone, nome, valores, cor, ícone e texto do status
- [x] 3.4 Painel da categoria: editar limite (`MoneyInput`), remover e "Ver transações"
- [x] 3.5 Criar limite novo: escolher categoria de despesa sem limite e o valor
- [x] 3.6 Estados: carregando, vazio com "Copiar do mês anterior" e "Criar orçamento", erro; valores ocultos
- [x] 3.7 Testes de componente: textos de cada status, cor nunca sozinha (ícone + texto), estado vazio

## 4. Conferência visual

- [x] 4.1 Conferir em 320, 390, 768, 1024 e 1440 px, nos dois temas, sem rolagem horizontal
- [x] 4.2 Revisar com `/ui-ux-pro-max`

## 5. Documentação

- [x] 5.1 Registrar a regra de gasto líquido e os limites de status em `docs/01-produto.md`
- [x] 5.2 Marcar como `[x]` o item "Orçamentos" da Fase 1 em `docs/07-roadmap.md`
