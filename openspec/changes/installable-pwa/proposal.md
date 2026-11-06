## Why

O Valora é usado principalmente no celular, e hoje abre como uma aba do navegador. Um PWA instalável dá ícone na tela inicial, abertura em tela cheia e, com os dados já carregados guardados no aparelho, deixa o app abrir mesmo sem rede. É o último item da Fase 2 e o critério de pronto "o app está instalado no celular".

## What Changes

- Adiciona o `vite-plugin-pwa` ao frontend (já previsto na stack) e gera:
  - o **manifesto** (nome, ícones 192/512 e maskable, cores do tema, modo `standalone`);
  - o **service worker** que guarda o app (HTML, JS, CSS, fontes e ícones) para abrir sem rede.
- Guarda no aparelho as **respostas de leitura da API** (`GET /api/v1/*`): com rede, usa a rede; sem rede ou muito lenta, mostra a última resposta guardada.
- **Nunca** guarda nem reenvia escritas: criar, editar e excluir exigem rede e falham na hora com uma mensagem clara (nada fica na fila).
- Mostra um aviso de **"sem conexão"** com a hora dos dados exibidos, e desabilita as ações que precisam de rede (sincronizar, salvar).
- Avisa quando há **nova versão** e deixa você atualizar com um toque.
- Ícone e tela de abertura: ícones gerados da marca do Valora, `theme-color` para os dois temas e imagem de abertura do iPhone.
- Ajusta o nginx para o service worker e o manifesto nunca ficarem presos em cache.
- Documenta como instalar no celular (iPhone e Android).

Itens do roadmap cobertos (Fase 2):
- **PWA instalável** (`vite-plugin-pwa`): ícone, tela de abertura, funciona com os dados já carregados mesmo sem rede.

## Capabilities

### New Capabilities

- `installable-pwa`: manifesto, ícones, service worker, cache de leitura da API, comportamento sem rede, aviso de nova versão e instruções de instalação.

### Modified Capabilities

Nenhuma.

## Impact

- **Dependência nova:** `vite-plugin-pwa` (devDependency do `frontend/`; traz o Workbox). Já estava na stack ([arquitetura](../../../docs/03-arquitetura.md#stack)).
- **Código novo:** configuração do PWA em `frontend/vite.config.ts`, ícones em `frontend/public/`, componentes de aviso de conexão e de nova versão em `frontend/src/components/`.
- **Código alterado:** `frontend/index.html` (meta tags), cliente de consultas do TanStack Query (modo de rede das mutações), botões que dependem de rede, `frontend/nginx.conf`.
- **Infra:** o nginx passa a servir `sw.js` e o manifesto sem cache.
- **API:** nenhuma mudança.
- **Depende de:** `web-shell`, `home-server-deploy` (HTTPS pela Tailscale é obrigatório para o service worker fora do `localhost`). É a última da Fase 2 para cobrir todas as telas novas.

## Fora do escopo

- Notificações push: ficam em "Ideias para depois" do roadmap.
- Escrever sem rede e sincronizar depois (fila offline).
- Sincronização em segundo plano (`background sync`).
- Publicar nas lojas (App Store e Google Play).
- Atualização automática sem perguntar: a nova versão espera o seu toque.
- Itens da seção "Fora do escopo" de `docs/01-produto.md`: nenhum é tocado.
