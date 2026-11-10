## MODIFIED Requirements

### Requirement: Saldo total e evolução
`GET /api/v1/dashboard?month=AAAA-MM` MUST devolver:
- `totalBalanceCents`, com a mesma definição da tela de Contas (corrente + poupança não ocultas, de bancos ativos);
- `balanceEvolution`: a soma diária das fotos de saldo dessas contas, de cada dia do mês que tiver foto, **mais** as fotos das contas corrente e poupança não ocultas de bancos arquivados, só dos dias **anteriores** ao dia do arquivamento (fuso de São Paulo);
- `balanceChange` (`cents` e `percent`): a diferença entre o saldo de hoje e o da primeira foto do mês, calculada **só com as fotos dos bancos ativos**, ou nulo se não houver foto de um dia anterior a hoje no mês.

Sem `month`, MUST usar o mês atual no fuso de São Paulo.

#### Scenario: Variação no mês
- **WHEN** a primeira foto de novembro soma R$ 4.000,00 e o saldo de hoje é R$ 4.850,32
- **THEN** `balanceChange.cents` é `85032`

#### Scenario: Primeiro dia com dados
- **WHEN** a única foto do mês é a de hoje
- **THEN** `balanceChange` é nulo

#### Scenario: Passado do banco arquivado
- **WHEN** um banco com R$ 1.000,00 em todas as fotos de novembro é arquivado no dia 10
- **THEN** a evolução soma esses R$ 1.000,00 nos dias 1 a 9 e não soma a partir do dia 10

#### Scenario: Variação sem o banco arquivado
- **WHEN** um banco com R$ 1.000,00 é arquivado no dia 10 e o saldo dos bancos ativos foi de R$ 4.000,00 (dia 1) a R$ 4.850,32 (hoje)
- **THEN** `balanceChange.cents` é `85032`, sem uma queda de R$ 1.000,00
