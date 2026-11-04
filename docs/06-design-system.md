# Design System

Construído a partir do [guia de identidade visual](design/identidade-visual.md) e do [moodboard](design/moodboard.png). A linha é **Clean Fintech + Organic Green**: minimalista, amigável e sofisticada, diferenciada pela qualidade dos detalhes e não pela quantidade de efeitos.

Os tokens já estão no formato do shadcn/ui com Tailwind v4 (seção [Tokens em CSS](#tokens-em-css)), para virar código direto na Fase 0.

**Figma:** o [arquivo do Valora](https://www.figma.com/design/MNdGWT8ZnSZkTRxlvoI0Ie/Valora) tem as variáveis com os mesmos nomes destes tokens, os estilos de texto e de sombra, os ícones e os componentes. As telas do celular estão em construção. O plano gratuito do Figma só permite um modo por coleção, então as cores ficam em duas coleções com os mesmos nomes, **Color · Light** e **Color · Dark**, em vez de uma coleção com dois modos. **Este documento é a fonte da verdade:** se o Figma e este texto divergirem, vale o texto.

## Princípios

- **O dinheiro em primeiro lugar.** Saldo, gasto do mês e limite do orçamento são as informações mais fortes da tela. O resto fica em segundo plano.
- **Calma.** Fundo claro e quente, verde como identidade, vermelho só quando algo pede atenção de verdade.
- **Uma coisa por vez.** Cada card responde uma pergunta. Nada de card dentro de card sem necessidade.
- **Detalhe acima de efeito.** Alinhamento, espaçamento e números bem formatados valem mais que gradiente, sombra ou animação.
- **Responsivo em qualquer tela.** Do celular pequeno ao monitor largo, cada tela funciona e fica bem cuidada. Veja [Responsividade](#responsividade).

**Evitar** (do guia): gradientes exagerados, glassmorphism, sombras fortes, cores muito saturadas, muitos elementos competindo, cara de painel administrativo, decoração que não ajuda a entender.

## Cores

### Paleta da marca

| Nome | Hex | Uso |
|---|---|---|
| Forest Green | `#173D32` | Texto sobre fundos verdes claros; superfícies de destaque |
| Primary Green | `#286B50` | Ações principais, links, valores positivos (tema claro) |
| Sage Green | `#75A98A` | Base do verde do tema escuro; ícones e detalhes decorativos. **Nunca como texto no tema claro** (2,69:1 sobre branco) |
| Mint | `#DDE9DF` | Fundo de destaque suave, chips, hover |
| Off-white | `#F5F6F1` | Fundo da página no tema claro |
| Charcoal | `#202923` | Texto principal no tema claro |

As seis cores do guia foram mantidas. Os ajustes ficaram nos tons derivados (texto secundário, bordas, estados), escolhidos para passar no contraste.

### Tokens semânticos

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `background` | `#F5F6F1` | `#111915` | Fundo da página |
| `foreground` | `#202923` | `#E8EEE9` | Texto principal |
| `card` | `#FFFFFF` | `#18241E` | Cards e superfícies |
| `card-foreground` | `#202923` | `#E8EEE9` | Texto em cards |
| `popover` | `#FFFFFF` | `#1C2B24` | Menus, popovers, tooltips |
| `popover-foreground` | `#202923` | `#E8EEE9` | |
| `primary` | `#286B50` | `#7DB894` | Botão principal, link, item ativo |
| `primary-foreground` | `#FFFFFF` | `#0F1F17` | Texto sobre `primary` |
| `secondary` | `#DDE9DF` | `#243A30` | Botão secundário, card de destaque (saldo) |
| `secondary-foreground` | `#173D32` | `#DDE9DF` | Texto sobre `secondary` |
| `muted` | `#ECEEE7` | `#1F2D26` | Fundos neutros, skeleton |
| `muted-foreground` | `#5C665F` | `#9DAEA4` | Texto secundário, legendas, eixos |
| `accent` | `#DDE9DF` | `#243A30` | Hover de menus e botões fantasma |
| `accent-foreground` | `#173D32` | `#DDE9DF` | |
| `destructive` | `#B4372E` | `#E5776C` | Erro, orçamento estourado, saldo negativo |
| `destructive-foreground` | `#FFFFFF` | `#1B0F0D` | Texto sobre `destructive` |
| `positive` | `#286B50` | `#7DB894` | Receitas e variações positivas |
| `warning` | `#8A5A00` | `#E3B04B` | Texto de atenção |
| `warning-surface` | `#FBF1DC` | `#2E2716` | Fundo de aviso |
| `border` | `#E2E5DD` | `#2A3B33` | Bordas e divisórias (decorativas) |
| `input` | `#889189` | `#5D7266` | Borda de campos (precisa ser visível: ≥ 3:1) |
| `ring` | `#286B50` | `#7DB894` | Foco do teclado |

O tema escuro usa verdes muito escuros em vez de preto puro, como pede o guia. O verde de ação fica mais claro (`#7DB894`) e o texto sobre ele fica escuro.

### Contraste verificado

Calculado com a fórmula WCAG 2. Mínimo: 4,5:1 para texto e 3:1 para bordas de campo e foco.

| Par | Claro | Escuro |
|---|---|---|
| `foreground` sobre `background` | 13,78 | 15,20 |
| `foreground` sobre `card` | 14,97 | 13,62 |
| `foreground` sobre `muted` | 12,80 | 12,20 |
| `muted-foreground` sobre `background` | 5,49 | 7,69 |
| `muted-foreground` sobre `card` | 5,96 | 6,89 |
| `muted-foreground` sobre `muted` | 5,10 | 6,17 |
| `primary-foreground` sobre `primary` | 6,35 | 7,45 |
| `primary` como texto sobre `card` | 6,35 | 6,99 |
| `primary` como texto sobre `background` | 5,84 | 7,80 |
| `secondary-foreground` sobre `secondary` | 9,60 | 9,75 |
| `positive` sobre `secondary` (variação no card de saldo) | 5,08 | 5,31 |
| `muted-foreground` sobre `secondary` (rótulos no card de saldo) | 4,77 | 5,24 |
| `destructive` como texto sobre `card` | 5,95 | 5,49 |
| `destructive-foreground` sobre `destructive` | 5,95 | 6,41 |
| `warning` sobre `warning-surface` | 5,28 | 7,46 |
| `warning` sobre `card` | 5,93 | 8,08 |
| `input` sobre `card` | 3,25 | 3,10 |
| `ring` sobre `background` | 5,84 | 7,80 |

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
| Dentro | abaixo de 80% do limite | `#286B50` | `#7DB894` | `circle-check` | "R$ 410 de R$ 1.000" |
| Atenção | de 80% a 100% | `#BC8019` | `#E3B04B` | `triangle-alert` | "82% do limite" |
| Estourou | acima de 100% | `#B4372E` | `#E5776C` | `circle-alert` | "R$ 120 acima do limite" |

Todas passam de 3:1 sobre `card` nos dois temas (claro: 6,35 / 3,37 / 5,95; escuro: 6,99 / 8,08 / 5,49). Trilho da barra: `#E6EAE3` no claro e `#26352D` no escuro.

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

| | Claro (sobre `#FFFFFF`) | Escuro (sobre `#18241E`) |
|---|---|---|
| Pior par vizinho, daltonismo | 15,2 | 13,0 |
| Pior par vizinho, visão normal | 28,4 | 24,5 |
| Contraste mínimo com a superfície | ≥ 3:1 em todas | ≥ 3:1 em todas |

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

Duas famílias, servidas pelo próprio app (pacotes `@fontsource-variable/manrope` e `@fontsource-variable/inter`), sem depender do Google Fonts:

- **Manrope:** títulos e valores em destaque. Combina com o desenho do logotipo.
- **Inter:** texto, listas, tabelas e formulários. Muito legível em tamanhos pequenos.

| Estilo | Tamanho / altura da linha | Peso | Fonte | Uso |
|---|---|---|---|---|
| `display` | 32/40 (celular), 40/48 (computador) | 700 | Manrope | Saldo total |
| `title-1` | 24/32 | 700 | Manrope | Título da página |
| `title-2` | 20/28 | 600 | Manrope | Título de seção, valores dos cards de resumo |
| `title-3` | 16/24 | 600 | Manrope | Título de card |
| `body` | 16/24 | 400 | Inter | Texto padrão e campos (16 px evita o zoom automático no iPhone) |
| `body-sm` | 14/20 | 400 ou 500 | Inter | Listas, tabelas, rótulos |
| `caption` | 12/16 | 500 | Inter | Legendas, eixos de gráfico, metadados |

- Títulos e `display` com `letter-spacing: -0.01em` a `-0.02em`.
- **Números em listas e tabelas** usam `font-variant-numeric: tabular-nums`, para os valores alinharem. Números grandes e isolados (o saldo) ficam com os algarismos normais.

## Espaçamento

Base de 4 px. Escala: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.

| Uso | Celular | Computador |
|---|---|---|
| Margem lateral da página | 16 | 32 |
| Espaço entre cards | 12 | 16 a 24 |
| Espaço interno do card | 16 | 20 a 24 |
| Espaço entre itens de lista | 12 | 12 |

## Bordas e raios

`--radius: 0.75rem` (12 px), com as variações do shadcn/ui:

| Token | Valor | Uso |
|---|---|---|
| `radius-sm` | 8 px | chips, badges, campos pequenos |
| `radius-md` | 10 px | botões, campos |
| `radius-lg` | 12 px | cards |
| `radius-xl` | 16 px | card de saldo, painéis inferiores (sheets) |
| `full` | 9999 px | avatares, bolinhas de ícone, barras de progresso |

## Elevação

| Nível | Claro | Escuro | Uso |
|---|---|---|---|
| 0 | só `border` | só `border` | Itens de lista, áreas internas |
| 1 | `border` + `0 1px 2px rgb(23 61 50 / 0.06)` | `border`, sem sombra | Cards |
| 2 | `0 8px 24px rgb(23 61 50 / 0.10)` | `border` + fundo `popover` | Menus, popovers, diálogos, sheets |

No tema escuro, a profundidade vem da superfície mais clara e da borda, não de sombra.

## Ícones

- **Lucide**, traço 1,75 px.
- Tamanhos: 16 px junto de texto pequeno, 20 px no padrão, 24 px na navegação.
- Botão só com ícone sempre tem `aria-label`.

## Movimento

- Transições de 150 a 200 ms com `ease-out`: hover, abrir menus, trocar de aba.
- Botões: leve redução de escala ao pressionar (`scale(0.98)`).
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
- O item ativo fica com fundo `secondary` e texto `secondary-foreground`, em negrito.
- O nome do grupo fica em `caption`, `muted-foreground`, sem caixa alta.

**Celular e tablet (< 1024 px):**
- O botão de menu (ícone `menu`, Lucide) fica à esquerda do título, no topo de cada tela.
- O menu abre por cima do conteúdo, vindo da esquerda: 300 px de largura (no máximo 85% da tela), com fundo escurecido atrás.
- Fecha ao tocar fora, no `x`, ao escolher uma área ou com o gesto de voltar.
- As ações mais usadas não dependem do menu: o Início tem os atalhos e a tela de Transações tem o botão "Nova transação".

**Computador (≥ 1024 px):**
- Menu lateral fixo de 240 px, sempre visível, sem botão de menu.
- Conteúdo com largura máxima de 1200 px.

**Topo de cada tela:** botão de menu (só abaixo de 1024 px), título, status da sincronização (por exemplo, "Atualizado hoje, 07:02"; tocar sincroniza agora), botão de ocultar valores e, a partir da v2, o sino de alertas. Na tela de Transações, o topo também tem o botão **"Nova transação"**.

**Breakpoints** (os do Tailwind): `sm` 640, `md` 768, `lg` 1024, `xl` 1280.

### Responsividade

**A aplicação tem que ser responsiva.** Toda tela funciona de **320 px** de largura (celular pequeno, ou zoom de 400% num notebook) até monitores largos, sem perder função nem acabamento.

**Regras gerais:**
- **Celular primeiro:** os estilos base são para o celular; `md:`, `lg:` e `xl:` só ampliam.
- **Nunca rolagem horizontal da página**, em nenhuma largura. Uma tabela larga rola dentro do próprio card, com a primeira coluna fixa.
- **Nada depende de hover.** Tooltip, menu e ações abrem com toque. A área de toque mínima é 44 × 44 px.
- **Funciona em retrato e paisagem**, e com o zoom do navegador em 200% sem quebrar o layout.
- **Áreas seguras do celular:** o menu, os rodapés fixos (como o botão "Salvar") e os painéis respeitam `env(safe-area-inset-*)`, para não ficarem embaixo do indicador do iPhone ou da barra do Android.

**Como cada parte se adapta:**

| Parte | Celular (< 768 px) | Tablet (768 a 1023 px) | Computador (≥ 1024 px) |
|---|---|---|---|
| Navegação | Menu que abre por cima, pelo botão no topo | Menu que abre por cima, pelo botão no topo | Menu lateral fixo de 240 px |
| Margem lateral | 16 px | 24 px | 32 px |
| Início | 1 coluna | 2 colunas | Grade de 12 colunas, até 1200 px |
| Lista de transações | Item em 2 linhas (descrição em cima; categoria e conta embaixo) | Igual ao celular, com mais espaço | Linha única com colunas: data, descrição, categoria, conta, valor |
| Formulários e detalhes | `Sheet` vindo de baixo, em tela quase cheia | `Sheet` lateral | `Dialog` centralizado |
| Filtros | Botão "Filtros" que abre um `Sheet` | Linha de filtros acima da lista | Linha de filtros acima da lista |
| Gráficos | Largura do card; menos marcações no eixo (meses abreviados: "jun.") | Largura do card | Largura do card |
| Saldo (`display`) | 32 px | 32 px | 40 px |

- **Texto longo** (descrição de transação, nome de conta) é cortado com reticências na lista e aparece inteiro no detalhe. Valores em dinheiro **nunca** são cortados: se não couberem, o rótulo ao lado é que encolhe.
- **Gráficos** usam um container responsivo (`ResponsiveContainer` do Recharts) e altura fixa por faixa de tela, nunca altura proporcional à largura.

**Larguras de teste obrigatórias** para toda tela nova: **320, 390, 768, 1024 e 1440 px**, nos temas claro e escuro.

### Dashboard (Início)

Ordem no celular, logo abaixo do topo de tela (título "Início" e status da sincronização):

1. **Card de saldo** (`secondary`, `radius-xl`):
   - saldo total em `display`;
   - variação desde o início do mês (quando já houver histórico);
   - gráfico de área pequeno, com a evolução do mês.
2. **Atalhos** em botões redondos, como no moodboard:
   - v1: Adicionar receita, Registrar despesa, Transações, Orçamentos;
   - na v2, Orçamentos dá lugar a Metas.
   - "Adicionar receita" e "Registrar despesa" abrem o formulário de [Nova transação](#nova-transação) já com o tipo escolhido.
3. Receitas e despesas do mês: dois números lado a lado.
4. Receitas x despesas dos últimos 6 meses: barras agrupadas, slots 1 e 2.
5. Gastos por categoria: a lista de barras da seção [Gastos por categoria](#gastos-por-categoria).
6. Orçamentos mais perto do limite (os 3 primeiros).
7. Últimas 5 transações, com "Ver todas".

Sem saudação: o espaço vai direto para o saldo.

No computador, os mesmos blocos ficam em grade: card de saldo e números do mês na primeira linha; gráfico e categorias na segunda; orçamentos e transações na terceira.

## Componentes

A base é o shadcn/ui, com os tokens deste documento. Os componentes do Valora são montados em cima dela.

| Componente | Base shadcn/ui | Notas |
|---|---|---|
| Botão | `Button` | Variantes: primária, secundária (mint), contorno, fantasma, destrutiva. Área de toque mínima de 44 px |
| Card de saldo | `Card` | Valor em `display`, variação, gráfico pequeno, botão de ocultar valores |
| Card de resumo | `Card` | Rótulo `body-sm` em `muted-foreground`, valor em `title-2` |
| Item de transação | — | Bolinha com ícone da categoria; descrição; "categoria · conta" em `muted-foreground`; valor à direita com `tabular-nums`; parcela ("3/10") como badge; transação manual com o badge "Manual"; possível duplicata com o badge de aviso |
| Cabeçalho de dia | — | "Hoje", "Ontem", "seg., 3 de nov." e o total do dia à direita |
| Barra de orçamento | `Progress` | Trilho, preenchimento na cor do status, ícone e texto do status |
| Lista de categorias | — | Barras horizontais numa cor só (veja acima) |
| Progresso de meta (v2) | `Progress` | Valor acumulado / desejado, percentual, prazo estimado |
| Filtro de período | `Popover` + `Calendar` | Atalhos: Este mês, Mês passado, Últimos 3 meses, Este ano, Personalizado |
| Filtros | `Select`, `Combobox`, `Badge` | Numa linha acima da lista; filtros ativos viram chips removíveis |
| Pesquisa | `Input` | Busca na descrição, com espera de 300 ms |
| Detalhe de transação | `Sheet` (celular), `Dialog` (computador) | Mostra dados completos e permite trocar a categoria. Numa transação manual, também editar e excluir (exclusão pede confirmação) |
| Nova transação | `Sheet` (celular), `Dialog` (computador) + `Form` | Veja [Nova transação](#nova-transação) |
| Campo de valor | `Input` | Teclado numérico; digitação da direita para a esquerda, como nos apps de banco |
| Badge de origem | `Badge` | "Manual" em `secondary`, com ícone `pencil-line`. Transações do Open Finance não têm badge |
| Possível duplicata | `Badge` + `Alert` | Badge "Possível duplicata" (ícone `copy`, texto `warning` sobre `warning-surface`) no item; faixa no topo de Transações quando houver duplicatas para conferir; no detalhe, as duas transações lado a lado com "Juntar" (primário) e "São diferentes" (contorno) |
| Trocar categoria | `Command` | Busca de categoria + opção "Aplicar sempre para '<descrição>'", que cria a regra |
| Status de conexão | `Badge` | OK, Sincronizando, Erro, Consentimento expirado |
| Aviso de conexão | `Alert` | Faixa no topo quando um banco não sincroniza |
| Notificação rápida | `Sonner` (toast) | "Sincronização concluída: 12 transações novas" |
| Carregando | `Skeleton` | No formato do conteúdo que vai aparecer, não um spinner |
| Abas | `Tabs` | Alternar mês, tipo de gráfico |
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

Botão **"Salvar"** (primário, largura total) fixo no rodapé do formulário. Depois de salvar, o formulário fecha e um toast confirma: "Despesa registrada".

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
| Sem conexão com o servidor | Faixa avisando que os dados podem estar desatualizados |
| Conexão com banco caída | Faixa com o banco afetado e o caminho para reconectar no Meu Pluggy |
| Funcionalidade ainda não pronta | Tela de demonstração com o selo **"Demonstração"** bem visível, nunca dados falsos parecendo reais |

## Gráficos

- **Formas:**
  - evolução no tempo → linha ou área;
  - comparar meses → barras agrupadas;
  - partes de um total → lista de barras horizontais;
  - um número só → card de resumo, sem gráfico.
- **Nunca dois eixos verticais** no mesmo gráfico. Medidas de escala diferente vão em gráficos separados.
- **Traço:**
  - linhas de 2 px;
  - barras com topo arredondado de 4 px e base reta;
  - 2 px de espaço entre barras vizinhas;
  - área com preenchimento suave (cor da série a 15%, sumindo para 0%).
- **Eixos e grade discretos:** grade horizontal fina (`#E6EAE3` no claro, `#26352D` no escuro); rótulos em `caption` e `muted-foreground`.
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

Formato do shadcn/ui com Tailwind v4. Na Fase 0, isto vai para `frontend/src/styles/globals.css`.

```css
@import "tailwindcss";
@import "@fontsource-variable/inter";
@import "@fontsource-variable/manrope";

@custom-variant dark (&:is(.dark *));

:root {
  --radius: 0.75rem;

  --background: #F5F6F1;
  --foreground: #202923;
  --card: #FFFFFF;
  --card-foreground: #202923;
  --popover: #FFFFFF;
  --popover-foreground: #202923;
  --primary: #286B50;
  --primary-foreground: #FFFFFF;
  --secondary: #DDE9DF;
  --secondary-foreground: #173D32;
  --muted: #ECEEE7;
  --muted-foreground: #5C665F;
  --accent: #DDE9DF;
  --accent-foreground: #173D32;
  --destructive: #B4372E;
  --destructive-foreground: #FFFFFF;
  --border: #E2E5DD;
  --input: #889189;
  --ring: #286B50;

  --positive: #286B50;
  --warning: #8A5A00;
  --warning-surface: #FBF1DC;
  --status-ok: #286B50;
  --status-warning: #BC8019;
  --status-critical: #B4372E;
  --track: #E6EAE3;

  --chart-1: #05773B;
  --chart-2: #DC6DA2;
  --chart-3: #5E6B10;
  --chart-4: #4C94EC;
  --chart-5: #916508;
  --chart-6: #A083EA;
  --chart-7: #A63C0C;
  --chart-8: #04A19B;
  --chart-other: #8A938C;
  --chart-grid: #E6EAE3;

  --sidebar: #FFFFFF;
  --sidebar-foreground: #202923;
  --sidebar-primary: #286B50;
  --sidebar-primary-foreground: #FFFFFF;
  --sidebar-accent: #DDE9DF;
  --sidebar-accent-foreground: #173D32;
  --sidebar-border: #E2E5DD;
  --sidebar-ring: #286B50;

  --elevation-card: 0 1px 2px rgb(23 61 50 / 0.06);
  --elevation-overlay: 0 8px 24px rgb(23 61 50 / 0.10);
}

.dark {
  --background: #111915;
  --foreground: #E8EEE9;
  --card: #18241E;
  --card-foreground: #E8EEE9;
  --popover: #1C2B24;
  --popover-foreground: #E8EEE9;
  --primary: #7DB894;
  --primary-foreground: #0F1F17;
  --secondary: #243A30;
  --secondary-foreground: #DDE9DF;
  --muted: #1F2D26;
  --muted-foreground: #9DAEA4;
  --accent: #243A30;
  --accent-foreground: #DDE9DF;
  --destructive: #E5776C;
  --destructive-foreground: #1B0F0D;
  --border: #2A3B33;
  --input: #5D7266;
  --ring: #7DB894;

  --positive: #7DB894;
  --warning: #E3B04B;
  --warning-surface: #2E2716;
  --status-ok: #7DB894;
  --status-warning: #E3B04B;
  --status-critical: #E5776C;
  --track: #26352D;

  --chart-1: #137D41;
  --chart-2: #D16B9B;
  --chart-3: #6E7E01;
  --chart-4: #2D6FBE;
  --chart-5: #916508;
  --chart-6: #997FDE;
  --chart-7: #AC502E;
  --chart-8: #04A19B;
  --chart-other: #7E8E85;
  --chart-grid: #26352D;

  --sidebar: #141F1A;
  --sidebar-foreground: #E8EEE9;
  --sidebar-primary: #7DB894;
  --sidebar-primary-foreground: #0F1F17;
  --sidebar-accent: #243A30;
  --sidebar-accent-foreground: #DDE9DF;
  --sidebar-border: #2A3B33;
  --sidebar-ring: #7DB894;

  --elevation-card: none;
  --elevation-overlay: none;
}

@theme inline {
  --font-sans: "Inter Variable", system-ui, sans-serif;
  --font-display: "Manrope Variable", "Inter Variable", system-ui, sans-serif;

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
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

  --shadow-card: var(--elevation-card);
  --shadow-overlay: var(--elevation-overlay);
}
```

**Ao mudar qualquer cor, rode de novo a verificação de contraste** e atualize as tabelas deste documento.
