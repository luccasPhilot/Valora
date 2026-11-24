## MODIFIED Requirements

### Requirement: Imagens do backend e do frontend
O backend e o frontend MUST ter cada um a sua imagem Docker, construída em etapas a partir da própria pasta, com a versão de Node fixada no `.nvmrc`. As imagens base (Node, nginx e PostgreSQL) MUST ser fixadas por tag e digest. Nenhum dos dois MUST rodar como root.

- **Backend:** imagem da API compilada com `tsc`, só com as dependências de produção.
- **Frontend:** o front compilado servido por nginx.
  - Requisições `GET` fora de `/api` que não são arquivos MUST receber o `index.html`.
  - Requisições para `/api` MUST ser repassadas ao backend, mantendo o caminho.
  - Toda resposta do nginx MUST levar `Content-Security-Policy` (só a própria origem para scripts, conexões e workers, `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` e `Permissions-Policy` sem câmera, microfone e localização, e MUST NOT mostrar a versão do nginx.

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

#### Scenario: Headers num arquivo com cache próprio
- **WHEN** o navegador pede `/sw.js`, que tem `Cache-Control` próprio
- **THEN** a resposta também traz `Content-Security-Policy`, `X-Content-Type-Options` e `Referrer-Policy`, e o header `Server` não mostra a versão

#### Scenario: App inteiro com a CSP
- **WHEN** o usuário percorre todas as telas, com o service worker e os gráficos
- **THEN** o console não mostra nenhuma violação de CSP

### Requirement: Compose de produção
O `infra/compose.yml` MUST ter só os serviços `frontend`, `backend` e `db`:
- `frontend` MUST publicar uma porta apenas em `127.0.0.1:3000`, e MUST ser o único serviço com porta publicada;
- `backend` MUST ficar só na rede interna do Compose e MUST conectar ao banco com o papel `valora_app`, dono do banco e das tabelas, sem `SUPERUSER`, `CREATEDB`, `CREATEROLE` nem `REPLICATION`;
- `db` MUST guardar os dados num volume nomeado, com a mesma versão de PostgreSQL usada em desenvolvimento e nos testes;
- os três MUST ter healthcheck, reinício `unless-stopped`, `TZ=America/Sao_Paulo` e limite de memória;
- os três MUST ter rotação de logs: driver `json-file`, com `max-size: 10m` e `max-file: 5` (no máximo 50 MB de log por serviço);
- `backend` e `frontend` MUST rodar com `init: true`, e o `backend` MUST ter pelo menos 75 s para encerrar antes do `SIGKILL`;
- as imagens do `backend` e do `frontend` MUST ter a tag da versão do código (`valora-backend:<commit>`);
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

#### Scenario: Backend sem superusuário
- **WHEN** o backend tenta rodar `COPY … TO PROGRAM` ou `CREATE DATABASE`
- **THEN** o PostgreSQL recusa por falta de permissão

#### Scenario: Migration com o papel do app
- **WHEN** o backend sobe com uma migration nova
- **THEN** a migration roda com `valora_app` e as tabelas novas ficam com ele como dono

### Requirement: Atualização do app
A atualização MUST ser feita no servidor pelo `infra/scripts/deploy.sh`, que:
1. recusa rodar se o clone tiver alterações locais;
2. faz o backup com origem `predeploy`, se o banco já estiver no ar, e aborta se o backup falhar;
3. troca para a versão pedida (a `main` por padrão);
4. baixa a imagem do PostgreSQL do Compose e, se as imagens daquela versão do código ainda não existirem, constrói as do backend e do frontend baixando as imagens base de novo;
5. sobe com `docker compose up -d --wait`;
6. falha, sem voltar o código sozinho, se algum container não ficar saudável;
7. guarda as imagens das 3 versões mais recentes e apaga só imagens e cache de build do projeto `valora`, nunca de outros apps do servidor.

As migrations MUST rodar sozinhas no início do backend.

#### Scenario: Versão nova com migration
- **WHEN** você roda o `deploy.sh` numa versão com migration nova
- **THEN** o app volta com o banco migrado e os dados preservados, e existe um arquivo `valora-predeploy-…` feito antes da atualização

#### Scenario: Versão que não sobe
- **WHEN** o `deploy.sh` publica uma versão cujo container não fica saudável
- **THEN** o script termina com erro, mostra o log do backend e avisa que voltar o código não desfaz migrations

#### Scenario: Voltar para uma versão guardada
- **WHEN** você roda `deploy.sh <commit>` de uma das 3 versões anteriores
- **THEN** o app volta sem construir as imagens de novo

#### Scenario: Outros apps do servidor
- **WHEN** o deploy termina e limpa as imagens
- **THEN** as imagens e o cache de build de outros projetos do servidor continuam lá
