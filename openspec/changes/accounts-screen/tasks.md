## 1. API

- [ ] 1.1 Service de totais (saldo total: corrente + poupança não ocultas; faturas em aberto; limite disponível), reutilizável pelo Início
- [ ] 1.2 `GET /api/v1/accounts` com contas, conexão de cada uma e totais (DTO sem `raw`)
- [ ] 1.3 `PATCH /api/v1/accounts/:id` com `isHidden` (400 para "Dinheiro")
- [ ] 1.4 Testes: total com contas e cartão, conta oculta, cheque especial, "Dinheiro" com saldo nulo e fora do total, ocultar "Dinheiro" recusado

## 2. Status da sincronização e aviso de conexão

- [ ] 2.1 Carregar `/frontend-design:frontend-design` e `/ui-ux-pro-max`; reler o Design System (topo, `Badge`, faixa, responsividade)
- [ ] 2.2 `SyncStatus` no topo: "Atualizado hoje, 07:02", "Atualizado ontem, 07:01", data, ou "Nunca sincronizado"
- [ ] 2.3 Tocar no status: `POST /sync-runs`, "Sincronizando…", consulta a cada 3 s até terminar (limite de 2 min), aviso com transações novas ou erro, recarga das consultas; tratar `SYNC_IN_PROGRESS`
- [ ] 2.4 `ConnectionAlert` no shell: faixa com banco e data da última sincronização boa, atalho para Contas
- [ ] 2.5 Testes de componente: textos do status, fluxo de sincronizar, `SYNC_IN_PROGRESS`, faixa aparece e some

## 3. Tela de Contas

- [ ] 3.1 Resumo com saldo total e faturas em aberto
- [ ] 3.2 Um card por instituição com `Badge` de status e última sincronização; contas com nome, final e saldo; cartões com fatura atual e limite disponível; saldo negativo em `destructive`
- [ ] 3.3 Explicação de como reconectar no Meu Pluggy nas conexões com problema
- [ ] 3.4 Painel da conta com "Ocultar dos totais" e a marcação "Fora dos totais" na lista
- [ ] 3.5 Esconder a conta "Dinheiro" da tela
- [ ] 3.6 Estados: carregando, vazio (sem bancos, com o passo a passo resumido do Meu Pluggy), erro; valores ocultos

## 4. Conferência visual

- [ ] 4.1 Conferir tela, faixa e status em 320, 390, 768, 1024 e 1440 px, nos dois temas, sem rolagem horizontal
- [ ] 4.2 Revisar com `/ui-ux-pro-max`

## 5. Documentação

- [ ] 5.1 Registrar a definição de saldo total em `docs/01-produto.md`
- [ ] 5.2 Registrar em `docs/03-arquitetura.md` a decisão de não paginar a lista de contas e os endpoints de contas
- [ ] 5.3 Marcar como `[x]` em `docs/07-roadmap.md` os itens "Contas e cartões" e "Faixa de aviso quando um banco não sincroniza"
