# transaction-notes-and-tags Specification

## Purpose
Nota livre e etiquetas em qualquer transação, do Open Finance ou manual: gravação, API de etiquetas, preservação pela sincronização e telas.

## Requirements

### Requirement: Nota da transação
Toda transação, do Open Finance ou manual, MUST aceitar uma nota de até 500 caracteres pelo `PATCH /api/v1/transactions/:id` (`note`, texto ou nulo). Texto vazio MUST ser gravado como nulo. A nota MUST vir no DTO da lista e do detalhe. A sincronização MUST NOT alterar nem apagar a nota.

#### Scenario: Nota numa compra do banco
- **WHEN** o usuário escreve "Jantar com o cliente, pedir reembolso" numa compra do Open Finance
- **THEN** a nota fica gravada e o detalhe a mostra

#### Scenario: Sincronização depois da nota
- **WHEN** a sincronização atualiza essa compra
- **THEN** a nota continua a mesma

#### Scenario: Nota longa demais
- **WHEN** a nota tem 501 caracteres
- **THEN** a API responde 400 `VALIDATION_ERROR` com `note` em `details`

### Requirement: Etiquetas
O sistema MUST guardar etiquetas com nome único sem diferenciar maiúsculas e acentos (até 40 caracteres) e MUST permitir até 10 etiquetas por transação, do Open Finance ou manual, pelo `PATCH /api/v1/transactions/:id` (`tagIds`, a lista completa). `GET /api/v1/tags` MUST listar as etiquetas por nome com `transactionCount`; `POST /api/v1/tags` MUST criar e recusar nome repetido com 409 `TAG_ALREADY_EXISTS`; `PATCH /api/v1/tags/:id` MUST renomear; `DELETE /api/v1/tags/:id` MUST apagar a etiqueta e tirá-la das transações, sem apagar transação, e responder 204. Etiqueta MUST NOT entrar em orçamentos, gastos por categoria, regras de categorização nem detecção de duplicata. A sincronização MUST NOT alterar as etiquetas de uma transação.

#### Scenario: Mesma etiqueta com outra grafia
- **WHEN** existe "Viagem" e o usuário tenta criar "viagem"
- **THEN** a API responde 409 `TAG_ALREADY_EXISTS`

#### Scenario: Renomear
- **WHEN** "Viagem" é renomeada para "Viagem Chile"
- **THEN** todas as transações com ela mostram "Viagem Chile"

#### Scenario: Excluir
- **WHEN** a etiqueta "Reforma", usada em 8 transações, é excluída
- **THEN** as 8 transações continuam, sem a etiqueta

#### Scenario: Etiqueta inexistente
- **WHEN** o `PATCH` traz um `tagIds` com um id que não existe
- **THEN** a API responde 400 `VALIDATION_ERROR` com `tagIds` em `details` e nada muda

### Requirement: Nota e etiquetas na tela
O detalhe da transação MUST ter o campo "Nota" e a seção "Etiquetas", com chips removíveis e "Adicionar etiqueta" (busca e "Criar '<nome>'" quando não existir). A linha da lista MUST indicar nota e mostrar até 2 etiquetas (no celular, só a indicação), sem empurrar o valor. "Categorias e regras" MUST ter a aba "Etiquetas", com a contagem, renomear e excluir (com confirmação que diz quantas transações perdem a etiqueta). As telas MUST ter carregando, vazio e erro, funcionar de 320 px a 1440 px nos dois temas e respeitar "Ocultar valores".

#### Scenario: Criar etiqueta no detalhe
- **WHEN** o usuário digita "viagem" em "Adicionar etiqueta" e ela não existe
- **THEN** aparece "Criar 'viagem'", e escolher cria a etiqueta e a põe na transação
