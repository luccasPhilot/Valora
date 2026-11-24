## Why

A revisão de 18/11/2026 ([docs/08-revisao-e-proximas-fases.md](../../../docs/08-revisao-e-proximas-fases.md)) achou caminhos raros em que a sincronização **perde dado em silêncio**: transações de um banco parado mais de 30 dias, a categoria escolhida numa pendente que vira postada com outro id, o aviso de duplicata nessa mesma troca, investimentos zerados numa coleta parcial e a foto do dia quando o cron das 07:00 não roda. Num app em que "histórico perdido não volta", isso vem antes de qualquer funcionalidade nova, e precisa estar pronto antes da foto de 31/12/2026, base dos bens e direitos no IR.

## What Changes

- **Janela de transações a partir da última sincronização (S1):** a busca passa a começar no dia da última sincronização bem-sucedida do banco, com 7 dias de margem, nunca menos de 30 dias e nunca mais de 365. Vale para banco que ficou em erro ou com consentimento vencido e para banco reativado depois de arquivado. Hoje a janela é sempre 30 dias depois da primeira vez, e o que ficou para trás nunca entra.
- **Decisão do usuário levada da pendente para a postada (S2):** quando uma pendente do Open Finance com categoria escolhida pelo usuário (ou vinculada a uma previsão) some do Pluggy, a sincronização procura a postada equivalente (mesma conta, mesmo valor, de 1 dia antes a 5 dias depois, chegada depois da pendente) e passa para ela a categoria, como `user`, e o vínculo com a previsão. Só então apaga a pendente. Sem candidata única, a pendente fica até 5 dias depois da data dela; depois disso é apagada como hoje.
- **Duplicata conferida depois de apagar as pendentes (S3):** as pendentes que sumiram são apagadas **antes** de marcar as possíveis duplicatas, na mesma transação do banco de dados. A manual que estava "ocupada" pela pendente volta a ser comparada com a postada nova.
- **Investimentos só zerados com coleta completa (S4):** o que sumiu da resposta só vai a zero quando o Pluggy diz que a coleta de investimentos do item terminou com sucesso (`status = UPDATED` e `executionStatus = SUCCESS`, ou `PARTIAL_SUCCESS` com `statusDetail.investments.isUpdated = true`). Em coleta parcial ou durante uma atualização, nada é zerado e nenhuma foto `0` é gravada para as ausentes. As posições que o Pluggy manda com saldo zero (`TOTAL_WITHDRAWAL`) continuam gravadas como hoje.
- **Recuperar a sincronização do dia (S5):** ao subir a API, se já passou do horário do `SYNC_CRON` e há banco ativo sem sincronização bem-sucedida hoje (fuso de São Paulo), a API dispara uma sincronização agendada só desses bancos, respeitando o lock. Uma execução agendada que termina com banco sem sincronizar hoje ganha **uma** segunda tentativa 3 horas depois, no mesmo dia, só para esses bancos.
- **Falha de um banco não derruba a execução (S8):** cada banco fica isolado num `try/catch` que cobre também `connections.ensure` e a atualização do status. Se só o registro do fim da execução (`syncRuns.finish`) falhar, as estatísticas reais não são trocadas por `failed`.

### Contraria documentos (decisão do usuário, já tomada no pedido)

Os trechos abaixo descrevem o comportamento atual e serão atualizados na mesma change:

- `docs/03-arquitetura.md`, seção "Sincronização": passo 3 ("nas próximas, buscar os últimos 30 dias" e "pendente que sumiu é apagada"), passo 6 (zerar o que sumiu) e a ordem upsert → duplicatas → apagar pendentes; tabela "Decisões": "Investimento que sumiu da resposta é zerado".
- `docs/04-modelo-de-dados.md`: "Posição que sumiu = posição zerada".

Nenhuma regra do `CLAUDE.md` é contrariada. A change reforça as regras 3 (categoria do usuário), 4 (gravar pelo id do Pluggy), 7 (fotos diárias) e 9 (manuais intocadas, duplicata nunca juntada sozinha).

### Fora do escopo

- Itens da revisão que não entram: **S6** (renovar consentimento como item novo), **S7** (conta que some do Pluggy), **S9** (diagnóstico dos erros do SDK), **S10** (CHECK de forma em `transactions` e `accounts`), **S11** (índices), **S12** (nome "MeuPluggy") e **S13** (pontos menores).
- O ping do healthchecks.io ao fim da sincronização agendada: fica na change `harden-backups`, proposta em paralelo.
- A parte de tela da "Foto de 31/12 garantida" (Fase 4 em `docs/08`): o aviso de que 31/12 terminou sem foto e a repetição no dia 1º. Esta change só reduz a chance de o dia ficar sem foto.
- Juntar duplicatas sozinho, mudar a regra de detecção de duplicata ou o prazo de 3 dias.
- Mudança de endpoint, de tela ou de tabela: nada no `frontend/` muda, e não há migration.
- Nenhum item da seção "Fora do escopo" de `docs/01-produto.md` é afetado: a sincronização continua só leitura.

### Roadmap

Os itens não estão em `docs/07-roadmap.md`: são correções da revisão, change nº 2 da "Ordem sugerida" de `docs/08-revisao-e-proximas-fases.md` (S1, S2, S3, S4, S5 e S8). Ao arquivar, S1 a S5 e S8 são marcados como resolvidos em `docs/08`.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `open-finance-sync`: janela de transações a partir da última sincronização; pendente que sumiu leva a decisão do usuário para a postada e só então é apagada; investimentos ausentes só zerados com coleta completa; falhas isoladas por banco também nas gravações de status e no fim da execução; recuperação da sincronização agendada ao subir a API e segunda tentativa no mesmo dia.
- `manual-transactions`: a detecção de possível duplicata roda depois de apagar as pendentes que sumiram, então a postada que substitui uma pendente ainda é comparada com a manual.

## Impact

- **Backend:** `modules/sync/` (`sync.service.ts`, `transactions.repository.ts`, `investments.repository.ts`, `item-status.ts`, `pluggy.schemas.ts`, `pluggy-client.ts`, `sync.schedule.ts`), `modules/connections/connections.repository.ts` (bancos sem sincronização hoje), `server.ts` (recuperação ao subir) e `scripts/record-pluggy-fixtures.ts` (guardar `statusDetail` sem mensagens).
- **Testes:** integração em `test/integration/sync*.test.ts`, `investments-sync.test.ts` e `possible-duplicates.test.ts`; unitários em `test/modules/sync/`. Fixtures continuam as gravadas, ajustadas dentro de cada teste.
- **Banco:** nenhuma migration.
- **API e frontend:** nenhuma mudança de contrato.
- **Documentação:** `docs/02-open-finance.md`, `docs/03-arquitetura.md` (Sincronização e Decisões), `docs/04-modelo-de-dados.md` e `docs/08-revisao-e-proximas-fases.md`.
- **Dependências:** nenhuma nova (`croner` já tem `previousRuns`).
