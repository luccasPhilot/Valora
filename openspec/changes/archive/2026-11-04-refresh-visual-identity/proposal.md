## Why

O visual entregue pela `setup-web-foundation` segue o Design System à risca, mas ficou contido demais: cantos pequenos, verde apagado (`#286B50`), tema escuro esverdeado e rótulos sem hierarquia. A referência que o usuário quer é um produto de fintech moderno, como o Meu Pluggy: cantos bem arredondados, fundo escuro quase preto, rótulos pequenos em caixa-alta com ícone e números grandes em destaque, com o verde como cor dos detalhes. Fazer isso agora, enquanto o app só tem o menu, o topo e os estados vazios, custa pouco; depois que existirem as telas com dados, o retrabalho seria bem maior.

Na revisão da primeira versão, o usuário apontou três problemas e um pedido: o tema escuro ainda parecia verde (era para ser escuro), o menu estava apertado e sem jeito de recolher, e o Valora ainda não tinha logotipo. Esta change inclui essas correções, com o logotipo desenhado a partir da imagem que o usuário enviou (`Valora Green Ribbon Logo.png`).

## What Changes

- **Paleta de verdes com vários tons**, mais viva que a atual, no lugar do verde-floresta único. O verde forte (700) é usado em texto, botões e foco, e os tons claros ficam para fundos e detalhes. Todos os pares de texto passam de 4,5:1 e os de borda de campo e foco passam de 3:1 (números na `design.md`).
- **Tema escuro neutro e quase preto** (cinzas sem tom de verde, fundo `#0A0A0B`), no lugar dos verdes muito escuros. Nenhuma superfície do tema escuro, nem o item ativo do menu, fica esverdeada: o verde fica só nos detalhes (botão principal, ícone do item ativo, foco, valores positivos e barras).
- **Cantos maiores**: cards com 20 px (hoje 12 px), card de saldo e painéis com 24 px, botões e campos com 16 px, chips e badges em pílula.
- **Rótulo de seção** (novo estilo de texto): caixa-alta pequena, com ícone em `primary` ao lado, para títulos de card.
- **Números maiores**: `display` passa para 36 px no celular e 48 px no computador; novo estilo `value-lg` (28 px) para os valores dos cards de resumo.
- **Menu retrátil no computador**: um botão no cabeçalho recolhe o menu para uma coluna de 72 px só com ícones (com tooltip com o nome da área) e expande de volta para 264 px. A escolha fica salva no aparelho. Abaixo de 1024 px o menu continua abrindo por cima, como hoje.
- **Menu mais espaçado e minimalista**: margem interna de 16 px, itens de 44 px separados por 4 px, 24 px entre o grupo e o rodapé, divisória acima do rodapé e cabeçalho de 72 px. O topo de tela passa a ter 72 px a partir de 1024 px, para alinhar com o cabeçalho do menu.
- **Logotipo do Valora** no cabeçalho do menu: o símbolo (um "V" de duas fitas verdes) e o nome em Manrope 700; recolhido, só o símbolo. O símbolo é redesenhado em SVG a partir da imagem enviada, com cores de tokens.
- **Aplicação no que já existe**: menu lateral (item ativo, grupos, rodapé), topo de tela (sem desfoque no fundo), estados vazio e erro, botão de ocultar valores e a tela de Ajustes (escolha de tema como controle segmentado). O botão padrão passa a ter 44 px de altura, como pede o Design System.
- **Documentação**: atualizar `docs/06-design-system.md` (princípios, cores, contraste, tipografia, raios, elevação, componentes, tokens em CSS) e `docs/design/identidade-visual.md` (paleta, tema escuro, "bordas arredondadas de maneira moderada", "evitar preto puro").
- **Mantido**: gradientes, glassmorphism e sombras fortes continuam proibidos. As regras de valores (receita em `positive` com `+`, despesa na cor normal com `−`, vermelho só para estouro, erro e saldo negativo), a lista de barras de uma cor só para gastos por categoria e a paleta de oito cores dos gráficos não mudam.

Itens do roadmap: nenhum item novo é coberto. A change reabre o trabalho visual dos itens de Fase 0 → Front-end (já marcados `[x]`) e acrescenta um item, "Identidade visual atualizada", marcado ao arquivar.

**Contraria os documentos** (decisão do usuário, já tomada na conversa que originou esta proposta):

- `docs/06-design-system.md`:
  - os princípios "Calma" e "Evitar… cores muito saturadas";
  - o tema escuro "em verdes muito escuros em vez de preto puro";
  - o raio de 12 px dos cards e o nome do grupo do menu "sem caixa alta";
  - "Menu lateral fixo de 240 px, sempre visível, sem botão de menu" no computador: passa a ser retrátil, com 264 px expandido e 72 px recolhido;
  - "sem gradiente": o símbolo do logotipo, que tem degradê nas fitas, é a única exceção.
- `docs/design/identidade-visual.md`:
  - "Evitar preto puro como cor predominante" no tema escuro;
  - "Bordas arredondadas de maneira moderada";
  - a paleta inicial, que pedia só "pequenos ajustes". Aqui, Primary Green e Forest Green mudam de tom.

Os dois documentos são atualizados na própria change, como manda o `CLAUDE.md`.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `web-shell`: muda o requisito de tokens (valores de `bg-card` etc. nos dois temas) e o de navegação por menu lateral (menu de 264 px, retrátil a partir de 1024 px); entram requisitos de paleta e tema escuro neutro, raios, estilos de texto de destaque (rótulo de seção e números grandes), controle de tema em Ajustes, menu retrátil, espaçamento do menu e logotipo.

## Impact

- **Documentação:** `docs/06-design-system.md`, `docs/design/identidade-visual.md`, `docs/07-roadmap.md` (um item novo na Fase 0 → Front-end).
- **Código** (só `frontend/`):
  - `src/styles/globals.css` (tokens, raios);
  - componentes: `ui/button`, `ui/sidebar`, `ui/input`, `ui/skeleton`;
  - `components/layout/*`, `components/states/*`, `components/hide-values-button.tsx`;
  - `components/brand/` (novo: símbolo e logotipo em SVG) e o estado de recolher o menu, salvo com `lib/storage.ts` no lugar do cookie do shadcn/ui;
  - `features/settings/settings-page.tsx`.
- **Sem mudança** em backend, API, banco, formatação ou rotas. Sem dependência nova.
- **Testes:** os existentes continuam valendo; entram testes de contraste dos tokens e do raio mínimo, e os testes de tela ajustam seletores se mudarem textos.
- **Figma:** o [arquivo do Valora](https://www.figma.com/design/MNdGWT8ZnSZkTRxlvoI0Ie/Valora) fica desatualizado em relação aos tokens novos. Atualizá-lo é tarefa do usuário, fora desta change; o texto do Design System continua sendo a fonte da verdade.

## Fora do escopo

- Telas com dados (Início, Transações, Orçamentos, Contas, Categorias) e gráficos novos: cada um chega na sua change da Fase 1.
- Mudar a navegação: continua o menu lateral, sem barra inferior. Só ele passa a recolher no computador.
- Favicon, ícone do PWA (Fase 2) e variações do logotipo (monocromático, fundo claro e escuro, versão para impressão). Aqui só entram o símbolo e o nome dentro do app.
- Gradientes, glassmorphism e sombras fortes.
- Mudar a paleta de oito cores dos gráficos. Só conferimos o contraste dela sobre as superfícies novas.
- Atualizar o arquivo do Figma.
- Itens de "Fora do escopo" de `docs/01-produto.md`: nada nesta change os toca.
