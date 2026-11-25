## ADDED Requirements

### Requirement: Regra sugerida pelas correções
O sistema MUST sugerir uma regra `equals` para cada par de descrição normalizada e categoria ativa em que existam 2 ou mais transações do Open Finance com essa descrição e essa categoria escolhida pelo usuário (`category_source = 'user'`), quando nenhuma regra atual decide essa descrição para essa categoria e o par não foi dispensado. `GET /api/v1/category-rules/suggestions` MUST listar até 20 sugestões, das com mais correções para as com menos, com `pattern`, `categoryId`, `categoryName`, `categoryIcon` e `correctionCount`. `POST /api/v1/category-rules/suggestions/dismiss` com `pattern` e `categoryId` MUST guardar o par, que não volta a ser sugerido, e MUST ser idempotente. A sugestão MUST NOT criar regra sozinha: aceitar usa a criação de regra que já existe, que aplica a regra ao histórico.

#### Scenario: Duas correções
- **WHEN** duas transações `UBER *TRIP` do Open Finance estão em "Transporte" por escolha do usuário e não há regra para elas
- **THEN** a lista traz a sugestão `UBER *TRIP` → "Transporte" com `correctionCount` 2

#### Scenario: Uma correção só
- **WHEN** só uma transação `UBER *TRIP` foi corrigida
- **THEN** não há sugestão para ela

#### Scenario: Regra que já cobre
- **WHEN** existe a regra "contém UBER → Transporte"
- **THEN** não há sugestão para `UBER *TRIP` → "Transporte"

#### Scenario: Lançamentos manuais
- **WHEN** as duas transações `PADARIA` em "Mercado" são lançamentos manuais
- **THEN** não há sugestão

#### Scenario: Dispensada
- **WHEN** o usuário dispensa `UBER *TRIP` → "Transporte" e depois corrige uma terceira
- **THEN** a sugestão não volta

#### Scenario: Aceitar
- **WHEN** o usuário aceita a sugestão
- **THEN** existe a regra "igual a UBER *TRIP → Transporte", aplicada ao histórico, e a sugestão sai da lista

### Requirement: Sugestões na tela
Depois de uma troca de categoria (no detalhe, na caixa ou em massa) cuja resposta traga `ruleSuggestion`, a tela MUST oferecer "Criar regra para '<padrão>' → <categoria>?" com "Criar regra" e "Agora não" ("Agora não" dispensa o par). A aba Regras de "Categorias e regras" MUST mostrar a lista "Sugestões" quando houver alguma, com "Criar regra" e "Dispensar" em cada item.

#### Scenario: Depois da segunda correção
- **WHEN** a segunda troca de `UBER *TRIP` para "Transporte" termina
- **THEN** aparece "Criar regra para 'UBER *TRIP' → Transporte?"

#### Scenario: Aba Regras
- **WHEN** há 3 sugestões e o usuário abre a aba Regras
- **THEN** a lista "Sugestões" mostra as 3 acima das regras
