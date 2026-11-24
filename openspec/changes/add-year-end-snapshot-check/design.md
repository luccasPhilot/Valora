## Context

- As fotos ficam em `balance_snapshots` (por conta e dia) e `investment_snapshots` (por posição e dia). A sincronização grava a foto das contas e posições de cada banco que leu com sucesso; as posições manuais ganham foto em `snapshotManualInvestments`, ao fim de toda sincronização.
- O `AlertEvaluator` roda ao fim de cada sincronização (`evaluateAll`), qualquer que seja o resultado. Há dois jeitos de alerta:
  - **reconciliados** (orçamento, conexão): a avaliação calcula as situações de agora, cria o que falta e resolve o que acabou (`reconcile`);
  - **de evento** (cobrança duplicada, assinatura): só inserem pela `dedupe_key` (`createIgnoringConflict`) e ficam até serem dispensados. O índice parcial `alerts_active_dedupe_key_key` impede que renasçam.
- "Banco ativo" tem uma definição só (`active-connection.ts`).
- O sino do front já mostra qualquer tipo, com ícone genérico para o que não conhece.

## Goals / Non-Goals

**Goals:**
- Em 31/12, saber no app, ainda no mesmo dia, que falta foto de alguma conta ou posição.
- Depois da virada, saber que 31/12 ficou sem foto e o que fazer.

**Non-Goals:**
- Gravar foto de um dia com a leitura de outro.
- Checar outros dias (fica na `add-data-health`).
- Push (fica na `add-push-notifications`).

## Decisions

### 1. Dois tipos de alerta, um para cada momento

| Tipo | Quando é avaliado | Jeito | `dedupe_key` |
|---|---|---|---|
| `year_end_snapshot_pending` | em 31/12 (São Paulo), ao fim de cada sincronização | reconciliado | `year_end_snapshot_pending:AAAA` |
| `year_end_snapshot_missing` | de 01/01 a 31/01, ao fim de cada sincronização | de evento | `year_end_snapshot_missing:AAAA` (ano de 31/12) |

- **No dia 31/12 é reconciliado:** a situação muda ao longo do dia (o botão de sincronizar pode completar as fotos). Quando completa, a avaliação seguinte resolve o alerta. Na avaliação de 1º/1 a situação "pendente" não existe mais, então ele é resolvido também, e o de evento assume.
- **Depois da virada é de evento:** a foto de 31/12 nunca mais pode ser gravada, então a situação não acaba. Um alerta reconciliado ficaria ativo para sempre. Como evento, fica até ser dispensado e, dispensado, não volta (a chave fica presa no índice parcial).
- **Por que janeiro inteiro:** se a API ficar desligada de 31/12 até dias depois, o alerta ainda nasce na primeira sincronização. Depois de janeiro, a avaliação não olha mais para trás.
- **Alternativa descartada:** um tipo só, com a mensagem trocando na virada. A `dedupe_key` igual impediria trocar a mensagem (o `createIgnoringConflict` não atualiza), e o jeito de resolver é diferente nos dois momentos.

### 2. O que deveria ter foto

Função de repository `findMissingSnapshots(date)` que devolve só **contagens** (`{ accounts, investments }`):

- **contas:** `accounts` de banco ativo (`accountIsOfActiveConnection`), exceto `type = 'cash'`, sem linha em `balance_snapshots` naquela data. As contas ocultas dos totais entram: o IR pede todos os saldos;
- **investimentos:** `investments` de banco ativo ou manuais (`investmentIsOfActiveConnection`), com `balance_cents <> 0`, sem linha em `investment_snapshots` naquela data. A posição zerada (resgatada) fica de fora: ela não vai para o IR, e a falta da foto `0` dela não é problema.

**Por que o saldo atual e não o de 31/12 nas posições:** no dia 31/12 é o mesmo. Na avaliação de janeiro, uma posição aberta em janeiro não tinha foto em 31/12 e não deveria contar. Para evitar esse falso positivo, em janeiro só contam as posições com `created_at` até 31/12 e as contas com `created_at` até 31/12.

### 3. Textos

Funções puras em `alert-situations.ts`, com testes, a partir das contagens:

- pendente: "Ainda falta a foto de 31/12 de {itens}. Sincronize hoje: ela é a base dos bens e direitos no IR.";
- depois da virada: "31/12/{ano} terminou sem a foto de {itens}. Confira esses saldos nos informes de rendimentos dos bancos.";
- `{itens}`: "1 conta", "2 contas", "1 investimento", "2 contas e 1 investimento".

Sem valores, nomes de conta nem descrições, como os outros alertas. `connectionId`, `categoryId` e `transactionId` ficam nulos.

### 4. Datas e testes

- "Hoje" sai do `now` injetado no `AlertEvaluator`, por `todayInSaoPaulo`. Duas funções puras decidem: `yearEndCheckFor(today)` devolve `{ kind: 'pending', date: 'AAAA-12-31' }` em 31/12, `{ kind: 'missing', date: '(AAAA-1)-12-31' }` em janeiro e `null` no resto do ano.
- `evaluateAll` ganha `evaluateYearEndSnapshots()`, no mesmo `Promise.allSettled`: uma falha nela não impede as outras avaliações nem falha a sincronização (o comportamento de hoje).
- Fora de 31/12 e de janeiro, a avaliação não consulta o banco.

### 5. Destino e interface

- `alertTarget` devolve `{ screen: 'accounts' }` para os dois tipos: é onde fica o status da sincronização e o botão de sincronizar.
- `alert-presentation.ts`: ícone `CalendarX` (Lucide), rótulo "Foto de 31/12"; tom `critical` para o pendente (ainda dá para agir no dia) e `warning` para o de depois da virada.

### 6. Migration

`alerts_type_check` passa a aceitar `year_end_snapshot_pending` e `year_end_snapshot_missing`, com migration nova gerada por `npm run db:generate`. `ALERT_TYPES` ganha os dois. Nenhuma coluna nova.

## Risks / Trade-offs

- **Sincronização que não roda em 31/12:** se a API ficar fora o dia todo, nenhum alerta nasce em 31/12, porque a avaliação só roda ao fim de uma sincronização. O healthchecks.io avisa que o agendamento não pingou, e o alerta de janeiro nasce na primeira sincronização. → Aceito.
- **Posição aberta em 31/12 depois da sincronização:** uma posição manual cadastrada à noite em 31/12 ganha foto na sincronização seguinte (já em 1º/1) e conta como faltando. → Aceito: o texto pede para conferir nos informes, que é o certo nesse caso.
- **Alerta pendente que nasce à noite e o dia acaba:** é resolvido na primeira avaliação de 1º/1, e o de evento nasce no lugar. Ninguém fica com dois alertas da mesma coisa.

## Migration Plan

Deploy antes de 31/12/2026 com `infra/scripts/deploy.sh`. A migration só troca uma constraint. Para voltar, `deploy.sh <ref anterior>`: alertas dos tipos novos já gravados violariam a constraint antiga, então a migration de volta precisaria apagá-los; antes de 31/12 não haverá nenhum.
