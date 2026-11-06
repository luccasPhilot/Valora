## Why

Os alertas de orçamento e de conexão (`alerts-center`) olham para totais e status. Os outros dois alertas da Fase 2 olham para o **padrão das transações**: uma compra cobrada duas vezes e uma assinatura que passou a se repetir todo mês. São dois dos recursos que o Valora aproveita do Pierre ([produto](../../../docs/01-produto.md#referência-pierre)), aqui como regras escritas no código, sem IA.

## What Changes

- Acrescenta ao avaliador de alertas dois detectores, rodados no fim de cada sincronização:
  - **Cobrança duplicada** (`duplicate_charge`): duas saídas postadas na mesma conta, com a mesma descrição normalizada e o mesmo valor, com até 3 dias de diferença;
  - **Assinatura detectada** (`subscription_detected`): uma saída de mesmo valor e mesma descrição que se repetiu em pelo menos 3 meses seguidos e continua ativa.
- Define o que **não** conta: parcelas, transferências, valores pequenos, pendentes e lançamentos manuais.
- Diferente dos alertas de orçamento e conexão, estes são **alertas de evento**: nascem uma vez e ficam até você dispensar. Não se resolvem sozinhos.
- Acrescenta no sino de alertas o ícone e o destino de cada um dos dois tipos ("Ver transações" abre a lista filtrada pelo dia e pela descrição).

Itens do roadmap cobertos (Fase 2):
- **Alertas:** cobrança duplicada (mesmo valor e mesmo estabelecimento em poucos dias).
- **Alertas:** assinatura detectada (mesmo valor se repetindo todo mês).

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `alerts` (criada por `alerts-center`): ganha os requisitos dos dois detectores. Os requisitos são acrescentados, nenhum existente muda.

## Impact

- **Código novo:** detectores em `backend/src/modules/alerts/detectors/`.
- **Código alterado:** o avaliador de alertas (`alerts-center`) e a lista do sino em `frontend/src/features/alerts/` (ícones e destinos dos dois tipos).
- **Banco:** nenhuma tabela nova; usa a `alerts` de `alerts-center` (os dois tipos já estão no `CHECK`).
- **API:** nenhuma rota nova; o item do alerta ganha o destino `transactions`.
- **Depende de:** `alerts-center` (precisa ser aplicada antes), `open-finance-sync`, `transactions-view`.

## Fora do escopo

- Detectar assinaturas com valor que muda todo mês (a regra é o mesmo valor, em centavos).
- Detectar cobrança duplicada entre contas diferentes ou com descrições parecidas, mas não iguais.
- Alertar de assinatura cancelada, de aumento de preço ou de gasto total em assinaturas.
- Criar automaticamente uma previsão (`planned-entries`) a partir da assinatura.
- Mudar a categoria da transação para "Assinaturas".
- Itens da seção "Fora do escopo" de `docs/01-produto.md`: nenhum é tocado.
