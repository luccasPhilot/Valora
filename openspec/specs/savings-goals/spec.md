# savings-goals Specification

## Purpose
Metas de poupança: valor desejado, aportes informados à mão, progresso, situação frente ao prazo e estimativa pelo ritmo, e a tela de Metas.

## Requirements

### Requirement: Cadastro de metas
O sistema MUST permitir criar, editar e excluir metas com nome (1 a 80 caracteres), ícone, valor desejado em centavos (inteiro maior que zero), prazo opcional e valor acumulado inicial opcional. Excluir uma meta MUST apagar os aportes dela. A resposta MUST NOT expor colunas de vínculo da v3.

#### Scenario: Meta com valor inicial
- **WHEN** o usuário cria "Viagem" com valor desejado de R$ 10.000,00 e R$ 1.500,00 já guardados
- **THEN** a meta é criada com `saved_cents` `150000` e um aporte do tipo `initial` de `150000`

#### Scenario: Valor desejado inválido
- **WHEN** o valor desejado é zero
- **THEN** a API responde 400 `VALIDATION_ERROR` com `targetCents` em `details`

#### Scenario: Excluir meta
- **WHEN** o usuário exclui uma meta com aportes
- **THEN** a meta e os aportes dela deixam de existir

### Requirement: Aportes e retiradas
`POST /api/v1/goals/:id/contributions` MUST registrar um aporte (valor positivo) ou uma retirada (`type` `withdrawal`) com data até hoje e atualizar o valor acumulado da meta na mesma transação do banco. O valor acumulado MUST ser sempre a soma dos aportes e retiradas. Uma retirada que deixaria o valor acumulado abaixo de zero MUST ser recusada. `DELETE` de um aporte MUST desfazer o efeito dele no valor acumulado.

#### Scenario: Registrar aporte
- **WHEN** a meta tem `150000` e o usuário registra um aporte de R$ 500,00
- **THEN** o valor acumulado passa a ser `200000`

#### Scenario: Retirada maior que o acumulado
- **WHEN** a meta tem `20000` e o usuário tenta retirar R$ 300,00
- **THEN** a API responde 400 `VALIDATION_ERROR` e o valor acumulado continua `20000`

#### Scenario: Remover aporte
- **WHEN** o usuário remove o aporte de `50000`
- **THEN** o valor acumulado diminui em `50000`

#### Scenario: Data no futuro
- **WHEN** a data do aporte é amanhã
- **THEN** a API responde 400 `VALIDATION_ERROR` com `date` em `details`

### Requirement: Progresso
O progresso MUST ser `floor(acumulado × 100 ÷ desejado)`, limitado a 100, calculado em inteiros.

#### Scenario: Meio caminho
- **WHEN** o acumulado é `500000` e o desejado é `1000000`
- **THEN** o progresso é 50

#### Scenario: Acima do valor desejado
- **WHEN** o acumulado é `1200000` e o desejado é `1000000`
- **THEN** o progresso é 100 e a situação é `completed`

#### Scenario: Quase lá
- **WHEN** o acumulado é `999999` e o desejado é `1000000`
- **THEN** o progresso é 99

### Requirement: Ritmo e prazo estimado
O ritmo mensal MUST ser a soma líquida de aportes e retiradas (sem o valor inicial) dos últimos 90 dias, multiplicada por 30 e dividida por 90, arredondada para baixo. Para metas com menos de 90 dias, a janela MUST ser a idade da meta em dias, com mínimo de 30. O prazo estimado MUST ser `ceil(faltante ÷ ritmo)` meses a partir de hoje. Ritmo zero ou negativo MUST resultar em situação `no_pace`, sem estimativa. Estimativas acima de 600 meses MUST ser devolvidas sem data.

#### Scenario: Ritmo regular
- **WHEN** a meta tem R$ 900,00 de aportes nos últimos 90 dias e faltam R$ 3.000,00
- **THEN** o ritmo é `30000` por mês e o prazo estimado é de 10 meses

#### Scenario: Valor inicial não conta
- **WHEN** a meta só tem o valor inicial de R$ 1.500,00
- **THEN** a situação é `no_pace`

#### Scenario: Retiradas anulam o ritmo
- **WHEN** as retiradas dos últimos 90 dias superam os aportes
- **THEN** a situação é `no_pace`

#### Scenario: Meta nova com ritmo alto
- **WHEN** a meta tem 10 dias e um aporte de R$ 300,00
- **THEN** o ritmo usa a janela mínima de 30 dias e vale `30000` por mês

#### Scenario: Estimativa absurda
- **WHEN** a estimativa passa de 600 meses
- **THEN** a resposta não traz data estimada

### Requirement: Situação frente ao prazo
Com prazo informado, a situação MUST ser `on_track` quando a estimativa chegar até o prazo e `behind` caso contrário, e a resposta MUST trazer o valor mensal necessário (`ceil(faltante ÷ meses até o prazo)`, mínimo de 1 mês). Meta não concluída com prazo vencido MUST ser `behind`. Meta concluída MUST ser `completed`, qualquer que seja o prazo.

#### Scenario: No ritmo
- **WHEN** faltam R$ 3.000,00, o ritmo é R$ 500,00 por mês e o prazo é daqui a 8 meses
- **THEN** a situação é `on_track`

#### Scenario: Atrasada
- **WHEN** faltam R$ 3.000,00, o ritmo é R$ 200,00 por mês e o prazo é daqui a 6 meses
- **THEN** a situação é `behind` e o valor mensal necessário é `50000`

#### Scenario: Prazo vencido
- **WHEN** o prazo passou e a meta não foi atingida
- **THEN** a situação é `behind`

### Requirement: Tela de Metas
A área "Metas" (`/metas`) MUST aparecer no menu lateral e listar as metas com ícone, nome, barra de progresso, valores e uma linha de situação com ícone e texto. MUST permitir criar, editar e excluir metas e registrar aportes e retiradas. Metas não concluídas MUST vir primeiro, pelo prazo mais próximo, e as concluídas no fim. MUST ter os estados carregando, vazio e erro, funcionar de 320 px a 1440 px nos dois temas e respeitar "Ocultar valores".

#### Scenario: Sem metas
- **WHEN** não há nenhuma meta
- **THEN** a tela mostra o estado vazio com a ação "Criar meta"

#### Scenario: Meta atrasada
- **WHEN** a situação é `behind`
- **THEN** a linha mostra o ícone e o texto com o valor mensal necessário, sem depender só da cor

#### Scenario: Meta concluída
- **WHEN** a meta atingiu o valor desejado
- **THEN** ela aparece no fim da lista com "Concluída"

#### Scenario: Confirmação ao excluir
- **WHEN** o usuário pede para excluir uma meta
- **THEN** a tela pede confirmação antes de apagar
