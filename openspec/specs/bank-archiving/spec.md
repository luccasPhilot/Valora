# bank-archiving Specification

## Purpose
Arquivar e reativar bancos: tirar um banco do dia a dia sem apagar o histórico, com recuperação pelo botão "Reativar".

## Requirements

### Requirement: Arquivar um banco
`PATCH /api/v1/connections/:id` com `{ "isArchived": true }` MUST arquivar a conexão (o banco inteiro, com todas as contas dele), gravando a data do arquivamento, e devolver a conexão atualizada. O sistema MUST NOT apagar nenhuma conta, transação, fatura, investimento nem foto de saldo. Arquivar de novo uma conexão já arquivada MUST manter a primeira data. Uma conexão que não existe MUST responder `NOT_FOUND`.

#### Scenario: Arquivar
- **WHEN** o usuário arquiva a conexão "Conta Corrente", que tem 2 contas e 48 transações
- **THEN** a conexão fica com a data de arquivamento e continua com as 2 contas e as 48 transações no banco

#### Scenario: Arquivar de novo
- **WHEN** a conexão já arquivada em 10/11 é arquivada outra vez em 12/11
- **THEN** a data de arquivamento continua sendo a de 10/11

#### Scenario: Conexão inexistente
- **WHEN** o id não existe
- **THEN** a resposta é `NOT_FOUND` e nada muda

#### Scenario: Qualquer banco
- **WHEN** o usuário arquiva um banco com a conexão `ok`
- **THEN** o arquivamento é feito, sem exigir que o banco esteja com problema

### Requirement: Reativar um banco
`PATCH /api/v1/connections/:id` com `{ "isArchived": false }` MUST desfazer o arquivamento, limpando a data, e o banco MUST voltar a ser sincronizado e a aparecer nas telas, nos totais, nas faturas e nos alertas.

#### Scenario: Reativar
- **WHEN** o usuário reativa um banco arquivado cujo id continua no `PLUGGY_ITEM_IDS`
- **THEN** a próxima sincronização volta a ler o banco, e as contas dele voltam à lista e ao saldo total

#### Scenario: Banco que não existe mais no Pluggy
- **WHEN** o usuário reativa um banco que foi removido do Meu Pluggy
- **THEN** a próxima sincronização marca `item_not_found` e o aviso "Remover do Valora" volta

#### Scenario: Banco que saiu do .env
- **WHEN** o usuário reativa um banco cujo id não está mais no `PLUGGY_ITEM_IDS`
- **THEN** o aviso de "saiu da lista de sincronização" volta, e ele pode ser arquivado de novo

### Requirement: Listas de bancos
`GET /api/v1/connections` MUST devolver só os bancos ativos. Com `?archived=true`, MUST devolver só os arquivados. Cada item MUST trazer `id`, `institutionName`, `institutionLogoUrl`, `status`, `statusDetail`, `lastSyncedAt`, `isConfigured` (o id está no `PLUGGY_ITEM_IDS`), `archivedAt` (nulo nos ativos) e `accounts` (`id`, `name`, `type`, `lastDigits`). A resposta MUST NOT expor o id do item do Pluggy nem o JSON bruto.

#### Scenario: Só os ativos
- **WHEN** existem 3 conexões e uma está arquivada
- **THEN** `GET /connections` traz 2 e `GET /connections?archived=true` traz 1, com `archivedAt` preenchido e as contas dela

#### Scenario: Banco fora do `.env`
- **WHEN** o id de uma conexão não está no `PLUGGY_ITEM_IDS`
- **THEN** o item dela traz `isConfigured: false`

#### Scenario: Banco na lista
- **WHEN** o id da conexão está no `PLUGGY_ITEM_IDS`
- **THEN** o item dela traz `isConfigured: true`

### Requirement: O histórico fica guardado
Um banco arquivado MUST continuar com todas as transações, faturas, investimentos e fotos de saldo. As transações dele MUST continuar contando nas receitas, nas despesas, nos gastos por categoria e nos orçamentos, e MUST continuar aparecendo na lista de transações com o nome da conta. As transações manuais ligadas às contas do banco MUST permanecer.

#### Scenario: Meses passados
- **WHEN** um banco com R$ 300,00 de despesas em outubro é arquivado em novembro
- **THEN** as despesas de outubro continuam incluindo esses R$ 300,00

#### Scenario: Lista de transações
- **WHEN** o usuário abre Transações depois de arquivar o banco
- **THEN** as transações do banco continuam na lista, com o nome da conta

#### Scenario: Conta arquivada fora das escolhas
- **WHEN** o usuário abre o filtro de conta ou o formulário de lançamento manual
- **THEN** as contas do banco arquivado não aparecem como opção

### Requirement: Aviso de banco removido ou fora da lista
Para uma conexão ativa com status `item_not_found`, ou com `isConfigured` falso, todas as telas MUST mostrar uma faixa no topo que diz a causa ("foi removido do Meu Pluggy" ou "saiu da lista de sincronização") e traz o botão "Remover do Valora". O botão MUST abrir uma confirmação que explica o que acontece e que dá para reativar em "Arquivados"; sem confirmar, nada MUST mudar. Depois de confirmado, a faixa MUST sumir.

#### Scenario: Removido do Meu Pluggy
- **WHEN** a sincronização recebeu "não existe" do Pluggy para o banco "Conta Corrente"
- **THEN** a faixa diz que o banco foi removido do Meu Pluggy e traz "Remover do Valora"

#### Scenario: Fora da lista de sincronização
- **WHEN** o id do banco "Conta Corrente" foi tirado do `PLUGGY_ITEM_IDS`
- **THEN** a faixa diz que o banco saiu da lista de sincronização e traz "Remover do Valora"

#### Scenario: Confirmar
- **WHEN** o usuário aciona "Remover do Valora" e confirma
- **THEN** o banco é arquivado e a faixa, o alerta, as contas dele e o saldo dele saem das telas

#### Scenario: Cancelar
- **WHEN** o usuário aciona "Remover do Valora" e cancela a confirmação
- **THEN** nada muda

### Requirement: Remover e reativar na tela Contas
Cada banco da tela Contas MUST trazer o botão "Remover do Valora", com a mesma confirmação. Os bancos órfãos MUST mostrar a causa. Quando houver bancos arquivados, o fim da tela MUST trazer uma seção recolhida "Arquivados" com o nome, as contas e a data da última sincronização de cada um e o botão "Reativar". Sem bancos arquivados, a seção MUST NOT aparecer.

#### Scenario: Botão em qualquer banco
- **WHEN** a tela Contas mostra um banco com a conexão `ok`
- **THEN** ele tem o botão "Remover do Valora"

#### Scenario: Seção Arquivados
- **WHEN** há um banco arquivado
- **THEN** o fim da tela traz a seção "Arquivados", recolhida, e ao abri-la aparecem o nome do banco, as contas e "Reativar"

#### Scenario: Sem arquivados
- **WHEN** nenhum banco está arquivado
- **THEN** a seção "Arquivados" não aparece

#### Scenario: Reativar pela tela
- **WHEN** o usuário aciona "Reativar" num banco arquivado
- **THEN** o banco volta à lista de bancos ativos e sai de "Arquivados"

#### Scenario: Estados
- **WHEN** a lista de arquivados está carregando ou falha ao carregar
- **THEN** a seção mostra o carregamento ou o erro com "Tentar de novo", sem derrubar o resto da tela

#### Scenario: Celular estreito
- **WHEN** a largura é 320 px
- **THEN** a faixa, o botão, a confirmação e a seção cabem na tela, sem rolagem horizontal, com botões de pelo menos 44 px de altura
