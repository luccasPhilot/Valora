## Why

Ninguém confere se os dados batem, e o consentimento só avisa depois que vence (`docs/08-revisao-e-proximas-fases.md`, "Lacunas", itens 4, 5 e 11):

- o `consentExpiresAt` do Pluggy é lido em toda sincronização, mas não é gravado; o app só fica sabendo quando o banco já parou;
- há fotos diárias de saldo e transações de cada conta, mas nada compara uma coisa com a outra: uma transação que o Open Finance não trouxe passa sem ninguém notar;
- uma conta que parou de receber transações (cartão substituído, banco que não manda mais) não chama atenção;
- Ajustes só tem o tema; o histórico das sincronizações só existe no banco.

É o item "Saúde dos dados" da Fase 4 ("Confiança e rotina"): você confia que os números batem com o banco.

## What Changes

- **Consentimento gravado:** coluna `connections.consent_expires_at`, atualizada em toda sincronização com o que o Pluggy devolve.
- **Aviso antes de vencer:** alerta `consent_expiring` no sino, 30 dias antes ("O consentimento do Itaú vence em 28/12. Renove a conexão no Meu Pluggy.") e de novo 7 dias antes. Some quando o consentimento é renovado ou o banco é arquivado. Sem valores no texto.
- **Conciliação do saldo:** para cada conta corrente e poupança de banco ativo, nos últimos 60 dias, a diferença entre duas fotos seguidas é comparada com a soma das transações postadas do período. Quando não bate, a tela mostra "Possível transação faltando entre 03/11 e 04/11 (diferença de R$ 120,00)" e leva à lista de Transações daquela conta e daquelas datas. Só olha períodos que já assentaram (fotos com pelo menos 3 dias).
- **Conta parada:** conta corrente ou cartão de banco ativo, sincronizado com sucesso, sem nenhuma transação há 10 dias ou mais aparece como "Sem transações há 14 dias".
- **Histórico das sincronizações:** as últimas 30 execuções, com quando, como começou (agendada ou botão), resultado e as contagens, sem valores.
- **Tela "Saúde dos dados"** (`/ajustes/saude-dos-dados`), aberta por Ajustes e por Contas, com quatro seções: consentimentos, conciliação, contas paradas e sincronizações. Cada seção diz "Tudo certo" quando não há nada.

### Contraria documentos

Nenhum. A tela só lê; nada é corrigido sozinho (regra 8 e "nunca juntar sozinho" valem por analogia: a divergência é sugerida, nunca resolvida pelo app).

### Fora do escopo

- Corrigir a divergência (lançar a transação que falta é o fluxo manual que já existe).
- Conciliar cartão de crédito (o saldo do cartão é a fatura, que fecha e zera; outra regra).
- Push do aviso de consentimento (change `add-push-notifications`, que manda os alertas).
- S6 (consentimento renovado como item novo), S7 (conta que some do Pluggy).
- Nenhum item da seção "Fora do escopo" de `docs/01-produto.md` é afetado.

### Roadmap

Não está em `docs/07-roadmap.md`: é o item "Saúde dos dados" da Fase 4 em `docs/08` (change nº 6 da "Ordem sugerida"). Ao arquivar, o item é marcado como feito.

## Capabilities

### New Capabilities

- `data-health`: tela e API da saúde dos dados (consentimentos, conciliação, contas paradas, histórico das sincronizações).

### Modified Capabilities

- `open-finance-sync`: grava o vencimento do consentimento.
- `alerts`: alerta de consentimento a vencer.

## Impact

- **Banco:** `connections.consent_expires_at timestamptz null`; `alerts_type_check` com `consent_expiring`. Migration nova.
- **Backend:** módulo novo `modules/data-health/` (rotas, service, repository e funções puras de conciliação), `GET /data-health`, `GET /sync-runs` paginado; `modules/sync/` (gravar o consentimento); `modules/alerts/` (situação nova).
- **Frontend:** tela nova em `features/settings/` (ou `features/data-health/`), links em Ajustes e Contas, ícone do alerta novo, schemas em `lib/api/`.
- **Testes:** unitários da conciliação e das contas paradas; integração da API, da gravação do consentimento e do alerta; tela com carregando, vazio e erro.
- **Documentação:** `docs/01-produto.md`, `docs/02-open-finance.md` (consentimento), `docs/03-arquitetura.md`, `docs/04-modelo-de-dados.md` e `docs/08-revisao-e-proximas-fases.md`.
- **Dependências:** nenhuma nova.
