## ADDED Requirements

### Requirement: Patrimônio de hoje
`GET /api/v1/net-worth` MUST devolver `current` com `date` (hoje, em São Paulo), `accountsCents`, `investmentsCents`, `openBillsCents` (positivo) e `netWorthCents`. `accountsCents` MUST ser o saldo total de Contas (corrente e poupança não ocultas, de bancos ativos), `investmentsCents` MUST ser a soma das posições dos investimentos de bancos ativos, `openBillsCents` MUST ser a soma das faturas atuais dos cartões não ocultos de bancos ativos, e `netWorthCents` MUST ser `accountsCents + investmentsCents − openBillsCents`. A conta "Dinheiro" MUST ficar de fora.

#### Scenario: Soma dos bancos e corretoras
- **WHEN** as contas somam R$ 5.000,00, os investimentos R$ 12.000,00 e as faturas em aberto R$ 1.500,00
- **THEN** `netWorthCents` é `1550000`

#### Scenario: Mesmo número das outras telas
- **WHEN** a tela de Contas mostra saldo total de R$ 5.000,00 e a de Investimentos R$ 12.000,00
- **THEN** `accountsCents` é `500000` e `investmentsCents` é `1200000`

#### Scenario: Conta oculta
- **WHEN** uma conta corrente está marcada como "Ocultar dos totais"
- **THEN** o saldo dela não entra no patrimônio

#### Scenario: Banco arquivado
- **WHEN** um banco com R$ 3.000,00 em conta e R$ 2.000,00 em investimentos está arquivado
- **THEN** nenhum desses valores entra em `current`

#### Scenario: Patrimônio negativo
- **WHEN** as faturas em aberto passam da soma de contas e investimentos
- **THEN** `netWorthCents` é negativo

### Requirement: Valor do patrimônio num dia
O patrimônio de um dia passado MUST ser calculado das fotos diárias, por item: cada conta e cada investimento MUST valer a foto mais recente até o dia, **desde que tenha no máximo 7 dias**; um item sem foto nessa janela MUST NOT entrar naquele dia. Contas ocultas e a conta "Dinheiro" MUST NOT entrar. Itens de bancos arquivados MUST entrar só em dias anteriores ao dia do arquivamento (fuso de São Paulo).

#### Scenario: Foto faltando num dia
- **WHEN** uma conta tem foto no dia 8 e no dia 10, e nenhuma no dia 9
- **THEN** o patrimônio do dia 9 usa a foto do dia 8 dela

#### Scenario: Item sem foto há mais de 7 dias
- **WHEN** a última foto de um investimento é de 10 dias antes do dia calculado
- **THEN** ele não entra naquele dia

#### Scenario: Passado do banco arquivado
- **WHEN** um banco é arquivado no dia 10
- **THEN** os itens dele entram nos dias 1 a 9 e não entram a partir do dia 10

#### Scenario: Fatura reduz o patrimônio
- **WHEN** a foto do cartão no dia é de R$ 800,00
- **THEN** o patrimônio do dia desconta R$ 800,00

### Requirement: Pontos mensais
`points` MUST ter no máximo um ponto por mês do intervalo pedido, com `month` (`AAAA-MM`), `date` (o dia de referência), `accountsCents`, `investmentsCents`, `openBillsCents` e `netWorthCents`. O dia de referência MUST ser o último dia do mês (ou hoje, no mês atual) que tenha pelo menos uma foto de um item contado. Meses sem nenhuma foto MUST NOT gerar ponto. Os pontos MUST vir do mês mais antigo para o mais recente. `firstSnapshotDate` MUST ser o dia da foto mais antiga guardada, ou nulo sem fotos.

#### Scenario: Último dia com foto do mês
- **WHEN** as últimas fotos de outubro são do dia 29
- **THEN** o ponto de outubro usa `date` `2026-10-29`

#### Scenario: Mês sem fotos
- **WHEN** não há nenhuma foto em setembro
- **THEN** não existe ponto de setembro e os demais meses aparecem normalmente

#### Scenario: Mês atual
- **WHEN** a última foto foi tirada hoje
- **THEN** o ponto do mês atual usa o dia de hoje

#### Scenario: Sem histórico
- **WHEN** não há nenhuma foto
- **THEN** `points` é vazio e `firstSnapshotDate` é nulo

#### Scenario: Confere com o dia de hoje
- **WHEN** as fotos de hoje têm os mesmos saldos das posições atuais
- **THEN** o último ponto tem o mesmo `netWorthCents` de `current`

### Requirement: Variação no mês
`monthChange` MUST ser `{ cents, percent }`: a diferença entre o patrimônio de hoje e o da primeira foto do mês, calculada **só com itens de bancos ativos** nas duas pontas. `percent` MUST ser a variação sobre o valor absoluto do patrimônio inicial, com duas casas, e nulo quando ele é zero. `monthChange` MUST ser nulo quando não há foto de um dia anterior a hoje no mês.

#### Scenario: Variação positiva
- **WHEN** o patrimônio da primeira foto do mês era R$ 10.000,00 e hoje é R$ 10.500,00
- **THEN** `monthChange.cents` é `50000` e `percent` é `5`

#### Scenario: Primeiro dia com dados
- **WHEN** a única foto do mês é a de hoje
- **THEN** `monthChange` é nulo

#### Scenario: Banco arquivado no mês
- **WHEN** um banco com R$ 1.000,00 é arquivado no meio do mês e o resto do patrimônio não mudou
- **THEN** `monthChange.cents` é `0`, sem uma queda de R$ 1.000,00

### Requirement: Intervalo de meses
A API MUST aceitar `from` e `to` no formato `AAAA-MM`. Sem `to`, MUST usar o mês atual; sem `from`, MUST usar os 11 meses anteriores a `to` (12 meses no total). `to` no futuro MUST ser limitado ao mês atual. `from` depois de `to`, formato inválido ou mais de 60 meses MUST resultar em 400 `VALIDATION_ERROR` com o campo em `details`.

#### Scenario: Padrão
- **WHEN** a API é chamada sem parâmetros em novembro de 2026
- **THEN** o intervalo vai de dezembro de 2025 a novembro de 2026

#### Scenario: Intervalo invertido
- **WHEN** `from` é `2026-08` e `to` é `2026-03`
- **THEN** a API responde 400 `VALIDATION_ERROR` com `from` em `details`

#### Scenario: Intervalo grande demais
- **WHEN** o intervalo tem 61 meses
- **THEN** a API responde 400 `VALIDATION_ERROR`

#### Scenario: Formato inválido
- **WHEN** `from` é `2026-13`
- **THEN** a API responde 400 `VALIDATION_ERROR` com `from` em `details`

### Requirement: Cartão de patrimônio
O topo da tela Investimentos MUST mostrar o cartão "Patrimônio" com o total, a variação no mês (ícone e texto, só quando houver), as linhas "Contas", "Investimentos" e "Faturas em aberto" (com `−`) e o gráfico de área mês a mês, com controle "6 meses" / "12 meses" (padrão 12). O gráfico MUST ser desenhado só com 2 ou mais pontos; com menos, o cartão MUST dizer desde quando há histórico. MUST trazer a nota da fórmula e do que não entra, um resumo em texto para leitor de tela, os estados carregando e erro (sem derrubar o resto da tela) e respeitar "Ocultar valores". MUST funcionar de 320 px a 1440 px nos dois temas sem rolagem horizontal. O valor só MUST ficar vermelho quando o patrimônio for negativo.

#### Scenario: Histórico curto
- **WHEN** só existe o ponto do mês atual e a primeira foto é de 04/11
- **THEN** o cartão mostra o total, as partes e "O histórico começa em 04/11", sem gráfico

#### Scenario: Gráfico
- **WHEN** há pontos de três meses
- **THEN** o gráfico de área é desenhado, com tooltip do mês e do patrimônio

#### Scenario: Trocar o período
- **WHEN** o usuário escolhe "6 meses"
- **THEN** o cartão pede e mostra só os últimos 6 meses

#### Scenario: Valores ocultos
- **WHEN** "Ocultar valores" está ligado
- **THEN** o total, as partes e o eixo vertical do gráfico não mostram valores

#### Scenario: Erro isolado
- **WHEN** a API de patrimônio falha e a de investimentos responde
- **THEN** o cartão mostra "Tentar de novo" e a lista de investimentos continua na tela

#### Scenario: Celular estreito
- **WHEN** a largura é 320 px e o patrimônio é "R$ 1.234.567,89"
- **THEN** o valor não é cortado e não há rolagem horizontal
