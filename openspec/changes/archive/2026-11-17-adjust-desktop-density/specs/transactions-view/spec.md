## ADDED Requirements

### Requirement: Uma rolagem só no detalhe da transação
O painel de detalhes da transação MUST ser a única área com rolagem: a lista de categorias de "Trocar categoria" MUST NOT ter altura limitada nem rolagem própria. A busca de categoria MUST continuar filtrando a lista.

#### Scenario: Trocar categoria
- **WHEN** o usuário abre os detalhes de uma transação
- **THEN** a lista de categorias cresce com o conteúdo e só o painel tem barra de rolagem

#### Scenario: Buscar categoria
- **WHEN** o usuário digita "merc" em "Buscar categoria"
- **THEN** a lista mostra só as categorias que contêm "merc", sem rolagem própria
