## 1. Dados reais e schemas

- [ ] 1.1 Estender o `fixtures:record` para gravar as faturas de cada cartão (anonimizadas) e conferir quais campos os 3 bancos devolvem; ajustar a decisão 4 do design se vier pouco
- [ ] 1.2 Schema Zod da fatura do Pluggy e `listCreditCardBills` no `PluggyClient`/`PluggySdk` (reais para centavos, soma dos pagamentos)
- [ ] 1.3 Testes do `PluggyClient` com as fixtures: valores em centavos, resposta inválida citando só os caminhos dos campos

## 2. Banco

- [ ] 2.1 Tabela `credit_card_bills` no schema Drizzle (com `closing_date` e `paid_cents`) e migration; índice único em `pluggy_bill_id` e índice (`account_id`, `due_date`)
- [ ] 2.2 Repository de faturas: gravar/atualizar por `pluggy_bill_id`, listar por cartão

## 3. Sincronização

- [ ] 3.1 Buscar as faturas de cada cartão junto com os dados do banco; falha numa fatura vira `bills_failed` nas estatísticas sem derrubar o banco
- [ ] 3.2 Gravar as faturas dentro da transação de cada banco e somar quantidades em `sync_runs.stats`
- [ ] 3.3 Testes de integração (Testcontainers): fatura nova, sincronizar duas vezes sem duplicar, pagamento parcial atualizado, banco sem faturas grava contas e transações

## 4. Regras e API

- [ ] 4.1 `billStatus(bill, today)` como função pura, com testes: paga, parcial, vence hoje, vencida, total zero
- [ ] 4.2 `projectFutureInstallments(transactions, today)` como função pura, com testes: parcela 1 de 3, última parcela, dia 31 em fevereiro, compra à vista, parcelas com centavos diferentes (60,00 / 59,98) na mesma compra
- [ ] 4.3 Service: escolher fatura atual e próximas, fallback pelo saldo e vencimento da conta (vencimento no passado vira estimado no mês seguinte, `isEstimatedDueDate`), ocultar cartões ocultos
- [ ] 4.4 `GET /api/v1/credit-card-bills` com DTO sem `raw`, controller com validação Zod
- [ ] 4.5 Testes de integração da rota: três faturas, fatura de hoje paga, cartão oculto, cartão sem faturas com vencimento futuro, vencimento velho (estimado), sem vencimento e fatura zerada

## 5. Tela de faturas

- [ ] 5.1 Carregar `/frontend-design:frontend-design` e `/ui-ux-pro-max`; reler o Design System (valores, status, responsividade)
- [ ] 5.2 Schemas Zod em `frontend/src/lib/api/` e consulta do TanStack Query
- [ ] 5.3 Rota `/contas/:accountId/faturas` e ação "Ver faturas" no painel do cartão
- [ ] 5.4 Fatura atual (valor, vencimento ou "Vencimento estimado" ou "não informado", situação com ícone e texto), próximas faturas e parcelas futuras por mês
- [ ] 5.5 Estados carregando, vazio e erro; "Ocultar valores"
- [ ] 5.6 Testes de componente: cada situação com ícone e texto, estado vazio de parcelas, erro

## 6. Conferência visual

- [ ] 6.1 Conferir em 320, 390, 768, 1024 e 1440 px, nos dois temas, sem rolagem horizontal
- [ ] 6.2 Revisar com `/ui-ux-pro-max`

## 7. Documentação

- [ ] 7.1 Atualizar `docs/04-modelo-de-dados.md` (`closing_date` e `paid_cents`) e `docs/03-arquitetura.md` (endpoint e decisão da lista sem paginação)
- [ ] 7.2 Marcar o item "Faturas do cartão" da Fase 2 em `docs/07-roadmap.md`
- [ ] 7.3 Atualizar `docs/01-produto.md` (faturas e parcelas futuras) e a seção de comandos/fixtures em `backend/README.md`
