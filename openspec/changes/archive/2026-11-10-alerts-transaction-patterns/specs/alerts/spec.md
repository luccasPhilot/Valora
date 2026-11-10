## ADDED Requirements

### Requirement: Alerta de cobrança duplicada
O sistema MUST criar um alerta `duplicate_charge` quando uma saída do Open Finance, postada, dos últimos 7 dias, tiver outra saída postada na mesma conta com a mesma descrição normalizada e o mesmo valor, com até 3 dias de diferença. O alerta MUST ser da transação mais recente do par. O sistema MUST NOT considerar transações pendentes, lançamentos manuais, parcelas, transferências (inclusive as de categoria Pluggy iniciada por "Transfer"), valores abaixo de R$ 5,00 nem pares de contas diferentes. Deve existir no máximo um alerta por transação.

#### Scenario: Mesma compra no mesmo dia
- **WHEN** a conta tem duas saídas postadas de R$ 89,90 com a descrição "LOJA EXEMPLO" no mesmo dia
- **THEN** nasce um alerta `duplicate_charge` ligado à transação mais recente

#### Scenario: Dentro da janela
- **WHEN** as duas cobranças iguais têm 3 dias de diferença
- **THEN** o alerta é criado

#### Scenario: Fora da janela
- **WHEN** as duas cobranças iguais têm 4 dias de diferença
- **THEN** nenhum alerta é criado

#### Scenario: Valor diferente
- **WHEN** as cobranças são de R$ 89,90 e R$ 89,91
- **THEN** nenhum alerta é criado

#### Scenario: Valor pequeno
- **WHEN** duas saídas iguais de R$ 4,50 acontecem no mesmo dia
- **THEN** nenhum alerta é criado

#### Scenario: Contas diferentes
- **WHEN** a mesma compra aparece em duas contas diferentes
- **THEN** nenhum alerta é criado

#### Scenario: Pendente
- **WHEN** uma das duas cobranças ainda está pendente
- **THEN** nenhum alerta é criado

#### Scenario: Compra parcelada
- **WHEN** as duas transações são parcelas de compras parceladas
- **THEN** nenhum alerta é criado

#### Scenario: Lançamento manual
- **WHEN** uma das transações é um lançamento manual
- **THEN** nenhum alerta é criado

#### Scenario: Pix para uma pessoa
- **WHEN** duas saídas iguais têm a categoria do Pluggy "Transfer - PIX"
- **THEN** nenhum alerta é criado

#### Scenario: Histórico antigo
- **WHEN** o par de cobranças iguais é de 3 meses atrás
- **THEN** nenhum alerta é criado

#### Scenario: Sincronizar de novo
- **WHEN** a sincronização roda outra vez sem transações novas
- **THEN** continua existindo um único alerta para a transação

### Requirement: Alerta de assinatura detectada
O sistema MUST criar um alerta `subscription_detected` quando houver pelo menos 3 saídas postadas do Open Finance com a mesma descrição normalizada e o mesmo valor em sequência, com 25 a 35 dias entre cobranças consecutivas, e a última delas tiver até 45 dias. O sistema MUST NOT considerar parcelas, transferências (inclusive as de categoria Pluggy iniciada por "Transfer"), valores abaixo de R$ 5,00, pendentes nem lançamentos manuais. O alerta MUST nascer uma vez por descrição e valor, e uma nova cobrança do mesmo grupo MUST NOT gerar outro.

#### Scenario: Três meses seguidos
- **WHEN** há cobranças de R$ 39,90 de "STREAMING EXEMPLO" em 05/08, 04/09 e 05/10 e hoje é 10/10
- **THEN** nasce um alerta `subscription_detected`

#### Scenario: Só duas cobranças
- **WHEN** há apenas as cobranças de 04/09 e 05/10
- **THEN** nenhum alerta é criado

#### Scenario: Intervalo irregular
- **WHEN** as cobranças têm 10 dias e depois 60 dias de intervalo
- **THEN** nenhum alerta é criado

#### Scenario: Valor muda
- **WHEN** as três cobranças têm valores diferentes
- **THEN** nenhum alerta é criado

#### Scenario: Assinatura encerrada
- **WHEN** a última de três cobranças mensais foi há 100 dias
- **THEN** nenhum alerta é criado

#### Scenario: Quarta cobrança
- **WHEN** a assinatura já foi avisada e chega a cobrança do mês seguinte
- **THEN** continua existindo um único alerta

#### Scenario: Pix mensal para uma pessoa
- **WHEN** há um Pix de R$ 30,00 para a mesma pessoa todo mês, com a categoria do Pluggy "Transfer - PIX"
- **THEN** nenhum alerta é criado

#### Scenario: Taxa abaixo do mínimo
- **WHEN** uma cobrança de R$ 3,85 se repete todo mês
- **THEN** nenhum alerta é criado

#### Scenario: Alerta dispensado
- **WHEN** o usuário dispensou o alerta e a próxima cobrança chega
- **THEN** nenhum alerta novo aparece

### Requirement: Alertas de evento não se resolvem sozinhos
Os alertas `duplicate_charge` e `subscription_detected` MUST permanecer ativos até o usuário dispensá-los, independentemente do tempo, e MUST NOT ser resolvidos pelo avaliador.

#### Scenario: Passou o tempo
- **WHEN** a cobrança duplicada fica com mais de 7 dias
- **THEN** o alerta continua ativo até ser dispensado

### Requirement: Sino com os alertas de padrão
O sino de alertas MUST mostrar os dois tipos com ícone e texto próprios e a ação "Ver transações", que MUST abrir a lista de transações filtrada pelo dia e pela descrição do alerta. As mensagens MUST NOT conter valores em dinheiro.

#### Scenario: Abrir uma cobrança duplicada
- **WHEN** o usuário aciona "Ver transações" no alerta de cobrança duplicada
- **THEN** o app abre Transações no dia da cobrança, pesquisando pela descrição, e o alerta fica lido

#### Scenario: Ícone e texto
- **WHEN** o painel mostra um alerta de assinatura
- **THEN** ele traz o ícone de repetição e o texto "Assinatura detectada: <descrição>"
