## ADDED Requirements

### Requirement: Ícone da aba
A página MUST declarar no `index.html` um ícone com o símbolo do Valora, em SVG, e o arquivo apontado pelo ícone MUST existir em `frontend/public/`. O ícone MUST ser só o símbolo, sem o nome, com as cores escritas no próprio arquivo, e MUST ficar legível em abas de navegador claras e escuras.

#### Scenario: Ícone declarado
- **WHEN** o `index.html` é lido
- **THEN** ele contém um `<link rel="icon">` do tipo `image/svg+xml` apontando para `/favicon.svg`

#### Scenario: Arquivo do ícone
- **WHEN** o build é gerado
- **THEN** `dist/favicon.svg` existe e é o símbolo do Valora

#### Scenario: Ícone sem dependência do tema
- **WHEN** o arquivo `favicon.svg` é lido
- **THEN** ele não usa variáveis CSS (`var(`), porque a aba do navegador não enxerga os tokens do app
