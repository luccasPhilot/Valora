## Why

O Valora é usado principalmente no celular, e hoje abre como uma aba do navegador. Um PWA instalável dá ícone na tela inicial, abertura em tela cheia e, com os dados já carregados guardados no aparelho, deixa o app abrir mesmo sem rede. É o último item da Fase 2 e o critério de pronto "o app está instalado no celular".

O mesmo pacote leva a **página "Página não encontrada"**: hoje, um endereço que não existe (por exemplo `/investimentos`, que só chega na Fase 3) cai na tela de erro padrão do React Router, sem menu e sem caminho de volta. Com o app instalado e sem rede, o service worker devolve o app para qualquer endereço, então a mesma página precisa existir para esse caso funcionar de ponta a ponta.

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
- Acrescenta a página **"Página não encontrada"**: uma rota coringa **fora** do `AppShell`, em tela cheia e sem menu, com "404 Página não encontrada", "Esta página não existe" e um único botão "Ir para o Início". Cobre qualquer endereço sem rota, inclusive filhos de rotas existentes (`/metas/abc`), e funciona sem rede.

Itens do roadmap cobertos (Fase 2):
- **PWA instalável** (`vite-plugin-pwa`): ícone, tela de abertura, funciona com os dados já carregados mesmo sem rede.
- **Página não encontrada:** nenhum item existente cobre; nasce de um pedido do usuário e entra na Fase 2 como item novo, já marcado ao concluir.

## Capabilities

### New Capabilities

- `installable-pwa`: manifesto, ícones, service worker, cache de leitura da API, comportamento sem rede, aviso de nova versão e instruções de instalação.

### Modified Capabilities

- `web-shell`: ganha o requisito da página "Página não encontrada" para endereços sem rota. Os requisitos existentes (menu, topo, estados de tela, áreas ainda não prontas) não mudam.

## Impact

- **Dependência nova:** `vite-plugin-pwa` (devDependency do `frontend/`; traz o Workbox). Já estava na stack ([arquitetura](../../../docs/03-arquitetura.md#stack)).
- **Código novo:** configuração do PWA em `frontend/vite.config.ts`, ícones em `frontend/public/`, componentes de aviso de conexão e de nova versão em `frontend/src/components/`, e a página em `frontend/src/features/not-found/`.
- **Código alterado:** `frontend/index.html` (meta tags), cliente de consultas do TanStack Query (modo de rede das mutações), botões que dependem de rede, `frontend/nginx.conf` e `frontend/src/app/router.tsx` (rota coringa).
- **Infra:** o nginx passa a servir `sw.js` e o manifesto sem cache.
- **Docs:** `docs/06-design-system.md` (linha na tabela de estados de tela) e `docs/07-roadmap.md`.
- **API:** nenhuma mudança.
- **Depende de:** `web-shell`, `home-server-deploy` (HTTPS pela Tailscale é obrigatório para o service worker fora do `localhost`). É a última da Fase 2 para cobrir todas as telas novas.

## Fora do escopo

- Notificações push: ficam em "Ideias para depois" do roadmap.
- Escrever sem rede e sincronizar depois (fila offline).
- Sincronização em segundo plano (`background sync`).
- Publicar nas lojas (App Store e Google Play).
- Atualização automática sem perguntar: a nova versão espera o seu toque.
- Devolver o status HTTP 404 no servidor para endereços desconhecidos: o nginx continua respondendo 200 com o app, o que é normal em app de página única e não importa num app privado.
- Tela para erros inesperados de renderização ou de carregamento de arquivos; o aviso de nova versão cobre o caso do deploy.
- Sugerir endereços parecidos ("Você quis dizer…?") e mudar o título do topo para a página não encontrada (continua "Valora").
- Itens da seção "Fora do escopo" de `docs/01-produto.md`: nenhum é tocado.
