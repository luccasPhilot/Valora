## Context

As regras abaixo foram conferidas contra o banco de desenvolvimento (12 meses de transações). Resultado: só **3 pares** parecem cobrança duplicada em 12 meses, e **8 grupos** passam pela primeira versão da regra de assinatura, dos quais 3 eram falsos positivos (Pix mensal para uma pessoa, taxa de IOF e uma assinatura encerrada há 63 dias). As exclusões por categoria do Pluggy e por valor mínimo vêm disso.

`alerts-center` entrega a tabela `alerts` (com `dedupe_key` e o índice parcial por `resolved_at`), o avaliador idempotente e o sino. Os detectores de orçamento e conexão são **de estado**: o avaliador recalcula a situação e resolve o que sumiu. Cobrança duplicada e assinatura são **de evento**: depois de avisar, o aviso não deve sumir só porque o tempo passou.

## Goals / Non-Goals

**Goals:**
- Poucos falsos positivos: regras simples e conservadoras.
- Rodar a sincronização repetidas vezes sem repetir alertas.
- Não inundar o sino com o histórico de 12 meses da primeira carga.

**Non-Goals:**
- Casamento aproximado de nomes ou valores.

## Decisions

**1. Alertas de evento só inserem.**
- O avaliador ganha um segundo tipo de detector: devolve alertas a criar (`INSERT ... ON CONFLICT DO NOTHING` pela `dedupe_key`) e nunca resolve. A etapa de "resolver o que sumiu" continua só nos detectores de estado.
- Como `resolved_at` fica nulo, o índice parcial segura a chave para sempre: um alerta dispensado não renasce.
- O sinal para o sino é o mesmo: ativos = não dispensados.

**2. Cobrança duplicada.**
- Elegíveis: transações do Open Finance, `posted`, saída (`amount_cents < 0`), com `installment_total` nulo ou 1, categoria que não seja `transfer`, **`pluggy_category` que não comece com "Transfer"** (Pix e TED para pessoas não são cobrança), valor absoluto de pelo menos R$ 5,00 (constante `MIN_PATTERN_CHARGE_CENTS`, 500), data nos últimos 7 dias.
- Par: outra elegível (de qualquer data até 3 dias antes) na **mesma conta**, mesma `description_normalized`, mesmo `amount_cents`, diferença de até 3 dias (mesmo dia conta). O alerta é da transação **mais recente** do par.
- `dedupe_key = duplicate_charge:<transactionId da mais recente>`; `transaction_id` preenchido. Três cobranças iguais geram dois alertas (a 2ª e a 3ª): cada uma é uma cobrança a mais.
- Mensagem sem valor: "Possível cobrança duplicada: <descrição, até 60 caracteres>".
- Pendentes ficam de fora porque o mesmo gasto pode aparecer como pendente e como postado ao mesmo tempo; a duplicidade real aparece quando as duas estiverem postadas.
- Lançamento manual fica de fora: as duplicatas entre manual e banco já têm o fluxo próprio (`manual-transactions`).
- *Alternativa:* comparar entre contas. Descartada: duas contas com a mesma compra são muito mais comuns do que duas cobranças erradas.

**3. Assinatura detectada.**
- Elegíveis: as mesmas de cima (inclusive a exclusão de `pluggy_category` "Transfer…" e o valor mínimo de R$ 5,00, que tiram o Pix mensal para uma pessoa e o IOF), sem o limite de 7 dias, olhando os últimos 7 meses.
- Grupo: (`description_normalized`, `amount_cents`), qualquer conta. Ordena as datas; o grupo é assinatura quando existem **3 ou mais cobranças em sequência** com intervalo de **25 a 35 dias** entre cada par consecutivo.
- Ativa: a última cobrança da sequência tem até **45 dias**. Assinatura que parou há meses não gera alerta (evita encher o sino com o passado na primeira execução).
- `dedupe_key = subscription_detected:<amount_cents>:<description_normalized>`; `transaction_id` = a cobrança mais recente. Nasce uma vez; a cobrança seguinte não gera outro.
- Mensagem sem valor: "Assinatura detectada: <descrição, até 60 caracteres>". O valor e as datas aparecem na lista de transações aberta pelo alerta.
- Assinatura com valor que muda (câmbio, plano com reajuste) vira uma chave nova quando o valor muda e só é detectada após 3 cobranças no novo valor: aceito.

**4. Quando rodam.**
- No fim de cada sincronização, junto do avaliador de `alerts-center`. Não rodam em gravações do usuário.
- Os dados vêm de uma consulta do repository (últimos 7 meses de saídas postadas, em colunas mínimas) e os detectores são funções puras sobre essas linhas: `detectDuplicateCharges(rows, today)` e `detectSubscriptions(rows, today)`.

**5. Destino no sino.**
- Os dois tipos usam o destino `{ screen: 'transactions', from, to, search }`: o app abre Transações filtrada pelo dia e pela descrição. Sem tela nova.
- Ícones: `CopyX` ou equivalente do Lucide para duplicada e `Repeat` para assinatura; cor nunca sozinha.

## Risks / Trade-offs

- [Falso positivo: duas compras reais iguais no mesmo dia (dois cafés de R$ 6,00)] → Valor mínimo e "Dispensar"; o alerta diz "possível".
- [A primeira sincronização depois do deploy cria um alerta para cada assinatura ativa] → Nos dados atuais seriam 5 (academia, Apple, Wellhub, Anthropic e a recarga da operadora). É a funcionalidade funcionando; vêm todos juntos uma vez só. "Marcar todos como lidos" resolve o contador.
- [A descrição do extrato varia entre cobranças (número da fatura, data no texto)] → Não detecta. Perda aceita; casamento aproximado fica fora do escopo e entra só se o uso real mostrar necessidade.

## Open Questions

- Nenhuma. O valor mínimo de R$ 5,00 e a janela de 3 dias foram conferidos nos dados reais (3 pares em 12 meses, baixo ruído). Se o uso mostrar falso positivo, as constantes ficam em um lugar só.
