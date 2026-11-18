# investments-view Specification

## Purpose
Consulta das posições de investimento (total, grupos por tipo e posições), rótulos em português por tipo e subtipo, e a tela de Investimentos.
## Requirements
### Requirement: Posições de investimento
`GET /api/v1/investments` MUST devolver as posições dos investimentos de conexões **ativas** (não arquivadas) e **todas as posições manuais** (que não têm conexão), agrupadas por `type`, com `totals` (`totalCents`, `positionsCount`, `closedCount`) e `groups`. Cada grupo MUST trazer `type`, `totalCents`, `percent` e `items`; cada item MUST trazer `id`, `name`, `subtype`, `balanceCents`, `percent`, `institutionName`, `source` e `balanceUpdatedOn`. Posições com saldo zero MUST ficar fora de `items` e MUST ser contadas em `closedCount`. A resposta MUST NOT expor `raw` nem o id do Pluggy.

#### Scenario: Total e grupos
- **WHEN** há um CDB de R$ 1.000,00, um Tesouro de R$ 500,00 (ambos `FIXED_INCOME`) e um fundo de R$ 500,00 (`MUTUAL_FUND`)
- **THEN** `totalCents` é `200000`, o grupo `FIXED_INCOME` tem `totalCents` `150000` e `percent` `75`, e o grupo `MUTUAL_FUND` tem `percent` `25`

#### Scenario: Manual e Open Finance no mesmo grupo
- **WHEN** há um CDB do Pluggy de R$ 1.000,00 e uma posição manual `FIXED_INCOME` de R$ 500,00
- **THEN** o grupo `FIXED_INCOME` tem `totalCents` `150000` e dois itens, um com `source` `open_finance` e outro com `source` `manual`

#### Scenario: Posição zerada
- **WHEN** um CDB resgatado tem saldo `0`
- **THEN** ele não aparece em `items`, `closedCount` conta 1 e `positionsCount` não o conta

#### Scenario: Banco arquivado
- **WHEN** a conexão de um investimento está arquivada
- **THEN** a posição não aparece e não entra no total

#### Scenario: Banco arquivado e posição manual
- **WHEN** um banco com R$ 2.000,00 em investimentos está arquivado e há uma posição manual de R$ 3.000,00
- **THEN** o total é `300000`

#### Scenario: Ordem
- **WHEN** há grupos e posições de tamanhos diferentes
- **THEN** os grupos vêm do maior para o menor total e, em cada grupo, as posições do maior para o menor saldo

#### Scenario: Sem investimentos
- **WHEN** não há nenhuma posição com saldo
- **THEN** `totalCents` é `0`, `groups` é vazio e `percent` nunca divide por zero

### Requirement: Rótulos por tipo e subtipo
A tela MUST traduzir os tipos para "Renda fixa" (`FIXED_INCOME`), "Fundos" (`MUTUAL_FUND`), "Ações" (`EQUITY`), "ETFs" (`ETF`), "Títulos e previdência" (`SECURITY`), "COE" (`COE`) e "Criptomoedas" (`CRYPTO`), e qualquer outro valor, inclusive `OTHER`, para "Outros". Subtipos conhecidos (CDB, LCI, LCA, Tesouro Direto, fundos) MUST ter nome em português e os desconhecidos MUST aparecer sem quebrar a tela. Uma posição sem subtipo MUST mostrar só a instituição na linha.

#### Scenario: Tipo conhecido
- **WHEN** o grupo é `FIXED_INCOME`
- **THEN** a tela mostra "Renda fixa"

#### Scenario: Criptomoedas
- **WHEN** o grupo é `CRYPTO`
- **THEN** a tela mostra "Criptomoedas"

#### Scenario: Tipo desconhecido
- **WHEN** o grupo vem com um tipo que o app não conhece
- **THEN** a tela mostra "Outros"

#### Scenario: Subtipo sem tradução
- **WHEN** o subtipo é um código que o app não conhece
- **THEN** a linha mostra o código de forma legível, sem erro

#### Scenario: Posição sem subtipo
- **WHEN** uma posição manual tem `subtype` nulo e instituição "Binance"
- **THEN** a linha mostra "Binance", sem separador solto

### Requirement: Tela de Investimentos
A área "Investimentos" (`/investimentos`) MUST aparecer no menu lateral, depois de Contas, e mostrar o total, a lista de barras por tipo numa cor só e as posições de cada tipo com "subtipo · instituição" e o saldo. MUST mostrar, só quando houver, a linha com a quantidade de posições zeradas. MUST ter o botão "Adicionar investimento", que abre um painel de formulário (folha inferior no celular, lateral no tablet e janela no computador) com nome, instituição, tipo e valor atual. Cada posição manual MUST trazer o selo "Manual" e "Atualizado em dd/mm/aaaa"; passados mais de 30 dias sem atualizar, a linha MUST dizer "Desatualizado" em texto, sem usar vermelho. Tocar numa posição manual MUST abrir o painel de edição, com "Atualizar valor", "Salvar" e "Excluir"; posição do Open Finance MUST continuar só leitura. A tela MUST ter os estados carregando, vazio e erro, funcionar de 320 px a 1440 px nos dois temas sem rolagem horizontal e respeitar "Ocultar valores".

#### Scenario: Menu
- **WHEN** o app abre
- **THEN** o menu lateral tem o item "Investimentos" depois de "Contas"

#### Scenario: Valores ocultos
- **WHEN** "Ocultar valores" está ligado
- **THEN** o total e os saldos aparecem mascarados, os percentuais continuam visíveis e o campo de valor do painel não revela o saldo atual

#### Scenario: Sem investimentos
- **WHEN** não há posições
- **THEN** a tela mostra o estado vazio com as ações "Adicionar investimento" e "Ver contas"

#### Scenario: Adicionar um investimento
- **WHEN** o usuário preenche "Fundo INCO", "INCO", "Fundos", "R$ 25.000,00" e salva
- **THEN** a tela mostra a posição no grupo "Fundos" com o selo "Manual" e o total sobe R$ 25.000,00

#### Scenario: Selo e data
- **WHEN** uma posição manual foi atualizada em 10/11/2026
- **THEN** a linha mostra "Manual" e "Atualizado em 10/11/2026"

#### Scenario: Posição desatualizada
- **WHEN** a última atualização de uma posição manual foi há 45 dias
- **THEN** a linha mostra "Desatualizado" em texto, na cor normal

#### Scenario: Posição do Open Finance
- **WHEN** o usuário toca num CDB que veio do Pluggy
- **THEN** nenhum painel de edição abre

#### Scenario: Erro ao salvar
- **WHEN** a API falha ao salvar
- **THEN** o painel continua aberto, mantém o que foi digitado e mostra o erro em linguagem simples

#### Scenario: Posições zeradas
- **WHEN** 3 posições estão zeradas
- **THEN** o rodapé diz que 3 posições zeradas não aparecem

#### Scenario: Erro
- **WHEN** a API falha
- **THEN** a tela mostra o erro em linguagem simples com "Tentar de novo"

#### Scenario: Celular estreito
- **WHEN** a largura é 320 px e um nome de investimento é longo
- **THEN** o nome é truncado, o saldo continua visível e não há rolagem horizontal

