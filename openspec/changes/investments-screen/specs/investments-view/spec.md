## ADDED Requirements

### Requirement: Posições de investimento
`GET /api/v1/investments` MUST devolver as posições dos investimentos de conexões **ativas** (não arquivadas), agrupadas por `type`, com `totals` (`totalCents`, `positionsCount`, `closedCount`) e `groups`. Cada grupo MUST trazer `type`, `totalCents`, `percent` e `items`; cada item MUST trazer `id`, `name`, `subtype`, `balanceCents`, `percent` e `institutionName`. Posições com saldo zero MUST ficar fora de `items` e MUST ser contadas em `closedCount`. A resposta MUST NOT expor `raw` nem o id do Pluggy.

#### Scenario: Total e grupos
- **WHEN** há um CDB de R$ 1.000,00, um Tesouro de R$ 500,00 (ambos `FIXED_INCOME`) e um fundo de R$ 500,00 (`MUTUAL_FUND`)
- **THEN** `totalCents` é `200000`, o grupo `FIXED_INCOME` tem `totalCents` `150000` e `percent` `75`, e o grupo `MUTUAL_FUND` tem `percent` `25`

#### Scenario: Posição zerada
- **WHEN** um CDB resgatado tem saldo `0`
- **THEN** ele não aparece em `items`, `closedCount` conta 1 e `positionsCount` não o conta

#### Scenario: Banco arquivado
- **WHEN** a conexão de um investimento está arquivada
- **THEN** a posição não aparece e não entra no total

#### Scenario: Ordem
- **WHEN** há grupos e posições de tamanhos diferentes
- **THEN** os grupos vêm do maior para o menor total e, em cada grupo, as posições do maior para o menor saldo

#### Scenario: Sem investimentos
- **WHEN** não há nenhuma posição com saldo
- **THEN** `totalCents` é `0`, `groups` é vazio e `percent` nunca divide por zero

### Requirement: Rótulos por tipo e subtipo
A tela MUST traduzir os tipos para "Renda fixa" (`FIXED_INCOME`), "Fundos" (`MUTUAL_FUND`), "Ações" (`EQUITY`), "ETFs" (`ETF`), "Títulos e previdência" (`SECURITY`) e "COE" (`COE`), e qualquer outro valor para "Outros". Subtipos conhecidos (CDB, LCI, LCA, Tesouro Direto, fundos) MUST ter nome em português e os desconhecidos MUST aparecer sem quebrar a tela.

#### Scenario: Tipo conhecido
- **WHEN** o grupo é `FIXED_INCOME`
- **THEN** a tela mostra "Renda fixa"

#### Scenario: Tipo desconhecido
- **WHEN** o grupo vem com um tipo que o app não conhece
- **THEN** a tela mostra "Outros"

#### Scenario: Subtipo sem tradução
- **WHEN** o subtipo é um código que o app não conhece
- **THEN** a linha mostra o código de forma legível, sem erro

### Requirement: Tela de Investimentos
A área "Investimentos" (`/investimentos`) MUST aparecer no menu lateral, depois de Contas, e mostrar o total, a lista de barras por tipo numa cor só e as posições de cada tipo com "subtipo · instituição" e o saldo. MUST mostrar, só quando houver, a linha com a quantidade de posições zeradas. MUST ter os estados carregando, vazio e erro, funcionar de 320 px a 1440 px nos dois temas sem rolagem horizontal e respeitar "Ocultar valores".

#### Scenario: Menu
- **WHEN** o app abre
- **THEN** o menu lateral tem o item "Investimentos" depois de "Contas"

#### Scenario: Valores ocultos
- **WHEN** "Ocultar valores" está ligado
- **THEN** o total e os saldos aparecem mascarados e os percentuais continuam visíveis

#### Scenario: Sem investimentos
- **WHEN** não há posições
- **THEN** a tela mostra o estado vazio com a ação "Ver contas"

#### Scenario: Posições zeradas
- **WHEN** 3 posições estão zeradas
- **THEN** o rodapé diz que 3 posições zeradas não aparecem

#### Scenario: Erro
- **WHEN** a API falha
- **THEN** a tela mostra o erro em linguagem simples com "Tentar de novo"

#### Scenario: Celular estreito
- **WHEN** a largura é 320 px e um nome de investimento é longo
- **THEN** o nome é truncado, o saldo continua visível e não há rolagem horizontal
