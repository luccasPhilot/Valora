## ADDED Requirements

### Requirement: API da saúde dos dados
`GET /api/v1/data-health` MUST devolver `consents` (cada banco ativo com `institutionName`, `expiresAt` e `daysLeft`, ou `expiresAt` nulo quando o banco não informou), `divergences` (as 50 mais recentes) e `staleAccounts`. Nenhum desses dados MUST ir para os logs.

#### Scenario: Consentimento informado
- **WHEN** o consentimento do Itaú vence em 28/12/2026 e hoje é 24/11/2026
- **THEN** `consents` traz o Itaú com `daysLeft` 34

#### Scenario: Banco arquivado
- **WHEN** um banco está arquivado
- **THEN** ele não aparece em nenhuma das listas

### Requirement: Conciliação do saldo
Para cada conta corrente e poupança de banco ativo, nos últimos 60 dias, o sistema MUST comparar a diferença entre duas fotos de saldo seguidas com a soma das transações postadas do Open Finance da conta no período entre elas, só para pares cuja foto mais recente tenha pelo menos 3 dias. Quando não baterem, MUST registrar uma divergência com a conta, o período e `differenceCents` (foto menos transações). Diferenças de dias seguidos que se anulam MUST NOT virar divergência. A conciliação MUST NOT criar, alterar nem apagar transação.

#### Scenario: Transação faltando
- **WHEN** a foto de 03/11 é R$ 1.000,00, a de 04/11 é R$ 880,00 e não há transação da conta no período
- **THEN** há uma divergência de 03/11 a 04/11 com `differenceCents` `-12000`

#### Scenario: Tudo bate
- **WHEN** a foto cai R$ 120,00 e há uma compra de R$ 120,00 no período
- **THEN** não há divergência

#### Scenario: Período recente
- **WHEN** a foto mais recente do par é de ontem
- **THEN** o par ainda não é conferido

#### Scenario: Transação no dia errado
- **WHEN** uma compra de R$ 50,00 aparece no período seguinte ao da queda do saldo, e os dois períodos se anulam
- **THEN** não há divergência

### Requirement: Conta parada
O sistema MUST listar como parada a conta corrente ou o cartão, não oculto, de banco ativo com sincronização `ok`, cuja transação mais recente tem 10 dias ou mais, ou que não tem transação e existe há 10 dias ou mais. Poupança MUST ficar de fora.

#### Scenario: Cartão sem compras
- **WHEN** a última transação do cartão é de 14 dias atrás e o banco sincroniza normalmente
- **THEN** ele aparece como "Sem transações há 14 dias"

#### Scenario: Poupança
- **WHEN** a poupança não tem transação há 60 dias
- **THEN** ela não aparece

### Requirement: Histórico das sincronizações
`GET /api/v1/sync-runs` MUST listar as execuções da mais recente para a mais antiga, paginadas (padrão 30, máximo 100), com o mesmo formato de `GET /sync-runs/latest`.

#### Scenario: Paginação
- **WHEN** há 45 execuções e a requisição não informa `limit`
- **THEN** a primeira página traz 30 e `pagination.total` é 45

### Requirement: Tela de saúde dos dados
A tela `/ajustes/saude-dos-dados`, aberta por Ajustes e por Contas, MUST mostrar as seções Consentimentos, Conciliação, Contas paradas e Sincronizações, cada uma com "Tudo certo" quando não houver nada a mostrar. A divergência MUST mostrar "Possível transação faltando entre dd/mm e dd/mm" com a diferença e levar a Transações filtrada pela conta e pelo período. O resultado de cada sincronização MUST ter ícone e texto, nunca só cor. A tela MUST ter os estados carregando, vazio e erro, funcionar de 320 px a 1440 px nos dois temas sem rolagem horizontal e respeitar "Ocultar valores".

#### Scenario: Ver a divergência
- **WHEN** o usuário toca na divergência da conta corrente de 03/11 a 04/11
- **THEN** a tela de Transações abre filtrada por essa conta, de 03/11 a 04/11

#### Scenario: Tudo certo
- **WHEN** nenhum consentimento vence em 30 dias, nenhuma divergência e nenhuma conta parada
- **THEN** as três primeiras seções mostram "Tudo certo" e o histórico mostra as sincronizações
