## Why

A revisão de 18/11/2026 (`docs/08-revisao-e-proximas-fases.md`) e a crítica de Transações de 16/11/2026 (26/40, `.impeccable/critique/2026-11-16T19-11-36Z__frontend-src-features-transactions.md`) deixaram itens de acabamento que atrapalham o uso diário:

- **F7, Média:** "Ocultar valores" fica incompleto. Os formulários de edição (orçamento, transação, meta, previsão) mostram o valor real, e a cor verde ou vermelha ainda revela se o valor é entrada ou saída (`transaction-item`, `planned-amount`, `result-money`, `projection-events` e o saldo negativo do `balance-card`). Só o painel de investimento manual já mascara.
- **F8, Média:** o botão "Fechar" do Sheet tem 16 px. Todo formulário no celular usa o Sheet; o do Dialog já tem 44 px.
- **F17, Média:** pendências da crítica de Transações: a 320 px o título, o status da sincronização e as descrições cortam; o estado dos filtros fica dividido (período em um lugar, contagem que não o considera, chips sem rótulo, chip de período repetido, sem "Limpar" no popover); a linha de resumo é discreta demais (sem rótulos visíveis, sem o período, não anunciada); o total do dia mostra "R$ 0,00" com o filtro de transferências (decidido: mostrar a contagem, "3 transferências").
- **F15, Baixa:** acessibilidade pontual: "Vincular" com 32 px; nomes de ícones do Lucide em inglês no `aria-label`; o `aria-label` da linha de regra e de categoria esconde o conteúdo visível.

## What Changes

- **Ocultar valores em todo lugar (F7):** com os valores ocultos, os campos de valor dos formulários de edição abrem vazios com o aviso "Valores ocultos. Deixe em branco para manter o valor atual." (o padrão do painel de investimento manual), e nenhum valor muda de cor: entrada, saída, resultado e saldo negativo ficam na cor normal do texto. Um hook `useAmountTone(cents)` decide a cor num lugar só. O sinal continua oculto junto com o valor (`R$ ••••`), como hoje.
- **"Fechar" com 44 px (F8):** o Sheet usa a mesma classe do Dialog.
- **Transações a 320 px (F17):** o status da sincronização vai para baixo do título no celular, a descrição da transação usa até duas linhas e o nome da conta sai da linha abaixo de 360 px. Nada corta com reticências no título.
- **Filtros num estado só (F17):** abaixo de 768 px, onde o período fica dentro do painel, a contagem do botão "Filtros" inclui o período quando ele não é "Este mês"; a partir de 768 px, onde o período fica à vista, não inclui. Os chips ganham rótulo ("Categoria: Transporte", "Tipo: Despesas"), o período não vira chip (já está à vista), o popover ganha "Limpar filtros" e o botão do painel do celular diz quantas transações vai mostrar ("Ver 38 transações").
- **Resumo mais claro (F17):** a linha de resumo mostra o período e os rótulos "Receitas" e "Despesas" visíveis ao lado dos valores, com tamanho de texto do corpo, e é anunciada aos leitores de tela quando muda (`aria-live="polite"`).
- **Total do dia com transferências (F17):** com `type=transfer`, o cabeçalho do dia mostra a contagem ("3 transferências") no lugar de "R$ 0,00".
- **Acessibilidade pontual (F15):** "Vincular" com 44 px; os ícones de categoria com nome em pt-BR no seletor; o `aria-label` só no botão de ação, e não na linha inteira, em Regras e Categorias.

### Contraria documentos

Nenhum. O Design System já pede 44 px de toque e "nunca só a cor". Nenhuma regra do `CLAUDE.md` muda: "Ocultar valores" continua escondendo o valor inteiro, sinal incluído.

### Fora do escopo

- Mostrar o sinal ou "Entrou/Saiu" com os valores ocultos: decidido em 16/11/2026 que ocultar esconde tudo.
- Filtros novos, seleção múltipla e categoria em massa (change `add-review-inbox`), notas e etiquetas (change `add-transaction-notes-and-tags`).
- F5, F6, F9, F10, F12, F14 e F16.
- Mudança de endpoint: o resumo e a contagem já vêm da API.
- Nenhum item da seção "Fora do escopo" de `docs/01-produto.md` é afetado.

### Roadmap

Não está em `docs/07-roadmap.md`: é a change nº 5 da "Ordem sugerida" de `docs/08` (o "Acabamento de Transações" da Fase 4). Ao arquivar, F7, F8, F15 e F17 são marcados como resolvidos.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `web-shell`: "Ocultar valores" também nos formulários de edição e sem cor que revele o sinal; alvos de toque de 44 px e nomes acessíveis em pt-BR nos controles citados.
- `transactions-view`: lista a 320 px, total do dia com transferências, filtros com contagem coerente, chips com rótulo e "Limpar filtros" no popover, resumo com rótulos, período e anúncio.

## Impact

- **Frontend:** `components/ui/sheet.tsx`, `components/money.tsx` (ou um hook novo `useAmountTone`), `features/transactions/` (lista, cabeçalho do dia, filtros, chips, resumo, topo), os formulários de edição de `budgets`, `transactions`, `goals` e `planning`, `features/planning/` (`planned-amount`, `projection-events`, `occurrence-panel`), `features/reports/` (`result-money`), `features/dashboard/` (`balance-card`), `features/categories/` (`icon-picker`, `rules-tab`, `categories-tab`).
- **Testes:** cada item com teste de componente (valor oculto no formulário, cor neutra com valores ocultos, contagem de filtros por largura, rótulos dos chips, resumo com `aria-live`, contagem de transferências no dia, nomes em pt-BR, alvos de 44 px).
- **Backend, banco e API:** nada muda.
- **Documentação:** `docs/06-design-system.md` (ocultar valores sem cor que revele o sinal; padrão "em branco mantém o valor") e `docs/08-revisao-e-proximas-fases.md`. A memória das pendências da crítica de Transações deixa de valer.
