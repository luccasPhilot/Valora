## Context

A `setup-web-foundation` (arquivada) entregou o shell com os tokens de `docs/06-design-system.md` ao pé da letra. O usuário quer um visual mais moderno, como o do Meu Pluggy, com o verde nos detalhes. O que a referência tem de útil para o Valora, e que dá para fazer sem gradiente, desfoque ou sombra forte:

- cards com cantos bem arredondados;
- fundo escuro quase preto e neutro;
- títulos de card em caixa-alta pequena, com ícone;
- números grandes;
- uma única cor viva, usada com disciplina.

A referência é só de estilo: não se copia marca, logotipo nem layout.

Restrições:

- O Design System vence as skills de design. Esta change é a aprovação do usuário para mudá-lo, e por isso os dois documentos de design são atualizados junto.
- As regras de valores, a lista de barras de uma cor e a paleta de oito cores dos gráficos não mudam.
- Só `frontend/` muda em código. Sem dependência nova.

## Goals / Non-Goals

**Goals:**

- Uma paleta de verdes com vários tons, vivos, com todos os pares de texto passando de 4,5:1.
- Tema escuro quase preto, com o verde só nos detalhes.
- Raios, estilos de texto e tamanho dos botões novos, aplicados ao menu, topo, estados vazio e erro, botão de ocultar valores e Ajustes.
- Uma verificação automática que impeça gradiente e desfoque de voltarem.

**Non-Goals:**

- Telas com dados e gráficos novos.
- Mudar a navegação, a paleta de oito cores dos gráficos ou o Figma.

## Decisions

**1. Paleta de verdes: uma escala, com papéis fixos.**

Os tons saem da escala de verdes abaixo. Os valores são os candidatos desta change e a tarefa 1.1 recalcula e documenta todos antes de qualquer código.

| Papel | Claro | Escuro |
|---|---|---|
| `primary` (botão, link, foco, item ativo, `positive`) | `#027A48` | `#32D583` |
| `primary-foreground` | `#FFFFFF` | `#04150C` |
| `secondary` (fundo de destaque, item ativo) | `#E7F6EC` | `#222226` |
| `secondary-foreground` | `#05603A` | `#EDEDEF` |
| `accent` (hover) | `#EDF7F1` | `#1B1B1F` |
| `accent-foreground` | `#05603A` | `#EDEDEF` |
| Status "Dentro do limite" | `#027A48` | `#32D583` |

- O verde forte (`#027A48`) dá 5,41:1 com texto branco. O tom logo acima na escala (`#039855`) dá 3,73:1 e não serve para botão nem texto; tons assim só servem para detalhes sem texto (barras, pontos, ícones decorativos).
- No tema escuro o verde claro (`#32D583`) fica com texto quase preto por cima (9,82:1).
- No tema escuro `secondary` e `accent` são cinzas neutros, não verdes: a revisão do usuário mostrou que o fundo do item ativo e dos círculos de ícone, em verde escuro, faziam o tema inteiro parecer esverdeado. O verde fica no ícone e no texto de destaque.
- _Alternativa:_ manter o verde-floresta atual e deixar o visual moderno só por conta de raios e tipografia. O usuário descartou; o verde apagado era o que mais pesava.
- _Alternativa:_ um verde ainda mais vivo (`#12B76A`) como `primary` no claro. Descartado: só dá 2,62:1 com branco, o que reprova botão e foco.

**2. Neutros e tema escuro quase preto.**

| Token | Claro | Escuro |
|---|---|---|
| `background` | `#F7F8F7` | `#0A0A0B` |
| `foreground` | `#141C17` | `#EDEDEF` |
| `card` | `#FFFFFF` | `#121214` |
| `popover` | `#FFFFFF` | `#18181B` |
| `sidebar` | `#FFFFFF` | `#0E0E10` |
| `muted` | `#EEF1EE` | `#1B1B1F` |
| `muted-foreground` | `#5A655E` | `#A1A1AA` |
| `border` | `#E3E8E4` | `#27272B` |
| `input` | `#848F88` | `#6B6B73` |
| `ring` | `#027A48` | `#32D583` |
| `destructive` | `#B4372E` | `#E5776C` |
| `warning` / `warning-surface` | `#8A5A00` / `#FBF1DC` | `#E3B04B` / `#2E2716` |

- **Tema escuro:** cinzas neutros, com no máximo 4 de diferença entre os canais R, G e B de cada cor. Um teste confere isso, para o tom de verde não voltar por engano. **Tema claro:** os neutros mantêm um traço de verde (fundo `#F7F8F7`), que combina com o verde forte.
- `destructive`, `warning` e o status "Atenção" e "Estourou" não mudam; só se confere o contraste sobre os fundos novos.
- Grade e trilho dos gráficos: `#E8ECE8` no claro e `#27272B` no escuro (acompanham `border`).
- Sombras: nível 1 `0 1px 2px rgb(20 28 23 / 0.06)`, nível 2 `0 8px 24px rgb(20 28 23 / 0.10)`; no escuro continua sem sombra, só superfície mais clara e borda.

**Contraste calculado** (WCAG 2; mínimo 4,5:1 para texto e 3:1 para borda de campo e foco):

| Par | Claro | Escuro |
|---|---|---|
| `foreground` sobre `background` | 16,33 | 16,93 |
| `foreground` sobre `card` | 17,38 | 16,00 |
| `muted-foreground` sobre `background` | 5,70 | 7,72 |
| `muted-foreground` sobre `card` | 6,07 | 7,30 |
| `muted-foreground` sobre `muted` | 5,34 | 6,70 |
| `primary-foreground` sobre `primary` | 5,41 | 9,82 |
| `primary` como texto sobre `card` | 5,41 | 9,78 |
| `primary` como texto sobre `secondary` | 4,84 | 8,29 |
| `secondary-foreground` sobre `secondary` | 6,86 | 13,56 |
| `accent-foreground` sobre `accent` | 7,00 | 14,68 |
| `destructive` sobre `card` | 5,95 | 6,40 |
| `warning` sobre `warning-surface` | 5,28 | 7,46 |
| `input` sobre `card` | 3,35 | 3,54 |
| `ring` sobre `background` | 5,08 | 10,35 |

- Os oito slots dos gráficos continuam com 3:1 ou mais sobre o `card` novo nos dois temas (menor valor: 3,17 no claro, para "Outros"; 3,51 no escuro, slot 7). A distância entre cores vizinhas não depende da superfície e, portanto, não muda.

**3. Escala de raios.**

`--radius` passa de `0.75rem` para `1.25rem` (20 px). As variações mudam para `calc(var(--radius) - 8px)`, `-4px`, `+0` e `+4px`:

| Token | Valor | Uso |
|---|---|---|
| `radius-sm` | 12 px | campos pequenos, itens do menu |
| `radius-md` | 16 px | botões, campos |
| `radius-lg` | 20 px | cards |
| `radius-xl` | 24 px | card de saldo, painéis |
| `full` | 9999 px | chips, badges, avatares, barras |

- Chips e badges viram pílula (`full`), em vez de `radius-sm`.
- _Alternativa:_ 16 px nos cards. Fica mais perto do Design System atual, mas o usuário pediu cantos maiores e a referência tem cerca de 20 a 24 px.

**4. Estilos de texto.**

- `label` (novo): 12/16, 600, Inter, caixa-alta, espaçamento entre letras de `0.06em`, `muted-foreground`, com ícone de 16 px em `primary`. Serve de título de card e de nome de grupo do menu.
- `display`: 36/44 no celular e 48/56 a partir de 1024 px (hoje 32/40 e 40/48).
- `value-lg` (novo): 28/32, 700, Manrope, para valores dos cards de resumo (substitui `title-2` nesse uso).
- Texto em caixa-alta só no estilo `label`, sempre curto (até 3 palavras), para não pesar na leitura. O resto do Design System não muda.
- Implementação: classes utilitárias do Tailwind v4 declaradas no `globals.css` com `@utility`, para não repetir os valores em cada componente.

**5. Aplicação nos componentes existentes.**

- **Menu lateral:** veja as decisões 9 a 11 (retrátil, espaçamento e logotipo).
- **Topo de tela:** fundo opaco `background` com borda inferior. O `backdrop-blur` e a transparência saem.
- **Botão:** `size` padrão com 44 px de altura (hoje 36 px), `radius-md`, e `scale(0.98)` ao pressionar. O `icon` fica com 44 px.
- **Estado vazio e erro:** card com `radius-lg`, borda sólida, o ícone dentro de um círculo `secondary` com o ícone em `primary`, título em `title-2` e descrição em `muted-foreground`. O erro usa o ícone em `destructive` sobre um círculo `warning-surface`.
- **Ocultar valores:** botão de 44 px, redondo.
- **Ajustes:** um card com o rótulo "Tema" e um controle segmentado em pílula com as três opções. A opção escolhida usa `secondary` e `secondary-foreground`. Continua sendo um `radiogroup`, e as opções continuam sendo botões.

**6. Verificação contra efeitos proibidos.**

O `check:tokens` passa a falhar também com `bg-gradient-`, `bg-linear-` e `backdrop-blur` em `src/components` e `src/features`.

- Já existe, roda junto com o `lint` e custa só uma expressão regular a mais.
- _Alternativa:_ uma regra de ESLint. Descartada, por ser mais código para a mesma garantia.

**7. Teste de contraste dos tokens.**

Um teste do Vitest lê `src/styles/globals.css`, calcula os pares da tabela da decisão 2 e falha se algum cair abaixo do mínimo.

- O CSS passa a ser a única fonte; os números do Design System deixam de poder divergir do código sem o teste acusar.
- _Alternativa:_ conferir à mão a cada mudança de cor. É o que se fazia, e é onde a tabela errada escapa.

**8. Documentação.**

`docs/06-design-system.md` e `docs/design/identidade-visual.md` são atualizados na mesma change, com as tabelas de tokens e de contraste, os raios, os estilos de texto e o princípio "Calma" reescrito. Os princípios que continuam valendo (dinheiro em primeiro lugar, uma coisa por vez, detalhe acima de efeito) ficam como estão.

**9. Menu retrátil: o próprio `Sidebar` do shadcn/ui com `collapsible="icon"`.**

- O componente já tem o modo "só ícones": o estado `collapsed` esconde os rótulos e os nomes de grupo, e `SidebarMenuButton` aceita `tooltip` (mostrado só quando recolhido).
- Larguras: `--sidebar-width` 264 px (hoje 240) e `--sidebar-width-icon` 72 px (hoje 48). O painel que abre por cima no celular continua com 300 px.
- O botão de recolher fica no cabeçalho do menu (ícones `chevrons-left` e `chevrons-right`), com `hidden lg:inline-flex`. Expandido, ele fica à direita do logotipo; recolhido, fica logo abaixo do símbolo, porque 72 px não cabem os dois lado a lado. Nome acessível "Recolher menu" ou "Expandir menu" e `aria-expanded`.
- O estado fica em `SidebarProvider` controlado (`open` e `onOpenChange`) e é salvo com `readStoredValue` e `writeStoredValue` de `lib/storage.ts` (chave `valora.sidebar`). O cookie `sidebar_state` do shadcn/ui sai: o projeto não tem servidor que o leia, e o `storage.ts` já trata o armazenamento indisponível.
- O valor salvo é lido na criação do estado, antes da primeira pintura, então o menu não pisca expandido.
- _Alternativa:_ recolher só por atalho de teclado. Descartado: o atalho `Ctrl+B` foi removido de propósito e botão visível é mais descobrível.
- _Alternativa:_ menu recolhível também no celular. Descartado: abaixo de 1024 px o menu já abre por cima e some.

**10. Espaçamento do menu.**

- Margem interna do menu de 16 px (`px-4`); recolhido, 14 px de cada lado para centralizar o ícone de 44 px nos 72 px.
- Itens de 44 px, com 4 px entre um e outro (`gap-1`); ícone de 20 px e 12 px entre o ícone e o texto.
- Nome de grupo (estilo `label`) com 12 px abaixo e 8 px acima; 24 px entre o grupo "Dia a dia" e o rodapé; no rodapé, uma linha divisória (`border`) e os itens Categorias e regras e Ajustes. Recolhido, o nome do grupo some e a divisória fica.
- Cabeçalho com 72 px de altura, sem borda abaixo. O topo de tela passa a ter 72 px a partir de 1024 px (`h-14 lg:h-[72px]`), para as duas linhas alinharem.
- O item ativo é um bloco `secondary` com `radius-sm`; o resto do menu fica sem fundo e sem borda, para o menu ser minimalista.

**11. Logotipo.**

- A imagem enviada é um PNG raster sobre fundo verde, e não serve para os dois temas. O símbolo é redesenhado em SVG, como inspiração: duas fitas formando um "V", com a fita da esquerda mais escura e a da direita mais clara, e uma dobra no encontro, no fundo.
- O SVG fica num componente (`components/brand/valora-mark.tsx`) e o logotipo completo em `valora-logo.tsx`: símbolo + o nome "Valora" como texto em Manrope 700. O nome é texto, e não parte da imagem, para seguir o tema e o idioma, e porque a fonte do app é a mesma família do desenho.
- As cores das fitas vêm de três tokens novos (`--logo-ribbon-deep`, `--logo-ribbon`, `--logo-ribbon-light`), com valores próprios por tema, para a fita clara não sumir sobre o fundo branco. Os componentes usam `var(--logo-...)`, sem hex, e passam no `check:tokens`.
- O degradê suave das fitas (como na imagem) é feito com `linearGradient` do SVG, que o `check:tokens` não pega (ele procura só classes `bg-gradient`, `bg-linear` e `backdrop-blur`). É a única exceção à regra de "sem gradiente", e está escrita no Design System e na spec.
- Com o menu recolhido só o símbolo aparece; o logotipo é um link para `/` com `aria-label="Valora"`.
- _Alternativa:_ usar o PNG como está. Descartado: fundo opaco, resolução fixa e cores que não acompanham o tema.

## Risks / Trade-offs

- [Verde mais vivo pode cansar nos botões grandes] → O verde forte só aparece em botão principal, item ativo, foco e valores positivos; o resto é neutro. Se ficar forte, ajusta-se um token só (`primary`), pela tabela.
- [Caixa-alta em rótulos pode reduzir a leitura em português] → Só no estilo `label`, curto, a 12 px e peso 600, e a regra está no Design System.
- [Raio maior em tela de 320 px come espaço útil] → O raio dos cards fica em 20 px em qualquer largura, e o espaço interno do card não muda; a conferência nas cinco larguras cobre isso.
- [O arquivo do Figma fica desatualizado] → O texto do Design System já é a fonte da verdade e o proposal registra a pendência.
- [O símbolo redesenhado pode ficar diferente do logotipo que o usuário tem] → Ele é inspirado na imagem, não uma cópia; o usuário confere o resultado na tela antes de arquivar e pode trocar o SVG por um arquivo final dele, sem mudar o resto (o componente é o único ponto de uso).
- [Menu recolhido esconde os nomes] → Cada ícone tem tooltip com o nome ao passar o mouse e ao receber o foco, e `aria-label`; o botão de expandir fica sempre visível.
- [Cinza neutro puro pode parecer "frio" ao lado do verde] → O verde é vivo o bastante para se destacar sobre o neutro, e a revisão do usuário pediu esse resultado; os cinzas ainda têm uma diferença mínima de luminosidade entre os degraus (fundo, card, popover).
- [A paleta de gráficos foi validada sobre `#18241E`] → A distância entre vizinhas não depende da superfície; só o contraste mínimo foi recalculado, e passa.

## Open Questions

Nenhuma.
