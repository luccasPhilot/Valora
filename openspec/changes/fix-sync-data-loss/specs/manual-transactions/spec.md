## MODIFIED Requirements

### Requirement: Detectar possível duplicata
Quando a sincronização **insere** uma transação do Open Finance, a API MUST procurar uma transação manual na mesma conta, com o mesmo `amount_cents` e data até 3 dias antes ou depois, que ainda não seja possível duplicata de outra transação. Se houver mais de uma, MUST escolher a de data mais próxima e, em empate, a lançada primeiro. A transação do Open Finance MUST receber `possible_duplicate_of_id` apontando para a manual. A API MUST NOT juntar as duas sozinha. A detecção MUST rodar depois de apagar as pendentes que sumiram da mesma conta, na mesma transação do banco de dados, para que a manual apontada por uma pendente apagada volte a estar livre para a postada que a substitui.

#### Scenario: Lançou e depois chegou do banco
- **WHEN** você lançou à mão uma despesa de R$ 45,00 no dia 2 na conta corrente e a sincronização insere uma transação de R$ 45,00 do dia 3 na mesma conta
- **THEN** a transação do banco fica marcada como possível duplicata da manual, e as duas continuam na lista

#### Scenario: Valor diferente
- **WHEN** a transação do banco é de R$ 45,10
- **THEN** nenhuma possível duplicata é marcada

#### Scenario: Mais de 3 dias
- **WHEN** a manual é do dia 2 e a do banco é do dia 6
- **THEN** nenhuma possível duplicata é marcada

#### Scenario: Transação já existente
- **WHEN** a sincronização só atualiza uma transação do banco que já existia
- **THEN** a detecção não roda para ela

#### Scenario: Pendente trocada por postada com outro id
- **WHEN** uma pendente de R$ 45,00 do dia 3 estava marcada como possível duplicata de uma manual de R$ 45,00 do dia 2, e na sincronização seguinte a pendente some e chega a postada de R$ 45,00 do dia 4, com outro id
- **THEN** a pendente é apagada, a postada fica marcada como possível duplicata da manual, e a manual e a postada continuam na lista
