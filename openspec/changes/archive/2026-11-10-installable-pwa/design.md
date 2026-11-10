## Context

O front é um app de página única servido pelo nginx, e o acesso é só pela Tailscale com HTTPS (`tailscale serve`), o que atende a exigência de contexto seguro do service worker. O uso principal é no iPhone (Safari: "Adicionar à Tela de Início") e, eventualmente, no Android. O app é de leitura em quase tudo; as escritas (lançamento manual, orçamentos, metas, previsões) precisam do servidor.

## Goals / Non-Goals

**Goals:**
- Instalar com ícone e abrir em tela cheia no celular.
- Abrir sem rede e mostrar os dados da última vez, dizendo claramente que são antigos.
- Nunca perder nem duplicar uma escrita por causa de fila offline.

- Qualquer endereço sem rota mostrar uma página do Valora, com o menu à mão e um caminho de volta, inclusive sem rede.

**Non-Goals:**
- Escrever offline e push.
- Resposta 404 no servidor e tela de erro de renderização.

## Decisions

**1. `vite-plugin-pwa` com `generateSW` e atualização por pedido (`registerType: 'prompt'`).**
- O Workbox gera o service worker; não há código de SW escrito à mão, só configuração.
- `prompt`: a versão nova fica esperando; um aviso "Nova versão disponível — Atualizar" aparece e só então o SW troca e a página recarrega. Evita recarregar no meio de um formulário.
- Em desenvolvimento o PWA fica desligado (`devOptions.enabled: false`): um SW no `npm run dev` atrapalha o hot reload. Testa-se com `npm run build` + `npm run preview`.
- *Alternativa:* `autoUpdate`. Descartada pelo risco de recarregar a tela durante o preenchimento.

**2. Pré-cache do app, rota de fallback e a API fora do fallback.**
- Pré-cache de HTML, JS, CSS, fontes e ícones. `navigateFallback: '/index.html'` para as rotas do app, com `navigateFallbackDenylist` para `/api/`.
- Sem rede, qualquer rota do app abre o shell e a tela mostra o que as consultas conseguirem.

**3. Cache de leitura da API: `NetworkFirst`.**
- Só `GET /api/v1/*` com resposta 200. Cache `valora-api`, no máximo 100 entradas, validade de 7 dias, `networkTimeoutSeconds: 5` (rede lenta cai para o cache).
- **Fora do cache:** `/api/v1/sync-runs*` (o acompanhamento da sincronização não pode mostrar status velho), `/api/v1/health` e qualquer método que não seja `GET`.
- *Alternativa:* persistir o cache do TanStack Query no `localStorage`/IndexedDB. Descartada: exigiria outra dependência e duplicaria o que o SW já faz.

**4. Dados antigos sempre identificados.**
- Um plugin do Workbox acrescenta ao responder do cache o cabeçalho `X-Valora-Cached-At` (data da resposta original). O cliente da API lê o cabeçalho e guarda o mais recente.
- O `OfflineBanner` aparece quando `navigator.onLine` é falso (ou quando uma resposta vier do cache) e diz "Sem conexão. Mostrando os dados de 05/11 às 08:12." Some quando a rede volta, e as consultas são atualizadas.

**5. Escrita nunca entra em fila.**
- O TanStack Query pausa mutações offline por padrão e as dispara quando a rede volta, o que enviaria um lançamento horas depois sem você perceber. O cliente passa a usar `networkMode: 'always'` nas mutações: elas tentam na hora e, sem rede, falham.
- A falha mostra o aviso "Sem conexão: esta ação precisa de internet" (reuso do sistema de avisos). Os botões "Sincronizar" e de salvar ficam desabilitados com a mesma dica enquanto offline.

**6. Manifesto e ícones.**
- `name` "Valora", `short_name` "Valora", `lang` `pt-BR`, `start_url` e `scope` `/`, `display` `standalone`, `orientation` `portrait-primary`, `theme_color` e `background_color` iguais aos tokens do tema (um teste confere os valores contra o `globals.css`, para não existir um segundo lugar com cor).
- Ícones PNG 192 e 512, um 512 `maskable` com a marca dentro da zona segura, e `apple-touch-icon` de 180. São gerados uma vez a partir da marca do Valora (`favicon.svg`/`ValoraMark`) e versionados em `frontend/public/`, sem dependência permanente de ferramenta de imagem.
- `<meta name="theme-color">` para claro e escuro (com `media`), e as meta tags `apple-mobile-web-app-*` para o modo tela cheia no iOS.

**7. Tela de abertura.**
- Android: o navegador monta a abertura com `background_color` e o ícone do manifesto.
- iOS: o Safari só usa `apple-touch-startup-image` com a resolução exata de cada aparelho. O aparelho do usuário é um **iPhone 13**: tela de 390 × 844 pontos a 3×, ou seja, **1170 × 2532 px**. Gera-se uma imagem só, em retrato, com `media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"`. Como o app é de uso pessoal, não se cobre o resto da família de aparelhos.

**8. nginx.**
- `location = /sw.js`, `location = /manifest.webmanifest` e o `registerSW.js` (se existir) com `Cache-Control: no-cache`. Os arquivos em `/assets/` continuam com cache longo (têm hash no nome). Conferir o `Content-Type` do manifesto (`application/manifest+json`).

**9. Privacidade.**
- As respostas da API ficam no armazenamento do navegador do aparelho, o mesmo que já recebe esses dados na tela. Perder o aparelho sem bloqueio de tela expõe isso: é responsabilidade do usuário bloquear o celular. A observação entra em `docs/05-deploy.md`. Limpar os dados do site apaga o cache.

**10. Página "Página não encontrada".**
- Rota coringa `{ path: '*', lazy: () => import('@/features/not-found/not-found-page') }` **fora** do `AppShell`, depois da rota do shell, em `frontend/src/app/router.tsx`: a página ocupa a tela inteira, sem menu nem topo (decisão do usuário, depois da primeira versão, que ficava dentro do shell). O `*` só vale quando nenhuma rota mais específica casa, inclusive `/metas/abc`. A rota `contas/:accountId/faturas` segue tratando o cartão inexistente com a mensagem dela.
- Conteúdo: "404" em destaque, "Página não encontrada", "Esta página não existe" e um único botão "Ir para o Início" (`Button asChild` com `Link to="/"`, 44 px de altura), centralizados em `min-h-dvh` e respeitando as áreas seguras do celular. O título (`h1`) lê "404 Página não encontrada". O endereço digitado não é mostrado.
- Sem rede, funciona sem código extra: o `navigateFallback: '/index.html'` da decisão 2 entrega o app para qualquer navegação (menos `/api/`), e o roteador mostra a página.
- *Alternativa:* `errorElement` na rota raiz. Descartada: no React Router ele também captura erros de renderização e de carregamento, e misturaria "endereço inexistente" com "algo quebrou".
- *Alternativa:* rota coringa dentro do shell, com o menu à mão (a primeira versão). Trocada pelo usuário por tela cheia: com um botão só, o caminho de volta é óbvio, e a página não parece uma área do app.
- O teste usa o roteador real (`createMemoryRouter(appRoutes)`, como o `app-shell.test.tsx`), com `/investimentos` e `/endereco-que-nao-existe`. O segundo nunca vira área, então o teste não quebra quando a Fase 3 criar Investimentos.

## Risks / Trade-offs

- [Service worker velho preso no aparelho] → `sw.js` sem cache no nginx e fluxo de atualização por aviso; teste manual de duas versões em sequência.
- [Mostrar números antigos como se fossem atuais] → O banner com data e hora é obrigatório e testado.
- [iOS limita armazenamento e pode apagar o cache do PWA sem uso] → Aceito: o app volta a funcionar com rede; offline é conforto, não requisito de integridade.
- [Uma área nova futura (ex.: `/investimentos`) ser registrada e a coringa continuar pegando] → A coringa só vale onde nenhuma outra rota casa; basta registrar a área.
- [O servidor responder 200 para endereços desconhecidos] → Aceito: app privado e de página única, sem indexação.
- [`NetworkFirst` com 5 s de espera deixa a tela lenta com rede ruim] → O tempo é curto o bastante e só afeta rede muito ruim.

## Open Questions

Nenhuma. O iPhone do usuário é um iPhone 13.
