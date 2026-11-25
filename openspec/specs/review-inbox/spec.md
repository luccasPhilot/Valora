# review-inbox Specification

## Purpose
Rotina diária de revisão: a caixa "Para revisar" com as transações que chegaram do banco e ainda não foram conferidas ("Ok", "Trocar categoria", "Marcar tudo como revisado" e o contador no Início), e a revisão que acompanha a pendente quando ela vira postada.
## Requirements
### Requirement: Transação revisada
Cada transação MUST guardar quando foi revisada (`reviewed_at`), nulo enquanto estiver para revisar. A sincronização MUST inserir transações sem revisão e MUST NOT mudar a revisão de uma transação que já existe. Lançar uma transação à mão, trocar a categoria (de uma ou em massa) e marcá-la como revisada MUST gravar a revisão. Na criação da coluna, todas as transações que já existiam MUST ficar revisadas.

#### Scenario: Chegou do banco
- **WHEN** a sincronização insere uma compra nova
- **THEN** ela fica para revisar

#### Scenario: Atualizada pelo banco
- **WHEN** a sincronização atualiza uma transação já revisada
- **THEN** ela continua revisada

#### Scenario: Lançada à mão
- **WHEN** o usuário lança uma despesa em "Dinheiro"
- **THEN** ela já nasce revisada

#### Scenario: Depois da migration
- **WHEN** a migration roda num banco com 925 transações
- **THEN** as 925 ficam revisadas e a caixa começa vazia

### Requirement: Caixa "Para revisar"
`GET /api/v1/transactions?reviewed=false` MUST listar as transações não revisadas de bancos ativos e as manuais não revisadas, da mais antiga para a mais recente, com a paginação e os dados da lista de transações, e MUST trazer `loadedAt` (instante do servidor). `GET /api/v1/transactions/review-count` MUST devolver `count`. A tela "Para revisar" (`/transacoes/revisar`) MUST mostrar essas transações com as ações "Ok" e "Trocar categoria", as etiquetas "Sem categoria" e "Possível duplicata" (esta com "Conferir", que abre a conferência de duplicata), o botão "Marcar tudo como revisado" e o estado vazio "Tudo revisado". MUST ter os estados carregando, vazio e erro, funcionar de 320 px a 1440 px nos dois temas sem rolagem horizontal e respeitar "Ocultar valores".

#### Scenario: Revisar uma
- **WHEN** o usuário toca em "Ok" numa compra da caixa
- **THEN** ela sai da caixa e o contador diminui 1

#### Scenario: Trocar a categoria na caixa
- **WHEN** o usuário troca a categoria de uma transação da caixa para "Mercado"
- **THEN** ela fica em "Mercado" com `category_source = 'user'` e sai da caixa

#### Scenario: Possível duplicata
- **WHEN** a caixa mostra uma transação marcada como possível duplicata e o usuário toca em "Ok"
- **THEN** ela sai da caixa e continua marcada como possível duplicata na conferência

#### Scenario: Banco arquivado
- **WHEN** um banco com transações não revisadas é arquivado
- **THEN** essas transações saem da caixa e do contador

#### Scenario: Tudo revisado
- **WHEN** não há transação para revisar
- **THEN** a tela mostra "Tudo revisado"

### Requirement: Marcar como revisadas
`POST /api/v1/transactions/review` com `transactionIds` (1 a 100) MUST marcar como revisadas as que existem e ainda não foram revisadas, e devolver `reviewedCount`; ids inexistentes MUST ser ignorados. `POST /api/v1/transactions/review-all` com `until` MUST marcar como revisadas só as não revisadas criadas até `until`, e MUST recusar um `until` no futuro com 400 `VALIDATION_ERROR`. As duas MUST ser idempotentes.

#### Scenario: Marcar tudo sem engolir o que chegou depois
- **WHEN** a caixa foi carregada às 08:00 com 12 transações, uma sincronização às 08:05 traz mais 3, e o usuário aciona "Marcar tudo como revisado" às 08:10
- **THEN** as 12 ficam revisadas e as 3 continuam na caixa

#### Scenario: Repetir
- **WHEN** o mesmo `POST /transactions/review` é enviado duas vezes
- **THEN** a segunda resposta traz `reviewedCount` 0 e nada muda

#### Scenario: Lista grande demais
- **WHEN** a requisição traz 101 ids
- **THEN** a API responde 400 `VALIDATION_ERROR` com `transactionIds` em `details`

