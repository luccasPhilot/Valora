## 1. Configuração e banco

- [x] 1.1 Testes primeiro do config: sem as três variáveis (desligado), com as três (ligado), com parte (erro citando só os nomes)
- [x] 1.2 `shared/config.ts` com `VAPID_*` opcionais; `.env.example` do backend e do `infra/` com as variáveis vazias
- [x] 1.3 Tabela `push_subscriptions`; migration com `npm run db:generate`
- [x] 1.4 Adicionar `web-push` ao `backend/` (dependência nova, justificada na proposta) e `npm run push:keys`

## 2. Inscrição (backend)

- [x] 2.1 Testes primeiro (`app.inject()` e integração): `public-key` com e sem chaves, gravar e atualizar pelo `endpoint`, endpoint não `https` recusado, `DELETE` idempotente, `test` manda para todas, logs sem endpoint
- [x] 2.2 Módulo `modules/push/` (rotas, service, repository) e a interface `PushSender` com a implementação `web-push`

## 3. Disparo

- [x] 3.1 Testes unitários primeiro de `push-messages.ts`: um texto por tipo, genérico para tipo desconhecido, plural, e nenhum texto com valor ou dado
- [x] 3.2 `createIgnoringConflict` devolve as linhas inseridas; `AlertEvaluator` chama o `PushNotifier` uma vez por avaliação
- [x] 3.3 Testes de integração com `PushSender` falso: 1 alerta, 3 alertas num push, alerta que continua não manda, falha de envio não falha a sincronização nem a gravação, 410 apaga a inscrição, push desligado não chama o sender
- [x] 3.4 Caixa cheia (se a `add-review-inbox` já estiver pronta): testes de 9 e 10 transações, uma vez por dia, só na agendada; implementação

## 4. PWA e Ajustes

- [x] 4.1 Carregar `/frontend-design:frontend-design` e `/ui-ux-pro-max`; o Design System vence
- [x] 4.2 `public/push-handler.js` com `workbox.importScripts`, com teste (`push` mostra a notificação, clique foca ou abre no destino); `/?alertas=1` abre o sino
- [x] 4.3 Seção "Notificações" em Ajustes (ativar, testar, desativar, iPhone sem instalar, permissão negada), schemas em `lib/api/` e testes de tela
- [ ] 4.4 Conferir em 320, 390, 768, 1024 e 1440 px, nos dois temas, e de ponta a ponta no iPhone com o app instalado (ativar, teste, um alerta real, tocar e abrir)

## 5. Conferência

- [x] 5.1 Rodar `typecheck`, `lint`, `format:check` e `test` no `backend/` e no `frontend/`

## 6. Documentação

- [x] 6.1 `docs/03-arquitetura.md` (Segurança: o push sai do servidor sem dados, cifrado; Decisões: Web Push com VAPID, textos fixos), `docs/01-produto.md` (notificações), `docs/04-modelo-de-dados.md` (`push_subscriptions`), `docs/05-deploy.md` (gerar as chaves e ativar no iPhone), `CLAUDE.md` (Comandos: `push:keys`)
- [x] 6.2 Ao arquivar: marcar "Push no iPhone" como feito e tirar o push de "Decisões que dependem de você" em `docs/08-revisao-e-proximas-fases.md`
