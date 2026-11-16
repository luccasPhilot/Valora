## Context

A tela de Transações (`frontend/src/features/transactions/`) tem hoje, a partir de 768 px, uma linha com a busca e os cinco filtros (Período, Categoria, Tipo, Origem, Conta) em grade (`transaction-filters-bar.tsx`). Abaixo de 768 px os filtros já abrem num painel pelo botão "Filtros". Os totais mostrados são só os do dia (`day-groups.ts`). O backend lista com `GET /transactions` (`buildConditions` em `transactions.repository.ts`) e já tem a definição única de receita e despesa no `TransactionTotalsRepository` (`transactionTypeCondition`), usada pelo Início e pelos relatórios. O botão de status da sincronização (`components/sync-status.tsx`) tem área de toque de 40 px abaixo de 640 px (16 px de altura + `after:-inset-y-3`).

## Goals / Non-Goals

**Goals:**
- Reduzir a barra de filtros ao que se usa todo dia e eliminar o texto cortado dos selects.
- Responder "quanto entrou e saiu neste filtro?" sem o usuário somar os totais por dia.
- Fazer o status da sincronização ter 44 px de área de toque em qualquer largura.

**Non-Goals:**
- Ordenação, lote, filtros salvos, atalhos de teclado e troca de categoria pela linha (ficam para outra change).
- Mudar a regra de receita e despesa: o resumo apenas a reusa.

## Decisions

**1. Endpoint separado `GET /transactions/summary`, com os mesmos filtros da lista.** A lista é paginada e o resumo precisa cobrir o filtro inteiro, então não cabe dentro de `items`/`pagination`. Alternativa descartada: somar no front os itens já carregados, que dá resultado errado enquanto a lista ainda tem páginas por vir. Resposta: `incomeCents`, `expenseCents` (positivo, como no Início) e `count`.

**2. Uma só definição dos filtros.** `buildConditions` é exportado de `transactions.repository.ts` (ou movido para um arquivo próprio da pasta) e o resumo o usa junto com `transactionTypeCondition`. Alternativa descartada: reescrever os filtros no resumo, que faria lista e resumo divergirem.

**3. A consulta do resumo mora no `TransactionTotalsRepository`.** É onde já vivem "receita" e "despesa" (decisão "Consulta de totais mensais compartilhada" de `docs/03-arquitetura.md`). Controller → Service (`TransactionsService.summarize`) → Repository, como no resto do módulo.

**4. `count` é o mesmo número de `pagination.total`** (todas as transações do filtro, inclusive transferências). Já `incomeCents` e `expenseCents` deixam as transferências de fora, como em todo o app. Com `type=transfer`, receita e despesa valem zero; a tela mostra só a contagem e uma nota de que transferências não entram nos totais, em vez de dois zeros enganosos.

**5. Filtros à vista: busca, Período e "Filtros".** Categoria, Tipo, Origem e Conta vão para o painel "Filtros". Abaixo de 768 px o painel continua vindo de baixo (`FormPanel`). A partir de 768 px passa a ser um `Popover` (já existe em `components/ui/popover.tsx`) ancorado no botão. O botão mostra o número de filtros ativos entre esses quatro ("Filtros (2)"). Os chips de filtros ativos continuam como estão, então nada some da vista. Período fica fora do popover porque é o filtro mais usado e já tem o seletor com "Personalizado". Alternativa descartada: manter seis selects e só encurtar os textos, que não resolve a cara de planilha.

**6. Resumo como linha de texto, não cartão.** Fica logo acima da lista, sob os filtros e chips: "N transações · + R$ X · − R$ Y", com `Money` (respeita "ocultar valores") e a regra de cores do Design System (receita em `positive` com `+`, despesa na cor normal com `−`). Transações é tela de trabalho; um cartão-herói competiria com a lista. Estados: carregando (skeleton de uma linha), erro (a linha mostra "Tentar de novo" e a lista continua) e vazio (some, porque o estado vazio da lista já fala por ele). O resumo usa os mesmos parâmetros dos filtros na chave de consulta e é invalidado junto com a lista quando uma transação muda.

**7. Status da sincronização.** A área de toque abaixo de 640 px passa de 40 para 44 px trocando `after:-inset-y-3` por `after:-inset-y-3.5` (16 + 28 = 44), sem mudar o visual. A partir de 640 px o botão já tem `min-h-11`.

## Risks / Trade-offs

- **[Resumo e lista divergirem]** → os dois usam as mesmas condições; teste de integração compara `count` do resumo com `pagination.total` e a receita e a despesa do mês com os do Início.
- **[Mais uma consulta por filtro digitado]** → a busca já tem espera de 300 ms, o resumo é um `select` agregado por data e o `staleTime` de 60 s do TanStack Query evita repetição.
- **[Filtros escondidos ficam menos descobertos]** → o botão mostra a contagem de ativos e os chips continuam à vista.
- **[Popover no teclado e no leitor de tela]** → usar o `Popover` do shadcn (Radix), que já cuida de foco e `Esc`; conferir o foco ao fechar.
