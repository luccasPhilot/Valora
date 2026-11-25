## Why

A foto de saldo e de investimentos de 31/12 é a base dos bens e direitos na declaração do IR, e só pode ser gravada naquele dia. A `fix-sync-data-loss` reduziu a chance de o dia ficar sem foto: recupera a sincronização ao subir a API e tenta de novo 3 horas depois. Mesmo assim, um banco com consentimento vencido, ou fora do ar o dia todo, deixa 31/12 sem foto **sem que nada no app avise**. O healthchecks.io avisa que a sincronização falhou, mas não diz que aquele dia é diferente dos outros.

É o item "Foto de 31/12 garantida" da Fase 4 em `docs/08-revisao-e-proximas-fases.md` (prioridade 10 do resumo), na parte que ficou de fora da `fix-sync-data-loss`. **Precisa estar em produção antes de 31/12/2026.**

## What Changes

- **Alerta no próprio dia 31/12 (`year_end_snapshot_pending`):** ao fim de cada sincronização de 31/12, se alguma conta ou posição de investimento que deveria ter foto ainda não tem a do dia, nasce um alerta no sino: "Ainda falta a foto de 31/12 de 2 contas e 1 investimento. Sincronize hoje: ela é a base dos bens e direitos no IR." O alerta leva para Contas, onde fica o botão de sincronizar. Ele é resolvido sozinho quando uma sincronização completa as fotos, ou quando o dia acaba.
- **Alerta depois da virada (`year_end_snapshot_missing`):** de 1º a 31 de janeiro, ao fim de cada sincronização, se 31/12 do ano anterior terminou sem foto de alguma conta ou posição, nasce um alerta: "31/12/2026 terminou sem a foto de 2 contas. Confira esses saldos nos informes de rendimentos dos bancos." É um alerta de evento: fica até ser dispensado e não volta.
- **O que deveria ter foto:** contas de banco ativo (a conta "Dinheiro" não tem saldo nem foto) e posições de investimento de banco ativo ou manuais com saldo diferente de zero. As contas ocultas dos totais entram, porque o IR pede todas.
- **Interface:** os dois tipos ganham ícone e rótulo no sino ("Foto de 31/12"). Nenhuma tela nova.
- **Banco:** a constraint `alerts_type_check` aceita os dois tipos novos, e `accounts` e `investments` ganham `created_at`, para a checagem de janeiro não contar o que foi criado depois de 31/12 (migration).

Os textos não levam valores nem descrições, como os outros alertas.

### Contraria documentos

Nenhum. A change completa um item da Fase 4 de `docs/08` e usa o sistema de alertas como ele é.

### Fora do escopo

- Gravar a foto de 31/12 com dados de outro dia (por exemplo, a de 1º/1 no lugar da que faltou). Uma foto é sempre a leitura do próprio dia (regra 7). Qual foto usar como referência quando 31/12 faltar é decisão da change `add-tax-support`.
- Push no celular: o alerta passa a chegar por push quando a change `add-push-notifications` estiver pronta, como os outros alertas.
- Checar fotos de outros dias ou a saúde geral dos dados: change `add-data-health`.
- A folha do IR (change `add-tax-support`, Fase 6).
- Nenhum item da seção "Fora do escopo" de `docs/01-produto.md` é afetado.

### Roadmap

O item não está em `docs/07-roadmap.md`: é a "Foto de 31/12 garantida" da Fase 4 de `docs/08-revisao-e-proximas-fases.md`. Ao arquivar, o item e a prioridade 10 do resumo são marcados como feitos.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `alerts`: dois tipos novos, o alerta do dia 31/12 (resolvido sozinho) e o alerta de 31/12 sem foto depois da virada (de evento, até ser dispensado); o sino mostra os dois com ícone e rótulo próprios.

## Impact

- **Backend:** `modules/alerts/` (`alert-situations.ts`, `alert-evaluator.ts`, `alert-target.ts`), um repository de leitura das fotos que faltam num dia (contas e investimentos ativos), `db/schema.ts` e uma migration nova (`alerts_type_check` e `created_at` em `accounts` e `investments`).
- **Frontend:** `features/alerts/alert-presentation.ts` (ícone e rótulo dos dois tipos).
- **Testes:** unitários das funções puras (datas, contagem e textos); integração da avaliação com fotos reais no banco; teste de apresentação no front.
- **API:** o contrato de `GET /alerts` não muda (o `type` já é texto livre no front).
- **Documentação:** `docs/01-produto.md` (alertas), `docs/04-modelo-de-dados.md` (tipos de alerta e `created_at`) e `docs/08-revisao-e-proximas-fases.md`.
- **Dependências:** nenhuma nova.
