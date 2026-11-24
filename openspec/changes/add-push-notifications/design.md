## Context

- Os alertas nascem no `AlertEvaluator` (`createIgnoringConflict`), ao fim de cada sincronização e depois de algumas gravações do usuário. Hoje ninguém sabe quais linhas foram inseridas numa avaliação.
- O PWA usa `vite-plugin-pwa` no modo `generateSW` (Workbox), com `registerType: 'prompt'`. Push no iOS só funciona com o app instalado na tela de início e a permissão pedida num gesto do usuário.
- O app é servido por HTTPS pelo `tailscale serve`, exigência do Web Push.
- O healthchecks.io é hoje a única saída do servidor além do Pluggy, e a regra é não levar dado nenhum.

## Goals / Non-Goals

**Goals:**
- Saber de um alerta com o app fechado.
- Nenhum dado financeiro ou pessoal no conteúdo do push.
- Nunca derrubar a sincronização ou uma gravação por causa do push.

**Non-Goals:**
- Escolha por tipo, resumo semanal, outros canais.

## Decisions

### 1. Inscrição

- `GET /api/v1/push/public-key` → `{ publicKey }` ou 404 `PUSH_DISABLED` quando as chaves não estão no `.env`.
- `POST /api/v1/push/subscriptions` com o `PushSubscription.toJSON()` (`endpoint`, `keys.p256dh`, `keys.auth`), validado com Zod (endpoint `https://`). Grava ou atualiza pelo `endpoint`. `DELETE /api/v1/push/subscriptions` com `{ endpoint }`, 204, idempotente.
- `POST /api/v1/push/test` manda "Notificações do Valora ativadas" para todas as inscrições.
- O `endpoint` identifica o aparelho no serviço de push: fica no banco e **nunca** nos logs.

### 2. Disparo

- `AlertsRepository.createIgnoringConflict` passa a devolver as linhas inseridas (`returning`). O `AlertEvaluator` junta as inseridas de uma avaliação inteira e chama `PushNotifier.notifyNewAlerts(types)` uma vez, depois de gravar, com `try/catch`: a falha vira log com o tipo do erro.
- Uma avaliação com 1 alerta novo → o texto do tipo; com 2 ou mais → "{N} alertas novos no Valora". Destino: `/?alertas=1` (abre o sino).
- **Caixa cheia** (se a `add-review-inbox` já estiver pronta): ao fim da sincronização **agendada**, se `reviewCount >= 10` e nenhum push de caixa foi mandado hoje (guardado em memória do processo com o dia em São Paulo; um reinício no mesmo dia pode repetir uma vez, aceito), manda "Há transações para revisar" com destino `/transacoes/revisar`.
- **Textos fixos por tipo** (`push-messages.ts`, função pura com teste que confere que nenhum texto tem placeholder):
  - `budget_warning`: "Um orçamento chegou a 80%";
  - `budget_exceeded`: "Um orçamento passou do limite";
  - `connection_error`: "Um banco parou de sincronizar";
  - `duplicate_charge`: "Possível cobrança duplicada";
  - `subscription_detected`: "Assinatura nova encontrada";
  - `consent_expiring`: "Um consentimento vence em breve";
  - `year_end_snapshot_pending` e `year_end_snapshot_missing`: "Falta a foto de 31/12";
  - tipo sem texto: "Alerta novo no Valora".
- O título é sempre "Valora". O payload é `{ title, body, url }`, sem `data` extra.

### 3. Envio

- Interface `PushSender.send(subscription, payload)` → `'sent' | 'gone' | 'failed'`. A implementação usa `web-push` com as chaves VAPID e `TTL` de 24 h. `gone` (404 ou 410) apaga a inscrição; `failed` só vira log com o código.
- Envio para todas as inscrições em paralelo, com limite de 5 s por envio. Os testes usam um `PushSender` falso; nenhum teste chama um serviço de push real.

### 4. Service worker

- `public/push-handler.js`, incluído por `workbox.importScripts`: `push` → `showNotification(title, { body, icon, badge, data: { url } })`; `notificationclick` → foca uma janela do app e navega para `url`, ou abre uma nova.
- O arquivo é estático e sem dependências; tem teste com um `self` falso.

### 5. Ajustes

- Seção "Notificações" só quando `GET /push/public-key` responde 200 e o navegador suporta (`PushManager`). No iPhone fora da tela de início, mostra "Instale o Valora na tela de início para receber notificações".
- "Ativar neste aparelho" → `Notification.requestPermission()` no clique → `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` → `POST /push/subscriptions`. Permissão negada: explica como liberar nos ajustes do sistema.
- "Enviar teste" e "Desativar" (`unsubscribe` + `DELETE`).

### 6. Chaves

`npm run push:keys` no backend gera e imprime o par VAPID (uma vez); o usuário copia para `infra/.env`. `VAPID_SUBJECT` é o endereço do app na tailnet (`https://…ts.net`), aceito pela Apple e sem e-mail pessoal. As três são opcionais e validadas juntas pelo Zod do config: ou as três, ou nenhuma.

## Risks / Trade-offs

- **Metadados no serviço de push:** a Apple vê quando e quanto (tamanho) o servidor manda, não o conteúdo. → Aceito na decisão de 24/11/2026; o texto não tem dado nenhum.
- **Push repetido depois de reinício:** o controle diário da caixa fica em memória. → No máximo um aviso a mais no dia.
- **iOS que esquece a inscrição:** o iOS pode invalidar a inscrição (410). → É apagada; a seção de Ajustes mostra "Desativado" e o usuário ativa de novo.
