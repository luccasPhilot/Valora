## ADDED Requirements

### Requirement: Nota e etiquetas na troca pendente → postada
Quando uma pendente que sumiu é trocada pela postada equivalente (a mesma troca que leva a categoria do usuário), a postada MUST receber a nota da pendente, se ainda não tiver uma, e a união das etiquetas das duas, antes de a pendente ser apagada. Uma pendente que tem nota ou etiqueta MUST ser tratada como pendente com decisão do usuário (espera a postada pelo mesmo prazo).

#### Scenario: Pendente com etiqueta
- **WHEN** uma pendente com a etiqueta "Viagem" some e chega a postada equivalente, com outro id
- **THEN** a postada fica com a etiqueta "Viagem"

#### Scenario: Pendente só com nota
- **WHEN** uma pendente sem categoria escolhida, mas com nota, some sem postada equivalente
- **THEN** ela fica até o fim do prazo de 5 dias, como as pendentes com categoria escolhida
