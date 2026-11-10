## ADDED Requirements

### Requirement: Cálculo da projeção
`GET /api/v1/projection` MUST devolver a projeção do mês atual (fuso de São Paulo) como `saldo de hoje + receitas previstas pendentes − despesas previstas pendentes − parte não paga das faturas que vencem até o último dia do mês`, em centavos. O saldo de hoje MUST ser o saldo total de Contas. Ocorrências realizadas ou puladas MUST NOT entrar. Faturas de cartões ocultos MUST NOT entrar.

#### Scenario: Conta completa
- **WHEN** o saldo de hoje é `500000`, há uma receita prevista pendente de `300000`, uma despesa prevista pendente de `120000` e uma fatura de `200000` que vence no mês
- **THEN** o saldo projetado é `480000`

#### Scenario: Previsão já realizada
- **WHEN** a despesa de `120000` já foi marcada como realizada
- **THEN** ela não é subtraída de novo

#### Scenario: Previsão pulada
- **WHEN** a receita de `300000` foi pulada neste mês
- **THEN** ela não é somada

#### Scenario: Fatura parcialmente paga
- **WHEN** a fatura é de `200000`, com `50000` pagos
- **THEN** só `150000` são subtraídos

#### Scenario: Fatura que vence no mês seguinte
- **WHEN** a fatura vence depois do último dia do mês
- **THEN** ela não entra na projeção

#### Scenario: Cartão oculto
- **WHEN** a fatura é de um cartão marcado com "Ocultar dos totais"
- **THEN** ela não entra na projeção

### Requirement: Itens atrasados
Uma ocorrência pendente com data prevista anterior a hoje MUST entrar na projeção como se fosse hoje e MUST ser marcada `isOverdue`. Uma fatura vencida e não paga MUST entrar em hoje.

#### Scenario: Despesa prevista atrasada
- **WHEN** a despesa de `120000` prevista para o dia 5 continua pendente no dia 12
- **THEN** ela é subtraída em 12 e vem marcada como atrasada

#### Scenario: Fatura vencida
- **WHEN** uma fatura de `80000` venceu ontem e não está paga
- **THEN** ela é subtraída hoje

### Requirement: Saldo dia a dia e ponto mais baixo
A resposta MUST trazer o saldo projetado de cada dia de hoje até o último dia do mês e o menor saldo do período com a data. No mesmo dia, as saídas MUST ser aplicadas antes das entradas.

#### Scenario: Ponto mais baixo
- **WHEN** hoje o saldo é `100000`, uma fatura de `150000` vence no dia 10 e um salário de `400000` cai no dia 15
- **THEN** o menor saldo é `-50000`, no dia 10, e o saldo final é `350000`

#### Scenario: Entrada e saída no mesmo dia
- **WHEN** no mesmo dia vencem uma despesa de `150000` e uma receita de `150000` com saldo inicial de `100000`
- **THEN** o menor saldo do dia é `-50000`

#### Scenario: Sem nada previsto
- **WHEN** não há ocorrências pendentes nem faturas no período
- **THEN** o saldo projetado é igual ao saldo de hoje e o menor saldo também

### Requirement: Cartão sem vencimento
Quando um cartão ativo não tiver fatura com vencimento conhecido, a resposta MUST trazer um aviso em `warnings` e MUST NOT estimar a saída.

#### Scenario: Vencimento desconhecido
- **WHEN** o cartão tem saldo de fatura mas nenhum vencimento informado
- **THEN** a fatura não entra na conta e `warnings` cita o cartão

### Requirement: Bloco de projeção na tela de Planejamento
A tela de Planejamento MUST mostrar o saldo projetado, a composição (saldo de hoje, previstas, faturas), o gráfico do saldo dia a dia com o ponto mais baixo marcado e a lista de eventos, com ícone e texto "Atrasada" nos atrasados. MUST avisar com ícone e texto quando o menor saldo for negativo. MUST dizer que gastos do dia a dia não entram. MUST ter os estados carregando e erro, funcionar de 320 px a 1440 px nos dois temas e respeitar "Ocultar valores".

#### Scenario: Saldo negativo no caminho
- **WHEN** o menor saldo do mês é `-50000` no dia 10
- **THEN** a tela mostra o aviso "Saldo negativo em 10/11" com ícone, em `destructive`

#### Scenario: Saldo sempre positivo
- **WHEN** todos os dias ficam acima de zero
- **THEN** nenhum aviso de saldo negativo é mostrado e o vermelho não é usado

#### Scenario: Erro de carregamento
- **WHEN** a API falha
- **THEN** o bloco mostra o estado de erro sem derrubar o resto da tela de Planejamento
