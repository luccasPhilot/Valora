# home-server-deploy Specification

## Purpose
Imagens do backend e do frontend, compose de produção, acesso só pela Tailscale com HTTPS, backup semanal, restauração testada e atualização pelo `deploy.sh`, no servidor de casa.
## Requirements
### Requirement: Imagens do backend e do frontend
O backend e o frontend MUST ter cada um a sua imagem Docker, construída em etapas a partir da própria pasta, com a versão de Node fixada no `.nvmrc`. Nenhum dos dois MUST rodar como root.

- **Backend:** imagem da API compilada com `tsc`, só com as dependências de produção.
- **Frontend:** o front compilado servido por nginx.
  - Requisições `GET` fora de `/api` que não são arquivos MUST receber o `index.html`.
  - Requisições para `/api` MUST ser repassadas ao backend, mantendo o caminho.

#### Scenario: Abrir uma rota do app direto
- **WHEN** o navegador abre `/transactions` diretamente
- **THEN** o nginx devolve o `index.html` e o app abre na tela de Transações

#### Scenario: Chamada à API pelo front
- **WHEN** o front chama `/api/v1/health`
- **THEN** o nginx repassa ao backend e a resposta é a do backend

#### Scenario: Rota de API inexistente
- **WHEN** uma requisição chega em `/api/v1/inexistente`
- **THEN** a resposta é o 404 do backend, com `code: "NOT_FOUND"`, e não o `index.html`

#### Scenario: Usuário dos processos
- **WHEN** os containers estão rodando
- **THEN** nem o processo do backend nem o do nginx rodam como root

### Requirement: Compose de produção
O `infra/compose.yml` MUST ter só os serviços `frontend`, `backend` e `db`:
- `frontend` MUST publicar uma porta apenas em `127.0.0.1:3000`, e MUST ser o único serviço com porta publicada;
- `backend` MUST ficar só na rede interna do Compose;
- `db` MUST guardar os dados num volume nomeado, com a mesma versão de PostgreSQL usada em desenvolvimento e nos testes;
- os três MUST ter healthcheck, reinício `unless-stopped` e `TZ=America/Sao_Paulo`;
- os três MUST ter rotação de logs: driver `json-file`, com `max-size: 10m` e `max-file: 5` (no máximo 50 MB de log por serviço);
- `backend` MUST ler as variáveis do `infra/.env` e só iniciar depois que `db` estiver saudável; `frontend` MUST iniciar depois do `backend`.

#### Scenario: Acesso pela rede de casa
- **WHEN** outro aparelho da rede de casa tenta abrir `http://<ip-do-servidor>:3000`
- **THEN** a conexão é recusada

#### Scenario: Backend e banco não expostos
- **WHEN** alguém tenta conectar direto no backend ou na porta 5432 do servidor
- **THEN** a conexão é recusada

#### Scenario: Reinício do servidor
- **WHEN** o servidor reinicia
- **THEN** os três containers voltam sozinhos e os dados continuam lá

#### Scenario: Logs com tamanho limitado
- **WHEN** um serviço já gravou 50 MB de log
- **THEN** o Docker descarta o arquivo de log mais antigo daquele serviço, e o espaço ocupado pelos logs dele não passa de 50 MB

### Requirement: Variáveis documentadas
O `infra/.env.example` MUST listar todas as variáveis que o Compose e o backend usam em produção, sem nenhum valor real. O backend MUST recusar iniciar se alguma obrigatória faltar.

#### Scenario: Arquivo de exemplo completo
- **WHEN** o `infra/.env.example` é copiado para `infra/.env` e preenchido só com as variáveis listadas
- **THEN** os três serviços iniciam sem erro de configuração

### Requirement: Acesso só pela Tailscale com HTTPS
O app MUST ser publicado apenas com `tailscale serve`, em HTTPS, no endereço `.ts.net` do servidor, apontando para o `frontend`. `tailscale funnel` MUST NOT ser usado.

#### Scenario: Celular na Tailscale
- **WHEN** o celular conectado à Tailscale abre `https://<servidor>.<tailnet>.ts.net`
- **THEN** o app abre com certificado válido

#### Scenario: Aparelho fora da Tailscale
- **WHEN** um aparelho fora da Tailscale tenta abrir o mesmo endereço
- **THEN** o app não é alcançado

### Requirement: Backup semanal
O `infra/scripts/backup.sh` MUST gerar um `pg_dump` em formato custom do banco do Valora num segundo disco (`BACKUP_DIR`, padrão `/mnt/hdd/valora`). Ele MUST receber a origem do backup como argumento: `weekly` (o cron de domingo às 03:00), `predeploy` (o `deploy.sh`) ou `manual` (o padrão, sem argumento); outra origem MUST ser recusada com erro, sem gerar arquivo.

- O arquivo MUST se chamar `valora-<origem>-AAAA-MM-DD_HHMMSS.dump`, com a data e a hora do servidor.
- O script MUST NOT sobrescrever um arquivo que já existe: se o nome já estiver em uso, ele MUST terminar com erro, mantendo o arquivo existente intacto.
- O arquivo MUST ser criado com permissão `600` (só o dono lê e escreve).
- Os arquivos antigos no formato `valora-AAAA-MM-DD.dump` MUST continuar valendo para restaurar e para a retenção.
- O resultado MUST ir para um log com só o nome e o tamanho do arquivo, sem conteúdo do banco.
- Se o `pg_dump` falhar, o script MUST terminar com erro e MUST NOT apagar nenhum backup.

#### Scenario: Backup da semana
- **WHEN** é domingo, 03:00, e o cron chama o backup semanal
- **THEN** existe um arquivo novo `valora-weekly-AAAA-MM-DD_030000.dump` (ou com os segundos em que o dump começou) no segundo disco, com permissão `600`

#### Scenario: Backup sem argumento
- **WHEN** o usuário roda `infra/scripts/backup.sh` sem argumento
- **THEN** o arquivo novo se chama `valora-manual-AAAA-MM-DD_HHMMSS.dump`

#### Scenario: Origem desconhecida
- **WHEN** o usuário roda `infra/scripts/backup.sh diario`
- **THEN** o script termina com erro, diz quais origens valem e nenhum dump é feito

#### Scenario: Rollback no mesmo dia
- **WHEN** um deploy às 10:00 e um `deploy.sh <commit anterior>` às 10:30 fazem backup no mesmo dia
- **THEN** existem dois arquivos `valora-predeploy-…` diferentes e o das 10:00 continua igual

#### Scenario: Nome já em uso
- **WHEN** o arquivo com o nome calculado já existe no `BACKUP_DIR`
- **THEN** o script termina com erro e o arquivo existente não é alterado

#### Scenario: Falha no dump
- **WHEN** o banco está fora do ar no horário do backup
- **THEN** o script termina com erro, registra a falha no log e nenhum backup antigo é apagado

### Requirement: Restauração testada
Deve existir um procedimento documentado de restauração que MUST, nesta ordem: fazer um backup `manual` do estado atual, parar o backend (`docker compose stop backend`), restaurar com `pg_restore --clean --if-exists` e iniciar o backend de novo (`docker compose start backend`).

O `infra/scripts/restore-check.sh` MUST restaurar o backup mais recente num banco temporário, comparar a quantidade de linhas de `transactions`, `accounts`, `categories`, `balance_snapshots`, `investment_snapshots` e `investments` com o banco em uso e apagar o banco temporário. O backup mais recente MUST ser escolhido pela data e hora do nome do arquivo, de qualquer origem, contando o formato antigo `valora-AAAA-MM-DD.dump` como meia-noite daquele dia. O restore-check MUST rodar sozinho toda semana, logo depois do backup semanal. A primeira restauração MUST ser executada antes de a Fase 1 ser considerada pronta.

#### Scenario: Conferência da restauração
- **WHEN** o script de conferência roda com o backup do dia
- **THEN** ele informa que as quantidades de transações, contas, categorias, fotos de saldo, fotos de investimentos e investimentos batem com o banco em uso e apaga o banco temporário

#### Scenario: Backups de origens diferentes
- **WHEN** existem `valora-2026-11-15.dump`, `valora-weekly-2026-11-22_030001.dump` e `valora-predeploy-2026-11-22_101500.dump`
- **THEN** o restore-check restaura o `valora-predeploy-2026-11-22_101500.dump`

#### Scenario: Quantidade diverge
- **WHEN** a quantidade de `investment_snapshots` do backup é diferente da do banco em uso
- **THEN** o script aponta a tabela que diverge, termina com erro e apaga o banco temporário

#### Scenario: Toda semana
- **WHEN** o backup semanal de domingo termina bem
- **THEN** o restore-check roda em seguida, sem ninguém pedir

### Requirement: Atualização do app
A atualização MUST ser feita no servidor pelo `infra/scripts/deploy.sh`, que:
1. recusa rodar se o clone tiver alterações locais;
2. faz o backup com origem `predeploy`, se o banco já estiver no ar, e aborta se o backup falhar;
3. troca para a versão pedida (a `main` por padrão);
4. constrói as imagens (`docker compose build`) e as testa antes de trocar qualquer container (requisito "Imagem nova testada antes de trocar os containers");
5. sobe com `docker compose up -d --wait`, sem `--build`;
6. falha, sem voltar o código sozinho, se algum container não ficar saudável.

As migrations MUST rodar sozinhas no início do backend.

#### Scenario: Versão nova com migration
- **WHEN** você roda o `deploy.sh` numa versão com migration nova
- **THEN** o app volta com o banco migrado e os dados preservados, e existe um arquivo `valora-predeploy-…` feito antes da atualização

#### Scenario: Versão que não sobe
- **WHEN** o `deploy.sh` publica uma versão cujo container não fica saudável
- **THEN** o script termina com erro, mostra o log do backend e avisa que voltar o código não desfaz migrations

### Requirement: Retenção dos backups
Depois de cada backup bem-sucedido, o `backup.sh` MUST apagar os backups vencidos, contando a idade pela data do nome do arquivo:
- **semanais** (`valora-weekly-…` e os antigos `valora-AAAA-MM-DD.dump`) MUST ficar por 8 semanas (56 dias); depois disso, o primeiro semanal de cada mês MUST ficar por 12 meses (365 dias);
- **pré-deploy** e **manuais** MUST ficar por 30 dias;
- os 3 mais recentes de cada origem MUST ficar sempre, mesmo vencidos;
- arquivos com nome fora desses formatos MUST NOT ser apagados.

Cada arquivo apagado MUST ir para o log só com o nome.

#### Scenario: Semanal recente
- **WHEN** o backup roda e existe um semanal de 56 dias atrás
- **THEN** esse arquivo fica

#### Scenario: Semanal vencido no meio do mês
- **WHEN** o backup roda e existe um semanal de 57 dias atrás que não é o primeiro semanal do mês dele
- **THEN** esse arquivo é apagado

#### Scenario: Primeiro do mês
- **WHEN** o backup roda e existe um semanal de 200 dias atrás que é o primeiro semanal do mês dele
- **THEN** esse arquivo fica

#### Scenario: Primeiro do mês com mais de um ano
- **WHEN** o backup roda e existe um semanal de 366 dias atrás que é o primeiro semanal do mês dele
- **THEN** esse arquivo é apagado

#### Scenario: Arquivo no formato antigo
- **WHEN** o backup roda e existe `valora-AAAA-MM-DD.dump` de 40 dias atrás
- **THEN** esse arquivo fica, porque conta como semanal

#### Scenario: Pré-deploy vencido
- **WHEN** o backup roda e existem 5 pré-deploy, dois deles com 31 dias e os outros 3 com menos de 30
- **THEN** os dois de 31 dias são apagados

#### Scenario: Poucos deploys
- **WHEN** o backup roda e os únicos 3 pré-deploy têm mais de 30 dias
- **THEN** os 3 ficam

#### Scenario: Arquivo desconhecido
- **WHEN** existe `valora-antes-da-migracao.dump` de 400 dias atrás no `BACKUP_DIR`
- **THEN** a retenção não apaga esse arquivo

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
