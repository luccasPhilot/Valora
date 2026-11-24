# Deploy no servidor de casa

O alvo é um **PC ou notebook com Linux** (Ubuntu Server, Debian ou parecido), ligado 24 horas. Os arquivos de produção (`infra/compose.yml`, os `Dockerfile`, o `.env.example` e os scripts) já estão no repositório; subir e configurar o servidor é o passo a passo abaixo. Veja o [roadmap](07-roadmap.md).

Tudo o que é de deploy fica na pasta [`infra/`](../infra/README.md), separado do código. Cada parte tem o próprio `Dockerfile`: `backend/Dockerfile` e `frontend/Dockerfile`.

## Requisitos

- Linux de 64 bits, 2 GB de RAM ou mais.
- Docker Engine com o plugin Compose ([instruções oficiais](https://docs.docker.com/engine/install/)).
- Conta na [Tailscale](https://tailscale.com), com o app instalado no servidor, no celular e no notebook.
- **Um segundo disco** (ou um destino externo) para o backup. Backup no mesmo disco não protege de disco queimado.

## Primeira subida

No servidor, com Docker, Tailscale e o segundo disco já instalados:

```bash
git clone https://github.com/luccasPhilot/Valora.git ~/Valora
cd ~/Valora
cp infra/.env.example infra/.env      # preencha: senha do banco, credenciais e ids do Pluggy
docker compose -f infra/compose.yml up -d --build
sudo tailscale serve --bg 3000
```

Depois da primeira vez, só o [`deploy.sh`](#atualizar-o-app). Confira: `docker compose -f infra/compose.yml ps` deve mostrar os três serviços `healthy`, e `curl http://127.0.0.1:3000/api/v1/health` deve responder `{"status":"ok","database":"ok"}`.

## Containers

São três, definidos em `infra/compose.yml`:

| Serviço | O que é | Rede |
|---|---|---|
| `frontend` | nginx com o front compilado; repassa `/api` para o backend | porta 3000 só em `127.0.0.1`, a única publicada |
| `backend` | Node + Fastify: API e sincronização agendada | só na rede interna do Compose |
| `db` | PostgreSQL (imagem oficial, versão fixada) com os dados num volume | só na rede interna do Compose |

A porta do front fica presa ao `127.0.0.1` de propósito: nem a rede de casa enxerga o Valora. O único caminho de entrada é a Tailscale. O backend e o banco não publicam porta nenhuma.

As migrations do banco rodam sozinhas quando o backend inicia.

## Desenvolvimento

O banco de desenvolvimento roda com o Compose de desenvolvimento; o backend e o frontend rodam direto na máquina, cada um na sua pasta:

```bash
docker compose -f infra/compose.dev.yml up -d
```

O front em desenvolvimento usa o proxy do Vite para chamar a API, sem nginx.

## Acesso pela Tailscale

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

1. No painel da Tailscale, ative **MagicDNS** e **HTTPS Certificates**.
2. No servidor, publique o app só para a sua rede Tailscale:

```bash
sudo tailscale serve --bg 3000
```

O app fica em `https://<nome-da-maquina>.<sua-tailnet>.ts.net`, com certificado válido. O HTTPS é obrigatório para instalar o PWA no celular.

**Servidor que já hospeda outros apps (como o CellCare):**

- A porta `127.0.0.1:3000` do Valora não conflita com as dos outros containers (CellCare em 3001 e 8080, Dozzle em 8888, Portainer em 9000). Antes de subir, confira com `docker ps` e `ss -tlnp`.
- O `tailscale serve --bg 3000` ocupa a porta HTTPS 443 do nome `.ts.net` da máquina. Se outro app já usa o 443, rode `tailscale serve status` antes e publique o Valora em outra porta HTTPS: `sudo tailscale serve --bg --https=8443 3000`, e o endereço vira `https://<nome-da-maquina>.<sua-tailnet>.ts.net:8443`. Não sobrescreva a configuração existente sem olhar o status.
- Acesse sempre pelo endereço `.ts.net` (HTTPS), não pelo IP `100.x.x.x`: o certificado vale só para o nome, e o PWA da v2 exige HTTPS. A porta do front está presa ao `127.0.0.1`, então pelo IP da Tailscale nada responde.

**Nunca use `tailscale funnel`**: ele publica o app na internet aberta. A v1 não tem tela de login justamente porque só os seus aparelhos chegam até ela.

## Instalar no celular

Abra o endereço `https://<nome-da-maquina>.<sua-tailnet>.ts.net` (HTTPS pela Tailscale) no navegador do celular:

- **iPhone (Safari):** Compartilhar → **Adicionar à Tela de Início**.
- **Android (Chrome):** menu ⋮ → **Instalar app**.

O app abre pelo ícone do Valora, em tela cheia, sem a barra do navegador.

**Quem já tem um atalho antigo no iPhone:** o iOS guarda o ícone e a tela de abertura do momento em que o atalho foi criado. Remova o atalho antigo e adicione de novo para pegar o ícone e a abertura do Valora.

**O que muda com o app instalado:**

- **Sem rede (ou com a Tailscale desligada) o app abre** e mostra os dados da última vez que você os viu, com o aviso "Sem conexão. Mostrando os dados de 05/11 às 08:12." Só valem as telas que você já abriu com rede.
- **Escrever exige rede.** Lançar, editar, excluir, salvar e sincronizar ficam desabilitados sem conexão e falham na hora, com "Sem conexão: esta ação precisa de internet". Nada fica numa fila para ser enviado depois.
- **Depois de cada atualização do servidor** ([Atualizar o app](#atualizar-o-app)), o app mostra "Nova versão disponível" com o botão **Atualizar**. A versão nova só entra, e a tela só recarrega, quando você toca nele.

**Cuidados:**

- As respostas da API ficam guardadas no armazenamento do navegador do aparelho, o mesmo que já recebe esses dados na tela. **Bloqueie o celular**: quem abrir o aparelho desbloqueado vê os dados.
- Limpar os dados do site no navegador apaga esse cache. O iOS também pode apagá-lo se o app ficar muito tempo sem uso; basta abrir com rede de novo.
- Um service worker travado numa versão velha se resolve apagando os dados do site (iPhone: Ajustes → Safari → Avançado → Dados de Sites) e abrindo de novo.

## Variáveis de ambiente

Em produção, ficam em `infra/.env` no servidor. O repositório só tem os exemplos, sem valores reais: `infra/.env.example` (produção) e `backend/.env.example` (desenvolvimento).

| Variável | Exemplo | Para quê |
|---|---|---|
| `POSTGRES_PASSWORD` | `openssl rand -hex 24` | Senha do banco (só letras e números, para não quebrar o endereço do banco) |
| `PLUGGY_CLIENT_ID` | (do dashboard do Pluggy) | Credencial da sua aplicação |
| `PLUGGY_CLIENT_SECRET` | (do dashboard do Pluggy) | Credencial da sua aplicação |
| `PLUGGY_ITEM_IDS` | (ids dos bancos no Meu Pluggy) | Bancos que a sincronização lê |
| `SYNC_CRON` | `0 7 * * *` | Horário da sincronização diária |
| `LOG_LEVEL` | `info` | Nível dos logs |
| `HEALTHCHECK_BACKUP_URL` | `https://hc-ping.com/<uuid>` | Opcional: aviso do backup semanal ([avisos de falha](#avisos-de-falha)) |
| `HEALTHCHECK_SYNC_URL` | `https://hc-ping.com/<uuid>` | Opcional: aviso da sincronização agendada |
| `HEALTHCHECK_DISK_URL` | `https://hc-ping.com/<uuid>` | Opcional: aviso de disco acima de 85% |

**Tirar um banco:** remover o banco do Meu Pluggy não tira o Valora do ar nem limpa as telas. Use **"Remover do Valora"** no app (aviso no topo ou tela Contas): o banco é arquivado e o histórico fica guardado. Depois, se quiser, tire o id do `PLUGGY_ITEM_IDS` do `infra/.env` e reinicie o backend; deixar o id lá não faz mal, porque a sincronização pula o banco arquivado.

O banco, a porta, o fuso (`America/Sao_Paulo`) e o endereço do banco (`DATABASE_URL`, montado com a `POSTGRES_PASSWORD`) são fixos no `infra/compose.yml`, não precisam estar no `.env`.

O backend valida as variáveis com Zod ao iniciar e para na hora, com mensagem clara, se faltar alguma.

## Backup

O Open Finance só devolve 12 meses. **O que for mais antigo só existe no seu banco de dados**, então o backup é parte do deploy, não um extra.

- **Quando:** todo domingo às 03:00, pelo cron do servidor, e antes de cada `deploy.sh`. O backup é **semanal por escolha**: um dado perdido entre dois backups é recuperável pela sincronização (Open Finance, 12 meses), e o que só existe no Valora (lançamentos manuais, categorias escolhidas, regras, orçamentos, metas, posições manuais e as fotos diárias) fica exposto por até uma semana.
- **Como:** `pg_dump` no formato custom, salvo no segundo disco, legível só pelo dono (`chmod 600`).
- **Nome:** `valora-<origem>-AAAA-MM-DD_HHMMSS.dump`, com a origem `weekly` (domingo), `predeploy` (antes de cada deploy) ou `manual`. O script **nunca sobrescreve** um arquivo: se o nome já existir, ele falha e não toca no arquivo. Os antigos `valora-AAAA-MM-DD.dump` continuam valendo e contam como semanais.
- **Retenção**, pela data do nome:

  | Origem | Fica | Sempre fica |
  |---|---|---|
  | `weekly` (e os antigos) | 8 semanas; depois, o primeiro semanal de cada mês por 12 meses | os 3 mais recentes |
  | `predeploy` e `manual` | 30 dias | os 3 mais recentes |

  Um arquivo com nome fora desse padrão (por exemplo, `valora-antes-da-migracao.dump`) nunca é apagado: é o jeito de guardar uma cópia para sempre.
- **Conferência:** toda semana, logo depois do backup, o `restore-check.sh` restaura o arquivo num banco temporário e compara as quantidades de `transactions`, `accounts`, `categories`, `balance_snapshots`, `investment_snapshots` e `investments`.
- **Cópia fora de casa: não implementada, por escolha.** Os backups ficam no segundo disco do mesmo servidor, então roubo, incêndio ou ransomware levam o banco e os backups juntos. É um risco aceito por enquanto; a cópia criptografada na nuvem (`rclone crypt` ou `restic`) fica para depois.

Os scripts ficam em `infra/scripts/`:

- `backup.sh [weekly|predeploy|manual]` (padrão `manual`): grava num arquivo temporário e só o renomeia se o `pg_dump` terminar bem; se falhar, sai com erro e **não apaga nenhum backup antigo**. Depois de um backup bem-sucedido, aplica a retenção. O destino é a variável `BACKUP_DIR` (padrão `/mnt/hdd/valora`); o usuário que roda o script precisa poder escrever lá.
- `weekly-backup.sh`: o que o cron chama no domingo. Faz o backup `weekly`, roda o `restore-check.sh` (só se o backup deu certo) e avisa o healthchecks.io do resultado.
- `disk-check.sh`: confere o uso de `/` e do `BACKUP_DIR` e avisa o healthchecks.io.

Instale no `crontab -e`. O cron não expande `~`: use o caminho completo da sua home.

```
0 3 * * 0 /home/luccas-philot/Valora/infra/scripts/weekly-backup.sh >> /var/log/valora-backup.log 2>&1
0 6 * * * /home/luccas-philot/Valora/infra/scripts/disk-check.sh >> /var/log/valora-backup.log 2>&1
```

O log só tem nomes e tamanhos de arquivo, contagens de linhas e percentuais de disco, nunca conteúdo do banco nem a URL dos avisos.

### Restaurar

1. Faça um backup do estado atual antes, para poder voltar atrás:

   ```bash
   ~/Valora/infra/scripts/backup.sh manual
   ```

2. Pare o backend, para a sincronização e o app não gravarem no meio da restauração:

   ```bash
   docker compose -f ~/Valora/infra/compose.yml stop backend
   ```

3. Restaure o arquivo escolhido:

   ```bash
   docker compose -f ~/Valora/infra/compose.yml exec -T db pg_restore -U valora -d valora --clean --if-exists < /mnt/hdd/valora/valora-<origem>-AAAA-MM-DD_HHMMSS.dump
   ```

4. Suba o backend de novo:

   ```bash
   docker compose -f ~/Valora/infra/compose.yml start backend
   ```

**Qual arquivo escolher:** num rollback depois de um deploy ruim, o `valora-predeploy-…` feito **antes** daquele deploy, não o mais recente (o mais recente pode ser o seu backup manual do passo 1, já com o problema). Em qualquer outro caso, o mais recente antes do problema.

**A conferência da restauração roda sozinha toda semana** (`weekly-backup.sh`). Para rodar à mão, logo depois de um backup (dados novos gravados depois dele fazem as quantidades divergirem):

```bash
~/Valora/infra/scripts/backup.sh manual && ~/Valora/infra/scripts/restore-check.sh
```

## Avisos de falha

O servidor avisa o [healthchecks.io](https://healthchecks.io) do resultado de três rotinas. O healthchecks.io manda um e-mail quando um sinal de falha chega **ou quando o sinal esperado não chega** (servidor desligado, cron quebrado, backend travado).

| Check | Quem avisa | Quando | Falha quando |
|---|---|---|---|
| Valora backup semanal | `weekly-backup.sh` | domingo, 03:00 | o backup ou o restore-check falha |
| Valora sincronização | o backend, no fim da sincronização agendada | todo dia, 07:00 | a sincronização termina `partial` (algum banco falhou) ou `failed`, ou nem consegue começar |
| Valora disco | `disk-check.sh` | todo dia, 06:00 | `/` ou o `BACKUP_DIR` passa de 85% |

- **O que é enviado:** só a URL de ping do check com o sinal de ok ou de falha. Nenhum valor, descrição, contagem, nome de arquivo ou mensagem de erro. O healthchecks.io vê o IP de casa e o horário.
- **Opcional:** cada aviso só liga com a sua variável (`HEALTHCHECK_BACKUP_URL`, `HEALTHCHECK_SYNC_URL`, `HEALTHCHECK_DISK_URL`) no `infra/.env`. Vazia, nada é enviado. Só `https`.
- **A URL é segredo:** quem a tem consegue mandar sinais falsos. Fica só no `infra/.env` e nunca aparece no log.
- **Nunca derruba nada:** um aviso que não sai (sem rede, healthchecks.io fora do ar, tempo esgotado de 10 s nos scripts e 5 s no backend) vira só uma linha no log.
- **O botão "Sincronizar agora" não avisa:** o check é por agenda, e um sinal fora de hora confundiria o "atrasado".

**Configurar:** crie os três checks no healthchecks.io no fuso `America/Sao_Paulo`, com o cron da tabela (tolerância de 2 h para o backup e 1 h para os outros), copie a URL de ping de cada um para o `infra/.env` e reinicie o backend (`docker compose -f ~/Valora/infra/compose.yml up -d backend`) para ele ler a URL nova.

**Quando chegar um aviso:**
- **Backup:** veja o fim do `/var/log/valora-backup.log`. Se o restore-check divergiu, rode `backup.sh manual && restore-check.sh` para conferir de novo.
- **Sincronização:** abra a tela Contas no app para ver qual banco falhou.
- **Disco:** veja o que cresceu (`du -sh /var/lib/docker /mnt/hdd/valora`) e libere espaço antes que o PostgreSQL pare.

## Atualizar o app

No servidor, um comando só:

```bash
~/Valora/infra/scripts/deploy.sh
```

O script (`infra/scripts/deploy.sh`) faz, nesta ordem:

1. confere que o clone não tem alterações locais;
2. faz o **backup** `predeploy` (se o banco já está no ar);
3. traz a `main` do GitHub (`git fetch` e troca de versão);
4. sobe com `docker compose up -d --build --wait`, um build por vez, esperando os healthchecks;
5. limpa imagens antigas.

As migrations rodam no início do backend. Se algum container não ficar saudável, o script falha e mostra o log do backend. Ele **não volta o código sozinho**, porque voltar o código não desfaz migrations já aplicadas.

**Voltar uma versão:** `deploy.sh <commit ou tag>`. Se a versão ruim mexeu no banco, restaure também o `valora-predeploy-…` feito antes do deploy ruim ([restaurar](#restaurar)). Depois de voltar por commit ou tag o servidor fica em HEAD solto; um `deploy.sh` sem argumento volta para a `main`.

## Branches e CI

- `develop`: trabalho do dia a dia. `main`: produção, só recebe merge vindo da `develop`.
- O CI (`.github/workflows/ci.yml`) roda em runner da GitHub em todo PR e em push na `develop` e na `main`: `typecheck`, `lint`, `format:check`, `test` e `build` no backend e no frontend, e os testes dos scripts de `infra/` (`bash infra/scripts/tests/run-tests.sh`).
- O deploy é **manual e fica de fora do GitHub**: você roda o `deploy.sh` no servidor depois que o CI da `main` ficar verde. Assim o GitHub não tem nenhum caminho para executar código no servidor.
- Recomendado: proteger a `main` (Settings → Branches) exigindo PR e o CI verde.

## Versões e releases

As versões seguem `vX.Y.Z` e cada uma vira um release no GitHub, com as notas montadas pelo workflow `.github/workflows/release.yml`. O texto vem da seção da versão no [CHANGELOG.md](../CHANGELOG.md) (escrita à mão, em português), seguida da lista automática de commits do intervalo (`.github/scripts/release-notes.sh`, que agrupa por tipo do Conventional Commits).

Para publicar uma versão:

1. Escreva a seção `## vX.Y.Z - AAAA-MM-DD` no topo do `CHANGELOG.md`, dentro da PR `develop` → `main`.
2. Faça o merge da PR com **"Create a merge commit"**. Squash junta tudo num commit só e a lista de commits do release perde o histórico.
3. Crie a tag no commit da `main`: `git tag vX.Y.Z && git push origin vX.Y.Z`. O push da tag dispara o workflow.
4. Para publicar uma versão em outro commit (por exemplo, uma antiga), use **Actions → Release → Run workflow**, informando a tag e o commit.

O workflow só publica o release; ele **não faz deploy**. A produção continua sendo atualizada pelo `deploy.sh`, que aceita a tag (`deploy.sh vX.Y.Z`).

## Saúde

- O Compose tem healthcheck nos três serviços: o front pelo nginx, `GET /api/v1/health` no backend, `pg_isready` no banco. O backend não registra o `GET /api/v1/health` que responde 200 (seriam ~8.640 linhas por dia); um health com 503 continua no log.
- Os logs dos containers giram: até 5 arquivos de 10 MB por serviço (`x-logging` no `infra/compose.yml`). Disco cheio derruba o PostgreSQL.
- Falhas do backup, da sincronização agendada e do disco chegam por e-mail ([avisos de falha](#avisos-de-falha)).
- A tela de Contas mostra a última sincronização de cada banco. A partir da v2, sincronização com falha vira alerta no app.
- Os logs nunca registram valores, descrições de transações nem credenciais.
