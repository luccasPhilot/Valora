## ADDED Requirements

### Requirement: Revisão na sincronização
A sincronização MUST inserir toda transação nova sem revisão (`reviewed_at` nulo) e MUST NOT mudar `reviewed_at` ao atualizar uma transação existente. Quando uma pendente que sumiu é trocada pela postada equivalente (a mesma troca que leva a categoria do usuário), a postada MUST receber o `reviewed_at` da pendente, se ela tinha um.

#### Scenario: Pendente revisada vira postada com outro id
- **WHEN** uma pendente revisada no dia 3 some e chega a postada equivalente, com outro id
- **THEN** a postada fica revisada e não entra na caixa "Para revisar"

#### Scenario: Pendente não revisada
- **WHEN** uma pendente ainda não revisada é trocada pela postada equivalente
- **THEN** a postada fica para revisar
