# project-tooling Specification

## Purpose
Estrutura do repositório e ferramentas de qualidade: partes independentes (`backend/`, `frontend/`, `infra/`), TypeScript estrito, lint, formatação, testes, segredos fora do git e versões fixadas.

## Requirements

### Requirement: Repositório com partes independentes
O repositório MUST ser um único repositório git com as pastas `backend/`, `frontend/` e `infra/`. O `backend/` e o `frontend/` MUST ser projetos Node independentes, cada um com o próprio `package.json`, `package-lock.json` e `node_modules`. A raiz MUST NOT ter `package.json`. Nenhuma parte MUST importar código de outra.

#### Scenario: Instalação de uma parte
- **WHEN** `npm install` roda dentro de `backend/`, num clone novo
- **THEN** só as dependências do backend são instaladas, dentro de `backend/node_modules`

#### Scenario: Importar código da outra parte
- **WHEN** um arquivo do `frontend/` tenta importar um módulo de `../backend/src`
- **THEN** a revisão recusa a mudança; o front usa os próprios schemas e utilitários

### Requirement: TypeScript estrito
O backend e o frontend MUST compilar com `strict: true`. O uso de `any` explícito MUST ser bloqueado pelo lint.

#### Scenario: Erro de tipo
- **WHEN** `npm run typecheck` roda numa parte que tem um erro de tipo
- **THEN** o comando termina com falha e aponta o arquivo e a linha do erro

#### Scenario: any explícito
- **WHEN** um arquivo declara um valor com o tipo `any`
- **THEN** `npm run lint` da parte termina com falha apontando o arquivo

### Requirement: Lint e formatação
Cada parte MUST ter ESLint e Prettier configurados, com os scripts `lint` e `format:check`. O estilo do Prettier MUST ser único para o repositório (arquivo na raiz). O lint MUST exigir imports organizados em três grupos: bibliotecas externas, aliases internos (`@/`) e arquivos locais.

#### Scenario: Violação de lint
- **WHEN** `npm run lint` roda numa parte com um arquivo que viola uma regra
- **THEN** o comando termina com falha e lista a violação

#### Scenario: Arquivo fora do padrão de formatação
- **WHEN** `npm run format:check` roda numa parte e um arquivo não segue o Prettier
- **THEN** o comando termina com falha indicando o arquivo

### Requirement: Testes
Cada parte MUST rodar os próprios testes Vitest com `npm test`.

#### Scenario: Testes passam
- **WHEN** `npm test` roda no backend e todos os testes passam
- **THEN** o comando termina com sucesso e mostra os testes do backend

#### Scenario: Um teste falha
- **WHEN** `npm test` roda numa parte e um teste falha
- **THEN** o comando termina com falha e mostra o teste que falhou

### Requirement: Segredos fora do repositório
Arquivos `.env` e `.env.*` MUST ficar fora do controle de versão em qualquer pasta. Os `.env.example` MUST ser versionados e listar as variáveis sem valores reais.

#### Scenario: .env ignorado em qualquer parte
- **WHEN** existe um `.env` na raiz, em `backend/`, em `frontend/` ou em `infra/`
- **THEN** `git check-ignore` confirma que ele é ignorado

#### Scenario: .env.example versionado
- **WHEN** existe um `backend/.env.example`
- **THEN** ele não é ignorado pelo git e não tem valores reais

### Requirement: Versões fixadas
A versão do Node MUST estar fixada no `.nvmrc` da raiz e no `engines` de cada parte. A instalação MUST falhar com uma versão de Node incompatível.

#### Scenario: Node incompatível
- **WHEN** `npm install` roda numa parte com uma versão de Node fora da faixa definida em `engines`
- **THEN** a instalação falha com `EBADENGINE`
