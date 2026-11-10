## Why

Quando um banco sai do Meu Pluggy, ou o id dele sai do `PLUGGY_ITEM_IDS` do `.env`, a conexão dele **fica parada no Valora**: a faixa "Conta Corrente não sincroniza desde 06/11" aparece em todas as telas para sempre, o alerta do sino não se resolve, as contas continuam na lista e o saldo total segue somando um saldo velho. Hoje a documentação só diz como **parar de ler** o banco (tirar o id do `.env`); não existe jeito de tirá-lo das telas. Foi o que aconteceu num teste real: o banco foi removido do Meu Pluggy e do `.env`, e a conexão continuou em erro.

## What Changes

- **Arquivar um banco** (a conexão do Meu Pluggy, com todas as contas dela): nada é apagado, o banco só deixa de contar no dia a dia. A conexão ganha `archived_at`, e `PATCH /api/v1/connections/:id` com `{ "isArchived": true | false }` arquiva e reativa.
- **O que sai** quando um banco é arquivado: a lista de contas, o saldo total, as faturas em aberto, a projeção do mês, a faixa de aviso e os alertas de conexão. A sincronização **pula** o banco, mesmo que o id continue no `.env`.
- **O que fica**: todas as transações, faturas, investimentos e fotos de saldo. As transações antigas continuam contando em receitas, despesas, categorias e orçamentos. A curva "evolução do saldo" do Início continua somando o banco **nos dias anteriores ao arquivamento**.
- **Detecção dos dois casos** (e o aviso passa a dizer qual foi): o Pluggy responde que o banco não existe mais (novo status `item_not_found`), ou o id não está mais no `PLUGGY_ITEM_IDS` (a conexão órfã). Nos dois, o aviso oferece **"Remover do Valora"**, com confirmação.
- **Qualquer banco** pode ser arquivado, não só os com problema, sempre com confirmação. Cada banco da tela Contas ganha o botão **"Remover do Valora"**.
- **Seção recolhida "Arquivados"** no fim da tela Contas, com o nome, as contas e a última sincronização de cada banco, e o botão **"Reativar"**.
- `GET /api/v1/connections` passa a listar só os bancos ativos (com `isConfigured`), e `?archived=true` lista os arquivados com as contas deles.
- O frontend atualiza os schemas e os testes na mesma change (contrato da API).

Item do roadmap: nenhum item existente cobre esta change. Ela nasce de um teste do usuário e entra na Fase 2 como item novo, marcado ao concluir.

## Capabilities

### New Capabilities

- `bank-archiving`: arquivar e reativar um banco, o que sai e o que fica, a detecção de banco removido do Meu Pluggy ou fora do `PLUGGY_ITEM_IDS`, o aviso com "Remover do Valora" e a seção "Arquivados".

### Modified Capabilities

- `open-finance-sync`: a sincronização pula banco arquivado, reconhece "banco não existe mais no Pluggy" (status `item_not_found`) e a lista de conexões passa a trazer só os ativos.
- `accounts-view`: a consulta de contas, o saldo total e a faixa de conexão com problema consideram só bancos ativos e os dois novos casos.
- `home-dashboard`: a evolução do saldo soma o banco arquivado só até o dia anterior ao arquivamento, e a variação do mês considera só os bancos ativos.
- `alerts`: o alerta de conexão cobre o novo status e é resolvido quando o banco é arquivado.
- `credit-card-bills`: cartões de banco arquivado não entram nas faturas.

## Impact

- **Banco:** coluna nova `connections.archived_at` (`timestamptz`, nula) e o status novo `item_not_found` no `CHECK` de `connections.status`; uma migration. Nenhuma tabela nova.
- **Backend:** `connections` (repository, service, rotas), `sync` (pular arquivado, 404 do Pluggy), `accounts`, `credit-card-bills`, `alerts` e `dashboard`. O `PluggyClient` continua o único ponto de contato com o Pluggy.
- **API:** `PATCH /api/v1/connections/:id` novo; `GET /api/v1/connections` ganha `isConfigured`, `archivedAt` e `accounts`, e passa a listar só os ativos; `GET /api/v1/accounts` e as faturas passam a ignorar bancos arquivados.
- **Frontend:** faixa de conexão, tela Contas (botão e seção "Arquivados"), schemas em `frontend/src/lib/api/` e o selo de status.
- **Docs:** `docs/02-open-finance.md` (a seção "Ids dos itens no Valora" passa a dizer o que fazer depois de tirar o id), `docs/03-arquitetura.md`, `docs/04-modelo-de-dados.md`, `docs/05-deploy.md`, `docs/06-design-system.md`, `docs/01-produto.md` e `docs/07-roadmap.md`.
- **Depende de:** `open-finance-sync`, `accounts-view`, `home-dashboard`, `alerts` e `credit-card-bills`.

## Fora do escopo

- **Apagar** o histórico de um banco de vez: esta change só arquiva (decisão tomada com o usuário). Se um dia fizer falta, é uma change à parte.
- Arquivar **uma conta individual** de um banco; para isso continua existindo "Ocultar dos totais".
- Editar o `.env` pelo app: o id fica lá até o usuário limpar, e o app o ignora.
- Arquivar sozinho, sem o usuário confirmar, um banco removido do Meu Pluggy.
- Filtrar as transações por uma conta arquivada: as transações dela continuam na lista e nos totais, mas a conta não aparece nas opções de filtro nem no formulário de lançamento manual.
- Descobrir bancos novos pelo Pluggy (continua dependendo do `PLUGGY_ITEM_IDS`).
- Itens da seção "Fora do escopo" de `docs/01-produto.md`: nenhum é tocado.

Esta change não contraria nenhum documento de `docs/` nem o `CLAUDE.md`: a regra "histórico perdido não volta" (regra 7) é justamente o motivo de arquivar em vez de apagar. O trecho de `docs/02-open-finance.md` que diz que tirar o id do `.env` "mantém o histórico" continua valendo e é completado, não trocado.
