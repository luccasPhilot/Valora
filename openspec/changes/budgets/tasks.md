## 1. Regras

- [ ] 1.1 Implementar `budgetStatus(spentCents, limitCents)` em `backend/src/modules/budgets/` com comparação de inteiros
- [ ] 1.2 Testes de limite: 799,99 → `ok`; 800,00 → `warning`; 1.000,00 → `warning`; 1.000,01 → `exceeded`; limite com gasto zero

## 2. API

- [ ] 2.1 Schema Zod do mês `AAAA-MM` (converte para o dia 1) e do limite (inteiro > 0)
- [ ] 2.2 Repository: gasto líquido por categoria no mês (`GREATEST(0, -SUM)`), todas as origens e status
- [ ] 2.3 `GET /api/v1/budgets` (mês atual por padrão, ordenado por percentual, com totais)
- [ ] 2.4 `PUT` e `DELETE /api/v1/budgets/:categoryId` (só categoria ativa do tipo `expense`)
- [ ] 2.5 `POST /api/v1/budgets/copy-previous` (só categorias sem limite no mês e ativas; devolve a quantidade)
- [ ] 2.6 Testes de integração: gasto em dinheiro conta, estorno reduz, só estornos dá zero, categoria de receita recusada, atualizar sem duplicar, copiar mês novo, cópia não sobrescreve

## 3. Tela de Orçamentos

- [ ] 3.1 Carregar `/frontend-design:frontend-design` e `/ui-ux-pro-max`; reler o Design System (status de orçamento, barra, responsividade)
- [ ] 3.2 Seletor de mês e resumo "R$ X de R$ Y"
- [ ] 3.3 Barras por categoria com ícone, nome, valores, cor, ícone e texto do status
- [ ] 3.4 Painel da categoria: editar limite (`MoneyInput`), remover e "Ver transações"
- [ ] 3.5 Criar limite novo: escolher categoria de despesa sem limite e o valor
- [ ] 3.6 Estados: carregando, vazio com "Copiar do mês anterior" e "Criar orçamento", erro; valores ocultos
- [ ] 3.7 Testes de componente: textos de cada status, cor nunca sozinha (ícone + texto), estado vazio

## 4. Conferência visual

- [ ] 4.1 Conferir em 320, 390, 768, 1024 e 1440 px, nos dois temas, sem rolagem horizontal
- [ ] 4.2 Revisar com `/ui-ux-pro-max`

## 5. Documentação

- [ ] 5.1 Registrar a regra de gasto líquido e os limites de status em `docs/01-produto.md`
- [ ] 5.2 Marcar como `[x]` o item "Orçamentos" da Fase 1 em `docs/07-roadmap.md`
