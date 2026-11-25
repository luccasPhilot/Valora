## ADDED Requirements

### Requirement: Erro inesperado numa tela
Quando uma tela lança um erro ao carregar ou ao desenhar, o app MUST mostrar, no lugar dela, a mensagem "Algo deu errado nesta tela" com o botão "Tentar de novo", em pt-BR, sem stack, nome de erro nem mensagem técnica. O menu lateral e o topo MUST continuar disponíveis quando o erro for de uma área. Quando o erro for de um arquivo da tela que não carregou (versão nova publicada ou cache apagado), o app MUST recarregar a página sozinho uma vez e, se falhar de novo, MUST mostrar a mesma mensagem. A tela MUST funcionar de 320 px a 1440 px nos dois temas.

#### Scenario: Exceção ao desenhar
- **WHEN** a tela de Metas lança uma exceção ao desenhar
- **THEN** aparece "Algo deu errado nesta tela" com "Tentar de novo", e o menu continua levando às outras áreas

#### Scenario: Versão nova publicada com a aba aberta
- **WHEN** o usuário abre Relatórios e o arquivo da tela não existe mais no servidor
- **THEN** o app recarrega a página uma vez e abre Relatórios na versão nova

#### Scenario: Arquivo que continua falhando
- **WHEN** o arquivo da tela falha de novo depois da recarga
- **THEN** aparece "Algo deu errado nesta tela", sem recarregar outra vez

#### Scenario: Nada técnico na tela
- **WHEN** qualquer erro inesperado é mostrado
- **THEN** a tela não contém texto em inglês, stack nem o nome do erro

### Requirement: Números atualizados depois de gravar
Depois de qualquer gravação feita pelo app, toda consulta cujo resultado pode ter mudado MUST ser marcada como desatualizada na hora, para ser buscada de novo quando a tela aparecer, sem esperar o tempo de cache. As chaves das consultas e o que cada gravação muda MUST estar definidos num lugar só.

#### Scenario: Regra salva
- **WHEN** o usuário salva uma regra que recategoriza transações e depois abre o Início
- **THEN** os gastos por categoria, os orçamentos e os alertas mostram os números já recategorizados

#### Scenario: Meta editada
- **WHEN** o usuário muda o valor-alvo de uma meta e volta ao Início
- **THEN** o cartão de metas mostra o valor novo

#### Scenario: Previsão criada
- **WHEN** o usuário cria uma previsão do mês e abre o Início
- **THEN** o resumo da projeção já a considera

#### Scenario: Lançamento manual
- **WHEN** o usuário lança uma despesa manual e abre Planejamento
- **THEN** a lista de candidatas para vincular e a projeção já a consideram

### Requirement: Repetir só o que pode dar certo
Uma consulta que falha MUST ser repetida no máximo uma vez, e só quando a falha for de rede ou uma resposta 5xx do servidor. Uma resposta 4xx ou fora do contrato MUST mostrar o estado de erro sem repetir.

#### Scenario: Servidor fora
- **WHEN** a consulta do Início recebe 503
- **THEN** o app tenta de novo uma vez antes de mostrar o erro

#### Scenario: Requisição recusada
- **WHEN** a consulta recebe 400 `VALIDATION_ERROR`
- **THEN** o estado de erro aparece sem nova tentativa
