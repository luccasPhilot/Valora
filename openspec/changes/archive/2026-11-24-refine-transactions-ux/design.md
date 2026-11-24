## Context

- `Money` é o único caminho para dinheiro na tela e já troca o valor por `R$ ••••` quando `areValuesHidden` (de `hide-values-provider`). A cor fica com quem usa o `Money`: cada componente escolhe `text-positive` ou `text-destructive` pelo sinal, e isso continua com os valores ocultos.
- O painel de investimento manual (`manual-investment-panel.tsx`) já resolve o formulário: com os valores ocultos, o campo abre vazio, com "Valores ocultos. Deixe em branco para manter o valor atual.", e em branco não muda o valor.
- `dialog.tsx` tem o "Fechar" com `size-11`; `sheet.tsx`, não.
- A tela de Transações (`features/transactions/`) teve os filtros refeitos na `refine-transactions-filters` (17/11/2026). A crítica depois dela deu 26/40 e listou o que esta change resolve.
- Tudo aqui é tela: a implementação carrega `/frontend-design:frontend-design` e `/ui-ux-pro-max`, e o Design System vence.

## Goals / Non-Goals

**Goals:**
- Com os valores ocultos, nada na tela revela um valor: nem o número, nem a cor, nem um campo de formulário.
- Transações legível a 320 px e com um estado de filtro que se entende de uma olhada.
- Todo controle citado com 44 px de toque e nome em pt-BR.

**Non-Goals:**
- Mostrar o sinal com os valores ocultos.
- Filtros novos ou seleção múltipla.

## Decisions

### 1. `useAmountTone(cents)` (F7)

- Hook em `components/` que devolve a classe de cor de um valor: `positive` para entrada, `destructive` para saldo negativo onde a regra pede, e a cor normal para o resto. Com `areValuesHidden`, devolve **sempre** a cor normal.
- Os componentes listados na revisão (`transaction-item`, `planned-amount`, `result-money`, `projection-events`, `balance-card`) trocam a escolha local pelo hook. Uma busca por `text-positive` e `text-destructive` em `features/` confirma que nenhum valor ficou de fora; o que sobrar sem ser valor (erro de formulário, botão destrutivo) não muda.
- Ícones que indicam o tipo (seta de transferência) continuam: não revelam valor.

### 2. Formulários com valor oculto (F7)

- Um helper compartilhado com o painel de investimento manual: `amountFieldInitial(cents, areValuesHidden)` devolve vazio quando oculto, e o envio trata vazio como "manter". Formulários de orçamento (limite), transação manual, meta (alvo e aporte) e previsão.
- O texto de ajuda é o do painel manual. Criar algo novo (sem valor anterior) não muda: o campo é obrigatório como hoje.
- **Alternativa descartada:** campo mascarado com `••••` editável. Um campo que mostra pontos e aceita digitação confunde o que será salvo.

### 3. Transações a 320 px (F17)

- No celular, o status da sincronização vai para a linha de baixo do título; abaixo de 360 px, o sino continua no topo e o título não divide espaço com o status.
- A descrição usa `line-clamp-2`; abaixo de 360 px, a segunda linha mostra só a categoria (sem "· conta").
- Conferir com a régua de 320, 390, 768, 1024 e 1440 px, nos dois temas.

### 4. Filtros (F17)

| Largura | Onde fica o período | A contagem do botão inclui o período? |
|---|---|---|
| < 768 px | dentro do painel "Filtros" | sim, quando não é "Este mês" |
| ≥ 768 px | à vista, na linha da busca | não |

- Função pura `activeFilterCount(filters, { isPeriodInside })`, com teste.
- Chips com rótulo do filtro ("Categoria: Transporte"); o período nunca vira chip.
- Popover (≥ 768 px) com "Limpar filtros" no rodapé; o painel do celular troca "Ver resultados" por "Ver N transações", com a contagem do resumo do filtro (`count`), e "Ver transações" enquanto ela carrega.

### 5. Resumo e total do dia (F17)

- O resumo vira uma linha com o período ("Novembro de 2026", ou as datas do personalizado), "38 transações", "Receitas + R$ 8.500,00" e "Despesas − R$ 4.215,30", com rótulos visíveis e texto do corpo (não o tamanho pequeno de hoje). O contêiner tem `aria-live="polite"` e anuncia só quando o filtro muda, não a cada página carregada.
- Com `type=transfer`, o cabeçalho de cada dia mostra a contagem ("1 transferência", "3 transferências") no lugar do total.

### 6. Toque e nomes (F8, F15)

- `sheet.tsx`: mesma classe do botão "Fechar" do `dialog.tsx`.
- `occurrence-panel.tsx`: "Vincular" com altura mínima de 44 px.
- `icon-picker.tsx`: um mapa de nome em pt-BR para cada ícone oferecido (ex.: `ShoppingCart` → "Carrinho de compras"), usado no `aria-label`; o mapa tem teste que falha se um ícone do seletor ficar sem nome.
- `rules-tab.tsx` e `categories-tab.tsx`: a linha deixa de ter `aria-label` próprio; o botão de ação ganha o nome ("Editar regra Uber").

## Risks / Trade-offs

- **Cor neutra com valores ocultos tira uma pista visual:** é o objetivo. A memória de 16/11/2026 registra que ocultar esconde tudo.
- **"Ver N transações" com o resumo ainda carregando:** mostra "Ver transações" até o número chegar, sem travar o botão.
