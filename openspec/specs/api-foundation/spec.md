# api-foundation Specification

## Purpose
Base da API do Valora: configuração validada na inicialização, rotas versionadas, verificação de saúde, formato padrão de erro e logs sem dados sensíveis.
## Requirements
### Requirement: Configuração validada na inicialização
A API MUST validar as variáveis de ambiente com Zod antes de aceitar requisições. Se uma variável obrigatória faltar ou for inválida, o processo MUST terminar com código diferente de zero e uma mensagem que nomeia a variável, sem imprimir nenhum valor do ambiente.

#### Scenario: Variável obrigatória ausente
- **WHEN** a API inicia sem `DATABASE_URL`
- **THEN** o processo termina com falha e a mensagem cita `DATABASE_URL`

#### Scenario: Valor inválido
- **WHEN** a API inicia com `PORT=abc`
- **THEN** o processo termina com falha e a mensagem cita `PORT`, sem mostrar o conteúdo de outras variáveis

#### Scenario: Configuração válida
- **WHEN** todas as variáveis obrigatórias estão presentes e válidas
- **THEN** a API aplica as migrations e passa a aceitar requisições na porta configurada

### Requirement: Rotas versionadas
Toda rota da API MUST ficar sob o prefixo `/api/v1`.

#### Scenario: Rota fora do prefixo
- **WHEN** uma requisição chega em `/health`, sem o prefixo
- **THEN** a API responde 404 no formato padrão de erro

### Requirement: Verificação de saúde
`GET /api/v1/health` MUST responder 200 com `{ "status": "ok", "database": "ok" }` quando o banco responde, e 503 com `{ "status": "degraded", "database": "unavailable" }` quando o banco não responde.

#### Scenario: Banco disponível
- **WHEN** o banco está de pé e `GET /api/v1/health` é chamado
- **THEN** a resposta é 200 com `database: "ok"`

#### Scenario: Banco fora do ar
- **WHEN** o banco não aceita conexões e `GET /api/v1/health` é chamado
- **THEN** a resposta é 503 com `database: "unavailable"`

### Requirement: Formato padrão de erro
Toda resposta de erro MUST ter o formato `{ "error": { "code": string, "message": string, "details": array } }`. Erros inesperados MUST responder 500 com `code: "INTERNAL_ERROR"`, sem stack trace nem mensagem interna.

#### Scenario: Entrada inválida
- **WHEN** uma rota recebe um corpo que não passa no schema Zod
- **THEN** a resposta é 400 com `code: "VALIDATION_ERROR"` e `details` lista cada campo inválido com uma mensagem

#### Scenario: Recurso inexistente
- **WHEN** uma rota lança `NotFoundError`
- **THEN** a resposta é 404 com `code: "NOT_FOUND"` e uma mensagem que identifica o recurso

#### Scenario: Erro inesperado
- **WHEN** uma rota lança um erro que não é de domínio
- **THEN** a resposta é 500 com `code: "INTERNAL_ERROR"`, uma mensagem genérica e sem stack trace

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

