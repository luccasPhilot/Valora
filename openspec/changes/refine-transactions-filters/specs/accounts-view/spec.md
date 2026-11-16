## MODIFIED Requirements

### Requirement: Status da sincronização no topo
O topo de todas as telas MUST mostrar quando foi a última sincronização ("Atualizado hoje, 07:02", "Atualizado ontem, 07:01" ou a data). Tocar no status MUST disparar `POST /api/v1/sync-runs` e mostrar "Sincronizando…" até a execução terminar. Ao terminar, um aviso MUST informar quantas transações novas chegaram ou que houve erro, e os dados das telas MUST ser recarregados. Se a API responder `SYNC_IN_PROGRESS`, o status MUST passar a "Sincronizando…" e acompanhar a execução em andamento. A área de toque do status MUST ter pelo menos 44 px de altura em qualquer largura.

#### Scenario: Sincronizar agora
- **WHEN** você toca no status e a sincronização traz 12 transações novas
- **THEN** o status mostra "Sincronizando…", depois "Atualizado hoje" com a hora, e um aviso diz "Sincronização concluída: 12 transações novas"

#### Scenario: Já sincronizando
- **WHEN** você toca no status durante a sincronização agendada
- **THEN** o status mostra "Sincronizando…" e acompanha a execução em andamento, sem erro

#### Scenario: Nunca sincronizou
- **WHEN** ainda não houve nenhuma sincronização
- **THEN** o status mostra "Nunca sincronizado" e tocar nele sincroniza

#### Scenario: Área de toque no celular
- **WHEN** a tela é aberta com 320 ou 390 px de largura
- **THEN** a área de toque do status tem pelo menos 44 px de altura
