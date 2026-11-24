# failure-monitoring Specification

## Purpose
Avisos de falha do servidor para o healthchecks.io: o backup semanal (com a conferência da restauração), a sincronização agendada e o uso do disco, cada um opcional e só com o sinal de ok ou falha, sem nenhum dado do banco e sem nunca derrubar o que monitora.
## Requirements
### Requirement: Avisos opcionais e sem dados
O servidor MUST avisar o healthchecks.io do resultado do backup semanal, da sincronização agendada e da conferência do disco, cada um pela própria URL de ping: `HEALTHCHECK_BACKUP_URL`, `HEALTHCHECK_SYNC_URL` e `HEALTHCHECK_DISK_URL`, lidas do `infra/.env`. Cada variável MUST ser opcional: sem ela (ausente ou vazia), nada MUST ser enviado e o resto MUST funcionar igual.

O aviso MUST levar só o sinal de ok ou de falha. Ele MUST NOT levar valores, descrições, contagens de linhas, nomes de arquivo, mensagens de erro nem qualquer outro dado do banco. A URL de ping MUST NOT aparecer em log nenhum, porque quem a tem consegue mandar sinais em nome do servidor.

#### Scenario: Sem URL configurada
- **WHEN** o backup semanal termina e `HEALTHCHECK_BACKUP_URL` está vazia
- **THEN** nenhuma requisição sai do servidor e o backup termina com o mesmo resultado que teria com a URL

#### Scenario: Conteúdo do aviso
- **WHEN** o backup semanal avisa o healthchecks.io
- **THEN** a requisição é só para a URL de ping com o código de saída, sem corpo, e o log diz que o aviso foi enviado sem mostrar a URL

### Requirement: Falha ao avisar não derruba nada
Uma falha ao avisar (sem rede, healthchecks.io fora do ar, resposta de erro ou tempo esgotado) MUST NOT mudar o resultado do que está sendo monitorado. Ela MUST virar só uma linha de aviso no log, com o tipo do erro ou o status HTTP. A chamada MUST ter tempo máximo curto: 10 segundos nos scripts e 5 segundos no backend.

#### Scenario: healthchecks.io fora do ar durante o backup
- **WHEN** o backup semanal dá certo e o aviso falha
- **THEN** o script termina com sucesso, o backup fica gravado e o log tem uma linha de aviso sem a URL

#### Scenario: Aviso da sincronização demora demais
- **WHEN** o healthchecks.io não responde em 5 segundos depois da sincronização agendada
- **THEN** a chamada é cancelada, o log registra o tipo do erro e o resultado da sincronização em `sync_runs` não muda

### Requirement: Aviso do backup semanal
O cron do servidor MUST rodar o `infra/scripts/weekly-backup.sh` todo domingo às 03:00. Ele MUST fazer o backup com origem `weekly`, rodar o `restore-check.sh` em seguida (só se o backup deu certo) e avisar o `HEALTHCHECK_BACKUP_URL` com o código de saída: `0` quando os dois deram certo, e o código da falha caso contrário. O script MUST terminar com o mesmo código que avisou.

#### Scenario: Semana normal
- **WHEN** o backup e o restore-check dão certo
- **THEN** o healthchecks.io recebe o sinal de sucesso

#### Scenario: Backup falha
- **WHEN** o `pg_dump` falha
- **THEN** o restore-check não roda, o healthchecks.io recebe o sinal de falha e o script termina com erro

#### Scenario: Restauração não confere
- **WHEN** o backup dá certo, mas o restore-check acha quantidades divergentes
- **THEN** o healthchecks.io recebe o sinal de falha e o script termina com erro

#### Scenario: Servidor desligado no domingo
- **WHEN** o servidor está desligado às 03:00 de domingo e nenhum sinal chega
- **THEN** o healthchecks.io avisa o usuário pela falta do sinal, depois do período de tolerância configurado no check

### Requirement: Aviso da sincronização agendada
A API MUST aceitar a variável opcional `HEALTHCHECK_SYNC_URL`, validada com Zod ao iniciar: vazia ou ausente desliga o aviso; preenchida, MUST ser uma URL `https`, ou a API MUST recusar iniciar com uma mensagem que cita o nome da variável, sem mostrar o valor.

Ao fim de cada sincronização disparada pelo agendamento (`trigger = 'schedule'`), a API MUST avisar o healthchecks.io: sinal de sucesso quando a execução termina `success`, e sinal de falha (`/fail`) quando termina `partial` ou `failed`, ou quando a sincronização nem consegue começar. Quando o disparo é pulado porque outra sincronização já está rodando, nenhum sinal MUST ser enviado. A sincronização pelo botão MUST NOT avisar.

#### Scenario: Sincronização diária com sucesso
- **WHEN** a sincronização das 07:00 termina com `status = 'success'`
- **THEN** a API chama a URL de ping uma vez, sem corpo

#### Scenario: Um banco falhou
- **WHEN** a sincronização agendada termina com `status = 'partial'`
- **THEN** a API chama a URL de ping com `/fail` no fim

#### Scenario: Sincronização não começa
- **WHEN** o disparo agendado falha antes de criar a execução (por exemplo, o banco de dados está fora do ar)
- **THEN** a API chama a URL de ping com `/fail` e o log registra só o tipo do erro

#### Scenario: Disparo pulado
- **WHEN** o horário agendado chega enquanto uma sincronização pelo botão está rodando
- **THEN** nenhum sinal é enviado

#### Scenario: Sincronização pelo botão
- **WHEN** o usuário toca em "Sincronizar agora" e a execução termina
- **THEN** nenhum sinal é enviado

#### Scenario: URL inválida
- **WHEN** a API inicia com `HEALTHCHECK_SYNC_URL=http://exemplo`
- **THEN** o processo termina com falha e a mensagem cita `HEALTHCHECK_SYNC_URL`, sem mostrar o valor

### Requirement: Aviso de disco
O cron do servidor MUST rodar o `infra/scripts/disk-check.sh` uma vez por dia. Ele MUST conferir o uso da partição raiz (`/`, onde ficam o Docker e os logs) e da partição do `BACKUP_DIR`, e avisar o `HEALTHCHECK_DISK_URL`: sinal de sucesso quando as duas estão em 85% ou menos, e sinal de falha quando alguma passa de 85%. O log MUST trazer só o caminho e o percentual.

#### Scenario: Disco com folga
- **WHEN** `/` está em 60% e o disco do backup em 40%
- **THEN** o healthchecks.io recebe o sinal de sucesso

#### Scenario: Limite exato
- **WHEN** `/` está em 85%
- **THEN** o healthchecks.io recebe o sinal de sucesso

#### Scenario: Disco quase cheio
- **WHEN** o disco do backup está em 86%
- **THEN** o healthchecks.io recebe o sinal de falha, o script termina com erro e o log diz qual caminho passou do limite

