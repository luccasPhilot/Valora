## ADDED Requirements

### Requirement: Moeda a partir de centavos
A formatação de moeda MUST receber centavos inteiros e devolver o valor em reais no padrão pt-BR. Ela MUST lançar um erro se receber um número que não é inteiro.

#### Scenario: Valor comum
- **WHEN** a função recebe `123456`
- **THEN** devolve `R$ 1.234,56`

#### Scenario: Zero
- **WHEN** a função recebe `0`
- **THEN** devolve `R$ 0,00`

#### Scenario: Valor não inteiro
- **WHEN** a função recebe `89.9`
- **THEN** lança um erro de validação

### Requirement: Sinal de receita e despesa
A formatação com sinal MUST mostrar `+` antes de valores positivos e o sinal de menos tipográfico `−` (U+2212) antes de valores negativos, nunca o hífen.

#### Scenario: Receita
- **WHEN** a função com sinal recebe `5000`
- **THEN** devolve `+ R$ 50,00`

#### Scenario: Despesa
- **WHEN** a função com sinal recebe `-8990`
- **THEN** devolve `− R$ 89,90`, com o caractere U+2212

### Requirement: Valores compactos
A formatação compacta, usada em eixos de gráfico, MUST abreviar milhares e milhões no padrão pt-BR.

#### Scenario: Milhares
- **WHEN** a função compacta recebe `120000` (R$ 1.200,00)
- **THEN** devolve `R$ 1,2 mil`

#### Scenario: Milhões
- **WHEN** a função compacta recebe `340000000` (R$ 3.400.000,00)
- **THEN** devolve `R$ 3,4 mi`

### Requirement: Percentual
A formatação de percentual MUST usar vírgula decimal e no máximo uma casa decimal.

#### Scenario: Percentual com decimal
- **WHEN** a função recebe `0.125`
- **THEN** devolve `12,5%`

### Requirement: Datas em pt-BR
As funções de data MUST formatar:
- a data completa como `dd/MM/aaaa`;
- o mês como `novembro de 2026`;
- o cabeçalho de dia nas listas como `Hoje`, `Ontem` ou `seg., 3 de nov.`.

#### Scenario: Data completa
- **WHEN** a função recebe a data `2026-11-03`
- **THEN** devolve `03/11/2026`

#### Scenario: Cabeçalho de dia antigo
- **WHEN** a função de cabeçalho recebe `2026-11-03` e hoje é 10 de novembro de 2026
- **THEN** devolve `ter., 3 de nov.`

### Requirement: Fuso de São Paulo
Toda formatação de data e todo cálculo de "hoje" e "ontem" MUST usar o fuso `America/Sao_Paulo`, seja qual for o fuso do aparelho.

#### Scenario: Aparelho em outro fuso
- **WHEN** o aparelho está em UTC, são 01:00 de 4 de novembro em UTC, e a função de cabeçalho recebe `2026-11-03`
- **THEN** devolve `Hoje`, porque em São Paulo ainda é 3 de novembro
