## Why

O backup é a única cópia do que o Open Finance não devolve mais (o que passou de 12 meses) e do que só existe no Valora (lançamentos manuais, categorias escolhidas, regras, orçamentos, metas). A revisão de 18/11/2026 ([docs/08](../../../docs/08-revisao-e-proximas-fases.md#infra-backup-e-segurança)) achou quatro jeitos de perder esse backup em silêncio:

- **I1:** o arquivo se chama `valora-AAAA-MM-DD.dump` e o `mv` sobrescreve. Um deploy seguido de um rollback no mesmo dia grava o banco ruim **por cima** do backup bom, e "restaure o mais recente" restaura o ruim.
- **I3:** retenção de 30 dias, ou seja, cerca de 4 cópias semanais: um erro notado depois de um mês não tem volta. Os dumps ficam legíveis por qualquer usuário do servidor.
- **I4:** ninguém fica sabendo quando o backup ou a sincronização diária falham, nem quando o disco está enchendo.
- **I5:** a restauração não é conferida sozinha, o `restore-check` compara só 3 tabelas (sem as fotos diárias, que não voltam) e o procedimento de restauração da doc roda com o backend no ar.
- **I8:** os logs dos containers não têm rotação e o backend registra o healthcheck a cada 10 s (~8.640 linhas por dia). Disco cheio derruba o PostgreSQL.

É o item 1 da [ordem sugerida](../../../docs/08-revisao-e-proximas-fases.md#parte-3--ordem-sugerida) ("Agora").

## What Changes

- **Nome do backup com origem e hora, sem sobrescrever (I1):** `valora-weekly-AAAA-MM-DD_HHMMSS.dump`, `valora-predeploy-…` e `valora-manual-…`. O `backup.sh` recebe a origem como argumento (sem argumento, `manual`) e falha se o arquivo já existir, sem tocar nele. O `deploy.sh` passa `predeploy`. Os arquivos antigos `valora-AAAA-MM-DD.dump` continuam valendo para restaurar e entram na retenção.
- **Retenção em camadas e permissões (I3):** semanais das últimas 8 semanas + o primeiro semanal de cada mês por 12 meses; pré-deploy e manuais por 30 dias, sempre mantendo os 3 mais recentes de cada origem. Dumps com `chmod 600` (`umask 077` no script).
- **Rotina semanal conferida (I5):** um script `weekly-backup.sh`, chamado pelo cron no lugar do `backup.sh`, faz o backup semanal e roda o `restore-check.sh` logo depois. O `restore-check` passa a comparar também `balance_snapshots`, `investment_snapshots` e `investments`, e acha o backup mais recente pela data e hora do nome, com qualquer origem.
- **Procedimento de restauração seguro (I5):** a doc passa a mandar fazer um backup manual, parar o backend, restaurar e iniciar o backend de novo.
- **Avisos de falha pelo healthchecks.io (I4):** sinal de ok ou falha, sem nenhum valor ou dado financeiro, para três checks: o backup semanal (com o restore-check), a sincronização diária agendada do backend e o disco (aviso acima de 85%). As URLs vêm de variáveis opcionais no `infra/.env` (`HEALTHCHECK_BACKUP_URL`, `HEALTHCHECK_SYNC_URL`, `HEALTHCHECK_DISK_URL`); sem a variável, nada é enviado e nada quebra. Falha ao avisar nunca derruba o backup nem a sincronização.
- **Logs (I8):** rotação nos três serviços do Compose (`json-file`, `max-size: 10m`, `max-file: 5`) e o backend deixa de registrar `GET /api/v1/health` com sucesso.
- **Documentação:** `docs/05-deploy.md` (backup, retenção, restauração, avisos, cron, variáveis), `docs/03-arquitetura.md` (decisão nova e seção de segurança), `infra/README.md`, `infra/.env.example`, `CLAUDE.md` (comandos) e `docs/08` (I1, I3, I4, I5 e I8 resolvidos).

### Contraria documentos

Esta change **contraria** estes trechos, que serão atualizados na mesma change (decisões do usuário, já tomadas):

- `docs/05-deploy.md` e `CLAUDE.md`: "Retenção: 30 dias" vira a retenção em camadas.
- `docs/05-deploy.md`: a "Cópia fora de casa (recomendado)" continua **não implementada**; a doc passa a dizer que fica para depois e qual risco isso aceita (roubo, incêndio, ransomware).
- `docs/03-arquitetura.md`: o servidor passa a mandar um sinal para fora (healthchecks.io). Nada entra pela internet e nenhum dado financeiro sai, mas é uma decisão nova de arquitetura e de segurança.
- `docs/07-roadmap.md`: o item "Backup semanal (domingo) com retenção de 30 dias" passa a citar a retenção em camadas.
- Spec `home-server-deploy`: os requisitos de backup, restauração, atualização e Compose mudam (delta nesta change).

### Fora do escopo

- **Backup diário.** O backup continua semanal (domingo às 03:00) e antes de cada deploy, por decisão do usuário: até 7 dias do que só existe no Valora ficam expostos.
- **Cópia fora de casa criptografada** (`rclone crypt` ou `restic`). Fica para uma change futura.
- Os outros itens de infra da revisão (I6, I7, I9 a I15), que ficam para a change `harden-infra`.
- Avisos no celular pelo app (push), `ntfy` próprio e monitoramento de container `unhealthy` ou de servidor desligado além do que o dead-man's switch dos três checks já cobre.
- Nada de `docs/01-produto.md` muda: os avisos são do servidor para o usuário, sem tela nova, sem IA e sem movimentar dinheiro. Nenhum item de "Fora do escopo" do produto é afetado.

### Roadmap

Não há item próprio em `docs/07-roadmap.md`: a change endurece o item "Backup semanal (domingo) com retenção de 30 dias, e uma restauração testada" da Fase 1 ("Servidor de casa"). Ao arquivar, o texto do item é atualizado e entra, já marcado, o item "Avisos de falha do backup, da sincronização e do disco pelo healthchecks.io".

## Capabilities

### New Capabilities

- `failure-monitoring`: avisos de ok ou falha para o healthchecks.io (backup semanal com restore-check, sincronização agendada e disco), opcionais, sem dados financeiros e sem nunca derrubar o que está sendo monitorado.

### Modified Capabilities

- `home-server-deploy`: backup com origem e hora no nome e sem sobrescrever, retenção em camadas, permissões `600`, rotina semanal que roda o restore-check, restore-check com mais tabelas, restauração com o backend parado, backup `predeploy` no deploy e rotação de logs no Compose.
- `api-foundation`: o log de requisições deixa de registrar o healthcheck que respondeu com sucesso (o de erro continua no log).

A variável `HEALTHCHECK_SYNC_URL` e a validação dela ficam na capability nova `failure-monitoring`, junto com o aviso que ela liga.

## Impact

- **Infra:** `infra/scripts/backup.sh`, `restore-check.sh` e `deploy.sh` mudam; novos `infra/scripts/weekly-backup.sh`, `disk-check.sh` e `lib/healthcheck.sh`; testes em `infra/scripts/tests/`; `infra/compose.yml` (rotação de logs); `infra/.env.example`.
- **Backend:** `shared/config.ts` (variável opcional `HEALTHCHECK_SYNC_URL`), `shared/request-log.ts` (sem o health com sucesso), `modules/sync/sync.schedule.ts` e `sync.service.ts` (o disparo agendado devolve o resultado e o agendamento avisa), novo cliente do aviso em `modules/sync/`.
- **CI:** um job que roda os testes dos scripts de `infra/` no runner Linux da GitHub.
- **Servidor:** criar os checks no healthchecks.io, preencher o `infra/.env`, trocar a linha do crontab e incluir a do disco.
- **API e frontend:** nenhuma mudança de contrato; o frontend não muda.
- **Dependências:** nenhuma nova. Os testes dos scripts são em bash puro, e o servidor usa o `curl` que já vem no Ubuntu.
