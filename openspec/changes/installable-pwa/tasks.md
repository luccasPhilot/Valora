## 1. Plugin, manifesto e ícones

- [ ] 1.1 Adicionar o `vite-plugin-pwa` ao `frontend/` (devDependency) e configurar `registerType: 'prompt'`, `devOptions.enabled: false`, manifesto e `navigateFallback` com `/api/` na denylist
- [ ] 1.2 Gerar uma vez os ícones PNG 192, 512, 512 `maskable` e `apple-touch-icon` 180 a partir da marca do Valora e versioná-los em `frontend/public/`
- [ ] 1.3 Meta tags no `index.html`: `theme-color` claro e escuro e `apple-mobile-web-app-*`
- [ ] 1.4 Teste que compara `theme_color` e `background_color` do manifesto com os tokens do `globals.css`

## 2. Cache e comportamento sem rede

- [ ] 2.1 Regra de cache `NetworkFirst` para `GET /api/v1/*` (200, 100 entradas, 7 dias, 5 s), com exclusão de `sync-runs`, `health` e métodos que não sejam `GET`
- [ ] 2.2 Plugin do Workbox que acrescenta `X-Valora-Cached-At` às respostas servidas do cache
- [ ] 2.3 Função pura `shouldCacheApiRequest(request)` com testes: `GET` em `/api/v1/budgets` entra; `sync-runs`, `health`, `POST`, `PATCH` e `DELETE` ficam de fora
- [ ] 2.4 `networkMode: 'always'` nas mutações do TanStack Query e mensagem "Sem conexão: esta ação precisa de internet"
- [ ] 2.5 `OfflineBanner` com data e hora dos dados (fuso de São Paulo) e atualização das consultas quando a rede volta
- [ ] 2.6 Desabilitar "Sincronizar agora" e os botões de salvar enquanto offline, com a explicação
- [ ] 2.7 Testes de componente: banner com data e hora, some ao voltar a rede, mutação offline falha na hora e não fica na fila, botões desabilitados

## 3. Atualização e tela de abertura

- [ ] 3.1 Aviso "Nova versão disponível" com a ação "Atualizar" (sistema de avisos existente); nada recarrega sem a ação
- [ ] 3.2 Teste do fluxo de atualização: aviso aparece e a página só recarrega após "Atualizar"
- [ ] 3.3 Carregar `/frontend-design:frontend-design` e `/ui-ux-pro-max`; ajustar o visual dos avisos de conexão e de versão ao Design System (cores, ícone e texto, áreas seguras)
- [ ] 3.4 Gerar o `apple-touch-startup-image` do iPhone 13 (1170 × 2532 px, retrato) e declará-lo no `index.html` com a `media` de 390 × 844 pt a 3×

## 4. Servidor

- [ ] 4.1 `frontend/nginx.conf`: `sw.js`, `manifest.webmanifest` e `registerSW.js` com `Cache-Control: no-cache`; conferir o `Content-Type` do manifesto; `/assets/` continua com cache longo
- [ ] 4.2 Subir a imagem localmente e conferir os cabeçalhos com `curl -I`

## 5. Verificação

- [ ] 5.1 `npm run build` e `npm run preview`: auditoria de PWA instalável no Chrome (manifesto, service worker, ícones) sem erros
- [ ] 5.2 Em modo offline do navegador: abrir o app, uma rota interna e o Início com dados da última vez e o banner
- [ ] 5.3 Publicar duas versões em sequência e conferir o aviso de atualização
- [ ] 5.4 Conferir os avisos em 320, 390, 768, 1024 e 1440 px, nos dois temas, sem rolagem horizontal; revisar com `/ui-ux-pro-max`

## 6. Passo manual no celular

- [ ] 6.1 Instalar no celular pela URL da Tailscale, abrir pelo ícone em tela cheia, abrir em modo avião e confirmar os dados da última vez (critério de pronto da Fase 2)

## 7. Documentação

- [ ] 7.1 Seção "Instalar no celular" em `docs/05-deploy.md` (iPhone e Android, cuidado de bloquear o aparelho, limpar dados apaga o cache) e `frontend/README.md`
- [ ] 7.2 Registrar a decisão do cache de leitura sem fila de escrita em `docs/03-arquitetura.md`
- [ ] 7.3 Marcar o item "PWA instalável" em `docs/07-roadmap.md`
