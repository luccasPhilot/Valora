## Context

- **O incidente:** `import webpush from 'web-push'` compila (o `@types/web-push` 3.6 descreve a versão 3) e roda no `tsx` e no Vitest (o dev tolera), mas o Node 26 recusa o import no `dist/` porque o `web-push` 4 só exporta por nome. O CI passou, o `deploy.sh` trocou os containers, e o backend entrou em loop de reinício.
- **O CI hoje:** `ci.yml` roda typecheck, lint, format, testes e `npm run build` (só `tsc`). Nenhum job executa o `dist/` nem sobe o Compose.
- **O `deploy.sh` hoje:** confere o checkout, faz backup `predeploy`, troca de versão (`checkout_target`) e roda `compose up -d --build --wait --wait-timeout 180`. O `up --build` constrói e **já recria** os containers na mesma chamada; a única checagem é o healthcheck, depois da troca. Se falha, só avisa.
- **O backend no boot** (`server.ts`): `loadConfig` → `createDatabase` → migrations → `buildApp` → seed de categorias → `listen` → cron e `recoverMissedSync`. O `recoverMissedSync` chama o Pluggy se o horário do cron de hoje já passou.
- **A `harden-infra`** (aberta, não aplicada) mexe no mesmo `deploy.sh` (grupo A: `pull`, tag por versão, limpeza) e no mesmo `ci.yml` (grupo B: audit, `docker build`, actions por SHA).

## Goals / Non-Goals

**Goals:**
- Um build que o Node não consegue carregar **nunca chega** à `main` (CI) nem **derruba** o que está no ar (servidor).
- O mesmo vale para `.env` do servidor com variável faltando e para `nginx.conf` inválido.
- Custo baixo: o smoke test do servidor leva segundos.

**Non-Goals:**
- Rollback automático, tag por versão, zero downtime (veja "Fora do escopo" da proposta).
- Pegar falhas que só aparecem com banco e dados reais (migration contra o banco de produção, por exemplo). Isso é o healthcheck e o backup `predeploy`, como antes; o job de boot cobre migration no banco vazio.

## Decisions

### 1. `boot-check`: carregar tudo, sem subir nada

- `src/shared/boot-check.ts` exporta `runBootCheck({ distDirectory, env })`, que devolve a lista de problemas (`{ kind: 'module', file, reason }` ou `{ kind: 'config', variables }`) em vez de lançar. Percorre a pasta, faz `import()` dinâmico de cada `.js` (menos o `server.js` e o próprio `boot-check.js`) e chama `loadConfig(env)`; o `ConfigError` já cita só nomes de variáveis, nunca valores.
- `src/boot-check.ts` (vira `dist/boot-check.js`) é a entrada, de poucas linhas: chama a função com a pasta do próprio arquivo e o `process.env`, imprime os problemas e sai com 1, ou imprime "ok" e sai com 0. Do import que falhou, imprime o caminho do módulo e o `error.message` do Node (ex.: "does not provide an export named 'default'"), que é mensagem de resolução de módulo e não leva dado do app. A configuração é validada à parte e só cita nomes de variáveis.
- **Por que varrer a pasta e não listar imports à mão:** uma lista fica velha no primeiro módulo novo e o teste passa em falso. A varredura é a mesma que, numa checagem manual, achou os 3 arquivos quebrados do incidente entre 178.
- **Alternativas descartadas:** `node --check` ou `tsc` (não resolvem módulos, não pegariam o erro); importar só o `app.js` (pega o `web-push`, mas deixa passar módulo que só o `server.js` importa, como o `sync.schedule.js`).
- Sem efeito colateral: nenhum módulo conecta no banco ou abre porta ao ser importado (os 178 carregaram sem isso). Se um módulo futuro violar, o `boot-check` trava ou falha e o job de boot do CI (decisão 3) acusa.

### 2. Smoke test no `deploy.sh`: construir, testar, só então trocar

Ordem nova: backup → `checkout_target` → **`compose build`** → **`smoke_test_images`** → `compose up -d --wait` (sem `--build`, já construído) → limpeza.

- `compose build` deixa os containers em execução intactos (só gera a imagem).
- `smoke_test_images` roda, com `--rm` e `--no-deps` (sem o banco, sem porta publicada):
  - `compose run --rm --no-deps backend node dist/boot-check.js`, que usa o `env_file` e o `DATABASE_URL` do compose, então valida o `infra/.env` real do servidor;
  - `compose run --rm --no-deps frontend nginx -t`. O `nginx.conf` usa o nome do backend numa variável (`set $backend_url`), então o `-t` não tenta resolver o host `backend` e funciona sem o backend no ar.
- Falha → `fail` com a saída do teste e a frase "os containers antigos continuam no ar". O clone fica no commit novo (o `checkout_target` já rodou); a mensagem diz isso e como voltar (`deploy.sh <ref anterior>`).
- Funciona na primeira subida (não precisa de banco nem de containers).
- **Alternativas descartadas:** `docker run` direto na imagem (repetiria o nome da imagem e o `.env` na mão; o `compose run` herda tudo); manter o `up --build --wait` e confiar no healthcheck (é o que falhou).
- **Interação com a `harden-infra`:** o grupo A troca `up --build` por tags por versão e pula o build quando a imagem existe. O smoke test se encaixa depois do build e antes do `up`, nos dois formatos. Se a `harden-infra` for aplicada antes, a tarefa 2.2 daqui só reposiciona a chamada.

### 3. Job `docker-boot` no CI

- Um job novo em `ci.yml`, em `ubuntu-latest` (runner da GitHub), em paralelo aos demais.
- Passos: criar `infra/.env` com `POSTGRES_PASSWORD` (aleatória, gerada no passo), `PLUGGY_CLIENT_ID=ci`, `PLUGGY_CLIENT_SECRET=ci`, `PLUGGY_ITEM_IDS=ci-item` e um `SYNC_CRON` que não cai em dia nenhum (ex.: `0 0 30 2 *`, 30 de fevereiro; se o `croner` recusar, 29 de fevereiro, que só cai de 4 em 4 anos e, naquele dia, só gera uma tentativa que falha por credencial falsa, sem derrubar nada); `docker compose -f infra/compose.yml up -d --build --wait --wait-timeout 180`; `curl -fsS http://127.0.0.1:3000/api/v1/health`; no fim (`if: always()`), `compose logs` se falhou e `compose down -v`.
- Sem push, sem registro, sem segredo do repositório: os valores são fictícios e vivem só no runner.
- **Por que o job inteiro e não só `docker build`:** o build passaria no incidente; o que acusa é executar. Também pega migration quebrada em banco vazio, nginx que não sobe e dependência entre serviços.
- Custo: alguns minutos de runner por push. Cache de camadas do GitHub Actions fica fora, para manter simples; se ficar lento, vira melhoria à parte.

### 4. Teste do `boot-check`

- Unitário (`backend/test/shared/boot-check.test.ts`), com pastas temporárias: `should_report_module_when_import_throws`, `should_report_config_variables_when_env_is_invalid`, `should_return_no_problems_when_everything_loads`, `should_skip_server_entry_when_scanning` (para o teste não subir a API).
- O teste de verdade do `dist/` é o job do CI (decisão 3) e o smoke test do servidor (decisão 2).

## Risks / Trade-offs

- **O build dobra no servidor?** → Não: `compose build` constrói uma vez e o `up` (sem `--build`) só recria; o cache de camadas segue valendo.
- **`compose run` cria um container de verdade.** → Com `--rm` some ao terminar, e `--no-deps` evita subir o banco. Se o deploy for interrompido no meio, sobra um container parado, que a limpeza de imagens e containers não cobre; o próximo `docker compose run --rm` não depende dele.
- **O smoke test não pega erro de runtime** (migration contra dados reais, falha de conexão). → O backup `predeploy` e o healthcheck seguem como rede de segurança; o job de boot pega migration no banco vazio.
- **Um módulo que ganhe efeito colateral ao ser importado** (conecta, escuta) faria o `boot-check` travar. → O job de boot no CI acusa.
- **Conflito com a `harden-infra` em `deploy.sh` e `ci.yml`.** → Mudanças pequenas e em pontos diferentes (uma chamada nova no deploy, um job novo no workflow); aplicar esta primeiro e a `harden-infra` depois (o B.2 dela, `docker build` solto, fica redundante).
- **CI mais lento:** alguns minutos no job novo, em paralelo aos outros.

## Migration Plan

1. Aplicar esta change na `develop`; o job `docker-boot` roda no PR dela.
2. No servidor, nada a configurar. O `deploy.sh` novo só vale a partir do deploy seguinte ao `git pull` que o traz: o script que está rodando é o do clone atual, e o `checkout_target` troca os arquivos depois que ele começou. Na primeira vez, rode `git pull` na `main` antes do `deploy.sh`.
3. Para voltar: reverter o commit da change; o fluxo antigo (`up --build --wait`) volta como estava.

## Open Questions

- O `croner` aceita `0 0 30 2 *` (30 de fevereiro)? (validar na tarefa 3.2; senão, 29 de fevereiro)
- O `nginx -t` funciona na imagem `nginx-unprivileged` sem permissão de escrita em `/var/run`? (validar na tarefa 2.3; se não, apontar um `-g 'pid /tmp/nginx.pid;'`)
