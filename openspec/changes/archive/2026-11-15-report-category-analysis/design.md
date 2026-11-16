## Context

O Início calcula o gasto líquido por categoria de **um mês** (`findCategorySpending`) e monta as 5 maiores mais "Sem categoria" e "Outros" (`buildSpendingBreakdown`). Categorias não têm cor própria; o Design System permite a paleta de 8 cores só em barras, áreas e linhas com os slots em ordem, e proíbe rosca colorida por categoria. O relatório precisa dessa mesma conta mês a mês.

## Goals / Non-Goals

**Goals:**
- O total de cada mês bater com o gasto do Início para o mesmo mês.
- Mostrar a composição por mês sem inventar cor por categoria.
- Tabela equivalente ao gráfico.

**Non-Goals:**
- Receitas por categoria, comparação com o período anterior, abrir transações.

## Decisions

**1. Gasto líquido por categoria e **por mês**, somado para o período.**
- A consulta agrupa por mês e categoria: `max(0, −Σ valores)` de cada par, igual à conta dos orçamentos e do Início, com as mesmas exclusões (sem transferências; sem categoria só a saída conta). O total de uma categoria no período é a **soma dos meses**, não o líquido do período inteiro: um estorno em março não apaga um gasto de janeiro, e cada mês continua batendo com o Início.
- `findCategorySpending` passa para o `TransactionTotalsRepository` (movimento sem mudança) e ganha `findCategorySpendingByMonth(from, to)`, que devolve `month`, categoria e `spentCents`.

**2. Ranking e "Outros".**
- Ordem das categorias: total do período decrescente, empate pelo nome. As 5 primeiras ficam; o resto vira "Outros" (soma mês a mês). "Sem categoria" disputa vaga como qualquer categoria, como no Início. A função pura `buildCategoryReport` reaproveita `buildSpendingBreakdown` para o ranking e o "Outros", aplicado ao total do período, e depois distribui os meses.
- Cada série traz `kind` (`category`, `uncategorized`, `other`), `categoryId` (nulo nas duas últimas), `name`, `icon` (nulo em "Outros" e "Sem categoria"), `totalCents`, `percent` (fatia do total do período, uma casa decimal) e `monthlyCents`, alinhado a `months`.
- `months` segue a mesma regra do relatório de receitas e despesas: começa na primeira transação guardada, e meses sem gasto dentro do período vêm com zero.

**3. Endpoint.**
- `GET /reports/category-spending?from=&to=` (mesmas regras de `parseMonthRange`). Resposta: `from`, `to`, `months`, `series` (no máximo 6) e `totals` (`totalCents`, `monthlyCents`). Sem paginação: no máximo 60 meses × 6 séries.

**4. Gráfico: colunas empilhadas, séries nos slots em ordem.**
- Uma coluna por mês, um segmento por série, do maior para o menor total de baixo para cima; "Outros" por último, na cor cinza da tabela da paleta (`#8A938C` claro, `#7E8E85` escuro). O slot 1 é a maior categoria do período, o slot 2 a segunda, e assim por diante, sem pular. A garantia de contraste do Design System vale para vizinhos na ordem, que é exatamente o empilhamento.
- Legenda sempre (2 ou mais séries). Tooltip do mês: total e cada categoria com valor maior que zero, em ordem. Texto nunca na cor da série; o mês em andamento é marcado em texto, como nos outros relatórios.
- A cor de uma categoria **pode mudar** quando o período muda (é o ranking daquele período). A lista e a legenda dizem o nome, então a cor nunca carrega sozinha a informação.
- *Alternativa:* uma linha por categoria. Descartada: cinco linhas se cruzam e escondem a composição; a coluna empilhada mostra total e partes.

**5. Lista ranqueada.**
- Abaixo do gráfico: a lista de barras horizontais numa cor só (`primary`; "Outros" cinza), cada linha com o ícone, o nome, o total e o percentual do período, no padrão de "Gastos por categoria". Barra proporcional à maior categoria. Sem toque para abrir transações (fora do escopo).

**6. Tabela.**
- `ReportTable` com um mês por linha e uma coluna por série (nomes truncados, `title` com o nome inteiro), coluna "Total" por mês e linha final com o total do período por série. Mês em andamento marcado em texto. Rolagem só dentro do bloco, com a coluna do mês fixa.

**7. Estados.**
- Carregando (skeleton do formato), vazio ("Nenhum gasto neste período" + "Mudar período") e erro ("Tentar de novo"). "Ocultar valores" mascara valores, remove o eixo vertical e mantém os percentuais. Resumo em texto para leitor de tela: as categorias do período com os totais.

## Risks / Trade-offs

- [Cor da categoria muda entre períodos] → Legenda e lista com o nome e o percentual; a regra do Design System sobre vizinhos na ordem continua valendo.
- [Muitas categorias pequenas viram "Outros"] → É o mesmo corte do Início; "Outros" tem o total e o percentual visíveis.
- [Somar os meses difere do líquido do período] → Escolha deliberada (decisão 1) e registrada em `docs/01-produto.md` para o número do relatório bater com os orçamentos e o Início.

## Open Questions

Nenhuma.
