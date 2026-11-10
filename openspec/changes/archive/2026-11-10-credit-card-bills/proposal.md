## Why

Hoje o Valora mostra só o valor da fatura em aberto de cada cartão (o `balance_cents` da conta). Para planejar o mês é preciso saber **quando** a fatura vence, quanto vem nas **próximas faturas** e quanto já está **comprometido em parcelas** nos meses seguintes. Sem isso, a projeção do fim do mês (`month-projection`) não tem como saber quanto vai sair da conta para pagar o cartão.

## What Changes

- Cria a tabela `credit_card_bills` e grava as faturas de cada cartão na sincronização (passo 7 de [Sincronização](../../../docs/03-arquitetura.md#sincronização)), pelo id do Pluggy, sem duplicar.
- O `PluggyClient` ganha `listCreditCardBills`, que valida a resposta com Zod e converte para centavos.
- Cria `GET /api/v1/credit-card-bills`, com uma entrada por cartão:
  - **fatura atual** (a primeira com vencimento de hoje em diante) e **próximas faturas** já fechadas;
  - **parcelas futuras**: compras parceladas que ainda têm parcelas por vir, projetadas mês a mês e somadas por mês.
- Cria a tela de faturas de um cartão, aberta pelo painel do cartão na tela de Contas: fatura atual com vencimento e situação (aberta, vencida, paga), próximas faturas e as parcelas futuras por mês.
- Quando o conector não manda faturas, mostra só a fatura atual a partir do saldo do cartão e do vencimento que vem nos dados da conta. Esse vencimento vive desatualizado (nos dados reais, está no mês passado ou nulo), então o app o repete no mês seguinte e marca como "Vencimento estimado". Não inventa as próximas faturas.
- Registra as faturas na `sync_runs.stats`.

Itens do roadmap cobertos (Fase 2):
- **Faturas do cartão:** fatura atual, próximas faturas, vencimento, parcelas futuras (`credit_card_bills`).

## Capabilities

### New Capabilities

- `credit-card-bills`: gravação das faturas pela sincronização, cálculo das parcelas futuras, API de faturas e a tela de faturas do cartão.

### Modified Capabilities

Nenhuma.

## Impact

- **Banco:** tabela nova `credit_card_bills` (migration). Documentada em `docs/04-modelo-de-dados.md` com duas colunas além das previstas: `closing_date` e `paid_cents`.
- **Código novo:** `backend/src/modules/credit-card-bills/` e `frontend/src/features/credit-card-bills/`.
- **Código alterado:** `PluggyClient`/`PluggySdk` e a sincronização (`sync.service.ts`, `sync.unit-of-work.ts`); o painel do cartão em `frontend/src/features/accounts/`.
- **API:** `GET /api/v1/credit-card-bills`.
- **Fixtures:** o script `fixtures:record` passa a gravar também as faturas (anonimizadas).
- **Depende de:** `open-finance-sync`, `accounts-screen`.
- **Alimenta:** `month-projection` (faturas que vencem no mês).

## Fora do escopo

- Pagar a fatura ou gerar boleto/Pix: o Valora é só leitura.
- Lista de compras de cada fatura: as compras já aparecem em Transações; ligar compra a fatura fica para depois.
- Prever o valor de faturas futuras além das parcelas já conhecidas: gastos novos no cartão não são adivinhados.
- Alertas de fatura (ver `alerts-center`).
- Itens da seção "Fora do escopo" de `docs/01-produto.md`: nenhum é tocado.
