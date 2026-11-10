## Context

O Valora guarda uma **conexão** por banco (`connections`), com as contas dela (`accounts`), e a lista de bancos vem do `PLUGGY_ITEM_IDS` no `.env`. A sincronização percorre esses ids; para cada um chama `connections.ensure` (cria a conexão se não existir) e lê o Pluggy. Dois caminhos deixam uma conexão **órfã**:

1. O banco foi removido do Meu Pluggy e o id continua no `.env`: o Pluggy responde "não existe", a sincronização marca a conexão como `error` com a mensagem genérica "Não foi possível consultar este banco no Pluggy" e tenta de novo todo dia.
2. O id saiu do `.env` (o caso do usuário): a sincronização nem olha a conexão, que fica congelada no último estado (aqui, `error` desde 06/11).

Nos dois, a faixa de aviso, o alerta `connection_error`, a lista de contas e o saldo total continuam mostrando o banco. Apagar a linha não resolve: se o id estiver no `.env`, `ensure` a recria na próxima sincronização, e o app não edita o `.env`.

O Pluggy só devolve 12 meses de histórico (regra 7 do projeto: o que se perde não volta), então o histórico guardado no Valora não deve ser apagado por um clique.

## Goals / Non-Goals

**Goals:**
- Tirar um banco do dia a dia (telas, totais, avisos, sincronização) sem perder nada do que ele já gravou.
- Reconhecer sozinho os dois casos de banco órfão e dizer qual é, em vez do aviso genérico.
- Poder desfazer.

**Non-Goals:**
- Apagar histórico, arquivar conta individual e editar o `.env` (ver "Fora do escopo" da proposta).

## Decisions

**1. Arquivar é uma data em `connections`, nada mais.**
- Coluna `archived_at timestamptz` (nula = ativa). Arquivar grava `now()`; reativar volta a nula. Contas, transações, faturas, investimentos e fotos ficam intactos, ligados à conexão como antes.
- *Alternativa:* um `status = 'archived'`. Descartada: o status descreve a saúde da conexão no Pluggy e é sobrescrito pela sincronização; "o usuário não quer mais ver este banco" é outra coisa e precisa sobreviver a qualquer sincronização.
- *Alternativa:* apagar a conexão em cascata. Descartada pelo usuário (e pela regra 7).

**2. Uma definição só de "banco ativo".**
- O critério `connections.archived_at is null` entra em um único ponto reutilizável do backend e é usado por: lista de conexões, lista de contas, faturas, alertas e a sincronização. A conta "Dinheiro" não tem conexão e é sempre ativa.
- `GET /accounts` e `GET /credit-card-bills` deixam de trazer contas de bancos arquivados; os totais saem da mesma lista (`calculateAccountTotals` não muda), então saldo total, faturas em aberto, limite disponível e a projeção do mês (que usa essas duas consultas) acompanham sem código novo.

**3. A sincronização pula o banco arquivado antes de qualquer chamada.**
- Em `syncItem`, depois de `ensure`, se a conexão está arquivada devolve um resultado `skipped`: nenhuma chamada ao Pluggy, nenhuma mudança de status. O resumo da execução ignora `skipped` (não vira `partial` nem `failed`).
- Isso resolve o `.env` sem editá-lo: o id pode ficar lá. Um id que não está mais no `.env` nem é percorrido (já era assim).

**4. Detecção do banco removido do Meu Pluggy: status `item_not_found`.**
- O SDK do Pluggy rejeita a chamada com o corpo de erro da API (não com uma exceção HTTP). O `PluggySdk` (ponto único de contato) reconhece o corpo com `code: 404` em `fetchItem` e lança um `PluggyItemNotFoundError` tipado; o `PluggyClient.getItem` o repassa.
- `syncItem` trata esse erro à parte do `attempt`: grava `status = 'item_not_found'` com a mensagem fixa do Valora "Este banco foi removido do Meu Pluggy. Remova-o do Valora." Outras falhas continuam `error`.
- O formato exato do corpo de erro do 404 é **conferido uma vez** contra o sandbox e guardado como resposta gravada e anonimizada para o teste (os testes nunca chamam o Pluggy de verdade).
- Novo valor no `CHECK` de `connections.status` (migration que recria a restrição) e nos enums de backend e frontend.

**5. Detecção do id fora do `.env`: calculada na leitura, não gravada.**
- `ConnectionsService` recebe `config.pluggyItemIds` e devolve `isConfigured = pluggyItemIds.includes(connection.pluggyItemId)`. Não vira coluna: mudar o `.env` exige reiniciar o backend (a configuração é lida na subida), então o valor calculado sempre bate com o que o processo em execução sincroniza.
- Não gera alerta por si só (um banco "ok" fora da lista só aparece na faixa e na tela Contas); o alerta continua pelo status (`error`, `consent_expired`, `item_not_found`). No caso real, a conexão congelada em `error` já tem o alerta.

**6. API.**
- `PATCH /api/v1/connections/:id` com `{ isArchived: boolean }`, validado com Zod, devolvendo a conexão atualizada; `NOT_FOUND` se o id não existe; repetir a mesma operação não muda nada (mantém a primeira data de arquivamento). Mesmo desenho do `PATCH /accounts/:id` (`isHidden`).
- `GET /connections` devolve os ativos; `?archived=true`, os arquivados. Cada item traz `id`, `institutionName`, `institutionLogoUrl`, `status`, `statusDetail`, `lastSyncedAt`, `isConfigured`, `archivedAt` e `accounts` (`id`, `name`, `type`, `lastDigits`). Sem paginação: são no máximo 5 bancos.
- O `raw` e o `pluggyItemId` nunca saem na resposta.

**7. Histórico e números.**
- Transações, faturas, investimentos e categorias não mudam: receitas, despesas, gastos por categoria e orçamentos (de qualquer mês) continuam contando as transações do banco arquivado. A lista de transações mostra o nome da conta pelo `join` de sempre.
- **Saldo no passado:** a consulta de evolução do saldo soma as fotos das contas ativas e, das contas corrente e poupança não ocultas de bancos arquivados, **só as fotos anteriores ao dia do arquivamento** (a data de `archived_at` no fuso de São Paulo). A curva do passado não muda e cai no dia do arquivamento, porque o banco deixa de ser somado.
- **Variação do mês** (`balanceChange`): hoje é a diferença entre o saldo de hoje e a primeira foto do mês. Com o banco arquivado no meio do mês, a primeira foto o incluiria e o saldo de hoje não, e o cartão mostraria uma queda que não aconteceu. Por isso a variação é calculada sobre as fotos **só dos bancos ativos** (uma segunda consulta, barata), e a curva do gráfico usa a soma completa descrita acima.
- *Alternativa:* o banco sair de todos os dias, como "Ocultar dos totais" faz hoje. Descartada pelo usuário: o histórico do saldo "mudaria".

**8. Alertas.**
- `evaluateConnections` passa a olhar só os bancos ativos e `item_not_found` entra nos status que geram `connection_error` (mensagem vinda de `status_detail`). Como o banco arquivado sai do conjunto, o alerta existente é resolvido pela reconciliação que já existe, sem código de resolução novo.

**9. Interface.**
- **Faixa** (`ConnectionAlert`): para `item_not_found` e para banco fora do `PLUGGY_ITEM_IDS` mostra a causa em texto ("Conta Corrente foi removido do Meu Pluggy" ou "Conta Corrente saiu da lista de sincronização (`PLUGGY_ITEM_IDS`)") e o botão **"Remover do Valora"**, que abre o diálogo de confirmação existente (`ConfirmDialog`). As outras conexões com problema continuam sendo um atalho para a tela Contas, como hoje. O botão não fica dentro do link da faixa (um botão dentro de um link é inválido e ruim no teclado).
- **Tela Contas:** cada `InstitutionCard` ganha o botão "Remover do Valora" (qualquer banco, mesmo saudável) e, nos órfãos, a explicação da causa. No fim, uma seção recolhida **"Arquivados"** lista nome, contas e última sincronização, cada banco com **"Reativar"**. A seção só existe quando há arquivados.
- **Confirmação:** "Remover <banco> do Valora? O banco sai do saldo total, das listas e dos avisos. O histórico fica guardado e você pode reativá-lo em Arquivados." Sem confirmar, nada muda.
- Depois de arquivar ou reativar, o app consulta de novo contas, conexões, faturas, projeção, Início e alertas.
- **Reativar** só desfaz o arquivamento. Se o banco continuar órfão, a próxima sincronização (ou a própria leitura) mostra a faixa de novo e dá para arquivar outra vez.
- Telas e componentes seguem o Design System, com as skills de design carregadas.

**10. Segurança e logs.**
- Nenhum valor, descrição ou id de item vai para o log; a sincronização registra só o id interno da conexão e o tipo do erro, como hoje.

## Risks / Trade-offs

- [O formato do erro 404 do SDK não ser o esperado e o banco removido continuar caindo no `error` genérico] → Conferir uma vez contra o sandbox (leitura) antes de escrever o teste, e guardar a resposta anonimizada. Se não der para distinguir, o caso de `PLUGGY_ITEM_IDS` continua funcionando e o do 404 cai no aviso genérico com o mesmo botão.
- [A curva do saldo ter um degrau no dia do arquivamento] → É a consequência da escolha de manter o passado; a variação do mês não sofre o degrau (decisão 7). Documentar em `docs/01-produto.md`.
- [Arquivar sem querer um banco saudável] → Confirmação com texto claro e "Reativar" em "Arquivados".
- [Uma conta arquivada some do filtro de transações e do formulário de lançamento] → Aceito (fora do escopo): as transações dela seguem na lista; lançar em conta arquivada não faz sentido.
- [Manter o id no `.env` para sempre] → A documentação diz que dá para limpar quando quiser; deixar lá não causa nada, porque a sincronização pula o banco.

## Migration Plan

1. Migration: `connections.archived_at` e o novo valor do `CHECK` de `status`. Sem preenchimento de dados: todas as conexões atuais ficam ativas.
2. Subir backend e frontend juntos (o frontend novo lê `isConfigured`, `archivedAt` e `accounts`).
3. Rollback: reverter o deploy; a coluna extra nula não atrapalha a versão anterior. Um banco arquivado voltaria a aparecer nas telas da versão antiga (o histórico está intacto).

## Open Questions

Nenhuma. As decisões de produto (arquivar em vez de apagar, o banco inteiro, a sincronização pular o banco, a seção "Arquivados" com "Reativar", o saldo do passado e "qualquer banco") foram tomadas com o usuário antes desta proposta.
