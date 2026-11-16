---
name: Valora
description: Finanças pessoais em Clean Fintech + Organic Green, com o dinheiro em primeiro lugar e verde só nos detalhes.
colors:
  primary: "#027A48"
  primary-night: "#32D583"
  forest-green: "#05603A"
  mint: "#E7F6EC"
  off-white: "#F7F8F7"
  charcoal: "#141C17"
  near-black: "#0A0A0B"
  card-night: "#121214"
  secondary-night: "#222226"
  muted-foreground: "#5A655E"
  muted-foreground-night: "#A1A1AA"
  border: "#E3E8E4"
  border-night: "#27272B"
  destructive: "#B4372E"
  destructive-night: "#E5776C"
  warning: "#8A5A00"
  warning-surface: "#FBF1DC"
  chart-1: "#05773B"
  chart-2: "#DC6DA2"
  chart-3: "#5E6B10"
  chart-4: "#4C94EC"
  chart-5: "#916508"
  chart-6: "#A083EA"
  chart-7: "#A63C0C"
  chart-8: "#04A19B"
  chart-other: "#8A938C"
typography:
  display:
    fontFamily: "Montserrat Alternates, Inter Variable, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: "2.75rem"
    letterSpacing: "-0.02em"
  title-1:
    fontFamily: "Montserrat Alternates, Inter Variable, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: "2rem"
    letterSpacing: "-0.01em"
  value-lg:
    fontFamily: "Montserrat Alternates, Inter Variable, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: "2rem"
    letterSpacing: "-0.01em"
  title-2:
    fontFamily: "Montserrat Alternates, Inter Variable, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: "1.75rem"
  title-3:
    fontFamily: "Montserrat Alternates, Inter Variable, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: "1.5rem"
  body:
    fontFamily: "Inter Variable, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "1.5rem"
  body-sm:
    fontFamily: "Inter Variable, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.25rem"
  caption:
    fontFamily: "Inter Variable, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: "1rem"
  label:
    fontFamily: "Inter Variable, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: "1rem"
    letterSpacing: "0.06em"
rounded:
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "8px 20px"
  button-secondary:
    backgroundColor: "{colors.mint}"
    textColor: "{colors.forest-green}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "8px 20px"
  card-support:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.lg}"
    padding: "20px"
  card-hero:
    backgroundColor: "{colors.mint}"
    textColor: "{colors.forest-green}"
    rounded: "{rounded.xl}"
    padding: "24px"
  menu-item-active:
    backgroundColor: "{colors.mint}"
    textColor: "{colors.forest-green}"
    rounded: "{rounded.sm}"
    height: "44px"
---

# Design System: Valora

## Overview

**Creative North Star: "O Extrato Sereno"**

O Valora se comporta como um extrato bancário bem diagramado: o número que responde à pergunta vem primeiro, grande e em Montserrat Alternates, e todo o resto fica em segundo plano. O fundo é neutro (off-white no claro, quase preto sem tom de verde no escuro) e o verde aparece só onde ajuda a decidir: ação, foco, item ativo e valores positivos. Vermelho é reservado para estouro, erro e saldo negativo.

A linha é **Clean Fintech + Organic Green**: minimalista, amigável e sofisticada, diferenciada pela qualidade dos detalhes (alinhamento, espaçamento, números bem formatados) e não pela quantidade de efeitos. Os componentes são arredondados e calmos em repouso, e firmes ao toque: o feedback vem do gesto, não de decoração.

O sistema recusa o que faria o app parecer painel administrativo ou planilha: gradientes (só o símbolo do logotipo tem), desfoque de fundo, sombras fortes, verde saturado em superfícies grandes, roscas coloridas por categoria e qualquer enfeite que não ajude a entender.

**Key Characteristics:**
- Um cartão-herói por tela e cartões de apoio abaixo, com a mesma escala de peso: título pequeno, número grande, contexto em uma linha.
- Verde nos detalhes, superfície neutra; no escuro, cinzas sem tom de verde.
- Despesa na cor normal com `−`; receita em verde com `+`; vermelho nunca em despesa comum.
- Informação nunca só na cor: status sempre com ícone e texto.
- Celular primeiro, de 320 px a monitores largos, nos dois temas.

## Colors

Fundo neutro, verde vivo nos detalhes, vermelho só para atenção real. Os tokens abaixo seguem o frontmatter; o tema escuro usa os pares `-night`.

### Primary
- **Verde Ação** (#027A48): botão principal, link, foco, ícone do item ativo e valores positivos no tema claro. Texto sobre ele é branco (5,41:1).
- **Verde Vivo Noturno** (#32D583): o mesmo papel no tema escuro, com texto escuro (#04150C) por cima. Nunca serve como texto no tema claro.

### Secondary
- **Verde Floresta** (#05603A): texto sobre fundos verdes claros (item ativo do menu, cartão-herói).
- **Menta** (#E7F6EC): fundo do cartão-herói, do item ativo do menu, do botão secundário e da bolinha dos ícones. No escuro o `secondary` é cinza (#222226), não verde.

### Neutral
- **Off-white** (#F7F8F7): fundo da página no tema claro.
- **Carvão** (#141C17): texto principal no claro.
- **Quase Preto** (#0A0A0B): fundo da página no escuro; cartões em #121214.
- **Cinza Apagado** (#5A655E claro, #A1A1AA escuro): texto secundário, rótulos, legendas e eixos.
- **Borda** (#E3E8E4 claro, #27272B escuro): divisórias decorativas. Borda de campo é mais forte (#848F88 / #6B6B73), para passar de 3:1.

### Status e gráficos
- **Vermelho Atenção** (#B4372E claro, #E5776C escuro): erro, orçamento estourado, saldo negativo.
- **Âmbar de Aviso** (#8A5A00 sobre #FBF1DC): atenção e possível duplicata.
- **Paleta de gráficos:** oito slots em ordem fixa (verde, rosa, oliva, azul, âmbar, lavanda, terracota, turquesa) mais um cinza para "Outros". Valores do tema claro no frontmatter; o escuro tem pares próprios no `docs/06-design-system.md`.

### Named Rules
**The Detail-Green Rule.** O verde fica em ação, foco, item ativo e valores positivos. Superfície grande nunca é verde saturado; o único tom verde de fundo é a Menta clara do cartão-herói.

**The Slots-In-Order Rule.** Gráficos com mais de uma série usam os slots 1, 2, 3… sem pular. Ninguém escolhe cor no olho, e texto nunca usa a cor da série.

**The One-Color Categories Rule.** Categorias não têm cor própria. Gastos por categoria são barras numa cor só (`primary`), com o nome dizendo qual é qual.

## Typography

**Display Font:** Montserrat Alternates (com Inter Variable e system-ui de reserva)
**Body Font:** Inter Variable (com system-ui de reserva)

**Character:** Montserrat Alternates é geométrica e redonda, com o "a" de um andar só, como o nome do logotipo; ela carrega títulos, valores em destaque e o menu. Inter faz o trabalho pequeno e denso (listas, tabelas, formulários). Só os pesos 500, 600 e 700 da Montserrat são carregados.

### Hierarchy
- **Display** (700, 36/44 no celular, 48/56 a partir de 1024 px): o saldo total, um por tela.
- **Title 1** (700, 24/32): título da página.
- **Value LG** (700, 28/32): número-chave dos cartões de resumo.
- **Title 2** (600, 20/28): título de seção e de estados vazio e erro.
- **Title 3** (600, 16/24): título de card.
- **Body** (400, 16/24): texto padrão e campos (16 px evita o zoom automático no iPhone).
- **Body SM** (400 ou 500, 14/20): listas, tabelas, rótulos.
- **Caption** (500, 12/16): legendas, eixos, metadados.
- **Label** (600, 12/16, `letter-spacing: 0.06em`, caixa-alta, cinza apagado): título de cartão e nome de grupo do menu; até 3 palavras.

### Named Rules
**The Tabular Rule.** Números em listas e tabelas usam `font-variant-numeric: tabular-nums` para os valores alinharem. O saldo grande e isolado fica com os algarismos normais.

**The Label-Only Caps Rule.** Caixa-alta só no estilo `label`. Nunca em frases nem em botões.

## Layout

Base de 4 px, escala 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. A margem lateral é 16 px no celular, 24 no tablet e 32 no computador; o conteúdo vai até 1200 px. Cartões têm 16 a 24 px de espaço interno e 12 a 24 px entre si.

Celular primeiro: os estilos base são do celular e `md:`, `lg:`, `xl:` só ampliam. Do celular ao tablet (< 1024 px) o menu lateral abre por cima, pelo botão de menu no topo, com 300 px (no máximo 85% da tela). A partir de 1024 px ele fica fixo e retrátil (264 px aberto, 72 px só com ícones). Não existe barra inferior. O Início vira uma grade de 12 colunas no computador sem mudar a ordem do DOM.

Nunca há rolagem horizontal da página, de 320 px a monitores largos. No celular a tabela vira blocos por linha; em tela maior ela rola só dentro do próprio card, com a primeira coluna fixa. Toque mínimo de 44 × 44 px, nada depende de hover, e rodapés fixos respeitam as áreas seguras.

Larguras de conferência de toda tela: 320, 390, 768, 1024 e 1440 px, nos dois temas.

## Elevation & Depth

Híbrido e contido. No tema claro, cartões levam borda e uma sombra mínima (`0 1px 2px rgb(20 28 23 / 0.06)`); menus, popovers, diálogos e sheets sobem para `0 8px 24px rgb(20 28 23 / 0.10)`. No tema escuro não há sombra: a profundidade vem da superfície mais clara (#121214 sobre #0A0A0B) e da borda.

### Shadow Vocabulary
- **Cartão** (`box-shadow: 0 1px 2px rgb(20 28 23 / 0.06)`): cartões de apoio no claro; `none` no escuro.
- **Camada** (`box-shadow: 0 8px 24px rgb(20 28 23 / 0.10)`): menus, popovers, diálogos, sheets; no escuro, borda e fundo `popover` (#18181B).

### Named Rules
**The Border-First Rule.** A profundidade vem de superfície e borda. Sombra é suave e rara; sombra forte, glassmorphism e gradiente são proibidos (o `check:tokens` falha se acha gradiente ou `backdrop-blur` em componentes).

## Shapes

Forma redonda e acolhedora, sem exagero. `--radius` é 20 px, com a escala: 12 px (itens do menu, campos pequenos), 16 px (botões, campos), 20 px (cartões), 24 px (cartão-herói e painéis inferiores) e `full` para chips, badges, bolinhas de ícone, controle segmentado e barras de progresso. Bordas de 1 px; botões só com ícone são redondos. O ícone de categoria vive numa bolinha Menta com o ícone em Verde Floresta. Ícones são Lucide, traço 1,75 px, em 16, 20 ou 24 px.

## Components

Arredondados e calmos em repouso, táteis ao toque: ao pressionar o botão reduz a escala para 0,98 (desligado com `prefers-reduced-motion`), e o resto do feedback é uma troca discreta de fundo em 150 a 200 ms com `ease-out`.

### Buttons
- **Shape:** raio de 16 px (`radius-md`), altura de 44 px, texto 14 px peso 600, sem caixa-alta.
- **Primary:** fundo Verde Ação, texto branco, `padding` 8 × 20 px; hover a 90% de opacidade.
- **Secondary:** fundo Menta, texto Verde Floresta.
- **Outline / Ghost:** contorno ou só hover em `accent` (#EDF7F1 claro). **Destructive** só para excluir.
- **Focus:** anel de 2 px em `ring`, com 2 px de distância, só em `focus-visible`. **Disabled:** 50% de opacidade.

### Cards / Containers
- **Cartão-herói** (`DataCard tier="hero"`): fundo `secondary`, raio de 24 px, `padding` 20 a 24 px; a resposta principal da tela, um por tela, com número em `display`.
- **Cartão de apoio** (`DataCard`): fundo `card`, borda, sombra de cartão, raio de 20 px, `padding` 16 a 20 px.
- **Hierarquia interna:** título `label` com ícone de 14 px, número-chave (`Metric`), contexto em `text-sm` apagado e linhas sem moldura (`ValueRow`). Título, ícone e valor nunca têm o mesmo tamanho. Nada de card dentro de card sem necessidade.

### Inputs / Fields
- **Style:** borda visível (≥ 3:1), raio de 16 px, rótulo sempre visível, 16 px de texto. O campo de valor digita da direita para a esquerda, como em apps de banco.
- **Focus:** anel `ring`. **Error:** mensagem embaixo do campo em `destructive`, em linguagem simples.

### Navigation
- Menu lateral agrupado (Dia a dia, Planejamento, Patrimônio, rodapé com Categorias e Ajustes). Item de 44 px, raio de 12 px, nome em Montserrat Alternates 16 px peso 500; o item ativo fica Menta, em negrito, com o ícone em `primary`. Só o ativo tem fundo.
- Recolhido, só ícones de 44 px com tooltip. No celular, abre por cima com o fundo escurecido.

### Barras de orçamento e de categoria
Trilho `track`, barra na cor do status (dentro, atenção, estourou), sempre com ícone e texto. Barras de categoria e de posição têm o comprimento da fatia do total, igual ao percentual escrito ao lado.

### Skeleton
Carregando é sempre um skeleton no formato do conteúdo, nunca spinner. No claro usa `muted-foreground` a 25% (o `muted` quase some sobre o cartão); no escuro usa `accent`.

## Do's and Don'ts

### Do:
- **Do** deixar o número principal ser o maior texto do cartão, em Montserrat Alternates 700.
- **Do** mostrar receita como `+ R$ 1.250,00` em `positive` e despesa como `− R$ 89,90` na cor normal, com o menos tipográfico (U+2212).
- **Do** usar tokens (`bg-card`, `text-muted-foreground`…) em todo componente, nunca hex direto.
- **Do** dar a toda tela carregando (skeleton), vazio e erro, e marcar funcionalidade não pronta com o selo "Demonstração".
- **Do** formatar moeda, datas e percentuais pelas funções de `frontend/src/lib`, em pt-BR e `America/Sao_Paulo`.
- **Do** recalcular o contraste e atualizar as tabelas do `docs/06-design-system.md` sempre que uma cor mudar.

### Don't:
- **Don't** usar gradiente (exceto no símbolo do logotipo), glassmorphism ou sombra forte.
- **Don't** pintar despesa de vermelho; vermelho é só para estouro, erro e saldo negativo.
- **Don't** usar rosca colorida por categoria nem dar cor fixa a uma categoria.
- **Don't** usar verde saturado em superfície grande nem o Verde Vivo Noturno como texto no tema claro.
- **Don't** comunicar estado só pela cor: sempre ícone e texto, sinal em receita e despesa.
- **Don't** dar à interface cara de painel administrativo ou de planilha, nem encher o cartão de elementos competindo.
- **Don't** usar caixa-alta fora do estilo `label`, nem animações chamativas (contador girando, confete).
