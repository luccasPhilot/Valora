## MODIFIED Requirements

### Requirement: Investimentos e foto diária
A sincronização MUST gravar ou atualizar cada investimento pelo `pluggy_investment_id`, com a posição em centavos, o `type` e o `subtype` (nulo quando o Pluggy não manda), e MUST gravar a foto do dia em `investment_snapshots`. Para um banco sincronizado com sucesso, todo investimento dele que **não veio** na resposta e tem posição diferente de zero MUST passar a ter posição `0`, com a foto do dia `0`, inclusive quando a resposta vem vazia. Um banco com erro MUST NOT ter investimentos alterados.

#### Scenario: Investimento existente
- **WHEN** um investimento já gravado volta com outra posição
- **THEN** a linha é atualizada e a foto do dia guarda a posição nova

#### Scenario: Subtipo gravado
- **WHEN** o Pluggy manda `type` `FIXED_INCOME` e `subtype` `CDB`
- **THEN** a linha guarda os dois

#### Scenario: Investimento que sumiu
- **WHEN** um CDB de R$ 500,00 já gravado não vem mais na resposta do banco
- **THEN** a posição passa a `0` e a foto do dia guarda `0`

#### Scenario: Lista vazia
- **WHEN** o banco sincroniza com sucesso e devolve zero investimentos, mas há três gravados com saldo
- **THEN** os três passam a `0`

#### Scenario: Banco com erro
- **WHEN** a sincronização do banco falha
- **THEN** nenhum investimento dele é alterado

#### Scenario: Volta depois de sumir
- **WHEN** um investimento zerado por ter sumido volta na resposta seguinte com R$ 500,00
- **THEN** a posição e a foto do dia voltam a `50000`
