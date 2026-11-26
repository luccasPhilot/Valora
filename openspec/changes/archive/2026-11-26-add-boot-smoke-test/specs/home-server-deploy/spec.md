## ADDED Requirements

### Requirement: Imagem nova testada antes de trocar os containers
O `deploy.sh` MUST construir as imagens do backend e do frontend e testá-las em containers descartáveis **antes** de subir ou recriar qualquer serviço. O teste MUST rodar sem banco no ar e sem publicar porta:

- **Backend:** MUST executar `node dist/boot-check.js` na imagem nova, com o `infra/.env` do servidor. O comando MUST carregar todos os módulos compilados, exceto a entrada que sobe a API, e validar a configuração do ambiente. Ele MUST NOT conectar no banco, escutar porta nem chamar o Pluggy.
- **Frontend:** MUST executar `nginx -t` na imagem nova.

Se o teste do backend ou do frontend falhar, o script MUST terminar com erro, MUST NOT parar, recriar nem reiniciar nenhum container, e MUST dizer na mensagem que a versão anterior continua no ar. A saída do teste MUST citar o módulo ou o nome da variável que falhou, e MUST NOT mostrar valores de variáveis, credenciais nem descrições de transações.

#### Scenario: Módulo que não carrega no Node
- **WHEN** o build do backend tem um `import` que o Node recusa (por exemplo, um export padrão que não existe)
- **THEN** o `deploy.sh` termina com erro apontando o módulo que falhou, os containers antigos continuam rodando e saudáveis, e o `up` não é executado

#### Scenario: Variável faltando no servidor
- **WHEN** o `infra/.env` não tem `PLUGGY_ITEM_IDS`, ou só parte das variáveis VAPID
- **THEN** o teste do backend falha citando só os nomes das variáveis, e a versão anterior continua no ar

#### Scenario: nginx.conf inválido
- **WHEN** o `nginx.conf` da imagem nova tem um erro de sintaxe
- **THEN** o `nginx -t` falha, o `deploy.sh` termina com erro e a versão anterior continua no ar

#### Scenario: Imagem boa
- **WHEN** os dois testes passam
- **THEN** o `deploy.sh` segue para o `compose up -d --wait` e espera os healthchecks, como antes

#### Scenario: Primeira subida
- **WHEN** o `deploy.sh` roda num servidor sem nenhum container do Valora
- **THEN** os testes rodam do mesmo jeito (não dependem de banco nem de containers) e, passando, a stack sobe
