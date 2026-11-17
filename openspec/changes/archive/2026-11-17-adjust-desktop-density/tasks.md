## 1. Densidade e largura

- [x] 1.1 Definir `html { font-size: 87.5% }` com `(min-width: 1024px) and (pointer: fine)` em `frontend/src/styles/globals.css`.
- [x] 1.2 Criar `--container-content: 110rem` no `@theme` e trocar `max-w-[1200px]` por `max-w-content` no shell, cabeçalho, banners e skeletons.
- [x] 1.3 Trocar o `72px` fixo do cabeçalho do topo e do menu por `h-18` (rem).
- [x] 1.4 Conferir a tela em 1024, 1280, 1440, 1920 e 2560 px com mouse, nos dois temas, sem rolagem horizontal; e em 320, 390 e 768 px, que não devem mudar.

## 2. Início

- [x] 2.1 Criar o card "Resultado do mês" (`monthIncomeCents − monthExpenseCents`, sinal da interface, cor normal) em `month-summary.tsx`, com os três cards na mesma altura a partir de 1024 px.
- [x] 2.2 Atualizar o teste do Início: ordem dos títulos e um teste do valor do resultado.
- [x] 2.3 Conferir os estados carregando, vazio e erro do Início e o "Ocultar valores".

## 3. Painéis de transação

- [x] 3.1 Remover a altura limitada com rolagem da lista de categorias em `category-picker.tsx` e `new-transaction/category-choice.tsx`.
- [x] 3.2 Colar o rodapé do "Salvar" na borda do diálogo com `lg:-bottom-6` em `transaction-form.tsx`.
- [x] 3.3 Conferir os dois painéis em 320, 390, 768, 1024 e 1440 px, nos dois temas.

## 4. Verificação e documentação

- [x] 4.1 Rodar `typecheck`, `lint`, `format:check` e `test` no frontend.
- [x] 4.2 Atualizar [docs/06-design-system.md](../../../docs/06-design-system.md): tipografia (base de 14 px com mouse), espaçamento, largura do conteúdo, Dashboard (card "Resultado do mês", grade), formulários e responsividade; atualizar o CLAUDE.md se citar 44 px ou 1200 px.
- [x] 4.3 Conferir que nenhum item do roadmap precisa ser marcado (a change não cobre item novo).
