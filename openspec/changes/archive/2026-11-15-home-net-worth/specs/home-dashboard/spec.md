## ADDED Requirements

### Requirement: Resumo do patrimônio no Início
`GET /api/v1/dashboard` MUST trazer `netWorth` com `totalCents`, `investmentsCents`, `openBillsCents` e `change` (`{ cents, percent }` ou nulo), com os mesmos valores de `GET /api/v1/net-worth` (`current` e `monthChange`), quando o mês pedido for o mês atual em São Paulo. Para qualquer outro mês, `netWorth` MUST ser `null`. A resposta MUST manter todos os campos que já existiam, e `totalBalanceCents` MUST continuar sendo só corrente e poupança.

#### Scenario: Mesmo número do patrimônio
- **WHEN** `GET /net-worth` devolve `netWorthCents` `1550000` e `monthChange.cents` `50000`
- **THEN** `netWorth.totalCents` é `1550000` e `netWorth.change.cents` é `50000`

#### Scenario: Saldo total não muda
- **WHEN** há R$ 12.000,00 em investimentos e R$ 5.000,00 em contas
- **THEN** `totalBalanceCents` continua `500000`

#### Scenario: Mês passado
- **WHEN** o Início é pedido para um mês anterior ao atual
- **THEN** `netWorth` é `null`

#### Scenario: Sem foto de dia anterior
- **WHEN** a única foto do mês é a de hoje
- **THEN** `netWorth.change` é nulo e `netWorth.totalCents` continua preenchido

### Requirement: Linha de patrimônio no card de saldo
O card de saldo MUST mostrar a linha "Patrimônio" com o valor, a variação no mês (ícone e texto, com `+` ou `−`, sem depender só da cor) e o link "Ver patrimônio" para `/investimentos`, quando `investmentsCents` ou `openBillsCents` for diferente de zero. Sem esses dois, a linha MUST NOT aparecer. O valor MUST ficar vermelho só quando negativo. MUST respeitar "Ocultar valores" (mascara os valores em reais e mantém o percentual) e MUST caber de 320 px a 1440 px nos dois temas sem rolagem horizontal.

#### Scenario: Com investimentos
- **WHEN** há R$ 12.000,00 em investimentos
- **THEN** o card mostra "Patrimônio", o valor, a variação do mês e "Ver patrimônio"

#### Scenario: Sem investimentos nem faturas
- **WHEN** `investmentsCents` e `openBillsCents` são zero
- **THEN** o card mostra só o saldo total, sem a linha de patrimônio

#### Scenario: Sem variação
- **WHEN** `netWorth.change` é nulo
- **THEN** a linha mostra o valor e o link, sem a variação

#### Scenario: Abrir o patrimônio
- **WHEN** o usuário aciona "Ver patrimônio"
- **THEN** o app abre `/investimentos`

#### Scenario: Valores ocultos
- **WHEN** "Ocultar valores" está ligado
- **THEN** o valor e a variação em reais aparecem mascarados e o percentual continua visível

#### Scenario: Celular estreito
- **WHEN** a largura é 320 px e o patrimônio é "R$ 1.234.567,89"
- **THEN** o valor não é cortado e não há rolagem horizontal
