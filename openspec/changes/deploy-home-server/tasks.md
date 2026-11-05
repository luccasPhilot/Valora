## 1. Imagens

- [x] 1.1 `backend/Dockerfile` em etapas (`npm ci`, `npm run build`, imagem final com `dist/`, dependências de produção, usuário `node`, Node do `.nvmrc`) e `backend/.dockerignore`
- [x] 1.2 `frontend/nginx.conf`: `try_files $uri /index.html`, `location /api/` com `proxy_pass http://backend:3000`, cache longo só para arquivos com hash
- [x] 1.3 `frontend/Dockerfile` em etapas (`npm ci`, `npm run build`, imagem final `nginxinc/nginx-unprivileged` na porta 8080) e `frontend/.dockerignore`
- [x] 1.4 Conferir que nenhum dos dois processos roda como root

## 2. Compose

- [x] 2.1 `infra/compose.yml`:
  - `frontend` em `127.0.0.1:3000:8080`, o único com porta publicada;
  - `backend` e `db` só na rede interna;
  - volume nomeado do banco;
  - healthchecks, `unless-stopped`, `TZ=America/Sao_Paulo`;
  - `env_file: .env` no backend;
  - ordem de início: `db` saudável → `backend` → `frontend`
- [x] 2.2 `infra/.env.example` com todas as variáveis da produção (sem valores reais)
- [x] 2.3 Conferir localmente:
  - `docker compose -f infra/compose.yml up -d --build` sobe e os healthchecks ficam saudáveis;
  - o app abre em `http://127.0.0.1:3000`;
  - `/transactions` aberto direto carrega o app;
  - `/api/v1/health` responde pelo nginx;
  - `/api/v1/inexistente` devolve o 404 JSON do backend

## 3. Backup e restauração

- [x] 3.1 `infra/scripts/backup.sh`: `pg_dump -Fc` para arquivo temporário, renomeia só se der certo, retenção de 30 dias, log sem conteúdo do banco, falha sem apagar backups antigos
- [x] 3.2 `infra/scripts/restore-check.sh`: restaura o último backup num banco temporário, compara as quantidades de `transactions`, `accounts` e `categories` e apaga o banco temporário
- [x] 3.3 Testar os dois scripts localmente com o compose de produção

## 4. Servidor de casa (passos no servidor, junto com você)

- [x] 4.1 Instalar Docker Engine com o plugin Compose e montar o segundo disco
- [x] 4.2 Instalar a Tailscale no servidor e no celular; ativar MagicDNS e HTTPS Certificates
- [ ] 4.3 Clonar em `~/valora`, preencher o `infra/.env` e subir com `docker compose -f infra/compose.yml up -d --build`
- [ ] 4.4 `sudo tailscale serve --bg 3000`
- [ ] 4.5 Instalar o cron do backup às 03:00 (`~/valora/infra/scripts/backup.sh`, com o caminho completo)
- [ ] 4.6 Rodar `infra/scripts/restore-check.sh` com o primeiro backup e registrar o resultado
- [ ] 4.7 Testar o `infra/scripts/deploy.sh` no servidor: com o banco no ar ele faz o backup antes de subir, e com um commit ruim falha sem derrubar o que está rodando

## 5. Conferência

- [ ] 5.1 Celular na Tailscale abre o app em HTTPS com certificado válido
- [ ] 5.2 Aparelho da rede de casa não alcança `http://<ip>:3000`, o backend nem a porta 5432
- [ ] 5.3 Reiniciar o servidor: containers e `tailscale serve` voltam sozinhos
- [ ] 5.4 Conferir o critério de pronto da Fase 1 (`docs/07-roadmap.md`) com dados reais

## 6. Documentação

- [x] 6.1 Atualizar `docs/05-deploy.md` e `infra/README.md` com os comandos finais, o procedimento de atualização e o rollback
- [x] 6.2 Atualizar a seção "Comandos" do `CLAUDE.md` (subir e atualizar a produção, backup, conferência de restauração)
- [ ] 6.3 Marcar como `[x]` os itens de "Servidor de casa" da Fase 1 em `docs/07-roadmap.md`
