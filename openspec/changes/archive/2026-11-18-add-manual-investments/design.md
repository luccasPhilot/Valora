## Context

Todo investimento do Valora hoje vem do Pluggy: `investments.connection_id` e `pluggy_investment_id` são obrigatórios, a sincronização os grava e zera os que o banco deixou de devolver, e as consultas de investimentos (lista, patrimônio, metas) fazem `innerJoin` com `connections` e filtram bancos ativos.

O usuário tem posições fora do Open Finance (fundos da INCO, criptomoedas na Binance, corretoras que o Meu Pluggy não cobre). O padrão para "coisa sem banco" já existe: a conta "Dinheiro" tem `connection_id` nulo, as consultas dela usam `leftJoin` e `accountIsOfActiveConnection` (`isNull(connectionId) or isNull(archivedAt)`). Esta change aplica o mesmo padrão aos investimentos.

Peças que dependem do formato atual e precisam mudar junto:

- `net-worth.repository.ts` (`findInvestmentSnapshots`) e `goals.repository.ts` (`investmentItemColumns` e três consultas) usam `innerJoin(connections)`.
- `investments.repository.ts` (leitura) usa `innerJoin(connections)` + `connectionIsActive`.
- A regra de patrimônio vale a foto mais recente de até 7 dias; sem foto nova, uma posição some do total.

## Goals / Non-Goals

**Goals:**
- Cadastrar, atualizar o valor, encerrar e excluir uma posição manual de investimento, em reais.
- A posição manual aparece na tela Investimentos, no patrimônio de hoje e na curva, e pode ser vinculada a metas.
- Nunca perder histórico: a foto diária das posições manuais é gravada todo dia.
- A sincronização continua sem tocar no que é manual.

**Non-Goals:**
- Integração automática com a Binance ou com corretoras (change futura, que escreveria nas mesmas posições).
- Aportes, resgates, rentabilidade, quantidade × cotação, conversão de moeda.
- Valor numa data passada e edição de fotos antigas.
- Importação de planilha.

## Decisions

### 1. Reusar a tabela `investments`, com `source`

Colunas novas: `source text not null default 'open_finance'` (`open_finance` ou `manual`), `institution_name text` e `balance_updated_on date`. `connection_id` e `pluggy_investment_id` passam a aceitar nulo (o índice único já aceita vários nulos). Um `CHECK` mantém as duas formas coerentes:

- `open_finance`: `connection_id` e `pluggy_investment_id` preenchidos; `institution_name` e `balance_updated_on` nulos.
- `manual`: `connection_id`, `pluggy_investment_id` e `raw` nulos; `institution_name` e `balance_updated_on` preenchidos.

Valores fechados são `text` + `CHECK`, como pede o backend (`source`, e `type` da posição manual).

**Por quê:** tudo que já lê investimentos (agrupamento, percentuais, fotos, patrimônio, metas) continua funcionando sobre uma tabela só, sem unir duas fontes. É o mesmo caminho de `transactions.source`.

**Alternativa descartada:** tabela `manual_investments` separada. Exigiria unir as duas nas quatro consultas e um id polimórfico em `goal_links` e em `investment_snapshots`.

**Por que `balance_updated_on` e não `updated_at`:** `updated_at` muda a cada renomeação e a cada passo interno; a data que o usuário vê ("Atualizado em") é a do último valor informado.

### 2. Tipos da posição manual

`type` manual é um de `FIXED_INCOME`, `MUTUAL_FUND`, `EQUITY`, `ETF`, `CRYPTO`, `OTHER`. `CRYPTO` é um código nosso (o Pluggy não tem tipo de cripto) e `OTHER` cai em "Outros" pelo rótulo que já existe. Não há subtipo: a linha mostra só a instituição. O `type` das posições do Pluggy continua sendo o que o Pluggy manda.

**Por quê:** o usuário não precisa classificar CDB de LCI à mão; o agrupamento por tipo já dá o panorama.

### 3. Foto diária no fim de toda sincronização

Depois de `syncAllItems()` e antes de `evaluateAlerts`, a sincronização chama `InvestmentsService.snapshotManualPositions()`, que grava `(investment_id, hoje, balance_cents)` de cada posição manual com `ON CONFLICT DO UPDATE` (mesma chave primária de hoje). Roda mesmo se algum banco falhou, porque o valor manual não depende do Pluggy. Falha nesse passo é capturada e registrada só com o tipo do erro (o mesmo tratamento dos alertas) e não muda o resultado dos bancos.

Atualizar o valor (`PATCH` com `balanceCents`) grava a foto de hoje na mesma transação do banco.

**Por quê:** a regra de patrimônio vale a foto mais recente de até 7 dias. Sem foto diária, uma posição informada uma vez sumiria do patrimônio na semana seguinte. Gravar a foto é a única mudança que mantém a regra de patrimônio, as metas vinculadas (que usam as fotos para o ritmo) e o "histórico perdido não volta" (regra 7) sem alteração.

**Alternativas descartadas:**
- Valer a última foto sem limite de dias para posição manual: abre uma exceção na regra de patrimônio e nas metas, com o risco de uma posição esquecida somar para sempre sem ninguém ver.
- Um agendamento próprio para as fotos manuais: mais uma peça rodando. A sincronização já roda todo dia.

**Limite aceito:** se o servidor ficar sem sincronizar por mais de 7 dias, as posições manuais saem do patrimônio desses dias, como já acontece com os itens do Open Finance.

### 4. Consultas: `leftJoin` e um critério único

Nas quatro consultas, `innerJoin(connections)` vira `leftJoin(connections)` e o filtro de banco ativo vira `investmentIsOfActiveConnection` (`isNull(investments.connectionId) or isNull(connections.archivedAt)`), ao lado de `connectionIsActive` em `active-connection.ts`, como `accountIsOfActiveConnection`. O nome da instituição vem de `coalesce(connections.institution_name, investments.institution_name)`. `archivedOn` e `isArchived` ficam nulos/falsos sem conexão.

**Por quê:** um critério único de "ativa" evita que a lista, o patrimônio e as metas discordem entre si.

### 5. Sincronização não toca no manual

`zeroVanished` já filtra por `connection_id = :connectionId`, então uma posição manual (sem conexão) nunca é zerada; a mudança é só um teste que garante isso, sem código novo no `upsert`.

### 6. API

| Rota | O que faz |
|---|---|
| `POST /investments` | Cria posição manual: `name`, `institutionName`, `type`, `balanceCents` (> 0). 201 |
| `PATCH /investments/:id` | Edição parcial de `name`, `institutionName`, `type` e `balanceCents` (≥ 0). Com `balanceCents`, atualiza `balance_updated_on` e a foto de hoje |
| `DELETE /investments/:id` | Exclui a posição manual (as fotos e os vínculos de metas saem em cascata). 204 |

Posição do Open Finance nas três rotas de escrita responde 409 `OPEN_FINANCE_READ_ONLY` (erro que já existe); id inexistente, 404. `GET /investments` ganha `source` e `balanceUpdatedOn` em cada item. A validação usa Zod; o `type` manual é um enum fechado. Camadas: `routes` → `InvestmentsService` (regra: só manual é editável, "hoje" via `shared/dates.ts`) → `InvestmentsRepository` (escrita em `db.transaction`, como `GoalsRepository`).

Como é só um usuário e a lista não passa de poucas dezenas, `GET /investments` continua sem paginação (já é uma exceção documentada).

### 7. Tela

`features/investments` ganha um painel de formulário no `FormPanel` (folha inferior no celular, lateral no tablet, janela no computador), usado para criar e para editar. Campos: nome, instituição, tipo (controle segmentado, que quebra linha em telas estreitas) e valor atual (o mesmo campo de valor do lançamento manual). Editar mostra "Atualizar valor" em destaque, "Salvar", "Encerrar posição" e "Excluir", os dois últimos com confirmação (a posição encerrada sai da lista e a tela não tem como reabri-la). O selo "Manual" e "Atualizado em dd/mm/aaaa" aparecem na linha; passados 30 dias (constante nomeada no front), a linha diz "Desatualizado" em texto, na cor normal (vermelho é só para estouro, erro e saldo negativo). A construção usa as skills `frontend-design` e `ui-ux-pro-max`, e o Design System vence qualquer sugestão delas. O seletor de vínculo das metas já lista investimentos por `GET`; passa a incluir as posições manuais sem mudança de layout.

## Risks / Trade-offs

- [Valor manual envelhece sem ninguém notar] → "Atualizado em" sempre visível e "Desatualizado" após 30 dias; sem alerta ou notificação nesta change.
- [A variação do patrimônio mistura aporte, rendimento e correção do valor] → já é a regra de `docs/01-produto.md` ("Não mostra rentabilidade"); o texto passa a valer também para posições manuais.
- [Excluir uma posição apaga o histórico dela e o vínculo com metas] → confirmação com aviso explícito; o caminho normal para "resgatei tudo" é atualizar o valor para zero, que mantém o histórico.
- [A migration afrouxa `NOT NULL` em duas colunas] → o `CHECK` por `source` impede uma linha do Open Finance sem conexão ou sem id do Pluggy; linhas existentes ficam com `source = 'open_finance'` e passam no `CHECK`.
- [Server parado mais de 7 dias] → as posições manuais saem do patrimônio desses dias; mesmo limite dos itens do Open Finance.
- [Consultas com `leftJoin` podem esconder um erro de dados] → testes de integração cobrem lista, patrimônio de hoje, patrimônio por dia e metas, com e sem banco arquivado.

## Migration Plan

1. Atualizar `schema.ts` e gerar a migration com `npm run db:generate` (nunca editar migration versionada).
2. A migration soma as colunas com `source` padrão `open_finance`, remove o `NOT NULL` de `connection_id` e `pluggy_investment_id` e cria o `CHECK`.
3. Deploy normal por `infra/scripts/deploy.sh` (faz backup antes). Sem dados a converter.
4. Rollback: voltar a versão pelo `deploy.sh <ref>`. Se já houver posições manuais, elas precisam ser removidas antes de recolocar o `NOT NULL` (a migration de volta não é automática).

## Open Questions

Nenhuma bloqueante. A cor ou ícone do selo "Manual" é decidida na construção da tela, seguindo o Design System, e registrada em `docs/06-design-system.md` se virar padrão novo.
