## Why

O uso real mostrou que falta uma rotina diária de revisão (`docs/08-revisao-e-proximas-fases.md`, "Lacunas", itens 1 e 3):

- ver o que chegou desde a última visita depende de lembrar onde parou;
- a categoria só se corrige uma transação por vez;
- regras só nascem com "Aplicar sempre", e corrigir a mesma descrição três vezes não sugere nada.

É o primeiro grupo da Fase 4 ("Confiança e rotina"), cujo resultado é "dois minutos por dia deixam tudo revisado". Junta três itens da Fase 4 que só fazem sentido juntos: a caixa de entrada "Para revisar", a categoria em massa e a regra sugerida pelas correções.

## What Changes

- **Transação revisada:** coluna nova `transactions.reviewed_at`. Toda transação que a sincronização insere chega sem revisão. Lançar à mão, trocar a categoria ou marcar como revisada grava a data. Na migration, todas as transações que já existem entram como revisadas (a carga atual não vira uma fila de meses). Quando uma pendente revisada vira postada com outro id, a postada herda a revisão junto com a decisão do usuário (a mesma troca da `fix-sync-data-loss`).
- **Caixa "Para revisar":** uma visão de Transações (`/transacoes/revisar`) com as transações ainda não revisadas de bancos ativos, mais antigas primeiro, cada uma com "Ok" (marca como revisada) e "Trocar categoria". Etiquetas visíveis para "Sem categoria" e "Possível duplicata" (que leva à conferência que já existe). "Marcar tudo como revisado" marca só o que estava na tela quando a lista foi carregada, nunca o que chegou depois. O estado vazio é a recompensa: "Tudo revisado".
- **Contador no Início:** um aviso "12 para revisar" no topo do Início, que leva à caixa; some com zero.
- **Categoria em massa:** seleção múltipla na lista de Transações e na caixa: "Selecionar", escolher várias e "Trocar categoria" (grava `category_source = 'user'` e marca como revisadas) ou "Marcar como revisadas". Até 100 de uma vez. Vale para transações do Open Finance e manuais; categoria arquivada é recusada.
- **Regra sugerida:** quando há 2 ou mais transações do Open Finance com a mesma descrição normalizada, todas com a mesma categoria escolhida por você, e nenhuma regra decide essa descrição para essa categoria, o app oferece "Criar regra?". Aparece logo depois de uma troca de categoria (no detalhe, na caixa e na troca em massa) e numa lista "Sugestões" na aba Regras. Aceitar cria a regra `equals` pelo fluxo que já existe (e aplica ao histórico). Dispensar guarda o par descrição e categoria, que não volta. Regra fixa, sem IA.

### Contraria documentos

Nenhum. A regra 9 do `CLAUDE.md` continua: numa transação do Open Finance, só a categoria muda; "revisada" é um dado do app, não da transação do banco. A regra 3 continua: a sincronização nunca mexe em `reviewed_at` de uma transação existente nem em categoria `user`.

### Fora do escopo

- Notas e etiquetas (change `add-transaction-notes-and-tags`).
- Push quando a caixa enche (change `add-push-notifications`).
- Juntar duplicatas sozinho ou mudar a regra de duplicata.
- Regra sugerida por padrão (`contains`, `starts_with`): só `equals`, como "Aplicar sempre".
- Desfazer "Marcar tudo como revisado".
- Nenhum item da seção "Fora do escopo" de `docs/01-produto.md` é afetado: nada de IA, nada de escrita no banco do usuário.

### Roadmap

Não está em `docs/07-roadmap.md`: são os itens "Caixa de entrada 'Para revisar'", "Categoria em massa" e "Regra sugerida pelas correções" da Fase 4 em `docs/08` (change nº 6 da "Ordem sugerida"). Ao arquivar, os três são marcados como feitos.

## Capabilities

### New Capabilities

- `review-inbox`: transação revisada, caixa "Para revisar", marcar uma e marcar tudo, contador.

### Modified Capabilities

- `transactions-view`: seleção múltipla e troca de categoria em massa; trocar a categoria marca como revisada.
- `transaction-categorization`: regra sugerida pelas correções, aceitar e dispensar.
- `open-finance-sync`: transação inserida chega sem revisão; a postada que substitui uma pendente herda a revisão.
- `home-dashboard`: contador "para revisar".

## Impact

- **Banco:** `transactions.reviewed_at timestamptz null` (preenchida na migration para as existentes) com índice parcial `where reviewed_at is null`; tabela `dismissed_rule_suggestions (pattern text, category_id uuid, dismissed_at)` com chave nos dois. Migration nova; `docs/04-modelo-de-dados.md`.
- **Backend:** `modules/transactions/` (filtro `reviewed=false`, `POST /transactions/review`, `POST /transactions/review-all`, `PATCH /transactions/category` em massa, `GET /transactions/review-count`), `modules/categories/` (`GET /category-rules/suggestions`, `POST /category-rules/suggestions/dismiss`), `modules/sync/` (herdar a revisão na troca pendente → postada), `modules/dashboard/` (contador).
- **Frontend:** `features/transactions/` (visão "Para revisar", modo de seleção, barra de ações), `features/dashboard/` (aviso), `features/categories/` (sugestões na aba Regras e "Criar regra?" depois da troca), schemas em `lib/api/`.
- **Testes:** integração de cada endpoint e da migration; unitários da sugestão; telas com carregando, vazio e erro, nos dois temas e nas cinco larguras.
- **Documentação:** `docs/01-produto.md`, `docs/03-arquitetura.md` (contrato da API e Decisões), `docs/04-modelo-de-dados.md` e `docs/08-revisao-e-proximas-fases.md`.
- **Dependências:** nenhuma nova.
