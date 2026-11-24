## Context

O Valora roda num servidor Linux em casa (usuário `luccas-philot`, clone em `~/Valora`, backups em `/mnt/hdd/valora`). Hoje:

- `infra/scripts/backup.sh` grava `valora-AAAA-MM-DD.dump` (via arquivo `.tmp` + `mv`) e apaga o que tem mais de 30 dias pelo `mtime`. O cron roda aos domingos às 03:00 e **funciona** (conferido em 18/11/2026: dumps de 08/11 e 15/11).
- `deploy.sh` chama o mesmo `backup.sh` antes de trocar de versão. Como o nome só tem a data, um segundo backup no mesmo dia sobrescreve o primeiro (I1).
- `restore-check.sh` escolhe o "último" por `sort` do nome e compara `transactions`, `accounts` e `categories`. Roda só quando alguém lembra (I5).
- Nada avisa quando algo falha (I4). Os containers não têm rotação de log e o backend registra cada healthcheck (I8).
- A sincronização diária roda dentro do backend pelo `croner` (`sync.schedule.ts` → `SyncService.runScheduled()`). O `finished` de `start()` resolve `void` e o resultado só fica em `sync_runs`.

Decisões já tomadas pelo usuário: backup **continua semanal** (domingo 03:00) + antes de cada deploy; **sem cópia fora de casa** por enquanto; avisos pelo **healthchecks.io**, só com sinal de ok ou falha.

## Goals / Non-Goals

**Goals:**
- Nenhum backup é sobrescrito; o mais recente é achado com qualquer origem e com os arquivos antigos.
- Retenção que cobre um erro notado meses depois, com espaço previsível.
- A restauração é conferida toda semana sozinha, incluindo as fotos diárias.
- Falha do backup, da sincronização agendada ou disco quase cheio chegam ao usuário fora do app, sem nenhum dado financeiro sair do servidor.
- Logs com tamanho limitado.
- Scripts e backend com testes automatizados.

**Non-Goals:**
- Backup diário, cópia off-site (`rclone`/`restic`), criptografia dos dumps em repouso.
- Push no celular, `ntfy` próprio, monitorar container `unhealthy` ou servidor desligado além do que a falta de sinal já mostra.
- Os outros itens de infra (I6, I7, I9 a I15).

## Decisions

### 1. Nome: `valora-<origem>-AAAA-MM-DD_HHMMSS.dump`, origem por argumento

`backup.sh [weekly|predeploy|manual]`, com `manual` como padrão. O `deploy.sh` passa `predeploy`; o cron chama o `weekly-backup.sh` (decisão 4), que passa `weekly`. Data e hora vêm do `date` do servidor (fuso local).

Para nunca sobrescrever:
1. o arquivo temporário também leva o nome completo (`<nome>.tmp`), então dois backups simultâneos não dividem o mesmo `.tmp`;
2. antes de mover, `[[ -e "$BACKUP_FILE" ]]` faz o script falhar;
3. o `mv -n` fecha a corrida entre a checagem e o `mv`; depois dele, se o `.tmp` ainda existir, o `mv` não moveu e o script falha.

O `mv -n` sozinho não basta: em versões do coreutils ele não move e devolve `0`, em silêncio.

**Por que argumento e não variável de ambiente:** a origem aparece na linha do cron e no `deploy.sh`, e um valor inválido é recusado com a lista das origens válidas.

**Por que `manual` como padrão e não erro sem argumento:** uma linha antiga do crontab (`backup.sh` sem argumento) continua gerando backup. O preço é que, até o crontab ser trocado, o semanal sai como `manual` e fica só 30 dias (a tarefa de servidor troca a linha).

**Alternativa descartada:** origem por variável `BACKUP_ORIGIN`. Fica escondida da linha de comando e cai em `manual` sem ninguém ver.

### 2. A data e a hora do nome são a fonte da verdade, não o `mtime`

Uma função comum (`infra/scripts/lib/backup-files.sh`) reconhece os dois formatos e devolve origem e chave de ordenação:

| Nome | Origem | Chave |
|---|---|---|
| `valora-weekly-2026-11-22_030001.dump` | `weekly` | `2026-11-22_030001` |
| `valora-predeploy-2026-11-22_101500.dump` | `predeploy` | `2026-11-22_101500` |
| `valora-2026-11-15.dump` (antigo) | `weekly` | `2026-11-15_000000` |
| qualquer outro nome | ignorado | — |

O `restore-check.sh` usa a mesma função para achar o mais recente (maior chave) e o `backup.sh` para a retenção.

**Por quê:** o `sort` do nome quebra com prefixos diferentes (`valora-weekly-…` ficaria sempre depois de `valora-predeploy-…`). O `mtime` muda se os arquivos forem copiados para outro disco. A data no nome não muda, e os testes conseguem montar cenários só criando arquivos com nomes, sem mexer em datas do sistema de arquivos.

**Arquivo antigo conta como `weekly`:** não dá para saber se um `valora-AAAA-MM-DD.dump` veio do cron ou de um deploy, e tratar como semanal é o lado seguro (fica mais tempo).

**Nome desconhecido é ignorado:** um dump guardado à mão com outro nome (`valora-antes-da-migracao.dump`) nunca é apagado nem escolhido pelo restore-check.

### 3. Retenção em camadas, adequada a backup semanal

| Origem | Fica | Sempre fica |
|---|---|---|
| `weekly` (e antigos) | 56 dias (8 semanas); depois, o primeiro semanal de cada mês por 365 dias | os 3 mais recentes |
| `predeploy` | 30 dias | os 3 mais recentes |
| `manual` | 30 dias | os 3 mais recentes |

Constantes nomeadas no `backup.sh`: `WEEKLY_RETENTION_DAYS=56`, `MONTHLY_RETENTION_DAYS=365`, `SHORT_RETENTION_DAYS=30`, `ALWAYS_KEPT_PER_ORIGIN=3`. Idade = hoje − data do nome, em dias inteiros. O "primeiro semanal do mês" é o de menor chave entre os semanais daquele mês que existem na pasta; como ele nunca é apagado antes de 365 dias, a escolha não muda de uma semana para a outra.

A retenção continua rodando **só depois de um backup bem-sucedido**, como hoje.

**Espaço:** cerca de 8 semanais + até 12 mensais + os pré-deploy de 30 dias. Com dumps de poucos MB, cabe com folga no segundo disco; o aviso de disco (decisão 7) cobre o crescimento.

**Por que manuais como os pré-deploy:** são backups pontuais (antes de restaurar, antes de um teste), com a mesma vida curta. Uma cópia que deve durar é renomeada para fora do padrão, e a retenção não a toca.

**Alternativas descartadas:** manter 30 dias (cerca de 4 cópias, não cobre um erro notado depois de um mês); 12 semanais + 24 mensais (o dobro do espaço para um caso que o mensal de 12 meses já cobre).

### 4. `weekly-backup.sh`: backup, restore-check e aviso numa rotina só

```
weekly-backup.sh
  ├─ backup.sh weekly
  ├─ restore-check.sh          (só se o backup deu certo)
  └─ aviso HEALTHCHECK_BACKUP_URL/<código de saída>
```

O cron passa a chamar só ele:

```
0 3 * * 0 /home/luccas-philot/Valora/infra/scripts/weekly-backup.sh >> /var/log/valora-backup.log 2>&1
```

**Por que um script novo e não `backup.sh && restore-check.sh` no cron:** o aviso precisa do resultado dos dois juntos, e lógica no crontab não tem teste. **Por que não o `backup.sh` chamar o restore-check:** o `deploy.sh` também chama o `backup.sh`, e o restore-check somaria minutos a cada deploy; o `backup.sh` continua com uma responsabilidade só.

O restore-check roda às 03:00, quatro horas antes da sincronização das 07:00, então o banco em uso não mudou desde o dump e as quantidades devem bater.

`restore-check.sh` ganha `balance_snapshots`, `investment_snapshots` e `investments` em `CHECKED_TABLES` (as fotos diárias são justamente o histórico que não volta).

### 5. Aviso pelo healthchecks.io, só com o código de saída

Os scripts usam a URL de ping com o código de saída no fim (`<url>/0` = ok, `<url>/<n>` = falha), recurso do próprio healthchecks.io. Funções comuns em `infra/scripts/lib/healthcheck.sh`:

- `healthcheck_url <NOME>`: usa a variável de ambiente, se existir; senão lê **só aquela linha** do `infra/.env` (`sed -n "s/^NOME=//p"`). O `.env` nunca é carregado com `source`, para não executar nada nem trazer as credenciais para o ambiente do script. O caminho do `.env` pode ser trocado por `VALORA_ENV_FILE` (usado nos testes). Valor que não começa com `https://` é ignorado com uma linha no log.
- `ping_healthcheck <url> <código>`: URL vazia → loga "aviso desligado" e volta; senão `curl -fsS --max-time 10 --retry 2 -o /dev/null`. Falha do `curl` → linha de aviso no log e retorno `0`. Nunca imprime a URL.

O código de saída do script é sempre o do trabalho monitorado, nunca o do aviso.

**Por que healthchecks.io:** decisão do usuário. Funciona como dead-man's switch: o aviso chega também quando o sinal **não** chega (servidor desligado, cron quebrado, backend travado), o que um aviso enviado só na falha não cobre.

**O que sai do servidor:** uma requisição HTTPS para `hc-ping.com` com o UUID do check e um número. O healthchecks.io vê o IP de casa e o horário. Nenhum valor, nome de arquivo, contagem ou mensagem de erro. A URL é tratada como segredo (só no `infra/.env`, nunca no log), porque quem a tem consegue mandar sinais falsos.

### 6. Backend: o agendamento avisa, o `SyncService` só devolve o resultado

- **Config (`shared/config.ts`):** `HEALTHCHECK_SYNC_URL` opcional. Vazia (o `.env.example` traz a linha vazia, e o `env_file` do Compose a repassa como string vazia) ou ausente vira `null`; preenchida, `z.url()` com protocolo `https`. `Config.healthcheckSyncUrl: string | null`. Erro cita só o nome da variável, como as outras.
- **`SyncService`:** `execute` passa a resolver o status final (`'success' | 'partial' | 'failed'`; o caminho de erro inesperado devolve `'failed'`). `StartSyncResult.finished` vira `Promise<SyncRunStatus>` (quem só faz `await` não muda) e `runScheduled()` devolve `ScheduledSyncResult = SyncRunStatus | 'skipped'`.
- **`HealthcheckPinger`** (`modules/sync/healthcheck-pinger.ts`): recebe `{ url, fetch, logger, timeoutMs }` (`timeoutMs` padrão `PING_TIMEOUT_MS = 5_000`, trocado só nos testes). `report('success' | 'fail')`: sem URL, não faz nada; senão `GET url` ou `GET url/fail` com `AbortSignal.timeout(timeoutMs)`. **Nunca rejeita:** erro de rede, `TimeoutError` ou status não 2xx viram `logger.warn` com `{ errorType }` ou `{ statusCode }`, sem a URL. É o único ponto do backend que fala com o healthchecks.io, como o `PluggyClient` é com o Pluggy.
- **`startSyncSchedule`** ganha `heartbeat: Pick<HealthcheckPinger, 'report'>` e, no fim do disparo, chama `report` pelo mapeamento puro `heartbeatFor(result)`: `success` → `'success'`; `partial` e `failed` → `'fail'`; `skipped` → nada. Se `runScheduled()` rejeitar (a sincronização nem começou), avisa `'fail'` e repassa o erro para o `catch` do `croner`, que já loga o tipo.
- **`server.ts`** cria o pinger com `globalThis.fetch` e a URL da config.

**Por que no agendamento e não no `SyncService`:** o aviso é sobre a rotina diária, não sobre a regra de sincronizar; o botão "Sincronizar agora" usa o mesmo service e não deve avisar. O `SyncService` continua sem saber que monitoramento existe.

**Por que `partial` é falha:** um banco com consentimento vencido também deixa de trazer transações e de gravar a foto diária, e esse é um dos casos que o aviso existe para pegar. O healthchecks.io só manda e-mail quando o estado muda, então um banco quebrado por dias gera um aviso, não um por dia.

**Alternativa descartada:** o backend avisar a cada sincronização, inclusive a do botão. O check do healthchecks.io é por agenda (cron `0 7 * * *`); pings fora de hora confundem o "atrasado".

### 7. Aviso de disco: entra, num script pequeno

`infra/scripts/disk-check.sh`, todo dia às 06:00 pelo cron, confere `/` e o `BACKUP_DIR` com `df -P` e avisa `HEALTHCHECK_DISK_URL` com `0` (as duas em até 85%) ou `1` (alguma acima de 85%). Constante `DISK_USAGE_LIMIT_PERCENT=85`. O log traz só caminho e percentual.

**Por que entra:** é o modo de falha que a própria revisão aponta (I8: "disco cheio derruba o Postgres"), a retenção nova guarda mais arquivos, e o custo é um script de ~30 linhas reaproveitando `lib/healthcheck.sh`, um check e uma linha de cron. Sem ele, o primeiro sinal de disco cheio seria o backup ou o banco caindo.

**Por que `/`:** é onde ficam o volume do PostgreSQL e os logs do Docker na instalação padrão (`/var/lib/docker`). Olhar `/var/lib/docker` direto falharia se o Docker estiver noutro caminho; `/` existe sempre.

### 8. Logs: rotação no Compose e health fora do log de requisições

- `infra/compose.yml` ganha uma âncora `x-logging: &default-logging` (`driver: json-file`, `max-size: 10m`, `max-file: "5"`) usada nos três serviços, para a configuração não se repetir três vezes.
- `shared/request-log.ts`: o hook `onResponse` não registra quando o caminho (sem query) é o do health **e** o status é 200. Um health com 503 continua no log, porque é exatamente o momento em que alguém vai procurar. O caminho vem de uma constante exportada pelo módulo de health (`HEALTH_PATH`), sem `shared/` depender de `app.ts`.

### 9. Testes dos scripts: bash puro, com comandos de mentira no `PATH`

`infra/scripts/tests/run-tests.sh` roda cada `test-*.sh` da pasta; um `assert.sh` pequeno (`assert_equals`, `assert_file_exists`, `assert_file_missing`, `assert_exit_code`, `assert_not_contains`) e cada teste numa subshell com pasta temporária própria (`mktemp -d`, apagada no fim). Os nomes seguem `should_…_when_…` e o corpo tem `# Arrange`, `# Act` e `# Assert`.

Os scripts de verdade rodam contra stubs em `infra/scripts/tests/stubs/`, colocados no começo do `PATH`:
- `docker`: `pg_dump` escreve um conteúdo fixo ou falha (`STUB_DUMP_FAILS=1`); `psql` responde as contagens (`STUB_LIVE_COUNT`, `STUB_RESTORED_COUNT`, por tabela quando preciso); `pg_restore` grava o que recebeu no stdin num arquivo, para o teste conferir qual backup foi restaurado.
- `curl`: grava os argumentos num arquivo, ou falha (`STUB_CURL_FAILS=1`).
- `df`: devolve os percentuais de `STUB_DISK_USAGE`.
- `date`: devolve `STUB_NOW` para `+%F_%H%M%S` e `STUB_TODAY` para `+%F`, e repassa o resto ao `date` real (as contas com `date -d` continuam de verdade). Assim os testes de "mesmo segundo" e de retenção são determinísticos sem mudar o código de produção.

**Dependência nova: nenhuma.** **Por que não `bats`:** exigiria instalar o `bats-core` no CI e na máquina de quem roda; o que os testes precisam (subshell, pasta temporária, comparar saída) cabe em ~40 linhas de bash. Se os testes crescerem muito, migrar para `bats` é direto.

**Onde rodam:** no Linux (CI e servidor). Os scripts usam GNU `date -d` e o `chmod 600` só é conferível num sistema de arquivos Linux; no Windows, pelo WSL. Um job novo `infra` no `.github/workflows/ci.yml` roda `bash infra/scripts/tests/run-tests.sh` no `ubuntu-latest`.

## Risks / Trade-offs

- **[Até 7 dias do que só existe no Valora podem se perder]** → Aceito pelo usuário (backup semanal). O deploy continua fazendo backup antes de cada atualização.
- **[Roubo, incêndio ou ransomware levam os dois discos]** → Aceito pelo usuário por enquanto; `docs/05` registra o risco e que a cópia off-site criptografada fica para depois.
- **[Dumps em texto claro no segundo disco]** → `chmod 600` e `umask 077`; a pasta com `700` (tarefa de servidor). Quem tem root no servidor continua lendo, o que já vale para o banco.
- **[O healthchecks.io é um terceiro]** → Recebe só UUID, número e o IP de casa; nenhum dado financeiro. Self-host (`healthchecks` em container) fica como opção futura.
- **[Crontab antigo depois do deploy]** → Sem argumento, o backup sai como `manual` (30 dias). A tarefa de servidor troca a linha; o aviso do backup semanal só fica verde com a linha nova, então o esquecimento aparece.
- **[`partial` deixa o check vermelho por dias]** → Um e-mail por mudança de estado; o app já mostra o banco com problema. Se incomodar, a regra muda num lugar só (`heartbeatFor`).
- **[Restore-check diverge se algo gravar entre 03:00 e o fim da conferência]** → A sincronização é às 07:00 e o usuário raramente lança algo às 03:00; uma divergência vira aviso de falha, e a mensagem do script já explica como conferir de novo.
- **[Dois backups no mesmo segundo]** → O segundo falha em vez de sobrescrever; é o comportamento pedido.
- **[Rollback desta change]** → O `restore-check` antigo ordena pelo nome e escolheria o arquivo errado entre os novos nomes, e o `backup.sh` antigo apagaria pelos 30 dias de `mtime`. Se precisar voltar, restaurar escolhendo o arquivo à mão (o procedimento da doc já pede isso).

## Migration Plan

1. Merge na `main` e `deploy.sh` no servidor. O backup deste primeiro deploy ainda roda o `backup.sh` antigo (o `deploy.sh` faz o backup antes de trocar de versão) e sai como `valora-AAAA-MM-DD.dump`, o que é esperado e continua válido.
2. Tarefa de servidor (seção 9 de `tasks.md`): criar os três checks, preencher o `infra/.env`, reiniciar o backend para ler a URL nova, trocar a linha do crontab e incluir a do disco, ajustar as permissões dos dumps existentes e rodar `weekly-backup.sh` e `disk-check.sh` uma vez, conferindo os sinais no painel.
3. Nada muda no banco: sem migration.

**Rollback:** `deploy.sh <commit anterior>` e voltar a linha antiga do crontab. Os arquivos com nome novo continuam restauráveis à mão.

## Open Questions

- **Seção de segurança do `docs/03`:** o pedido cita "a seção de segurança" do `docs/03-arquitetura.md`, mas ela não existe (a segurança está no `CLAUDE.md` e no `docs/05`). Decidi criar uma seção curta "Segurança" no `docs/03`, antes de "Decisões", com o que entra (só Tailscale) e o que sai (Pluggy e o sinal do healthchecks.io), além da linha nova na tabela "Decisões". Confirmar se prefere só a linha na tabela.
- **`partial` como falha no aviso da sincronização:** decidi que sim (decisão 6). A alternativa é avisar falha só com `failed`, deixando banco com problema só no app.
- **Retenção dos manuais igual à dos pré-deploy (30 dias, 3 mais recentes):** decidi assim para simplificar. Se quiser que backups manuais nunca sejam apagados, a regra muda numa constante.
- **Aviso de disco:** decidi incluir (decisão 7), com 85% em `/` e no `BACKUP_DIR`. Confirmar que o Docker do servidor usa o `/` (padrão) e não outro disco.
- **Job de CI para os testes de `infra/`:** decidi incluir um job novo no `ci.yml` (bash puro, sem dependência). Os testes não rodam no Git Bash do Windows de forma confiável (`chmod`, `date -d`); no Windows, pelo WSL.
- **Período e tolerância dos checks no healthchecks.io:** proposta na tarefa de servidor (backup: cron `0 3 * * 0`, tolerância de 2 h; sincronização: `0 7 * * *`, 1 h; disco: `0 6 * * *`, 1 h, todos no fuso `America/Sao_Paulo`). Ajustar se o backup demorar mais.
