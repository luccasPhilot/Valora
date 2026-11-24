## MODIFIED Requirements

### Requirement: Logs sem dados sensíveis
Os logs MUST NOT conter corpo de requisição ou de resposta, query string, valores em dinheiro, descrições de transações, tokens ou credenciais. Cada requisição MUST gerar uma linha com método, caminho sem query, status e duração, com uma exceção: `GET /api/v1/health` respondido com 200 MUST NOT gerar linha, porque o healthcheck do Compose o chama a cada 10 segundos. Um `GET /api/v1/health` com status de erro (por exemplo, 503) MUST continuar gerando a linha.

#### Scenario: Requisição com corpo
- **WHEN** uma requisição `POST` com corpo é processada
- **THEN** a linha de log tem método, caminho, status e duração, e não tem nenhum campo do corpo

#### Scenario: Requisição com busca
- **WHEN** `GET /api/v1/transactions?search=farmacia` é processado
- **THEN** a linha de log mostra `/api/v1/transactions`, sem o termo buscado

#### Scenario: Healthcheck com sucesso
- **WHEN** `GET /api/v1/health` responde 200
- **THEN** nenhuma linha de log de requisição é gerada

#### Scenario: Healthcheck com banco fora do ar
- **WHEN** `GET /api/v1/health` responde 503
- **THEN** a linha de log de requisição é gerada, com método, caminho, status e duração

#### Scenario: Outras rotas continuam no log
- **WHEN** `GET /api/v1/accounts` responde 200
- **THEN** a linha de log de requisição é gerada
