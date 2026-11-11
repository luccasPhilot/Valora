## Context

`investments` e `investment_snapshots` já recebem dados em toda sincronização (61 posições nas fixtures, a maioria CDB, muitas com saldo zero porque o banco mantém o título vencido). A tabela guarda `type` (`FIXED_INCOME`, `MUTUAL_FUND`...) mas o `subtype` (`CDB`, `TREASURY`...) só existe no `raw`. A tela segue o padrão das telas de leitura (Contas): um resumo no topo e as listas abaixo.

## Goals / Non-Goals

**Goals:**
- O total da tela conferir com a soma das posições dos bancos e corretoras ativos.
- Agrupar "por tipo", como pede o roadmap, mostrando o subtipo em cada linha.
- Nenhuma posição fantasma: o que foi resgatado não pode continuar somando.

**Non-Goals:**
- Rentabilidade, detalhe por investimento e histórico (ver "Fora do escopo" da proposta).

## Decisions

**1. Agrupar pelo `type` do Pluggy; o `subtype` aparece na linha.**
- Grupos: `FIXED_INCOME` ("Renda fixa"), `MUTUAL_FUND` ("Fundos"), `EQUITY` ("Ações"), `ETF` ("ETFs"), `SECURITY` ("Títulos e previdência"), `COE` ("COE"); qualquer outro valor cai em "Outros". Os rótulos em português ficam no front (`investment-labels.ts`); a API devolve os códigos.
- *Alternativa:* agrupar por `subtype`. Descartada: são dezenas de valores (CDB, LCI, LCA, Tesouro...) e a lista ficaria longa; o tipo dá o panorama e o subtipo identifica a linha.

**2. Coluna `investments.subtype` em vez de ler o `raw` na consulta.**
- `text`, nulo permitido. A migration preenche as linhas existentes com `raw->>'subtype'`; a sincronização passa a gravá-lo (`pluggyInvestmentSchema.subtype` é `nullish`).
- *Alternativa:* extrair do `raw` na leitura. Descartada: acopla a API ao formato do Pluggy e não cabe num índice nem num `GROUP BY` simples.

**3. Posição que sumiu = posição zerada.**
- Em `InvestmentsRepository.upsertWithSnapshots`, depois do upsert, os investimentos da conexão cujo `pluggy_investment_id` **não veio** e cuja posição é diferente de zero recebem `balance_cents = 0` e uma foto do dia com `0`.
- Também vale quando o banco devolve a lista **vazia**: hoje há um retorno antecipado (`length === 0`) que precisa deixar de pular essa etapa.
- Só roda dentro da transação do banco sincronizado com sucesso. Banco com erro continua sem mudar nada.
- *Risco:* o Pluggy devolver uma lista incompleta por falha parcial. A sincronização seguinte restaura a posição (o upsert volta a gravar o saldo), então o dano é uma foto do dia com valor menor. Aceito: o contrário (valor velho para sempre) é pior e silencioso.

**4. Quais posições entram.**
- Só as de conexões **ativas** (`archived_at` nulo), pelo critério único de `active-connection.ts`. Bancos arquivados saem da tela e do total, como já saem do saldo ([produto](../../../docs/01-produto.md#remover-um-banco-do-valora)); as fotos continuam guardadas.
- Posição com `balance_cents = 0` fica fora da lista e entra em `closedCount`. Posição negativa (não esperada) aparece normalmente.

**5. API.**
- `GET /investments` sem paginação: poucas dezenas de posições no máximo (5 conexões). Exceção consciente a registrar nas Decisões.
- Resposta: `totals` (`totalCents`, `positionsCount`, `closedCount`) e `groups`, cada um com `type`, `totalCents`, `percent` e `items` (`id`, `name`, `subtype`, `balanceCents`, `percent`, `institutionName`). `percent` é a fatia do total, com uma casa decimal (`round(cents × 1000 ÷ total) ÷ 10`), zero quando o total é zero.
- Grupos do maior para o menor total; itens do maior para o menor saldo, depois pelo nome. Nunca expõe `raw` nem `pluggy_investment_id`.
- Agrupamento e percentuais são uma função pura (`groupInvestments`), testada sem banco.

**6. Tela.**
- Rota `/investimentos`, ícone `TrendingUp`, grupo `daily`, depois de Contas, `phase: 3`.
- Cartão de resumo (`secondary`, como o saldo): rótulo "Investimentos", total em `display`, "N posições em M instituições".
- Lista de barras por tipo numa cor só (`primary`), como "Gastos por categoria": ícone, nome do tipo, valor e percentual; sem rosca colorida.
- Abaixo, uma seção por tipo com as posições: nome (truncado), "subtipo · instituição" em `muted-foreground`, saldo em `tabular-nums`, percentual do total.
- Rodapé: "N posições zeradas não aparecem" (só quando `closedCount > 0`).
- Estados: carregando (skeleton no formato), vazio ("Nenhum investimento encontrado" + "Ver contas", que explica que os investimentos chegam pela sincronização), erro ("Tentar de novo"). "Ocultar valores" mascara saldos; percentuais continuam visíveis.

## Risks / Trade-offs

- [Subtipo desconhecido do Pluggy] → O rótulo cai no código formatado e o tipo desconhecido cai em "Outros"; nada quebra.
- [Zerar posição que sumiu pode errar numa resposta parcial] → Ver decisão 3: a próxima sincronização corrige.
- [Total de investimentos não é o saldo total] → Intencional: o "Saldo total" do Início continua sendo só corrente e poupança; o patrimônio (próxima change) soma as duas coisas.

## Open Questions

Nenhuma.
