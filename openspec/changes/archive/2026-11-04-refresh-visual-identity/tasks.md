## 1. Preparação e tokens

- [x] 1.1 Carregar as skills `/frontend-design:frontend-design` e `/ui-ux-pro-max`; recalcular o contraste de todos os pares da tabela do `design.md` com a fórmula WCAG 2 e ajustar qualquer token que fique abaixo de 4,5:1 (texto) ou 3:1 (borda de campo e foco)
- [x] 1.2 Trocar os tokens de cor, raio e elevação em `frontend/src/styles/globals.css` pelos valores do `design.md` (claro, escuro, `--radius: 1.25rem` com as variações `-8px`, `-4px`, `+0`, `+4px`, grade e trilho dos gráficos, sidebar)
- [x] 1.3 Declarar os estilos `label` (12/16, 600, caixa-alta, `0.06em`), `display` (36/44 e 48/56 a partir de 1024 px) e `value-lg` (28/32, Manrope 700) como `@utility` no `globals.css`
- [x] 1.4 Teste de contraste: lê `globals.css`, calcula os pares da tabela do `design.md` nos dois temas e falha se algum passar abaixo do mínimo; também confere que o `background` escuro é `#0B0D0C` e que `bg-card` vale `#FFFFFF` (claro) e `#131614` (escuro)
- [x] 1.5 Conferir o contraste dos oito slots dos gráficos, do status de orçamento e do `destructive` sobre o `card` novo nos dois temas (mínimo 3:1) e registrar os números na documentação

## 2. Verificação contra efeitos proibidos

- [x] 2.1 Estender o `check:tokens` para falhar também com `bg-gradient-`, `bg-linear-` e `backdrop-blur` em `src/components` e `src/features`
- [x] 2.2 Testes do `check:tokens`: arquivo com `backdrop-blur` falha, arquivo com `bg-gradient-to-r` falha, arquivo só com tokens passa

## 3. Componentes e shell

- [x] 3.1 `Button`: tamanho padrão e `icon` com 44 px de altura, `radius-md`, `scale(0.98)` ao pressionar; ajustar `Input` e `Skeleton` ao novo raio
- [x] 3.2 Menu lateral: itens com `radius-sm` e 44 px, ícone do item ativo em `primary`, nome do grupo no estilo `label`, cabeçalho "Valora" em Manrope 700
- [x] 3.3 Topo de tela: fundo opaco `background` com borda inferior (sem `backdrop-blur`); botão de ocultar valores e botão de menu redondos de 44 px
- [x] 3.4 `EmptyState` e `ErrorState`: card com `radius-lg`, ícone dentro de um círculo (`secondary` no vazio, `warning-surface` no erro), título em `title-2`; manter "Tentar de novo" e a ausência de detalhe técnico
- [x] 3.5 Tela de Ajustes: card com o rótulo "Tema" (estilo `label`, com ícone) e controle segmentado em pílula; manter `radiogroup`, `aria-checked` e 44 px por opção
- [x] 3.6 Ajustar os testes existentes que dependem de texto, classe ou estrutura mudados e escrever o teste da tela de Ajustes (opção marcada, trocar de tema)

## 4. Conferência visual

- [x] 4.1 Conferir todas as rotas em 320, 390, 768, 1024 e 1440 px, nos temas claro e escuro, sem rolagem horizontal, com os estados vazio, carregando (skeleton) e erro
- [x] 4.2 Revisar o resultado com `/ui-ux-pro-max`: foco visível, áreas de toque de 44 px, contraste, e comparar com a referência (cantos, rótulos, números) sem copiar marca nem layout
- [x] 4.3 Rodar `typecheck`, `lint`, `format:check`, `test` e `build` no `frontend`

## 5. Documentação

- [x] 5.1 Atualizar `docs/06-design-system.md`: princípios (reescrever "Calma" e "Evitar"), paleta, tokens semânticos, tabela de contraste, status de orçamento, raios, elevação, tipografia (`label`, `display`, `value-lg`), componentes, a seção "Tokens em CSS" (igual ao `globals.css`) e a nota do Figma desatualizado
- [x] 5.2 Atualizar `docs/design/identidade-visual.md`: paleta de verdes, tema escuro quase preto, raios maiores, "evitar" sem preto puro e sem "moderada"
- [x] 5.3 Acrescentar "Identidade visual atualizada" em Fase 0 → Front-end de `docs/07-roadmap.md` e marcar `[x]`

## 6. Revisão do usuário: tema neutro, menu retrátil e logotipo

- [x] 6.1 Trocar os tokens do tema escuro em `globals.css` por cinzas neutros (decisões 1 e 2 do `design.md`: `background`, `card`, `popover`, `sidebar`, `muted`, `secondary`, `accent`, `border`, `input`, grade e trilho) e acrescentar os tokens `--logo-ribbon-deep`, `--logo-ribbon` e `--logo-ribbon-light` nos dois temas
- [x] 6.2 Atualizar o teste de tokens: valores esperados (`#0A0A0B`, `#121214`), contraste dos pares novos e um teste que falha se uma superfície ou borda do tema escuro tiver mais de 4 de diferença entre os canais R, G e B
- [x] 6.3 Menu retrátil: `SidebarProvider` controlado com o estado salvo por `lib/storage.ts` (chave `valora.sidebar`, sem o cookie do shadcn/ui), `Sidebar collapsible="icon"` com 264 px e 72 px, botão "Recolher menu" e "Expandir menu" (só a partir de 1024 px, com `aria-expanded`) e `tooltip` em cada item
- [x] 6.4 Espaçamento do menu (decisão 10): margem de 16 px, itens de 44 px com 4 px entre eles, 24 px antes do rodapé, divisória acima do rodapé, cabeçalho de 72 px e topo de tela com 72 px a partir de 1024 px; item ativo em bloco `secondary` e o resto sem fundo nem borda
- [x] 6.5 Logotipo: `components/brand/valora-mark.tsx` (símbolo em SVG, redesenhado a partir da imagem enviada, cores por `var(--logo-...)`) e `valora-logo.tsx` (símbolo + "Valora" em Manrope 700, link para `/` com `aria-label="Valora"`), no cabeçalho do menu, expandido e recolhido
- [x] 6.6 Testes: recolher e expandir troca o nome do botão e persiste; sem `localStorage` o menu abre expandido; o ícone recolhido mostra o tooltip ao receber o foco; o botão de recolher não aparece no celular; o logotipo tem o nome "Valora" e leva ao Início; ajustar os testes do shell que mudarem
- [x] 6.7 Conferir no navegador, em 320, 390, 768, 1024 e 1440 px e nos dois temas, com o menu expandido e recolhido: sem rolagem horizontal, itens de 44 px com 4 px de espaço, sem verde nas superfícies do tema escuro, e o logotipo legível nos dois temas
- [x] 6.8 Atualizar `docs/06-design-system.md` (tokens do tema escuro, tabela de contraste, seção "Tokens em CSS", menu de 264 px e 72 px retrátil, espaçamento, logotipo e a exceção do degradê) e `docs/design/identidade-visual.md` (tema escuro neutro)
