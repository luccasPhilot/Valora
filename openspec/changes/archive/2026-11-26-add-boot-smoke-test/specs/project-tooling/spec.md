## ADDED Requirements

### Requirement: Stack inteira sobe no CI
O CI MUST ter um job que sobe o `infra/compose.yml` completo (banco, backend e frontend) a cada push e PR, com um `infra/.env` de valores falsos criado pelo próprio workflow, e esperar os três serviços ficarem saudáveis (`up -d --build --wait`). Depois MUST conferir que `/api/v1/health` responde `200` pelo front. O job MUST derrubar a stack e apagar os volumes ao terminar, mesmo com falha, e MUST mostrar os logs dos serviços quando falhar. O job MUST NOT publicar imagem em registro, fazer deploy nem chamar o Pluggy: as credenciais são falsas e o `SYNC_CRON` MUST ser um padrão que não dispara hoje.

#### Scenario: Backend que não inicia
- **WHEN** um PR deixa o build compilado do backend com um `import` que o Node recusa
- **THEN** o job falha na espera pelos healthchecks e os logs do backend mostram o erro

#### Scenario: Migration que quebra no banco vazio
- **WHEN** uma migration falha ao rodar num PostgreSQL novo
- **THEN** o backend não fica saudável e o job falha

#### Scenario: Stack saudável
- **WHEN** a mudança não quebra o boot
- **THEN** os três serviços ficam saudáveis, `/api/v1/health` responde `200` com `{"status":"ok","database":"ok"}` e o job passa

#### Scenario: Nenhuma chamada ao Pluggy
- **WHEN** o job sobe o backend com credenciais falsas
- **THEN** nenhuma sincronização é disparada (o `SYNC_CRON` não cai hoje) e nenhuma requisição sai para a API do Pluggy

### Requirement: Carga do build compilado coberta por teste
O backend MUST ter um teste unitário da verificação de carga (`boot-check`) que prove que ela falha quando um módulo do diretório compilado não carrega e quando a configuração é inválida, e passa quando tudo carrega.

#### Scenario: Módulo com erro de import
- **WHEN** o teste aponta a verificação para uma pasta com um módulo que lança erro ao carregar
- **THEN** a verificação devolve esse módulo na lista de falhas

#### Scenario: Configuração inválida
- **WHEN** o ambiente do teste não tem `PLUGGY_CLIENT_ID`
- **THEN** a verificação falha citando `PLUGGY_CLIENT_ID` e nenhum valor

#### Scenario: Tudo carrega
- **WHEN** a pasta só tem módulos válidos e o ambiente é válido
- **THEN** a verificação não devolve falha nenhuma
