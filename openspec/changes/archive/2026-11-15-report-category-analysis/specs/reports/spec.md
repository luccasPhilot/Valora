## ADDED Requirements

### Requirement: Gasto por categoria e mês
`GET /api/v1/reports/category-spending?from=&to=` MUST devolver `months`, `series` e `totals`. O gasto de uma categoria num mês MUST ser o gasto líquido da regra dos orçamentos e do Início (`max(0, −soma dos valores)` do mês, estornos reduzem, sem transferências internas, com lançamentos manuais e pendentes, e uma saída sem categoria contando em "Sem categoria"). O total de uma categoria no período MUST ser a soma dos gastos dos meses dela. `series` MUST ter no máximo 6 itens: as 5 maiores categorias do período (por total, desempate pelo nome), com "Sem categoria" disputando vaga, e "Outros" com a soma do resto quando houver. Cada série MUST trazer `kind` (`category`, `uncategorized` ou `other`), `categoryId`, `name`, `icon`, `totalCents`, `percent` (fatia do total do período, uma casa decimal) e `monthlyCents` alinhado a `months`. `months` MUST seguir a regra do histórico de receitas e despesas (começa na primeira transação guardada, zeros nos meses sem gasto) e `from` e `to` MUST seguir as regras de intervalo.

#### Scenario: Mesmo gasto do Início
- **WHEN** o Início mostra R$ 3.200,00 de gasto líquido em outubro somando todas as categorias
- **THEN** `totals.monthlyCents` de `2026-10` é `320000`

#### Scenario: Estorno reduz o mês
- **WHEN** uma compra de R$ 200,00 em Compras tem estorno de R$ 50,00 no mesmo mês
- **THEN** o gasto de Compras nesse mês é `15000`

#### Scenario: Estorno em outro mês
- **WHEN** a compra de R$ 200,00 é de janeiro e o estorno de R$ 50,00 é de março
- **THEN** o gasto de janeiro é `20000`, o de março é `0` e o total da categoria no período é `20000`

#### Scenario: Cinco maiores e Outros
- **WHEN** o período tem 8 categorias com gasto
- **THEN** `series` traz as 5 maiores, "Outros" com a soma das 3 restantes mês a mês, e a soma dos `percent` é 100 (com a tolerância do arredondamento)

#### Scenario: Sem categoria disputa vaga
- **WHEN** a soma das saídas sem categoria é a terceira maior
- **THEN** "Sem categoria" (`kind` `uncategorized`) aparece na terceira posição

#### Scenario: Transferência fora
- **WHEN** há um pagamento de fatura de R$ 1.000,00 no mês
- **THEN** ele não entra em nenhuma série

#### Scenario: Receita não é gasto
- **WHEN** uma categoria de receita tem R$ 5.000,00 no mês
- **THEN** ela não aparece em `series`

#### Scenario: Sem gastos
- **WHEN** não há nenhum gasto no período
- **THEN** `series` é vazio e `totals.totalCents` é `0`

#### Scenario: Desempate
- **WHEN** duas categorias têm o mesmo total no período
- **THEN** a de nome menor em ordem alfabética (pt-BR) vem antes

### Requirement: Tela de gasto por categoria
O relatório `/relatorios/categorias` ("Por categoria" na navegação entre relatórios) MUST mostrar um gráfico de colunas empilhadas por mês, com uma série por item de `series` nos slots da paleta de gráficos em ordem sem pular e "Outros" na cor cinza da paleta, legenda e tooltip com o total do mês e cada categoria com valor maior que zero. MUST mostrar a lista ranqueada de barras horizontais numa cor só (`primary`; "Outros" cinza) com ícone, nome, total e percentual, e a tabela ("Ver em tabela") com um mês por linha, uma coluna por série, a coluna "Total" e a linha de total do período. MUST NOT usar rosca nem uma cor fixa por categoria. O texto MUST NOT usar a cor da série. MUST marcar o mês em andamento em texto, ter os estados carregando, vazio ("Nenhum gasto neste período", com "Mudar período") e erro ("Tentar de novo"), funcionar de 320 px a 1440 px nos dois temas sem rolagem horizontal da página e respeitar "Ocultar valores" (mascara os valores, remove o eixo vertical e mantém os percentuais).

#### Scenario: Cores em ordem
- **WHEN** o período tem 3 categorias com gasto
- **THEN** a maior usa o slot 1 da paleta, a segunda o slot 2 e a terceira o slot 3

#### Scenario: Outros em cinza
- **WHEN** existe a série "Outros"
- **THEN** ela usa a cor cinza da paleta e aparece por último

#### Scenario: Legenda por nome
- **WHEN** o gráfico é mostrado
- **THEN** a legenda traz o nome de cada série, sem depender só da cor

#### Scenario: Lista ranqueada
- **WHEN** a tela é aberta
- **THEN** a lista mostra cada categoria com ícone, nome, total e percentual, da maior para a menor

#### Scenario: Tabela
- **WHEN** o usuário escolhe "Tabela"
- **THEN** a tabela traz um mês por linha, uma coluna por série, "Total" por mês e o total do período no fim

#### Scenario: Sem gastos
- **WHEN** não há gasto no período
- **THEN** a tela mostra "Nenhum gasto neste período" com "Mudar período"

#### Scenario: Valores ocultos
- **WHEN** "Ocultar valores" está ligado
- **THEN** valores e tabela aparecem mascarados, o eixo vertical some e os percentuais continuam visíveis

#### Scenario: Celular estreito
- **WHEN** a largura é 320 px e há 24 meses
- **THEN** a página não tem rolagem horizontal e a tabela rola só dentro do bloco
