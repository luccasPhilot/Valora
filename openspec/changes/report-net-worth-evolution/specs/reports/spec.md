## ADDED Requirements

### Requirement: Evolução do patrimônio
O relatório `/relatorios/patrimonio` ("Patrimônio" na navegação entre relatórios) MUST usar `GET /api/v1/net-worth` com o período do relatório (`from` e `to`) e MUST mostrar três números: "Patrimônio hoje" (vermelho só se negativo), "Variação no período" (do primeiro ao último ponto, em reais e percentual, com ícone, `+` ou `−` e o texto "desde" com a data do primeiro ponto, ou "—" com menos de 2 pontos) e "Em investimentos" (percentual da soma de contas e investimentos, "—" quando a soma é zero). MUST mostrar o gráfico de área do patrimônio total (série 1) e o gráfico de colunas por mês com a composição nos slots da paleta em ordem — Contas (1), Investimentos (2) e Faturas em aberto (3, valores negativos abaixo do zero) —, com legenda e tooltip com as três cifras e o patrimônio do mês. Os gráficos MUST ser desenhados só com 2 ou mais pontos; com menos, MUST mostrar o texto que diz desde quando há histórico. MUST ter a tabela ("Ver em tabela") com mês, Contas, Investimentos, Faturas em aberto (com `−`) e Patrimônio, sem linha de total, e MUST marcar o mês em andamento em texto. MUST trazer a nota da fórmula, de que bancos removidos do Valora saem a partir do dia do arquivamento e de que gastos no cartão fora de fatura fechada não entram. MUST NOT usar cor de série em texto. MUST ter os estados carregando, vazio (sem nenhuma foto, com "Ver contas") e erro ("Tentar de novo"), funcionar de 320 px a 1440 px nos dois temas sem rolagem horizontal da página e respeitar "Ocultar valores" (mascara os valores em reais, remove os eixos de valores e mantém os percentuais).

#### Scenario: Mesmo número do cartão
- **WHEN** o cartão de patrimônio da tela Investimentos mostra R$ 17.500,00 para o mês atual
- **THEN** o ponto do mês atual na tabela do relatório tem Patrimônio R$ 17.500,00

#### Scenario: Variação no período
- **WHEN** o primeiro ponto é R$ 10.000,00 em 04/11 e o último é R$ 10.500,00
- **THEN** a variação mostra "+ R$ 500,00 (+5%)" e "desde 04/11", com ícone

#### Scenario: Composição com fatura
- **WHEN** um mês tem Contas R$ 5.000,00, Investimentos R$ 12.000,00 e Faturas em aberto R$ 1.500,00
- **THEN** as colunas do mês mostram as duas primeiras acima do zero e a fatura abaixo, e o tooltip mostra o patrimônio R$ 15.500,00

#### Scenario: Histórico curto
- **WHEN** existe um ponto só e a primeira foto é de 04/11
- **THEN** não há gráficos, o texto diz "O histórico começa em 04/11" e a tabela mostra o ponto

#### Scenario: Sem fotos
- **WHEN** não há nenhuma foto guardada
- **THEN** a tela mostra o estado vazio com "Ver contas"

#### Scenario: Tabela
- **WHEN** o usuário escolhe "Tabela"
- **THEN** a tabela mostra Contas, Investimentos, Faturas em aberto e Patrimônio de cada mês, e os gráficos somem

#### Scenario: Período
- **WHEN** o usuário escolhe "24 meses"
- **THEN** o relatório pede `from` e `to` de 24 meses e mostra só os meses que têm fotos

#### Scenario: Valores ocultos
- **WHEN** "Ocultar valores" está ligado
- **THEN** os valores em reais, a tabela e os eixos de valores aparecem mascarados ou somem, e o percentual em investimentos continua visível

#### Scenario: Celular estreito
- **WHEN** a largura é 320 px
- **THEN** os gráficos ficam em uma coluna, a página não tem rolagem horizontal e a tabela rola só dentro do bloco

#### Scenario: Erro
- **WHEN** a API falha
- **THEN** a tela mostra o erro em linguagem simples com "Tentar de novo"
