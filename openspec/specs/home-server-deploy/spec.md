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
O `infra/scripts/backup.sh` MUST gerar, todo domingo às 03:00, um `pg_dump` em formato custom do banco do Valora num segundo disco, com a data no nome do arquivo. Ele MUST apagar os backups com mais de 30 dias e registrar o resultado num log, sem conteúdo do banco. Se o `pg_dump` falhar, o script MUST terminar com erro e MUST NOT apagar backups antigos.

#### Scenario: Backup da semana
- **WHEN** é domingo, 03:00
- **THEN** existe um arquivo `valora-AAAA-MM-DD.dump` novo no segundo disco

#### Scenario: Retenção
- **WHEN** o backup roda e existe um arquivo de 31 dias atrás
- **THEN** esse arquivo é apagado e os de 30 dias ou menos ficam

#### Scenario: Falha no dump
- **WHEN** o banco está fora do ar no horário do backup
- **THEN** o script termina com erro, registra a falha no log e nenhum backup antigo é apagado

### Requirement: Restauração testada
Deve existir um procedimento documentado de restauração. O `infra/scripts/restore-check.sh` MUST restaurar o último backup num banco temporário e comparar a quantidade de linhas das tabelas principais com o banco em uso. A primeira restauração MUST ser executada antes de a Fase 1 ser considerada pronta.

#### Scenario: Conferência da restauração
- **WHEN** o script de conferência roda com o backup do dia
- **THEN** ele informa que as quantidades de transações, contas e categorias batem com o banco em uso e apaga o banco temporário

### Requirement: Atualização do app
A atualização MUST ser feita no servidor pelo `infra/scripts/deploy.sh`, que:
1. recusa rodar se o clone tiver alterações locais;
2. faz o backup, se o banco já estiver no ar, e aborta se o backup falhar;
3. troca para a versão pedida (a `main` por padrão);
4. sobe com `docker compose up -d --build --wait`;
5. falha, sem voltar o código sozinho, se algum container não ficar saudável.

As migrations MUST rodar sozinhas no início do backend.

#### Scenario: Versão nova com migration
- **WHEN** você roda o `deploy.sh` numa versão com migration nova
- **THEN** o app volta com o banco migrado e os dados preservados, e existe um backup feito antes da atualização

#### Scenario: Versão que não sobe
- **WHEN** o `deploy.sh` publica uma versão cujo container não fica saudável
- **THEN** o script termina com erro, mostra o log do backend e avisa que voltar o código não desfaz migrations
