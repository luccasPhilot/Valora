## Context

- `transactions` tem `category_id`, `category_source` (`user`, `rule`, `pluggy`, `none`), `description_normalized`, `source`, `possible_duplicate_of_id`, `created_at`. Nenhuma coluna diz se a transação já foi vista.
- `PATCH /transactions/:id` troca a categoria (e, com `applyAlways`, chama `learnFromCorrection`, que cria ou atualiza uma regra `equals` e aplica ao histórico).
- A decisão de categoria é pura (`compileRules`, `decideCategory` em `category-decision.ts`).
- A `fix-sync-data-loss` leva a categoria `user` e o vínculo com previsão da pendente para a postada (`pending-replacement.ts`, `carryUserCategory`).
- O front lista transações com filtros, resumo e detalhe; as possíveis duplicatas já têm contagem e conferência.

## Goals / Non-Goals

**Goals:**
- Uma fila que chega a zero todo dia, sem perder nada que chegou no meio.
- Corrigir várias categorias de uma vez.
- Sugerir a regra que o usuário já está aplicando à mão.

**Non-Goals:**
- Notas, etiquetas, push.
- Sugestão por padrão diferente de `equals`.

## Decisions

### 1. `reviewed_at` em `transactions`

- `timestamptz null`. Nulo = para revisar.
- **Migration:** `update transactions set reviewed_at = now()` para todas as existentes. Índice parcial `transactions_unreviewed_idx on (date) where reviewed_at is null`.
- **Quem grava:**
  - sincronização, ao **inserir**: nulo. Ao **atualizar** uma existente: não toca;
  - lançamento manual (`POST /transactions`): `now()`;
  - troca de categoria (uma ou em massa): `now()`;
  - "Ok", "Marcar como revisadas" e "Marcar tudo": `now()`;
  - troca pendente → postada: a postada recebe o `reviewed_at` da pendente quando a pendente tinha um, na mesma operação que leva a categoria.
- **Alternativa descartada:** um marcador global "revisei até tal hora". Não permite revisar uma por vez nem deixar uma para depois.

### 2. A caixa

- `GET /transactions?reviewed=false` reaproveita a lista (paginação, DTO, filtros), com ordem **mais antiga primeiro** quando `reviewed=false` (para revisar na ordem em que aconteceu). Só bancos ativos e manuais, como a lista.
- `GET /transactions/review-count` → `{ count }`, para o Início e o título da caixa.
- `POST /transactions/review` com `{ transactionIds }` (1 a 100, uuids, sem repetir): marca as que ainda não têm revisão; ids inexistentes são ignorados e a resposta diz quantas foram marcadas (`{ reviewedCount }`). Idempotente.
- `POST /transactions/review-all` com `{ until }` (instante ISO em que a lista foi carregada): marca as não revisadas com `created_at <= until`. O que chegou depois fica. Um `until` no futuro é recusado com 400.
- Ações por linha: "Ok" e "Trocar categoria" (o painel de categoria que já existe). Possível duplicata mostra a etiqueta e "Conferir", que abre a conferência atual; "Ok" numa duplicata só marca como revisada, a marca de duplicata continua no fluxo dela.

### 3. Categoria em massa

- `PATCH /transactions/category` com `{ transactionIds (1 a 100), categoryId }`. Numa transação do banco de dados: valida a categoria (ativa), grava `category_id`, `category_source = 'user'` e `reviewed_at = now()` em todas as que existem, e reavalia os alertas de orçamento (como a troca de uma). Resposta `{ updatedCount }`.
- Vale para Open Finance e manual: nas duas, a categoria é editável (regra 9).
- Sem "Aplicar sempre" na troca em massa: a regra sugerida cobre o caso, e uma escolha de várias descrições diferentes não vira uma regra.
- Front: botão "Selecionar" no topo da lista e da caixa; cada linha ganha uma caixa de seleção de 44 px; uma barra fixa embaixo com "N selecionadas", "Trocar categoria", "Marcar como revisadas" e "Cancelar". No computador, também com Shift+clique para intervalo.

### 4. Regra sugerida

- **Critério**, calculado no service a cada consulta (sem tabela de contagem):
  1. grupos de transações `source = 'open_finance'` e `category_source = 'user'` por `(description_normalized, category_id)` com 2 ou mais;
  2. fora os pares dispensados (`dismissed_rule_suggestions`);
  3. fora os grupos em que `decideCategory` com as regras atuais já dá essa categoria para essa descrição (regra que cobre);
  4. a categoria precisa estar ativa.
- `GET /category-rules/suggestions` → `{ items: [{ pattern, categoryId, categoryName, categoryIcon, correctionCount }] }`, mais correções primeiro, no máximo 20.
- **Aceitar:** o front chama o `POST /category-rules` que já existe (`equals`, `pattern`, `categoryId`), que aplica ao histórico.
- **Dispensar:** `POST /category-rules/suggestions/dismiss` com `{ pattern, categoryId }` grava o par. Idempotente.
- **Depois de uma troca:** a resposta de `PATCH /transactions/:id` e `PATCH /transactions/category` passa a trazer `ruleSuggestion` (a sugestão para a descrição trocada, ou nulo), para o front mostrar "Criar regra para 'UBER *TRIP' → Transporte?" sem outra consulta.
- **Por que 2:** a Fase 4 diz "2 ou mais correções"; com 1, "Aplicar sempre" já existe.

### 5. Contador no Início

`GET /dashboard` ganha `reviewCount`. O aviso fica acima dos cartões, discreto, e some com zero. Tocar abre `/transacoes/revisar`.

## Risks / Trade-offs

- **Caixa grande no primeiro dia depois do deploy:** a migration marca tudo como revisado, então a caixa começa vazia e só enche com o que chegar depois.
- **Sugestão calculada a cada consulta:** agrupa todas as transações `user` do Open Finance. Com um usuário e alguns milhares de linhas, é pouco; se pesar, um índice em `(category_source, description_normalized)`.
- **"Marcar tudo" com relógios diferentes:** o `until` vem do servidor (a lista traz `loadedAt`), não do relógio do aparelho.
