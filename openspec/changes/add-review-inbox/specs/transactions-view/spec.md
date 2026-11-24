## MODIFIED Requirements

### Requirement: Trocar a categoria
`PATCH /api/v1/transactions/:id` com `categoryId` MUST gravar a categoria com `category_source = 'user'` e marcar a transação como revisada. Com `applyAlways: true`, MUST também chamar o aprendizado da categorização, que cria ou atualiza a regra para a descrição. Uma categoria arquivada MUST ser recusada. A resposta MUST trazer `ruleSuggestion`: a regra sugerida para a descrição da transação, ou nulo.

#### Scenario: Correção simples
- **WHEN** você troca a categoria de uma transação para "Lazer" sem "Aplicar sempre"
- **THEN** a transação fica em "Lazer" com `category_source = 'user'`, revisada, e nenhuma regra é criada

#### Scenario: Aplicar sempre
- **WHEN** você troca a categoria de `PAG*JOSEDASILVA` para "Mercado" com "Aplicar sempre"
- **THEN** a transação fica em "Mercado" com `category_source = 'user'`, existe a regra "igual a PAG*JOSEDASILVA → Mercado", e as outras transações com essa descrição, sem categoria do usuário, passam para "Mercado"

#### Scenario: Correção sobrevive à sincronização
- **WHEN** a sincronização roda depois da sua correção
- **THEN** a transação continua na categoria que você escolheu

#### Scenario: Categoria arquivada
- **WHEN** a troca pede uma categoria arquivada
- **THEN** a resposta é 400 com `code: "VALIDATION_ERROR"`

#### Scenario: Segunda correção da mesma descrição
- **WHEN** você troca para "Transporte" a segunda transação `UBER *TRIP` do Open Finance, depois de já ter trocado a primeira para "Transporte", sem "Aplicar sempre"
- **THEN** a resposta traz `ruleSuggestion` com o padrão `UBER *TRIP`, a categoria "Transporte" e `correctionCount` 2

## ADDED Requirements

### Requirement: Categoria em massa
`PATCH /api/v1/transactions/category` com `transactionIds` (1 a 100) e `categoryId` MUST gravar a categoria com `category_source = 'user'` e marcar como revisadas todas as transações que existem, do Open Finance e manuais, numa transação só do banco de dados, MUST reavaliar os alertas de orçamento e MUST devolver `updatedCount` e `ruleSuggestion`. Uma categoria arquivada MUST ser recusada com 400 `VALIDATION_ERROR` sem mudar nada. A lista de Transações e a caixa "Para revisar" MUST ter o modo "Selecionar", com caixa de seleção de 44 px em cada linha e uma barra com o número de selecionadas, "Trocar categoria", "Marcar como revisadas" e "Cancelar". No computador, Shift+clique MUST selecionar o intervalo.

#### Scenario: Trocar várias
- **WHEN** o usuário seleciona 5 transações e escolhe "Restaurantes"
- **THEN** as 5 ficam em "Restaurantes" com `category_source = 'user'`, revisadas, e a lista sai do modo de seleção

#### Scenario: Orçamento atualizado
- **WHEN** a troca em massa leva "Restaurantes" a 85% do limite
- **THEN** o alerta de orçamento já existe na próxima consulta

#### Scenario: Categoria arquivada em massa
- **WHEN** a troca em massa pede uma categoria arquivada
- **THEN** a resposta é 400 e nenhuma das transações muda

#### Scenario: Celular
- **WHEN** o modo "Selecionar" está ativo com 390 px de largura
- **THEN** a barra de ações fica fixa embaixo, acima da área segura, sem cobrir a última linha da lista
