## 1. Dados reais e schemas

- [x] 1.1 Estender o `fixtures:record` para gravar as faturas de cada cartão (anonimizadas) e conferir quais campos os 3 bancos devolvem; ajustar a decisão 4 do design se vier pouco (feito: só vêm faturas fechadas e o vencimento vem à meia-noite UTC; design e spec atualizados)
- [x] 1.2 Schema Zod da fatura do Pluggy e `listCreditCardBills` no `PluggyClient`/`PluggySdk` (reais para centavos, soma dos pagamentos)
- [x] 1.3 Testes do `PluggyClient` com as fixtures: valores em centavos, resposta inválida citando só os caminhos dos campos

## 2. Banco

- [x] 2.1 Tabela `credit_card_bills` no schema Drizzle (com `closing_date` e `paid_cents`) e migration; índice único em `pluggy_bill_id` e índice (`account_id`, `due_date`)
- [x] 2.2 Repository de faturas: gravar/atualizar por `pluggy_bill_id`, listar por cartão

## 3. Sincronização

- [x] 3.1 Buscar as faturas de cada cartão junto com os dados do banco; falha numa fatura vira `bills_failed` nas estatísticas sem derrubar o banco
- [x] 3.2 Gravar as faturas dentro da transação de cada banco e somar quantidades em `sync_runs.stats`
- [x] 3.3 Testes de integração (Testcontainers): fatura nova, sincronizar duas vezes sem duplicar, pagamento parcial atualizado, banco sem faturas grava contas e transações

## 4. Regras e API

- [x] 4.1 `billStatus(bill, today)` como função pura, com testes: paga, parcial, vence hoje, vencida, total zero
- [x] 4.2 `projectFutureInstallments(transactions, today)` como função pura, com testes: parcela 1 de 3, última parcela, dia 31 em fevereiro, compra à vista, parcelas com centavos diferentes (60,00 / 59,98) na mesma compra
- [x] 4.3 Service: escolher fatura atual e próximas, fallback pelo saldo e vencimento da conta (vencimento no passado vira estimado no mês seguinte, `isEstimatedDueDate`), ocultar cartões ocultos
- [x] 4.4 `GET /api/v1/credit-card-bills` com DTO sem `raw`, controller com validação Zod
- [x] 4.5 Testes de integração da rota: três faturas, fatura de hoje paga, cartão oculto, cartão sem faturas com vencimento futuro, vencimento velho (estimado), sem vencimento e fatura zerada

## 5. Tela de faturas

- [x] 5.1 Carregar `/frontend-design:frontend-design` e `/ui-ux-pro-max`; reler o Design System (valores, status, responsividade)
- [x] 5.2 Schemas Zod em `frontend/src/lib/api/` e consulta do TanStack Query
- [x] 5.3 Rota `/contas/:accountId/faturas` e ação "Ver faturas" no painel do cartão
- [x] 5.4 Fatura atual (valor, vencimento ou "Vencimento estimado" ou "não informado", situação com ícone e texto), próximas faturas e parcelas futuras por mês
- [x] 5.5 Estados carregando, vazio e erro; "Ocultar valores"
- [x] 5.6 Testes de componente: cada situação com ícone e texto, estado vazio de parcelas, erro

## 6. Conferência visual

- [x] 6.1 Conferir em 320, 390, 768, 1024 e 1440 px, nos dois temas, sem rolagem horizontal
- [x] 6.2 Revisar com `/ui-ux-pro-max`

## 7. Documentação

- [x] 7.1 Atualizar `docs/04-modelo-de-dados.md` (`closing_date` e `paid_cents`) e `docs/03-arquitetura.md` (endpoint e decisão da lista sem paginação)
- [x] 7.2 Marcar o item "Faturas do cartão" da Fase 2 em `docs/07-roadmap.md`
- [x] 7.3 Atualizar `docs/01-produto.md` (faturas e parcelas futuras) e a seção de comandos/fixtures em `backend/README.md`
