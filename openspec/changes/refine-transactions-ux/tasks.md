## 0. Preparação

- [ ] 0.1 Carregar `/frontend-design:frontend-design` e `/ui-ux-pro-max` antes de mexer nas telas; o Design System vence

## 1. Ocultar valores em todo lugar (F7)

- [ ] 1.1 Testes primeiro para `useAmountTone` (entrada, saída, saldo negativo, valores ocultos sempre na cor normal)
- [ ] 1.2 Trocar a cor local por `useAmountTone` em `transaction-item`, `planned-amount`, `result-money`, `projection-events` e `balance-card`; buscar `text-positive`/`text-destructive` em `features/` e conferir que nenhum valor ficou de fora
- [ ] 1.3 Testes primeiro para os formulários com valores ocultos: orçamento, transação manual, meta e previsão abrem o campo vazio com o aviso, e salvar em branco mantém o valor
- [ ] 1.4 Helper compartilhado com o painel de investimento manual e aplicação nos quatro formulários

## 2. Transações (F17)

- [ ] 2.1 Testes primeiro para `activeFilterCount` (período dentro e fora do painel, "Este mês" não conta)
- [ ] 2.2 Chips com rótulo, sem chip de período; "Limpar filtros" no popover; "Ver N transações" no painel do celular
- [ ] 2.3 Resumo com período, rótulos visíveis, texto do corpo e `aria-live="polite"` (anúncio só na troca de filtro), com teste
- [ ] 2.4 Cabeçalho do dia com a contagem de transferências quando `type=transfer`, com teste
- [ ] 2.5 Topo e linhas a 320 px: status abaixo do título, descrição em duas linhas, conta fora abaixo de 360 px

## 3. Toque e nomes (F8, F15)

- [ ] 3.1 `sheet.tsx` com o "Fechar" de 44 px, com teste de classe/tamanho
- [ ] 3.2 "Vincular" do `occurrence-panel.tsx` com 44 px
- [ ] 3.3 Nomes em pt-BR dos ícones do `icon-picker.tsx`, com teste que falha se um ícone ficar sem nome
- [ ] 3.4 `aria-label` só no botão de ação em `rules-tab.tsx` e `categories-tab.tsx`, com teste pelo papel e nome

## 4. Conferência

- [ ] 4.1 Conferir Transações, Planejamento, Orçamentos, Metas, Início e Relatórios em 320, 390, 768, 1024 e 1440 px, nos dois temas, com os valores visíveis e ocultos, sem rolagem horizontal
- [ ] 4.2 Rodar `typecheck`, `lint`, `format:check` e `test` no `frontend/`

## 5. Documentação

- [ ] 5.1 `docs/06-design-system.md`: com os valores ocultos, nenhuma cor revela o sinal; padrão "em branco mantém o valor" nos formulários de edição
- [ ] 5.2 Ao arquivar: marcar F7, F8, F15 e F17 como resolvidos e o "Acabamento de Transações" da Fase 4 como feito em `docs/08-revisao-e-proximas-fases.md`
