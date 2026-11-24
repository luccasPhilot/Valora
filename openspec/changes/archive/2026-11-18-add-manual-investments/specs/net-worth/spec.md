## MODIFIED Requirements

### Requirement: Patrimônio de hoje
`GET /api/v1/net-worth` MUST devolver `current` com `date` (hoje, em São Paulo), `accountsCents`, `investmentsCents`, `openBillsCents` (positivo) e `netWorthCents`. `accountsCents` MUST ser o saldo total de Contas (corrente e poupança não ocultas, de bancos ativos), `investmentsCents` MUST ser a soma das posições dos investimentos de bancos ativos **e de todas as posições manuais**, `openBillsCents` MUST ser a soma das faturas atuais dos cartões não ocultos de bancos ativos, e `netWorthCents` MUST ser `accountsCents + investmentsCents − openBillsCents`. A conta "Dinheiro" MUST ficar de fora.

#### Scenario: Soma dos bancos e corretoras
- **WHEN** as contas somam R$ 5.000,00, os investimentos R$ 12.000,00 e as faturas em aberto R$ 1.500,00
- **THEN** `netWorthCents` é `1550000`

#### Scenario: Mesmo número das outras telas
- **WHEN** a tela de Contas mostra saldo total de R$ 5.000,00 e a de Investimentos R$ 12.000,00
- **THEN** `accountsCents` é `500000` e `investmentsCents` é `1200000`

#### Scenario: Posição manual entra
- **WHEN** os investimentos do Open Finance somam R$ 12.000,00 e há uma posição manual de R$ 25.000,00
- **THEN** `investmentsCents` é `3700000`

#### Scenario: Conta oculta
- **WHEN** uma conta corrente está marcada como "Ocultar dos totais"
- **THEN** o saldo dela não entra no patrimônio

#### Scenario: Banco arquivado
- **WHEN** um banco com R$ 3.000,00 em conta e R$ 2.000,00 em investimentos está arquivado
- **THEN** nenhum desses valores entra em `current`

#### Scenario: Banco arquivado e posição manual
- **WHEN** um banco é arquivado e há uma posição manual de R$ 25.000,00
- **THEN** a posição manual continua em `investmentsCents`

#### Scenario: Patrimônio negativo
- **WHEN** as faturas em aberto passam da soma de contas e investimentos
- **THEN** `netWorthCents` é negativo

### Requirement: Valor do patrimônio num dia
O patrimônio de um dia passado MUST ser calculado das fotos diárias, por item: cada conta e cada investimento (do Open Finance ou manual) MUST valer a foto mais recente até o dia, **desde que tenha no máximo 7 dias**; um item sem foto nessa janela MUST NOT entrar naquele dia. Contas ocultas e a conta "Dinheiro" MUST NOT entrar. Itens de bancos arquivados MUST entrar só em dias anteriores ao dia do arquivamento (fuso de São Paulo). Uma posição manual, que não tem banco, MUST NOT ser tratada como arquivada em nenhum dia.

#### Scenario: Foto faltando num dia
- **WHEN** uma conta tem foto no dia 8 e no dia 10, e nenhuma no dia 9
- **THEN** o patrimônio do dia 9 usa a foto do dia 8 dela

#### Scenario: Item sem foto há mais de 7 dias
- **WHEN** a última foto de um investimento é de 10 dias antes do dia calculado
- **THEN** ele não entra naquele dia

#### Scenario: Posição manual com foto diária
- **WHEN** uma posição manual de R$ 25.000,00 foi informada no dia 1 e a sincronização gravou a foto dela em todos os dias até o dia 20
- **THEN** o patrimônio do dia 20 inclui os R$ 25.000,00

#### Scenario: Posição manual sem banco para arquivar
- **WHEN** um banco é arquivado no dia 10 e existe uma posição manual com foto no dia 12
- **THEN** a posição manual entra no patrimônio do dia 12

#### Scenario: Passado do banco arquivado
- **WHEN** um banco é arquivado no dia 10
- **THEN** os itens dele entram nos dias 1 a 9 e não entram a partir do dia 10

#### Scenario: Fatura reduz o patrimônio
- **WHEN** a foto do cartão no dia é de R$ 800,00
- **THEN** o patrimônio do dia desconta R$ 800,00
