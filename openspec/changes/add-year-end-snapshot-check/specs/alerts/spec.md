## ADDED Requirements

### Requirement: Alerta da foto de 31/12 no próprio dia
Em 31/12 (fuso de São Paulo), ao fim de cada sincronização, o sistema MUST contar as contas de banco ativo (exceto a conta "Dinheiro", inclusive as ocultas dos totais) sem foto de saldo do dia e as posições de investimento de banco ativo ou manuais, com saldo diferente de zero, sem foto do dia. Se a contagem for maior que zero, MUST existir um único alerta ativo `year_end_snapshot_pending`, com a mensagem "Ainda falta a foto de 31/12 de {itens}. Sincronize hoje: ela é a base dos bens e direitos no IR." e destino na tela de Contas. Quando a contagem chegar a zero, ou o dia acabar, o alerta MUST ser resolvido. A mensagem MUST NOT conter valores, nomes de conta nem descrições.

#### Scenario: Um banco falhou na sincronização de 31/12
- **WHEN** a sincronização das 07:00 de 31/12 termina como `partial`, e o banco que falhou tem 2 contas e 1 investimento com saldo
- **THEN** nasce um alerta `year_end_snapshot_pending` com a mensagem "Ainda falta a foto de 31/12 de 2 contas e 1 investimento. Sincronize hoje: ela é a base dos bens e direitos no IR."

#### Scenario: A sincronização seguinte completa as fotos
- **WHEN** o usuário sincroniza de novo em 31/12 e todas as contas e posições ganham a foto do dia
- **THEN** o alerta é resolvido

#### Scenario: Posição resgatada
- **WHEN** a única posição sem foto do dia tem saldo zero
- **THEN** nenhum alerta é criado

#### Scenario: Conta "Dinheiro"
- **WHEN** só a conta "Dinheiro" não tem foto do dia
- **THEN** nenhum alerta é criado

#### Scenario: Outro dia do ano
- **WHEN** a sincronização de 30/12 deixa um banco sem foto
- **THEN** nenhum alerta de foto de 31/12 é criado

### Requirement: Alerta de 31/12 sem foto depois da virada
De 01/01 a 31/01, ao fim de cada sincronização, o sistema MUST contar as contas e posições que deveriam ter foto em 31/12 do ano anterior e não têm, pelos mesmos critérios do alerta do próprio dia, considerando só as contas e posições criadas até 31/12. Se a contagem for maior que zero, MUST criar um alerta de evento `year_end_snapshot_missing` com a mensagem "31/12/{ano} terminou sem a foto de {itens}. Confira esses saldos nos informes de rendimentos dos bancos." e destino na tela de Contas. O alerta MUST NOT ser resolvido sozinho e, depois de dispensado, MUST NOT voltar para o mesmo ano. Na primeira avaliação de 01/01, o alerta `year_end_snapshot_pending` ainda ativo MUST ser resolvido.

#### Scenario: Virada com foto faltando
- **WHEN** 31/12/2026 terminou sem a foto de 2 contas e a sincronização de 01/01/2027 roda
- **THEN** o alerta pendente de 31/12 é resolvido e nasce um alerta `year_end_snapshot_missing` com a mensagem "31/12/2026 terminou sem a foto de 2 contas. Confira esses saldos nos informes de rendimentos dos bancos."

#### Scenario: Sincronizações seguintes em janeiro
- **WHEN** a sincronização de 02/01/2027 roda e 31/12/2026 continua sem as fotos
- **THEN** continua existindo um único alerta `year_end_snapshot_missing`

#### Scenario: Dispensado
- **WHEN** o usuário dispensa o alerta e a sincronização de 03/01/2027 roda
- **THEN** nenhum alerta novo é criado

#### Scenario: API desligada na virada
- **WHEN** a API ficou desligada de 31/12/2026 a 04/01/2027 e a primeira sincronização roda em 05/01/2027
- **THEN** nasce o alerta `year_end_snapshot_missing` de 2026

#### Scenario: Posição cadastrada em janeiro
- **WHEN** uma posição manual foi cadastrada em 10/01/2027 e não tem foto em 31/12/2026
- **THEN** ela não conta para o alerta

#### Scenario: Fevereiro
- **WHEN** a sincronização roda em 01/02/2027
- **THEN** a avaliação não olha 31/12/2026 e nenhum alerta novo de foto de 31/12 é criado

### Requirement: Foto de 31/12 no sino
O sino MUST mostrar os alertas `year_end_snapshot_pending` e `year_end_snapshot_missing` com o ícone de calendário e o rótulo "Foto de 31/12", e a ação MUST abrir a tela de Contas.

#### Scenario: Abrir pelo sino
- **WHEN** o usuário aciona a ação de um alerta de foto de 31/12
- **THEN** o app abre a tela de Contas e o alerta fica lido
