## ADDED Requirements

### Requirement: Escrita vinda de outro site recusada
A API MUST recusar com 403 `CROSS_SITE_REQUEST`, no formato padrão de erro, toda requisição com método diferente de `GET`, `HEAD` e `OPTIONS` cujo header `Sec-Fetch-Site` seja `cross-site`. Requisições sem esse header, ou com `same-origin`, `same-site` ou `none`, MUST seguir normalmente.

#### Scenario: Página de outro site
- **WHEN** uma página de outro site faz o navegador enviar `POST /api/v1/sync-runs`
- **THEN** a API responde 403 `CROSS_SITE_REQUEST` e nenhuma sincronização começa

#### Scenario: O próprio app
- **WHEN** o front do Valora envia `POST /api/v1/alerts/read-all` com `Sec-Fetch-Site: same-origin`
- **THEN** a requisição segue normalmente

#### Scenario: Linha de comando
- **WHEN** o usuário roda `curl -X POST http://127.0.0.1:3000/api/v1/sync-runs`, sem o header
- **THEN** a requisição segue normalmente

### Requirement: Desligamento gracioso
Ao receber SIGTERM ou SIGINT, a API MUST parar o agendamento da sincronização e a segunda tentativa agendada, MUST esperar a sincronização em curso terminar por até 60 s, e MUST fechar o servidor HTTP e as conexões com o banco antes de sair. Passados os 60 s, MUST sair assim mesmo; a execução que ficou aberta é fechada na subida seguinte.

#### Scenario: Deploy no meio de uma sincronização
- **WHEN** o deploy para o backend enquanto uma sincronização grava o terceiro banco
- **THEN** a sincronização termina, o resultado fica registrado em `sync_runs` e o processo sai antes do `SIGKILL`

#### Scenario: Sem sincronização em curso
- **WHEN** o backend recebe SIGTERM sem sincronização rodando
- **THEN** o processo sai em poucos segundos, sem esperar o `SIGKILL`

#### Scenario: Sincronização que não termina
- **WHEN** a sincronização em curso passa dos 60 s depois do SIGTERM
- **THEN** o processo sai, e na subida seguinte a execução é fechada como interrompida
