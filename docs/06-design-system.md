# Design System

Construído a partir do [guia de identidade visual](design/identidade-visual.md) e do [moodboard](design/moodboard.png). A linha é **Clean Fintech + Organic Green**: minimalista, amigável e sofisticada, diferenciada pela qualidade dos detalhes e não pela quantidade de efeitos.

Os tokens já estão no formato do shadcn/ui com Tailwind v4 (seção [Tokens em CSS](#tokens-em-css)), para virar código direto na Fase 0.

**Figma:** o [arquivo do Valora](https://www.figma.com/design/MNdGWT8ZnSZkTRxlvoI0Ie/Valora) tem as variáveis com os mesmos nomes destes tokens, os estilos de texto e de sombra, os ícones e os componentes. As telas do celular estão em construção. O plano gratuito do Figma só permite um modo por coleção, então as cores ficam em duas coleções com os mesmos nomes, **Color · Light** e **Color · Dark**, em vez de uma coleção com dois modos. **Este documento é a fonte da verdade:** se o Figma e este texto divergirem, vale o texto. Hoje eles divergem: as cores, os raios e os estilos de texto mudaram na change `refresh-visual-identity`, e o Figma ainda tem os valores antigos até ser atualizado.

## Princípios

- **O dinheiro em primeiro lugar.** Saldo, gasto do mês e limite do orçamento são as informações mais fortes da tela. O resto fica em segundo plano.
- **Calma, com cor só onde importa.** Fundo neutro (quase preto no tema escuro), verde vivo nos detalhes (ação, item ativo, foco, valores positivos), vermelho só quando algo pede atenção de verdade.
- **Uma coisa por vez.** Cada card responde uma pergunta. Nada de card dentro de card sem necessidade.
- **Detalhe acima de efeito.** Alinhamento, espaçamento e números bem formatados valem mais que gradiente, sombra ou animação.
- **Responsivo em qualquer tela.** Do celular pequeno ao monitor largo, cada tela funciona e fica bem cuidada. Veja [Responsividade](#responsividade).

**Evitar:** gradientes (só o símbolo do logotipo tem), glassmorphism (desfoque de fundo), sombras fortes, verde saturado em superfícies grandes (ele fica nos detalhes), muitos elementos competindo, cara de painel administrativo, decoração que não ajuda a entender. O `check:tokens` falha se achar gradiente ou `backdrop-blur` em componentes.

## Cores

### Paleta da marca

| Nome | Hex | Uso |
|---|---|---|
| Forest Green | `#05603A` | Texto sobre fundos verdes claros (`secondary-foreground`) |
| Primary Green | `#027A48` | Ações principais, links, foco, valores positivos (tema claro) |
| Bright Green | `#32D583` | Base do verde do tema escuro (ação, foco, valores positivos). **Nunca como texto no tema claro** |
| Mint | `#E7F6EC` | Fundo de destaque suave, item ativo do menu, chips (tema claro) |
| Off-white | `#F7F8F7` | Fundo da página no tema claro |
| Charcoal | `#141C17` | Texto principal no tema claro |
| Near-black | `#0A0A0B` | Fundo da página no tema escuro (cinza neutro, sem tom de verde) |

O verde tem vários tons, com papéis fixos: o forte (`#027A48`) leva texto e botão no claro; o vivo (`#32D583`) leva o mesmo papel no escuro; os claros ficam para fundos. Tons como `#039855` (3,73:1 sobre branco) só servem para detalhes sem texto. As seis cores do guia original viraram sete: Primary e Forest Green ficaram mais vivos, o Sage Green deu lugar ao Bright Green e entrou o Near-black. Os tons derivados (texto secundário, bordas, estados) foram escolhidos para passar no contraste.

### Tokens semânticos

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `background` | `#F7F8F7` | `#0A0A0B` | Fundo da página |
| `foreground` | `#141C17` | `#EDEDEF` | Texto principal |
| `card` | `#FFFFFF` | `#121214` | Cards e superfícies |
| `card-foreground` | `#141C17` | `#EDEDEF` | Texto em cards |
| `popover` | `#FFFFFF` | `#18181B` | Menus, popovers, tooltips |
| `popover-foreground` | `#141C17` | `#EDEDEF` | |
| `primary` | `#027A48` | `#32D583` | Botão principal, link, item ativo (ícone) |
| `primary-foreground` | `#FFFFFF` | `#04150C` | Texto sobre `primary` |
| `secondary` | `#E7F6EC` | `#222226` | Botão secundário, item ativo do menu, círculo dos ícones, card de destaque (saldo). No escuro é cinza, não verde |
| `secondary-foreground` | `#05603A` | `#EDEDEF` | Texto sobre `secondary` |
| `muted` | `#EEF1EE` | `#1B1B1F` | Fundos neutros, skeleton |
| `muted-foreground` | `#5A655E` | `#A1A1AA` | Texto secundário, rótulos de seção, legendas, eixos |
| `accent` | `#EDF7F1` | `#1B1B1F` | Hover de menus e botões fantasma |
| `accent-foreground` | `#05603A` | `#EDEDEF` | |
| `destructive` | `#B4372E` | `#E5776C` | Erro, orçamento estourado, saldo negativo |
| `destructive-foreground` | `#FFFFFF` | `#1B0F0D` | Texto sobre `destructive` |
| `positive` | `#027A48` | `#32D583` | Receitas e variações positivas |
| `warning` | `#8A5A00` | `#E3B04B` | Texto de atenção |
| `warning-surface` | `#FBF1DC` | `#2E2716` | Fundo de aviso |
| `border` | `#E3E8E4` | `#27272B` | Bordas e divisórias (decorativas) |
| `input` | `#848F88` | `#6B6B73` | Borda de campos (precisa ser visível: ≥ 3:1) |
| `ring` | `#027A48` | `#32D583` | Foco do teclado |
| `sidebar` | `#FFFFFF` | `#0E0E10` | Fundo do menu lateral |

O tema escuro é **quase preto e neutro**: todas as superfícies e bordas são cinzas sem tom de verde (a diferença entre os canais R, G e B é de no máximo 4, e um teste confere isso). O verde só aparece nos detalhes: botão, ícone e texto do item ativo, foco e valores positivos. O verde de ação fica mais claro (`#32D583`) e o texto sobre ele fica escuro.

Os tokens `--logo-ribbon-deep`, `--logo-ribbon` e `--logo-ribbon-light` (`#0E7A47`, `#2FA866`, `#5FCB86` no claro; `#17894F`, `#3FB873`, `#A6EBB4` no escuro) são só do [logotipo](#logotipo).

### Contraste verificado

Calculado com a fórmula WCAG 2. Mínimo: 4,5:1 para texto e 3:1 para bordas de campo e foco.

| Par | Claro | Escuro |
|---|---|---|
| `foreground` sobre `background` | 16,33 | 16,93 |
| `foreground` sobre `card` | 17,38 | 16,00 |
| `foreground` sobre `muted` | 15,27 | 14,68 |
| `muted-foreground` sobre `background` | 5,70 | 7,72 |
| `muted-foreground` sobre `card` | 6,07 | 7,30 |
| `muted-foreground` sobre `muted` | 5,34 | 6,70 |
| `muted-foreground` sobre `accent` | 5,55 | 6,70 |
| `primary-foreground` sobre `primary` | 5,41 | 9,82 |
| `primary` como texto sobre `card` | 5,41 | 9,78 |
| `primary` como texto sobre `background` | 5,08 | 10,35 |
| `primary` como texto sobre `secondary` (ícone, variação no card de saldo) | 4,84 | 8,29 |
| `secondary-foreground` sobre `secondary` | 6,86 | 13,56 |
| `accent-foreground` sobre `accent` | 7,00 | 14,68 |
| `muted-foreground` sobre `secondary` (rótulos no card de saldo) | 5,43 | 6,18 |
| `destructive` como texto sobre `card` | 5,95 | 6,40 |
| `destructive-foreground` sobre `destructive` | 5,95 | 6,41 |
| `warning` sobre `warning-surface` | 5,28 | 7,46 |
| `warning` sobre `card` | 5,93 | 9,42 |
| `input` sobre `card` | 3,35 | 3,54 |
| `ring` sobre `background` | 5,08 | 10,35 |

Os números saem do teste `frontend/test/design-tokens.test.ts`, que também confere o status de orçamento, os oito slots dos gráficos e o "Outros" sobre `card` (mínimo de 3:1). Se um token mudar, o teste falha até este documento e o CSS voltarem a bater.

### Valores financeiros

- **Receita:** `+ R$ 1.250,00` na cor `positive`.
- **Despesa:** `− R$ 89,90` na cor do texto normal (`foreground`), **não em vermelho**. A maior parte das transações é despesa; pintar todas de vermelho deixa a tela alarmante e tira o peso dos alertas de verdade.
- **Saldo negativo de conta** (cheque especial): `destructive`, com o sinal de menos.
- **Transferências internas** (pagamento de fatura, entre contas suas): texto `muted-foreground`, com ícone de setas. Não entram nos totais.
- Use o sinal de menos tipográfico (`−`, U+2212), não o hífen.

### Status de orçamento

Sempre com **ícone + texto**, nunca só a cor.

| Estado | Regra | Claro | Escuro | Ícone Lucide | Texto |
|---|---|---|---|---|---|
| Dentro | abaixo de 80% do limite | `#027A48` | `#32D583` | `circle-check` | "R$ 410 de R$ 1.000" |
| Atenção | de 80% a 100% | `#BC8019` | `#E3B04B` | `triangle-alert` | "82% do limite" |
| Estourou | acima de 100% | `#B4372E` | `#E5776C` | `circle-alert` | "R$ 120 acima do limite" |

Todas passam de 3:1 sobre `card` nos dois temas (claro: 5,41 / 3,37 / 5,95; escuro: 9,78 / 9,42 / 6,40). Trilho da barra: `#E8ECE8` no claro e `#27272B` no escuro.

### Paleta de gráficos

Oito cores para gráficos com **mais de uma série** (receitas x despesas, patrimônio por tipo, comparações nos relatórios). A ordem é fixa: a série 1 sempre usa a cor 1, a série 2 a cor 2, e assim por diante. Ninguém escolhe cor "no olho".

| Slot | Família | Claro | Escuro |
|---|---|---|---|
| 1 | verde | `#05773B` | `#137D41` |
| 2 | rosa | `#DC6DA2` | `#D16B9B` |
| 3 | oliva | `#5E6B10` | `#6E7E01` |
| 4 | azul | `#4C94EC` | `#2D6FBE` |
| 5 | âmbar | `#916508` | `#916508` |
| 6 | lavanda | `#A083EA` | `#997FDE` |
| 7 | terracota | `#A63C0C` | `#AC502E` |
| 8 | turquesa | `#04A19B` | `#04A19B` |
| — | "Outros" | `#8A938C` | `#7E8E85` |

**Validação** (simulação de protanopia e deuteranopia de Machado et al. 2009; distância em OKLab ×100; meta ≥ 8 para daltonismo e ≥ 15 para visão normal):

| | Claro (sobre `#FFFFFF`) | Escuro (sobre `#121214`) |
|---|---|---|
| Pior par vizinho, daltonismo | 15,2 | 13,0 |
| Pior par vizinho, visão normal | 28,4 | 24,5 |
| Contraste mínimo com a superfície | ≥ 3:1 em todas (mín. 3,17 em "Outros") | ≥ 3:1 em todas (mín. 3,51, slot 7) |

A ordem foi escolhida testando todas as combinações e ficando com a que mais separa cores vizinhas. **A garantia vale para cores vizinhas na ordem** (barras agrupadas, áreas empilhadas, linhas). Duas cores distantes na ordem (por exemplo, oliva e âmbar) podem se confundir quando aparecem lado a lado. Por isso:

- gráficos de barras, áreas e linhas usam os slots em sequência, sem pular;
- gráficos em que qualquer marca pode ficar ao lado de qualquer outra (rosca, dispersão) não usam a paleta de oito cores.

### Gastos por categoria

O moodboard mostra uma rosca colorida por categoria. **No Valora, essa informação vira uma lista de barras horizontais numa cor só:**

```
Moradia        ████████████████████  R$ 1.900,00   38%
Alimentação    ████████████████      R$ 1.600,00   32%
Transporte     ███████               R$   750,00   15%
Saúde          ███                   R$   300,00    6%
Lazer          ██                    R$   250,00    5%
Outros         ██                    R$   200,00    4%
```

Motivos:

1. **Cor fixa por categoria não é segura.** Com 8 cores e categorias quaisquer lado a lado na rosca, vários pares ficam indistinguíveis. No teste, o pior par ficou com distância 0,8 para daltônicos e 7,2 para visão normal, quando o mínimo é 15.
2. **Barra é mais fácil de comparar** que fatia de rosca, e cabe melhor no celular.
3. **O nome já identifica a categoria.** A cor não precisa fazer esse trabalho.

Regras da lista:
- mostra as 5 maiores categorias e junta o resto em "Outros";
- barras em `primary`, "Outros" na cor cinza da tabela acima;
- ícone da categoria, nome, valor e percentual em texto normal;
- toque abre as transações daquela categoria.

Categorias não têm cor própria. O ícone de categoria aparece numa bolinha `secondary` com o ícone em `secondary-foreground`, o mesmo verde dos atalhos do moodboard.

## Tipografia

Duas famílias, servidas pelo próprio app (pacotes `@fontsource/montserrat-alternates` e `@fontsource-variable/inter`), sem depender do Google Fonts:

- **Montserrat Alternates:** títulos, valores em destaque, itens do menu e o nome "Valora". Geométrica e redonda, com o "a" de um andar só e a cauda no pé do "a", como o nome do logotipo. Só os pesos 500, 600 e 700 são carregados (a fonte não é variável).
- **Inter:** texto, listas, tabelas e formulários. Muito legível em tamanhos pequenos.

| Estilo | Tamanho / altura da linha | Peso | Fonte | Uso |
|---|---|---|---|---|
| `display` | 36/44 (celular), 48/56 (computador) | 700 | Montserrat Alternates | Saldo total |
| `title-1` | 24/32 | 700 | Montserrat Alternates | Título da página |
| `value-lg` | 28/32 | 700 | Montserrat Alternates | Valores dos cards de resumo |
| `title-2` | 20/28 | 600 | Montserrat Alternates | Título de seção, título de estado vazio e de erro |
| `title-3` | 16/24 | 600 | Montserrat Alternates | Título de card |
| `body` | 16/24 | 400 | Inter | Texto padrão e campos (16 px evita o zoom automático no iPhone) |
| `body-sm` | 14/20 | 400 ou 500 | Inter | Listas, tabelas, rótulos |
| `caption` | 12/16 | 500 | Inter | Legendas, eixos de gráfico, metadados |
| `label` | 12/16 | 600 | Inter | Título de card e nome de grupo do menu: caixa-alta, `letter-spacing: 0.06em`, `muted-foreground`, com ícone de 16 px em `primary` à esquerda (nos grupos do menu, sem ícone) |

- Títulos e `display` com `letter-spacing: -0.01em` a `-0.02em`.
- Caixa-alta só no estilo `label`, sempre curto (até 3 palavras). Não use em frases nem em botões.
- **Números em listas e tabelas** usam `font-variant-numeric: tabular-nums`, para os valores alinharem. Números grandes e isolados (o saldo) ficam com os algarismos normais.

## Espaçamento

Base de 4 px. Escala: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.

| Uso | Celular | Computador |
|---|---|---|
| Margem lateral da página | 16 | 32 |
| Espaço entre cards | 12 | 16 a 24 |
| Espaço interno do card | 16 | 20 a 24 |
| Espaço entre itens de lista | 12 | 12 |

### Densidade no computador

Todas as medidas em px deste documento (tamanhos de texto, espaços, 264 px do menu, 44 px de toque, 72 px do cabeçalho) valem na **base de 16 px**. Em telas de **1024 px ou mais com mouse** (`pointer: fine`), a base cai para **14 px** (`html { font-size: 87.5% }` em `globals.css`), e como tudo é `rem` o app inteiro escala por 87,5%: o menu expandido tem 231 px, os itens do menu e os botões 38,5 px, o cabeçalho 63 px, o saldo (`display`) 42 px. Celular, tablet e telas de toque ficam em 16 px, com os 44 px de toque.

- A porcentagem (e não `14px`) respeita a preferência de tamanho de fonte do navegador.
- Não use `zoom` nem `transform: scale` para isso, e prefira `rem` a `px` em tamanhos novos, senão o valor não escala.
- 38,5 px continua acima do mínimo de 24 px do WCAG 2.2 (critério 2.5.8).
- Os gráficos (Recharts) medem fonte e margens em px e **não** escalam com a base.

## Bordas e raios

`--radius: 1.25rem` (20 px), com as variações do shadcn/ui:

| Token | Valor | Uso |
|---|---|---|
| `radius-sm` | 12 px | itens do menu, campos pequenos |
| `radius-md` | 16 px | botões, campos |
| `radius-lg` | 20 px | cards |
| `radius-xl` | 24 px | card de saldo, painéis inferiores (sheets) |
| `full` | 9999 px | chips, badges, avatares, bolinhas de ícone, controle segmentado, barras de progresso |

## Elevação

| Nível | Claro | Escuro | Uso |
|---|---|---|---|
| 0 | só `border` | só `border` | Itens de lista, áreas internas |
| 1 | `border` + `0 1px 2px rgb(20 28 23 / 0.06)` | `border`, sem sombra | Cards |
| 2 | `0 8px 24px rgb(20 28 23 / 0.10)` | `border` + fundo `popover` | Menus, popovers, diálogos, sheets |

No tema escuro, a profundidade vem da superfície mais clara e da borda, não de sombra.

## Logotipo

O logotipo do Valora tem o **símbolo** e o **nome**. O símbolo é um "V" de duas fitas verdes: a da esquerda mais escura, a da direita mais clara, com uma dobra no encontro. Foi redesenhado em SVG a partir da imagem do logotipo (`Valora Green Ribbon Logo.png`) e fica em `frontend/src/components/brand/`.

- Menu expandido: símbolo (28 px de altura) e o nome "Valora" em Montserrat Alternates 500, com 12 px entre os dois. Recolhido: só o símbolo.
- É um link para o Início, com nome acessível "Valora".
- As cores vêm dos tokens `--logo-ribbon-deep`, `--logo-ribbon` e `--logo-ribbon-light`, que mudam com o tema para a fita clara não sumir sobre o fundo branco.
- **Exceção ao "sem gradiente":** o símbolo tem um degradê suave dentro de cada fita, como no logotipo original. Nenhuma outra peça da interface usa degradê.
- **Favicon:** o símbolo em SVG, sem o nome (`frontend/public/favicon.svg`, declarado em `index.html`). Ele repete o desenho de `valora-mark.tsx` com as cores escritas no arquivo (as do tema escuro), porque a aba do navegador não enxerga os tokens. Se o desenho do símbolo mudar, atualize os dois.
- O ícone do app instalável (Fase 2) e as variações do logotipo (monocromático, para impressão) ainda não existem.

## Ícones

- **Lucide**, traço 1,75 px.
- Tamanhos: 16 px junto de texto pequeno, 20 px no padrão, 24 px na navegação.
- Botão só com ícone sempre tem `aria-label`.

## Movimento

- Transições de 150 a 200 ms com `ease-out`: hover, abrir menus, trocar de aba.
- Botões: leve redução de escala ao pressionar (`scale(0.98)`).
- Menu lateral ao recolher ou expandir: 200 ms com `ease-out` na largura, no cabeçalho (72 → 112 px) e nos espaços entre grupos, para os itens deslizarem em vez de pular; o ícone não se mexe de lado (12 px de margem nos dois estados). Os nomes saem na hora ao recolher e, ao expandir, entram em 150 ms com 75 ms de atraso, quando o menu já abriu o bastante para o texto não aparecer cortado.
- Gráficos: animação de entrada de no máximo 300 ms.
- Com `prefers-reduced-motion`, as animações são desligadas.
- Sem efeitos chamativos (contador girando, confete).

## Layout e navegação

O Valora é pensado primeiro para o celular.

A navegação é um **menu lateral** com as áreas agrupadas. A estrutura é a mesma em qualquer tamanho de tela; só muda como ele aparece. O motivo: com as fases 2 e 3, o app passa de dez áreas, o que não cabe numa barra inferior sem esconder metade delas atrás de um "Mais".

| Grupo | Áreas | Fase |
|---|---|---|
| Dia a dia | Início, Transações, Orçamentos, Contas | v1 |
| Planejamento | Planejamento, Metas | v2 |
| Patrimônio | Investimentos, Relatórios | v3 |
| Rodapé do menu | Categorias e regras, Ajustes | v1 |

- O menu só mostra áreas que já existem. Um grupo aparece quando a primeira área dele fica pronta.
- O item ativo fica com fundo `secondary`, texto `secondary-foreground` em negrito, o ícone em `primary` e uma **barra de 3 × 20 px em `primary`** à esquerda (4 px da borda do item). O fundo sozinho tem só 1,12:1 contra o menu no claro e 1,22:1 no escuro, abaixo dos 3:1 que um indicador de estado exige; a barra tem 5,41:1 (claro) e 10,08:1 (escuro) contra o menu, e é ela que mostra o item atual com o menu recolhido, quando o negrito some. Ao passar o mouse, o item inativo ganha fundo `muted` (neutro, sem verde, sem barra e sem trocar a cor do texto ou do ícone), para nunca parecer o ativo. Os itens têm 44 px de altura e `radius-sm`, com o nome em Montserrat Alternates (16 px, peso 500; o ativo em 700), a mesma fonte do nome "Valora" e dos títulos das páginas.
- O nome do grupo usa o estilo `label` (caixa-alta, `muted-foreground`).

**Celular e tablet (< 1024 px):**
- O botão de menu (ícone `menu`, Lucide) fica à esquerda do título, no topo de cada tela.
- O menu abre por cima do conteúdo, vindo da esquerda: 300 px de largura (no máximo 85% da tela), com fundo escurecido atrás.
- Fecha ao tocar fora, no `x`, ao escolher uma área ou com o gesto de voltar. Abrir o menu cria uma entrada no histórico (mesmo endereço), então voltar fecha o menu em vez de sair da tela; escolher uma área troca essa entrada pela nova tela, e voltar leva à tela anterior, não ao menu.
- As ações mais usadas não dependem do menu: o Início tem os atalhos e a tela de Transações tem o botão "Nova transação".

**Computador (≥ 1024 px):**
- Menu lateral fixo à esquerda, **retrátil**: 264 px expandido e 72 px recolhido, sem o botão de menu do topo.
- O botão de recolher (`chevrons-left` e `chevrons-right`, nome acessível "Recolher menu" ou "Expandir menu") fica no cabeçalho do menu. Recolhido, o menu mostra só os ícones, cada um com 44 px e com um tooltip com o nome da área ao passar o mouse ou receber o foco. A escolha fica salva no aparelho.
- Conteúdo com largura máxima de **110 rem** (`max-w-content`: 1540 px com mouse, 1760 px em toque), centralizado. A altura de 72 px do cabeçalho também é em rem (`h-18`), para o topo da tela e o cabeçalho do menu ficarem alinhados em qualquer escala.

**Espaçamento do menu** (expandido):
- margem interna de 16 px (14 px recolhido, para centralizar o ícone de 44 px);
- itens de 44 px de altura, 4 px entre eles, ícone de 20 px e 12 px entre o ícone e o texto;
- nome do grupo (estilo `label`) com 8 px acima do primeiro item, e 20 px entre o último item de um grupo e o nome do próximo (dentro do grupo são 4 px, então o grupo se lê como bloco);
- recolhido, o nome do grupo some e uma linha divisória (`sidebar-border`, de lado a lado, como a do rodapé) separa os grupos, com 8 px de cada lado;
- **tela baixa** (altura até 780 px, variante `short`: notebooks e celular deitado): o menu inteiro precisa de cerca de 760 px, então o nome dos grupos some (continua lido pelo leitor de tela) e linhas divisórias, as mesmas do menu recolhido, separam os grupos; o vão entre grupos cai de 20 para 8 px e o do rodapé de 24 para 8 px. Os itens continuam com 44 px. Com 650 px de altura o menu cabe sem rolar; abaixo de uns 610 px só a lista rola, com barra fina na cor do tema (`scrollbar-width: thin`) em vez da barra branca do navegador. O `color-scheme` do `:root` e do `.dark` faz o navegador pintar barras de rolagem e controles nativos no tema certo;
- cada grupo é uma lista nomeada pelo próprio rótulo (`aria-labelledby`), dentro de um único `<nav aria-label="Principal">`; o rodapé é outro `<nav aria-label="Configurações">`;
- 24 px, no mínimo, entre o grupo "Dia a dia" e o rodapé, e uma linha divisória (`border`) acima de Categorias e regras e Ajustes;
- cabeçalho de 72 px, sem borda abaixo; só o item ativo tem fundo (`secondary`) e barra; o resto do menu fica sem fundo e sem borda (só o hover, em `muted`, e o foco aparecem por um instante).

**Topo de cada tela:** altura de 56 px (72 px a partir de 1024 px, alinhado com o cabeçalho do menu), botão de menu (só abaixo de 1024 px), título, status da sincronização (por exemplo, "Atualizado hoje, 07:02"; tocar sincroniza agora; a área de toque tem 44 px de altura em qualquer largura, mesmo com o texto pequeno do celular), botão de ocultar valores e, a partir da v2, o sino de alertas. Na tela de Transações, o topo também tem o botão **"Nova transação"**.

**Título da aba do navegador:** "Área | Valora" (por exemplo, "Orçamentos | Valora"); nos relatórios, "Relatório | Relatórios | Valora". Telas sem título próprio ficam só com "Valora".

**Breakpoints** (os do Tailwind): `sm` 640, `md` 768, `lg` 1024, `xl` 1280.

### Responsividade

**A aplicação tem que ser responsiva.** Toda tela funciona de **320 px** de largura (celular pequeno, ou zoom de 400% num notebook) até monitores largos, sem perder função nem acabamento.

**Regras gerais:**
- **Celular primeiro:** os estilos base são para o celular; `md:`, `lg:` e `xl:` só ampliam.
- **Nunca rolagem horizontal da página**, em nenhuma largura. No celular a tabela vira blocos por linha; uma tabela larga em tela maior rola dentro do próprio card, com a primeira coluna fixa.
- **Nada depende de hover.** Tooltip, menu e ações abrem com toque. A área de toque mínima é 44 × 44 px (na base de 16 px; com mouse no computador os alvos escalam junto com a base de 14 px e ficam com 38,5 px, veja [Densidade no computador](#densidade-no-computador)).
- **Funciona em retrato e paisagem**, e com o zoom do navegador em 200% sem quebrar o layout.
- **Áreas seguras do celular:** o menu, os rodapés fixos (como o botão "Salvar") e os painéis respeitam `env(safe-area-inset-*)`, para não ficarem embaixo do indicador do iPhone ou da barra do Android.

**Como cada parte se adapta:**

| Parte | Celular (< 768 px) | Tablet (768 a 1023 px) | Computador (≥ 1024 px) |
|---|---|---|---|
| Navegação | Menu que abre por cima, pelo botão no topo | Menu que abre por cima, pelo botão no topo | Menu lateral fixo, retrátil (264 px ou 72 px) |
| Margem lateral | 16 px | 24 px | 32 px |
| Início | 1 coluna | 2 colunas | Grade de 12 colunas, até 110 rem (1540 px com mouse) |
| Lista de transações | Item em 2 linhas (descrição em cima; categoria e conta embaixo) | Igual ao celular, com mais espaço | Linha única com colunas: data, descrição, categoria, conta, valor |
| Formulários e detalhes | `Sheet` vindo de baixo, em tela quase cheia | `Sheet` lateral | `Dialog` centralizado |
| Filtros | Busca e botão "Filtros", que abre um `Sheet` de baixo com período, categoria, tipo, origem e conta | Busca, período e botão "Filtros", que abre um `Popover` com categoria, tipo, origem e conta | Igual ao tablet |
| Gráficos | Largura do card; menos marcações no eixo (meses abreviados: "jun.") | Largura do card | Largura do card |
| Saldo (`display`) | 36 px | 36 px | 48 px |

- **Texto longo** (descrição de transação, nome de conta) é cortado com reticências na lista e aparece inteiro no detalhe. Valores em dinheiro **nunca** são cortados: se não couberem, o rótulo ao lado é que encolhe.
- **Gráficos** usam um container responsivo (`ResponsiveContainer` do Recharts) e altura fixa por faixa de tela, nunca altura proporcional à largura.

**Larguras de teste obrigatórias** para toda tela nova: **320, 390, 768, 1024 e 1440 px**, nos temas claro e escuro.

### Dashboard (Início)

Ordem no celular, logo abaixo do topo de tela (título "Início" e status da sincronização):

1. **Card de saldo** (`secondary`, `radius-xl`):
   - saldo total em `display`;
   - variação desde o início do mês (quando já houver histórico);
   - linha **Patrimônio** (v3), abaixo da variação e separada por um filete: rótulo `type-label`, valor em tamanho `md` (vermelho só se negativo), a variação no mês no mesmo formato do saldo e o link "Ver patrimônio" para `/investimentos`. Só aparece quando há investimento ou fatura em aberto (sem eles o patrimônio é igual ao saldo) e some fora do mês atual. Sem variação, mostra só o valor e o link. O "Saldo total" continua sendo só corrente e poupança;
   - gráfico de área pequeno, com a evolução do mês.
2. **Atalhos** em botões redondos, como no moodboard:
   - v1: Adicionar receita, Registrar despesa, Transações, Orçamentos;
   - na v2, Orçamentos dá lugar a Metas.
   - "Adicionar receita" e "Registrar despesa" abrem o formulário de [Nova transação](#nova-transação) já com o tipo escolhido.
3. Receitas, despesas e resultado do mês: três números (veja "Detalhes de implementação").
4. **Projeção do fim do mês** (v2): saldo projetado em `type-value-lg`, aviso "Saldo negativo em 20/11" (ícone e texto, `destructive`) só quando o menor saldo é negativo, e "Ver planejamento". Sem nada previsto, o estado vazio "Planeje o mês". O saldo projetado só fica vermelho se terminar negativo.
5. **Metas** (v2): até 3 linhas com ícone, nome, percentual, barra, "R$ x de R$ y" e a situação em ícone e texto (a mesma de Metas), e "Ver metas". Sem metas em andamento, o estado vazio com "Criar meta".
6. Receitas x despesas dos últimos 6 meses: barras agrupadas, slots 1 e 2.
7. Gastos por categoria: a lista de barras da seção [Gastos por categoria](#gastos-por-categoria).
8. Orçamentos mais perto do limite (os 3 primeiros).
9. Últimas 5 transações, com "Ver todas".

Sem saudação: o espaço vai direto para o saldo.

No computador, os mesmos blocos ficam numa grade de 12 colunas, sem mudar a ordem do DOM:

| Linha | Blocos (colunas) |
|---|---|
| 1 e 2 | Card de saldo (7) e atalhos (7) empilhados à esquerda; receitas, despesas e resultado do mês (5) à direita, um sobre o outro, ocupando as duas linhas |
| 3 | Projeção do fim do mês (5) e metas (7) |
| 4 | Gráfico de receitas x despesas (7) e gastos por categoria (5) |
| 5 | Orçamentos (5) e últimas transações (7) |

No tablet (2 colunas), saldo, atalhos, números do mês, gráfico e últimas transações ocupam a linha toda; projeção e metas, e também categorias e orçamentos, ficam lado a lado. Quando a projeção não vem (mês que não é o atual), o cartão some e o das metas fica sozinho.

**Detalhes de implementação:**
- Os números do mês são três cards: **Receitas do mês**, **Despesas do mês** e **Resultado do mês** (receitas menos despesas, calculado no front, com `+` ou `−` e a cor normal do texto: vermelho é só para estouro, erro e saldo negativo). Receitas e despesas ficam lado a lado a partir de 400 px e o resultado ocupa a linha de baixo; abaixo de 400 px empilham, para o valor nunca ser cortado (em 320 px, "+ R$ 12.345,67" não cabe em meia coluna). No computador os três empilham à direita, com a mesma altura, ocupando a altura do card de saldo e dos atalhos: card de resumo não estica sem conteúdo.
- Os meses do eixo do gráfico são sempre abreviados ("jun."): os nomes inteiros se sobrepõem na coluna de 7/12 do computador.
- Com os valores ocultos, o eixo vertical do gráfico some junto, porque mostraria os mesmos números.
- Cada gráfico tem um resumo para leitor de tela (a tabela dos 6 meses; o saldo no primeiro e no último dia do gráfico de área).
- A barra de cada categoria tem o tamanho do percentual escrito ao lado (a fatia do gasto líquido total do mês): uma categoria com 11% preenche 11% do trilho, e só 100% enche a barra. "Sem categoria" e "Outros" não abrem Transações.
- O gráfico de área do saldo só aparece com 2 ou mais dias de foto de saldo.

### Hierarquia dos cartões

Todo cartão de dados tem a mesma escala de peso, para o olho achar o número primeiro. Os componentes ficam em `frontend/src/components/cards/` e **não têm cor própria**:

| Nível | Elemento | Tratamento | Componente |
|---|---|---|---|
| 1 | **Cartão-herói** | `secondary`, `radius-xl`; a resposta principal da tela, um por tela | `DataCard tier="hero"` |
| 2 | **Cartão de apoio** | `card` com borda e sombra | `DataCard` |
| — | **Título do cartão** | `type-label` (12 px, caixa alta, apagado) com ícone de 14 px. Só diz o assunto | `DataCard` |
| — | **Número-chave** | o maior texto do cartão: `type-display` no herói, `type-value-lg` nos demais, `md` (24 px) quando precisa caber em meia coluna | `Metric` |
| — | **Contexto** | `text-sm`, `muted-foreground`, uma linha | `Metric caption` |
| 3 | **Linhas** | sem moldura: nome `text-sm` médio, valor `text-sm` em negrito, subtítulo e percentual `text-xs` apagados | `ValueRow` |

Regras:
- Título, ícone e valor **nunca** têm o mesmo tamanho. O ícone não vira bolinha grande ao lado do título.
- Listas longas mostram as 5 primeiras e "Mostrar mais N".
- Vermelho só no número do herói quando negativo (saldo), nunca em despesa.
- Grades de uma coluna usam `grid-cols-1` (coluna `minmax(0, 1fr)`): sem isso o cartão cresce até o conteúdo e alarga a página no celular.

### Investimentos

Ordem da tela, em todas as larguras (coluna única no celular; no computador, herói em 7 colunas e ranking em 5):

0. **Patrimônio** (`DataCard tier="hero"`, largura toda; no canto do cabeçalho, o link "Ver relatório completo" para `/relatorios/patrimonio`): total em `display` (vermelho só se negativo), variação no mês (ícone e texto, igual à do saldo), as linhas "Contas", "Investimentos" e "Faturas em aberto" (com `−`), o controle "6 meses" / "12 meses" (padrão 12), o gráfico de área mensal e a nota "Patrimônio = contas + investimentos − faturas em aberto. Gastos no cartão ainda fora de fatura fechada não entram." Vem de outra consulta (`GET /net-worth`) e tem os próprios estados: se falhar, mostra "Tentar de novo" dentro do cartão e o resto da tela continua.
1. **Herói** (nível 1): total em `display`, "N posições em M instituições", a **barra de composição por tipo** e a legenda (cor, tipo, valor, percentual).
2. **Maiores posições** (nível 2): ranking numerado das 5 maiores, em barras finas de `primary`, cada uma com o tamanho do percentual da posição no total investido.
3. **Posições por tipo**: um cartão por tipo (título pequeno, total em `type-value-lg`, "% do total" e as linhas, com "Mostrar mais").
4. Rodapé "N posições zeradas não aparecem na lista", só quando houver.

**Exceção de cor, só desta tela:** a barra de composição, a legenda e o marcador de cada cartão por tipo usam os slots da [paleta de gráficos](#paleta-de-gráficos) em ordem (tipos são poucos e fixos). **Não é um padrão para as outras telas**, que continuam com uma cor só. A cor só marca; o nome do tipo sempre aparece em texto, e a barra tem um resumo para leitor de tela.

**Exceção ao "um herói por tela":** em Investimentos há dois cartões `secondary`, porque cada um responde a uma pergunta diferente ("quanto eu tenho?" e "como está investido?"). Os dois não competem: o patrimônio vem primeiro e é o único com gráfico.

**Cartão de patrimônio e gráfico mensal:**
- Gráfico de **área** com uma série só (slot 1 da paleta), linha de 2 px, preenchimento a 15% sumindo para 0, grade horizontal fina e eixo X com meses abreviados ("nov."). Sem legenda (uma série). O tooltip mostra o mês ("novembro de 2026") e o patrimônio.
- O eixo vertical é discreto (valores compactos, 72 px de largura) e **some com "Ocultar valores"**.
- Só desenha com **2 ou mais pontos**. Com menos, o lugar do gráfico diz "O histórico começa em 04/11. O gráfico aparece quando houver dois meses de dados." (ou "Ainda não há histórico de patrimônio…" sem nenhuma foto) e o controle de período some. Se o usuário escolheu "6 meses" e ficou sem 2 pontos, o controle continua visível, para ele poder voltar a "12 meses".
- Resumo para leitor de tela: o patrimônio no primeiro e no último mês do gráfico.
- Layout: duas colunas (5/12 com os números, 7/12 com o controle e o gráfico) **a partir de 1280 px**. Abaixo disso, uma coluna: com o menu fixo de 1024 px a coluna dos números fica estreita e "R$ 1.234.567,89" quebraria no meio.
- Enquanto o novo período carrega, o gráfico anterior continua na tela.

**Detalhes de implementação:**
- Abaixo de 400 px, nome e valor do ranking e do total ficam em linhas separadas, para o nome nunca ser cortado.
- Os nomes das posições são truncados; o saldo nunca é.
- Vazio: "Nenhum investimento encontrado" com o botão "Ver contas". "Ocultar valores" mascara os saldos e mantém os percentuais.

### Relatórios

Uma área com um relatório por endereço (`/relatorios/receitas-e-despesas`, `/relatorios/categorias`, `/relatorios/evolucao-financeira` e `/relatorios/patrimonio`). Ordem da tela, em todas as larguras:

0. **Navegação entre relatórios:** **abas** com sublinhado (uma linha de `border-b`; a aba aberta com sublinhado `primary`, texto normal e `aria-current="page"`). **Só aparece com 2 ou mais relatórios** e leva o `?periodo=` e o `?visao=` atuais no link. Abaixo de 640 px as abas não cabem numa linha: ela rola sem barra, as bordas esmaecem para mostrar que há mais, e a aba aberta sempre é trazida para o centro.
1. **Filtro de período** (`SegmentedControl`, sem rótulo visível, só para leitor de tela): 6 meses, 12 meses, 24 meses, Este ano; padrão 12 meses; na URL (`?periodo=`). Numa linha só a partir de ~340 px (largura do conteúdo); abaixo de 360 px de tela vira grade 2×2. É o **único** controle da barra: "Gráfico ou tabela" fica no cartão que ele troca. Quando o período não muda nada (patrimônio com menos de dois meses de histórico), o filtro some e uma nota diz o motivo.
2. **Aviso de histórico** (`text-xs`, `muted-foreground`), só quando os dados começam depois do primeiro mês do período: "Há dados desde abr. 2026, por isso o período mostra 8 meses."
3. **O cartão-herói** (`DataCard tier="hero"`, um por relatório): o número que responde a pergunta (Resultado; Total gasto com `−`; Resultado do período; Patrimônio hoje) em `type-value-lg` (28 px, em todas as larguras: `type-display` é grande demais para um relatório), e abaixo a **frase de resposta** em uma ou duas linhas (a média dos meses fechados; a maior categoria; a taxa de poupança do último mês fechado contra a média dos anteriores). O Patrimônio não tem frase: o número de apoio "Variação no período" já a diz.
4. **Os números de apoio** em `DataCard` (valor em `text-xl` e sem quebra): Receitas com `+` em `positive` e Despesas com `−` na cor normal; Taxa de poupança e Meses com sobra; Variação no período e Em investimentos. Um por linha abaixo de 640 px, dois lado a lado a partir daí.
5. **Gráfico ou tabela**, nunca os dois, num cartão de apoio. O gráfico tem altura de 240 px (288 px a partir de 1024 px). **O seletor "Gráfico | Tabela"** fica no cabeçalho desse cartão (slot `action` do `DataCard`), em texto, com 44 px de toque; no celular desce para baixo do título. Vale para o relatório todo (`?visao=tabela`, mantido ao trocar de relatório). Nos relatórios com vários gráficos, fica no primeiro.

**Mês em andamento (parcial):** o mês atual nunca é marcado só por cor ou hachura.
- *Gráfico:* as barras do mês levam hachura diagonal (a cor da série a 35% com traços da cor cheia), o item "Mês em andamento" entra na legenda e o tooltip escreve "(em andamento)" depois do mês.
- *Tabela:* a linha do mês traz o texto "em andamento" abaixo do mês (`text-xs`, `muted-foreground`).

**Gráfico de receitas e despesas:** o mesmo do Início (barras agrupadas, slots 1 e 2, topo de 4 px, 2 px entre barras), agora num componente compartilhado (`components/charts/income-expense-bars.tsx`). O tooltip dos relatórios acrescenta a linha "Resultado" com sinal. Com mais de 12 meses o eixo X deixa de mostrar todos: o Recharts esconde os rótulos que se sobrepõem e o ano entra no rótulo ("nov. 25"), para separar meses repetidos.

**Tabela dos relatórios (`ReportTable`):**
- `<table>` com `<caption>` (só para leitor de tela: descreve o relatório e o período), cabeçalhos de coluna (`type-label`) e de linha (o mês, "nov. 2026"), valores alinhados à direita com `tabular-nums` e `−` tipográfico, e uma **linha de total** no fim ("Total do período", em negrito, com filete duplo acima).
- **Responsividade:** abaixo de 640 px cada mês vira um **bloco** (mês em cima, depois uma linha por coluna com o nome à esquerda e o valor à direita), sem rolagem lateral. O nome da coluna pode quebrar em várias linhas (categorias têm nomes longos); o valor nunca quebra. A partir de 640 px, se faltar largura, a tabela rola **só dentro do próprio bloco** (`overflow-x-auto`, borda e raio no bloco), com a **coluna do mês fixa** (`sticky`, fundo `card`). A página nunca ganha rolagem horizontal, nem com 24 meses em 320 px.

**Gráfico de gasto por categoria** (`features/reports/category-spending/`): **colunas empilhadas**, uma coluna por mês e um segmento por série, da maior categoria do período (embaixo) para a menor, com "Outros" por último.
- **Cor pela posição, não pela categoria:** a série na posição N usa o slot N da paleta, sem pular (as 5 maiores ocupam os slots 1 a 5), e "Outros" usa o cinza. O empilhamento é exatamente a vizinhança na ordem para a qual a paleta foi validada. A cor de uma categoria pode mudar quando o período muda; por isso a legenda sempre traz o nome e a lista abaixo identifica cada categoria pelo nome, nunca só pela cor.
- Segmentos separados por um traço de 1 px na cor do cartão; sem raio no topo (a coluna é uma pilha). Legenda com os nomes (truncados, `title` com o nome inteiro) e tooltip com o total do mês seguido de cada categoria com valor maior que zero.
- **Mês em andamento:** sem hachura (os segmentos já são separados por cor e traço); o mês é marcado em texto, "nov. 2026 em andamento" abaixo da legenda e "(em andamento)" no tooltip.
- **Lista ranqueada** logo abaixo, no cartão "Ranking do período": as barras horizontais numa cor só de "Gastos por categoria" (`primary`, "Outros" cinza), com ícone, nome, total e percentual, e uma **marca de 10 px na cor da coluna** do gráfico acima (a exceção à regra de categorias sem cor: é a legenda do gráfico empilhado, que colore pela posição; as barras seguem numa cor só). Cada categoria **abre as transações** dela no período do relatório (`/transacoes?period=custom&from=…&to=…&category=…`); "Outros" não abre, por juntar várias. O nome quebra em até duas linhas em vez de ser cortado. O total do período fica no cartão-herói. Com "Ocultar valores", os totais são mascarados e os percentuais continuam visíveis.
- **Tabela:** `ReportTable` com uma coluna por série e a coluna "Total"; o nome da coluna é truncado (`title` com o nome inteiro).

**Gráficos de evolução financeira** (`features/reports/savings-evolution/`): três gráficos, cada um no seu cartão e com a **sua escala**, nunca dois eixos no mesmo gráfico. Todos de uma série só, então sempre o slot 1.
- **Resultado do mês:** barras com topo de 4 px; os meses negativos descem da **linha do zero**, que fica sempre visível (`muted-foreground`). **Resultado negativo não usa vermelho nas barras** (o vermelho é de estouro, erro e saldo negativo): o sinal `−` no tooltip e na tabela e o texto dizem o que a forma já mostra. Largura cheia (240 px de altura, 288 px a partir de 1024 px).
- **Taxa de poupança:** linha de 2 px com pontos pequenos e eixo em `%`, referência em 0%. Meses sem receita **interrompem** a linha (não viram zero); o ponto mostra um mês isolado entre dois sem receita.
- **Sobra acumulada:** área (cor da série a 15%, sumindo para 0) com a linha do zero; pode descer abaixo dela. Uma frase abaixo diz que **não é saldo nem patrimônio**.
- Os dois últimos ficam lado a lado a partir de 1024 px e empilhados abaixo disso. O eixo sempre inclui o zero. Tooltip do resultado: receitas, despesas, resultado com sinal e taxa; os outros, o valor do mês. Mês em andamento marcado em texto ("nov. 2026 em andamento" abaixo do título e "(em andamento)" no tooltip), sem hachura.
- **Números do período:** o herói "Resultado do período" com sinal (`positive` se sobrou, `destructive` só se for negativo) e, de apoio (cada um com uma linha de explicação em `text-xs`), "Taxa de poupança" com sinal e "—" sem receita (cor normal) e "Meses com sobra" ("7 de 10 meses fechados").
- **Ocultar valores:** os eixos em reais somem e a taxa continua visível, inclusive o eixo em `%`.

**Gráficos de evolução do patrimônio** (`features/reports/net-worth/`): o herói e dois números de apoio no padrão dos relatórios e dois gráficos, cada um no seu cartão, em largura cheia (240 px de altura, 288 px a partir de 1024 px).
- **Patrimônio total:** o mesmo gráfico de área do cartão de Investimentos (`NetWorthChart`, série 1, 2 px, 15% sumindo para 0). Com mais de 12 meses o ano entra no rótulo do eixo X ("nov. 25").
- **Composição:** **colunas empilhadas** com Contas (slot 1), Investimentos (slot 2) e Faturas em aberto (slot 3), sempre nessa ordem. A fatura é um valor **negativo**: o gráfico usa `stackOffset="sign"`, que empilha os positivos para cima do zero e os negativos para baixo dele (sem isso o negativo entra na pilha positiva e a coluna fica errada). Linha do zero sempre visível, segmentos separados por um traço de 1 px na cor do cartão e legenda sempre, com os nomes. O tooltip traz as três cifras (a fatura com `−`) e o patrimônio do mês.
- Os dois só são desenhados com 2 ou mais pontos; com um só, o texto "O histórico começa em …" ocupa o lugar. Mês em andamento marcado em texto, sem hachura; "Ocultar valores" remove os eixos em reais.
- **Números do topo:** o herói "Patrimônio hoje" (vermelho só se negativo) e, de apoio, "Variação no período" (`ValueChange`: ícone, `+`/`−`, percentual e "desde dd/mm") e "Em investimentos" (percentual em `text-xl`, que continua visível com "Ocultar valores", e o valor em reais abaixo).
- **Tabela:** `ReportTable` **sem linha de total** (patrimônio não se soma entre meses), com Contas, Investimentos, Faturas em aberto (com `−`) e Patrimônio. A nota da fórmula, do arquivamento de bancos e das faturas fica abaixo de tudo, em `text-xs`.
- **Estados:** vazio (sem nenhuma foto) leva a "Ver contas".

**Eixos dos gráficos:** os valores em reais usam **números redondos** (R$ 1 mil, R$ 2 mil…, de 1, 2, 2,5 ou 5 vezes uma potência de 10, em cerca de quatro intervalos), sempre com o zero (`components/charts/axis-scale.ts`); o rótulo usa espaço sem quebra para não partir em duas linhas, e a margem direita de 12 px impede o último mês ("nov.") de ser cortado. O texto dos eixos usa `muted-foreground` (7,3:1 no escuro). Os gráficos ficam em `aria-hidden` e **não recebem foco** (`accessibilityLayer={false}`); o resumo em texto ou a tabela é a alternativa. O gráfico de patrimônio total mantém o eixo automático (sem o zero), para a variação não ficar achatada.

**Estados:** carregando (skeleton no formato: o herói, dois cartões de apoio e o gráfico), vazio ("Ainda não há transações neste período": num período curto, "Tente um período maior" com o botão "Mudar período", que leva o foco ao filtro; em 24 meses, "Nem nos últimos 24 meses…" com o botão "Ver contas") e erro ("Não foi possível carregar o relatório." e "Tentar de novo"). "Ocultar valores" mascara os números, a frase, a tabela e o tooltip, e o eixo vertical do gráfico some. Com um período novo carregando, o relatório anterior continua na tela, esmaecido, com `aria-busy` e o aviso "Atualizando o relatório" para leitor de tela. A aba do navegador leva o nome do relatório ("Por categoria | Relatórios | Valora").

## Componentes

A base é o shadcn/ui, com os tokens deste documento. Os componentes do Valora são montados em cima dela.

| Componente | Base shadcn/ui | Notas |
|---|---|---|
| Botão | `Button` | Variantes: primária, secundária (mint), contorno, fantasma, destrutiva. Altura padrão de 44 px, `radius-md`, fonte 600. Botões só com ícone (menu, ocultar valores) são redondos (`full`) |
| Card de saldo | `Card` | Valor em `display`, variação, gráfico pequeno, botão de ocultar valores |
| Card de resumo | `Card` | Título no estilo `label` com ícone em `primary`; valor em `value-lg` |
| Item de transação | — | Bolinha com ícone da categoria; descrição; "categoria · conta" em `muted-foreground`; valor à direita com `tabular-nums`; parcela ("3/10") como badge; transação manual com o badge "Manual"; possível duplicata com o badge de aviso |
| Cabeçalho de dia | — | "Hoje", "Ontem", "seg., 3 de nov." e o total do dia à direita |
| Barra de orçamento | `Progress` | Trilho, preenchimento na cor do status, ícone e texto do status |
| Lista de categorias | — | Barras horizontais numa cor só (veja acima) |
| Progresso de meta (v2) | `Progress` | Valor acumulado / desejado, percentual, prazo estimado |
| Selo de meta vinculada | — | "Vinculada · N itens" em `secondary`, com ícone `link-2`, no cartão da meta. Metas manuais não têm selo |
| Painel de meta vinculada | `Sheet` / `Dialog` | No lugar de "Registrar aporte", "Registrar retirada" e do histórico, a seção "Itens vinculados" com o saldo de cada item. Item de banco arquivado leva ícone `archive` e o texto "Banco removido do Valora: não conta". Traz as notas "O valor acompanha o saldo e muda na sincronização diária" e "O ritmo vem da variação dos saldos… e mistura aporte e rendimento", e, havendo aportes guardados, uma linha com o valor deles. No formulário, o controle segmentado "Eu informo" / "Vinculada" mostra a lista de contas e investimentos com caixas de seleção (até 10), a "Soma atual" e o aviso do item que já está em outra meta; o valor inicial some |
| Seletor (lista suspensa) | `Select` (`<select>` nativo + `Popover`) | O campo é sempre um `<select>` de 44 px, com `radius-md` e chevron que gira ao abrir. **Toque** (`pointer: coarse`): abre o seletor do sistema, o mais fácil com uma mão. **Mouse** (`hover: hover` e `pointer: fine`): abre a lista do Valora, porque a do navegador não segue tema, raio nem tipografia. A lista usa o `Popover` (`border`, fundo `popover`, sombra nível 2), tem a largura do campo (mínimo 224 px), 320 px de altura no máximo com rolagem, linhas de 40 px com `radius-sm`, ativa em `accent`, selecionada em `secondary` com ✓ em `primary`, e rótulos de grupo no estilo `label`. Com 8 opções ou mais aparece o campo "Buscar" (sem acento e sem diferenciar maiúsculas). Teclado: setas, Home, End, Enter, Esc, e Espaço, Enter ou seta abrem o campo. Categorias mostram o ícone ao lado do nome |
| Filtro de período | `Popover` + `Calendar` | Atalhos: Este mês, Mês passado, Últimos 3 meses, Este ano, Personalizado |
| Filtros | `Select`, `Popover`, `Badge` | À vista só a busca, o período e o botão "Filtros", que mostra quantos dos quatro filtros do painel (categoria, tipo, origem e conta) estão ativos ("Filtros (2)"). A partir de 768 px o painel é um `Popover` ancorado no botão, que devolve o foco a ele ao fechar; abaixo disso é o `Sheet` de baixo, com o período também. Filtros ativos continuam como chips removíveis abaixo da barra. Nenhum seletor mostra o texto cortado |
| Resumo do filtro | texto (`p`) | Uma linha entre os chips e a lista, não um cartão: "N transações", receitas com `+` em `positive` e despesas com `−` na cor normal, sem transferências internas (valor zero não aparece). Valores ocultos viram `R$ ••••` e a contagem continua. Carregando: skeleton de uma linha. Erro: "Tentar de novo", sem derrubar a lista. Sem transações: some. Com o filtro "Transferências": só a contagem e a nota de que transferências não entram nos totais |
| Pesquisa | `Input` | Busca na descrição, com espera de 300 ms |
| Detalhe de transação | `Sheet` (celular), `Dialog` (computador) | Mostra dados completos e permite trocar a categoria. Numa transação manual, também editar e excluir (exclusão pede confirmação) |
| Nova transação | `Sheet` (celular), `Dialog` (computador) + `Form` | Veja [Nova transação](#nova-transação) |
| Campo de valor | `Input` | Teclado numérico; digitação da direita para a esquerda, como nos apps de banco |
| Badge de origem | `Badge` | "Manual" em `secondary`, com ícone `pencil-line`. Transações do Open Finance não têm badge |
| Possível duplicata | `Badge` + `Alert` | Badge "Possível duplicata" (ícone `copy`, texto `warning` sobre `warning-surface`) no item; faixa no topo de Transações quando houver duplicatas para conferir; no detalhe, as duas transações lado a lado com "Juntar" (primário) e "São diferentes" (contorno) |
| Trocar categoria | `Command` | Busca de categoria + opção "Aplicar sempre para '<descrição>'", que cria a regra |
| Status de conexão | `Badge` | OK, Sincronizando, Erro, Consentimento expirado, Removido do Meu Pluggy |
| Aviso de conexão | `Alert` | Faixa no topo quando um banco não sincroniza |
| Notificação rápida | `Sonner` (toast) | "Sincronização concluída: 12 transações novas" |
| Carregando | `Skeleton` | No formato do conteúdo que vai aparecer, não um spinner. No claro usa `muted-foreground` a 25% (contraste 1,42:1 sobre `card`; `muted` e `accent` davam 1,14:1 e 1,10:1, quase invisíveis); no escuro usa `accent` |
| Abas | `Tabs` | Alternar mês, tipo de gráfico |
| Controle segmentado | `Button` (`role="radio"`) | Pílula com borda; a opção escolhida fica em `secondary` com ícone de check (nunca só a cor). Usado na escolha de tema em Ajustes |
| Menu | `Sidebar` (abaixo de 1024 px, no modo que abre por cima) | Grupos de áreas, item ativo, rodapé com Categorias e regras e Ajustes |

### Ocultar valores

O ícone de olho (presente no moodboard) troca todos os valores por `R$ ••••`. A escolha fica salva no aparelho.

### Nova transação

Formulário para o [lançamento manual](01-produto.md#lançamento-manual): dinheiro em espécie ou uma transação que o Open Finance não trouxe. Precisa ser rápido de preencher no celular, com uma mão.

Campos, nesta ordem:

1. **Tipo:** Despesa ou Receita, em controle segmentado. Vem escolhido pelo atalho usado.
2. **Valor:** campo grande, em `title-1`, com foco automático e teclado numérico.
   - Digitação da direita para a esquerda: digitar `8990` mostra `R$ 89,90`.
   - O valor vira centavos na hora; nunca passa por número com casas decimais.
3. **Descrição:** texto curto, obrigatório. Ex.: "Feira", "Pastel".
4. **Categoria:** busca de categorias (`Command`), mostrando só as do tipo escolhido.
5. **Conta:** "Dinheiro" vem selecionado; a lista também mostra as contas e cartões conectados.
6. **Data:** "Hoje" vem selecionado; atalhos "Ontem" e "Escolher data".

Botão **"Salvar"** (primário, largura total) fixo no rodapé do formulário. No `Dialog` (computador), o rodapé fica rente à borda de baixo (`lg:-bottom-6`, o inverso do espaço interno de `p-6`): sem isso o `sticky` para 24 px acima da borda e o conteúdo aparece por baixo. O painel é a **única** área com rolagem: a lista de categorias não tem altura limitada nem rolagem própria (vale também para "Trocar categoria" nos detalhes da transação). Depois de salvar, o formulário fecha e um toast confirma: "Despesa registrada".

Erros aparecem embaixo do campo, em `destructive`, em linguagem simples ("Informe o valor", "Escolha uma categoria").

## Estados

**De interação:**
- *hover*: fundo `accent` nos itens clicáveis;
- *foco*: anel de 2 px em `ring`, com 2 px de distância, só no foco por teclado (`focus-visible`);
- *pressionado*: `scale(0.98)`;
- *desabilitado*: 50% de opacidade, sem ponteiro;
- *selecionado*: fundo `secondary` e texto `secondary-foreground`.

**De tela:**

| Estado | Como mostrar |
|---|---|
| Carregando | Skeleton no formato do conteúdo |
| Vazio | Ícone, uma frase e uma ação. Ex.: "Nenhuma transação neste período" + "Mudar período" |
| Erro | O que deu errado em linguagem simples + "Tentar de novo". Sem código técnico na tela |
| Sem conexão com o servidor | Faixa `warning-surface` com ícone e texto: "Sem conexão. Mostrando os dados de 05/11 às 08:12." (ou "…podem estar desatualizados" sem data). Some quando a rede volta. Quando uma escrita falha, acrescenta "Sem conexão: esta ação precisa de internet.", e "Sincronizar" e os botões de salvar ficam desabilitados |
| Versão nova do app | Faixa `secondary` com "Nova versão disponível" e o botão **Atualizar**; nada recarrega sem o toque |
| Endereço sem rota | Página em tela cheia, sem menu: "404" em destaque (`type-display`, `primary`), "Página não encontrada", "Esta página não existe" e um único botão **Ir para o Início**. Não mostra o endereço digitado |
| Conexão com banco caída | Faixa com o banco afetado e o caminho para reconectar no Meu Pluggy |
| Banco removido do Meu Pluggy ou fora da lista de sincronização | Faixa `warning-surface` com ícone e texto que diz a causa ("foi removido do Meu Pluggy" / "saiu da lista de sincronização") e o botão **Remover do Valora** (botão normal, fora do link, com confirmação; vermelho só para excluir, e arquivar se desfaz). Nos celulares estreitos o botão desce para a linha de baixo, com a largura toda |
| Bancos arquivados | Seção recolhida **Arquivados (n)** no fim da tela Contas, com o nome, as contas e a última sincronização de cada banco e o botão **Reativar**. Só aparece quando há arquivados; carregando mostra um skeleton e, com erro, "Tentar de novo" sem derrubar o resto |
| Funcionalidade ainda não pronta | Tela de demonstração com o selo **"Demonstração"** bem visível, nunca dados falsos parecendo reais |

## Gráficos

- **Formas:**
  - evolução no tempo → linha ou área;
  - comparar meses → barras agrupadas;
  - partes de um total → lista de barras horizontais;
  - evolução de uma medida que passa por zero (resultado, sobra acumulada) → barras, linha ou área com a **linha do zero** visível, sem vermelho só porque é negativa;
  - partes de um total mês a mês → colunas empilhadas, com a cor pela posição no ranking (nunca uma cor fixa por categoria);
  - um número só → card de resumo, sem gráfico.
- **Nunca dois eixos verticais** no mesmo gráfico. Medidas de escala diferente vão em gráficos separados.
- **Traço:**
  - linhas de 2 px;
  - barras com topo arredondado de 4 px e base reta;
  - 2 px de espaço entre barras vizinhas;
  - área com preenchimento suave (cor da série a 15%, sumindo para 0%).
- **Eixos e grade discretos:** grade horizontal fina (`#E8ECE8` no claro, `#27272B` no escuro); rótulos em `caption` e `muted-foreground`.
- **Texto nunca na cor da série.** Valores e rótulos usam `foreground` ou `muted-foreground`. A cor fica só na marca (linha, barra, ponto da legenda).
- **Legenda** sempre que houver 2 ou mais séries. Rótulos diretos só onde ajudam (o último ponto, o maior valor), nunca um número em cada ponto.
- **Tooltip** ao tocar ou passar o mouse: data e valores formatados em R$. A área de toque é maior que a marca.
- **Acessibilidade:** cada gráfico tem um resumo em texto para leitor de tela. Os relatórios têm a opção "Ver em tabela".

## Formatos

| O quê | Formato | Como |
|---|---|---|
| Moeda | `R$ 1.234,56` | `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` |
| Receita / despesa | `+ R$ 50,00` / `− R$ 50,00` | Sinal explícito; menos tipográfico (U+2212) |
| Valores compactos (eixos) | `R$ 1,2 mil`, `R$ 3,4 mi` | `notation: 'compact'` |
| Percentual | `12,5%` | `Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 })` |
| Data completa | `03/11/2026` | `dd/MM/yyyy` |
| Data em listas | `seg., 3 de nov.`, `Hoje`, `Ontem` | `Intl.DateTimeFormat('pt-BR', ...)` |
| Mês | `novembro de 2026`, `nov. 2026` | |
| Fuso | `America/Sao_Paulo` | Sempre explícito na formatação |

Toda a interface é em **português do Brasil**, com termos financeiros corretos: fatura, vencimento, limite, parcela, receita, despesa, saldo, patrimônio.

## Acessibilidade

- Contraste AA conferido para todos os pares de texto (tabela acima).
- Foco visível em tudo o que é clicável.
- Área de toque mínima de 44 × 44 px.
- Todo campo de formulário tem rótulo visível.
- Informação nunca só na cor: status de orçamento com ícone e texto; receita e despesa com sinal.
- `lang="pt-BR"` no documento.
- Respeito a `prefers-reduced-motion` e `prefers-color-scheme`.
- Tema: segue o sistema por padrão, com escolha manual (Claro, Escuro, Sistema) em Ajustes.

## Tokens em CSS

Formato do shadcn/ui com Tailwind v4. É a cópia exata de `frontend/src/styles/globals.css`; um teste (`frontend/test/design-tokens.test.ts`) lê esse arquivo e confere os contrastes desta página.

```css
@import 'tailwindcss';
@import 'tw-animate-css';
@import '@fontsource-variable/inter';
@import '@fontsource/montserrat-alternates/500.css';
@import '@fontsource/montserrat-alternates/600.css';
@import '@fontsource/montserrat-alternates/700.css';

@custom-variant dark (&:is(.dark *));
/* Altura que não comporta o menu inteiro (cerca de 760 px): notebooks e celular deitado. */
@custom-variant short (@media (max-height: 780px));

:root {
  color-scheme: light;
  --radius: 1.25rem;

  --background: #f7f8f7;
  --foreground: #141c17;
  --card: #ffffff;
  --card-foreground: #141c17;
  --popover: #ffffff;
  --popover-foreground: #141c17;
  --primary: #027a48;
  --primary-foreground: #ffffff;
  --secondary: #e7f6ec;
  --secondary-foreground: #05603a;
  --muted: #eef1ee;
  --muted-foreground: #5a655e;
  --accent: #edf7f1;
  --accent-foreground: #05603a;
  --destructive: #b4372e;
  --destructive-foreground: #ffffff;
  --border: #e3e8e4;
  --input: #848f88;
  --ring: #027a48;

  --positive: #027a48;
  --warning: #8a5a00;
  --warning-surface: #fbf1dc;
  --status-ok: #027a48;
  --status-warning: #bc8019;
  --status-critical: #b4372e;
  --track: #e8ece8;

  --chart-1: #05773b;
  --chart-2: #dc6da2;
  --chart-3: #5e6b10;
  --chart-4: #4c94ec;
  --chart-5: #916508;
  --chart-6: #a083ea;
  --chart-7: #a63c0c;
  --chart-8: #04a19b;
  --chart-other: #8a938c;
  --chart-grid: #e8ece8;

  --sidebar: #ffffff;
  --sidebar-foreground: #141c17;
  --sidebar-primary: #027a48;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #edf7f1;
  --sidebar-accent-foreground: #05603a;
  --sidebar-border: #e3e8e4;
  --sidebar-ring: #027a48;

  --logo-ribbon-deep: #0e7a47;
  --logo-ribbon: #2fa866;
  --logo-ribbon-light: #5fcb86;

  --elevation-card: 0 1px 2px rgb(20 28 23 / 0.06);
  --elevation-overlay: 0 8px 24px rgb(20 28 23 / 0.1);
}

.dark {
  color-scheme: dark;
  --background: #0a0a0b;
  --foreground: #ededef;
  --card: #121214;
  --card-foreground: #ededef;
  --popover: #18181b;
  --popover-foreground: #ededef;
  --primary: #32d583;
  --primary-foreground: #04150c;
  --secondary: #222226;
  --secondary-foreground: #ededef;
  --muted: #1b1b1f;
  --muted-foreground: #a1a1aa;
  --accent: #1b1b1f;
  --accent-foreground: #ededef;
  --destructive: #e5776c;
  --destructive-foreground: #1b0f0d;
  --border: #27272b;
  --input: #6b6b73;
  --ring: #32d583;

  --positive: #32d583;
  --warning: #e3b04b;
  --warning-surface: #2e2716;
  --status-ok: #32d583;
  --status-warning: #e3b04b;
  --status-critical: #e5776c;
  --track: #27272b;

  --chart-1: #137d41;
  --chart-2: #d16b9b;
  --chart-3: #6e7e01;
  --chart-4: #2d6fbe;
  --chart-5: #916508;
  --chart-6: #997fde;
  --chart-7: #ac502e;
  --chart-8: #04a19b;
  --chart-other: #7e8e85;
  --chart-grid: #27272b;

  --sidebar: #0e0e10;
  --sidebar-foreground: #ededef;
  --sidebar-primary: #32d583;
  --sidebar-primary-foreground: #04150c;
  --sidebar-accent: #1b1b1f;
  --sidebar-accent-foreground: #ededef;
  --sidebar-border: #27272b;
  --sidebar-ring: #32d583;

  --logo-ribbon-deep: #17894f;
  --logo-ribbon: #3fb873;
  --logo-ribbon-light: #a6ebb4;

  --elevation-card: none;
  --elevation-overlay: none;
}

@theme inline {
  --font-sans: 'Inter Variable', system-ui, sans-serif;
  --font-display: 'Montserrat Alternates', 'Inter Variable', system-ui, sans-serif;

  --radius-sm: calc(var(--radius) - 8px);
  --radius-md: calc(var(--radius) - 4px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);

  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  --color-positive: var(--positive);
  --color-warning: var(--warning);
  --color-warning-surface: var(--warning-surface);
  --color-status-ok: var(--status-ok);
  --color-status-warning: var(--status-warning);
  --color-status-critical: var(--status-critical);
  --color-track: var(--track);

  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-chart-6: var(--chart-6);
  --color-chart-7: var(--chart-7);
  --color-chart-8: var(--chart-8);
  --color-chart-other: var(--chart-other);
  --color-chart-grid: var(--chart-grid);

  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);

  --color-logo-ribbon-deep: var(--logo-ribbon-deep);
  --color-logo-ribbon: var(--logo-ribbon);
  --color-logo-ribbon-light: var(--logo-ribbon-light);

  --shadow-card: var(--elevation-card);
  --shadow-overlay: var(--elevation-overlay);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }

  body {
    @apply bg-background text-foreground font-sans antialiased;
  }

  h1,
  h2,
  h3 {
    @apply font-display;
  }
}

/* Estilos de texto de destaque do Design System (seção Tipografia). */
@utility type-label {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  line-height: 1rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted-foreground);
}

@utility type-display {
  font-family: var(--font-display);
  font-size: 2.25rem;
  line-height: 2.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;

  @media (min-width: 1024px) {
    font-size: 3rem;
    line-height: 3.5rem;
  }
}

@utility type-value-lg {
  font-family: var(--font-display);
  font-size: 1.75rem;
  line-height: 2rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}
```

**Ao mudar qualquer cor, rode de novo a verificação de contraste** e atualize as tabelas deste documento.
