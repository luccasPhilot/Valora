## Why

Os alertas só aparecem no sino (`docs/08-revisao-e-proximas-fases.md`, "Lacunas", item 9). Um orçamento estourado, um banco que parou de sincronizar, um consentimento a vencer ou a foto de 31/12 faltando só são vistos quando o usuário abre o app, e às vezes isso é tarde.

É o item "Push no iPhone" da Fase 4. **Decisão do usuário em 24/11/2026:** aprovado, com o conteúdo sempre sem valores. O push passa pelo servidor da Apple (o serviço de push do navegador).

## What Changes

- **Web Push no PWA instalado:** em Ajustes, a seção "Notificações" com "Ativar neste aparelho" (pede a permissão do sistema num toque do usuário), "Enviar teste" e "Desativar". Funciona no iPhone com o app instalado na tela de início (iOS 16.4 ou mais novo) e nos navegadores de computador. Cada aparelho tem a sua inscrição.
- **O que dispara:** todo alerta **novo** (orçamento em 80% e estourado, banco sem sincronizar, cobrança duplicada, assinatura, e os tipos novos das outras changes, como consentimento a vencer e foto de 31/12), e a caixa "Para revisar" com 10 ou mais transações depois da sincronização agendada (no máximo um aviso desses por dia). Vários alertas numa mesma avaliação viram um push só ("3 alertas novos no Valora").
- **Conteúdo sem dados:** o texto é fixo por tipo ("Um orçamento passou do limite", "Um banco parou de sincronizar", "Há transações para revisar") e **nunca** leva valor, descrição, nome de categoria, de banco ou de conta. Tocar abre o app na tela do alerta (o sino) ou na caixa.
- **Chaves VAPID só no `.env`:** `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT` (o endereço do app na tailnet, não um e-mail pessoal). Sem as chaves, o push fica desligado e a seção some de Ajustes. Um comando gera as chaves.
- **Inscrições:** tabela `push_subscriptions`. Inscrição que o serviço de push diz que não existe mais (404 ou 410) é apagada. Falha ao enviar nunca derruba a sincronização nem a operação do usuário.

### Contraria documentos (decisão do usuário, tomada em 24/11/2026)

- `docs/03-arquitetura.md`, seção "Segurança": "Sai do servidor só o necessário" ganha o push, com a regra de conteúdo sem dados. O conteúdo do Web Push é cifrado do servidor ao aparelho (RFC 8291); o serviço de push vê só o horário e o tamanho, e mesmo assim o texto não leva dado nenhum.
- `docs/08`, "Decisões que dependem de você": o push sai da lista.

### Fora do escopo

- Escolher por tipo quais alertas viram push (todos ou nenhum, por aparelho).
- Resumo da semana por push (Fase 7).
- E-mail, Telegram ou WhatsApp (descartados em `docs/08`).
- Push no Android fora do navegador ou app nativo.
- Nenhum item da seção "Fora do escopo" de `docs/01-produto.md` é afetado.

### Roadmap

Não está em `docs/07-roadmap.md`: é o item "Push no iPhone" da Fase 4 em `docs/08` (change nº 6 da "Ordem sugerida"). Ao arquivar, o item é marcado como feito.

## Capabilities

### New Capabilities

- `push-notifications`: inscrição por aparelho, disparo nos alertas novos e na caixa cheia, conteúdo sem dados, chaves VAPID opcionais.

### Modified Capabilities

- `installable-pwa`: o service worker recebe e mostra o push e abre o app no destino ao tocar.

## Impact

- **Banco:** `push_subscriptions (id, endpoint unique, p256dh, auth, created_at, last_success_at)`. Migration nova; `docs/04-modelo-de-dados.md`.
- **Backend:** módulo novo `modules/push/` (rotas `GET /push/public-key`, `POST /push/subscriptions`, `DELETE /push/subscriptions`, `POST /push/test`; service e repository; o envio fica atrás de uma interface `PushSender`, a única que fala com o serviço de push); `modules/alerts/` passa a saber quais alertas acabaram de nascer; `shared/config.ts` com as três variáveis opcionais; `scripts/` com o gerador de chaves.
- **Frontend:** seção "Notificações" em Ajustes, `public/push-handler.js` importado pelo service worker (`workbox.importScripts`), schemas em `lib/api/`.
- **Infra:** `infra/.env.example` e `backend/.env.example` com as variáveis vazias.
- **Testes:** unitários dos textos (nenhum leva dado), integração das rotas e do disparo com o `PushSender` falso (nunca chama um serviço real), apagar inscrição em 410, falha isolada; teste do handler do service worker.
- **Dependências:** **nova** no backend, `web-push` (VAPID e a cifra do RFC 8291), porque implementar a cifra à mão é arriscado.
- **Documentação:** `docs/01-produto.md`, `docs/03-arquitetura.md` (Segurança e Decisões), `docs/04-modelo-de-dados.md`, `docs/05-deploy.md` (gerar as chaves e ativar no iPhone), `CLAUDE.md` (comando do gerador) e `docs/08-revisao-e-proximas-fases.md`.
