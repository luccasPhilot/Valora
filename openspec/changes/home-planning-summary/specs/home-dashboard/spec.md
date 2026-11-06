## ADDED Requirements

### Requirement: Resumo da projeção no Início
`GET /api/v1/dashboard` MUST trazer `projection` com `projectedBalanceCents`, `lowestBalanceCents`, `lowestBalanceDate` e `hasPlannedItems`, com os mesmos valores de `GET /api/v1/projection`, quando o mês pedido for o mês atual em São Paulo. Para qualquer outro mês, `projection` MUST ser `null`. A resposta MUST manter todos os campos que já existiam.

#### Scenario: Mesmo número da projeção
- **WHEN** a projeção completa tem saldo projetado de `480000`
- **THEN** `projection.projectedBalanceCents` é `480000`

#### Scenario: Mês passado
- **WHEN** o Início é pedido para um mês anterior ao atual
- **THEN** `projection` é `null`

#### Scenario: Nada previsto
- **WHEN** não há ocorrência pendente nem fatura no período
- **THEN** `hasPlannedItems` é falso

### Requirement: Resumo de metas no Início
`GET /api/v1/dashboard` MUST trazer `goals` com até 3 metas não concluídas, na mesma ordem da tela de Metas (prazo mais próximo primeiro, sem prazo por último), cada uma com progresso, valores, situação e estimativa iguais aos de `GET /api/v1/goals`, e `activeCount` com o total de metas não concluídas. Metas concluídas MUST NOT entrar.

#### Scenario: Mais de três metas
- **WHEN** existem 5 metas não concluídas
- **THEN** `goals.items` traz as 3 de prazo mais próximo e `activeCount` vale 5

#### Scenario: Só metas concluídas
- **WHEN** todas as metas foram atingidas
- **THEN** `goals.items` fica vazio e `activeCount` vale 0

#### Scenario: Mesmos números da tela de Metas
- **WHEN** uma meta tem progresso de 40% e situação `behind` em `GET /api/v1/goals`
- **THEN** o Início traz a mesma meta com 40% e `behind`

### Requirement: Cartão de projeção no Início
A tela Início MUST mostrar o cartão "Projeção do fim do mês" com o saldo projetado em destaque e o link "Ver planejamento". Quando o menor saldo for negativo, MUST mostrar o aviso com a data, com ícone e texto, em `destructive`. Quando `hasPlannedItems` for falso, MUST mostrar o estado vazio "Planeje o mês" com a ação para o Planejamento. Quando `projection` for `null`, o cartão MUST NOT aparecer.

#### Scenario: Saldo negativo no caminho
- **WHEN** o menor saldo é `-50000` no dia 20
- **THEN** o cartão mostra "Saldo negativo em 20/11" com ícone

#### Scenario: Tudo positivo
- **WHEN** o menor saldo é positivo
- **THEN** o cartão não usa vermelho

#### Scenario: Nada previsto
- **WHEN** `hasPlannedItems` é falso
- **THEN** o cartão mostra "Planeje o mês" com a ação para o Planejamento

### Requirement: Cartão de metas no Início
A tela Início MUST mostrar o cartão "Metas" com até 3 metas (ícone, nome, barra de progresso, percentual e uma frase de situação com ícone e texto) e o link "Ver metas". Sem metas, MUST mostrar o estado vazio com a ação "Criar meta".

#### Scenario: Meta atrasada
- **WHEN** uma meta está `behind`
- **THEN** a linha dela mostra o ícone e o texto da situação, sem depender só da cor

#### Scenario: Sem metas
- **WHEN** não há nenhuma meta
- **THEN** o cartão mostra o estado vazio com "Criar meta"

### Requirement: Layout e valores dos cartões novos
Os cartões novos MUST seguir a grade do Início (1 coluna no celular, 2 no tablet, 12 no computador), funcionar de 320 px a 1440 px nos dois temas sem rolagem horizontal e respeitar "Ocultar valores". MUST usar o skeleton do Início enquanto carregam.

#### Scenario: Valores ocultos
- **WHEN** "Ocultar valores" está ligado
- **THEN** o saldo projetado e os valores das metas aparecem mascarados

#### Scenario: Celular estreito
- **WHEN** a largura é 320 px
- **THEN** os cartões ficam em uma coluna, sem rolagem horizontal
