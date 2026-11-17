## Context

O gasto por categoria já existe em três lugares: o Início (5 maiores, um mês), Orçamentos (só categorias com limite) e `/relatorios/categorias` (top 5 + "Outros", vários meses). Todos usam a mesma regra de gasto líquido, que mora em `TransactionTotalsRepository` (`findCategorySpending` e `findCategorySpendingByMonth`). A detecção de assinatura vive em `alerts/detectors/subscriptions.ts` e devolve `AlertSituation`, não os grupos de cobranças. A tela `/categorias` é só de gestão, com abas Categorias, Regras e Pluggy.

Esta change acrescenta uma visão de **decisão** sobre o mês, na tela de categorias, sem mexer em tabelas e sem tocar nos relatórios.

## Goals / Non-Goals

**Goals:**
- Um endpoint que devolve a análise do mês já calculada, para o front só mostrar.
- Reutilizar as regras existentes (gasto líquido, status de orçamento, assinatura detectada), sem uma segunda definição de nenhuma.
- Tela que responde "para onde foi?", "o que mudou?" e "o que é fixo?" à primeira vista, dentro do Design System.

**Non-Goals:**
- Período livre (6/12/24 meses), receitas, edição de orçamento, previsão, sugestões automáticas, notificações. Veja "Fora do escopo" no proposal.
- Tabelas ou colunas novas.
- Mudar `/relatorios/categorias` ou os alertas.

## Decisions

### 1. Módulo novo `category-insights`, não dentro de `reports` nem de `categories`

`backend/src/modules/category-insights/` com `category-insights.routes.ts`, `category-insights.service.ts` e funções puras de cálculo (`category-insights-calculations.ts`), seguindo Controller → Service → Repository. Não há repositório próprio: o service recebe os repositórios existentes por injeção.

| Dependência | Para quê |
|---|---|
| `TransactionTotalsRepository.findCategorySpendingByMonth` | gasto líquido por categoria e mês na janela de 6 meses |
| `TransactionTotalsRepository.findCategorySpending` | gasto do período de comparação (mês anterior inteiro ou trecho) |
| `TransactionTotalsRepository.findFirstTransactionDay` | cortar `months` no início do histórico |
| `BudgetsRepository.findForMonth` + `budgetStatus` / `budgetPercent` | limite, percentual e status |
| `AlertChargesRepository.findOutflowsSince` + função compartilhada de assinatura | cobranças recorrentes |

**Alternativas:** (a) pôr em `reports`: o módulo é de relatórios por período, com `from`/`to`; esta análise é de um mês com comparação e mistura orçamento e recorrência. (b) pôr em `categories`: o módulo é de gestão (CRUD, regras, mapeamento) e já é grande. Um módulo novo mantém cada módulo com uma responsabilidade.

### 2. Um endpoint só, tudo calculado no backend

`GET /api/v1/category-insights?month=AAAA-MM` devolve `categories`, `changes`, `recurring`, `attention` e `totals` numa resposta. **Por quê:** os blocos compartilham os mesmos números (o gasto do mês e o do período de comparação); calcular em um lugar evita que "O que mudou" e "Para onde foi" discordem. É um uso pessoal, com algumas dezenas de categorias, então o peso da resposta é pequeno.

**Alternativa:** um endpoint por cartão. Rejeitada: mais viagens, os números poderiam divergir, e o estado de erro ficaria fragmentado. O erro de `recurring` não derruba a tela inteira porque o front trata a resposta como um todo; se um dia isso incomodar, separa-se então.

**Contrato:** o backend é o dono. O front tem a cópia dos schemas Zod em `frontend/src/lib/api/category-insights.ts`, com testes dos dois lados.

### 3. Comparação justa no mês em andamento

Para o mês atual, comparar com o mês anterior **inteiro** faria quase toda categoria parecer "em queda". O service compara com **o mesmo trecho** (dia 1 até hoje, limitado ao último dia do mês anterior): `findCategorySpending(anteriorDia1, anteriorAteDia)`. Para meses encerrados, o mês anterior inteiro. O campo `comparedThroughDay` leva essa informação à tela, que escreve "até o dia 17, contra o mesmo trecho de outubro".

**Alternativa:** projetar o gasto do mês até o fim. Rejeitada: é previsão, e previsão é outra funcionalidade (já existe a projeção do saldo).

**Limitação aceita:** compras no cartão entram pela data da transação, não da fatura, e quem paga uma conta grande no dia 20 vê a categoria "subir" no trecho. É o mesmo critério de todos os outros números do app.

### 4. Tendência: janela de 6 meses, uma consulta

`findCategorySpendingByMonth(início, fim)` já devolve o par (mês, categoria). A janela é `monthsEndingAt(month, 6)`, cortada no mês da primeira transação (mesma regra dos relatórios). Os valores viram `monthlyCents` alinhados a `months`, com zero nos meses sem gasto. A média usa só os meses **anteriores** ao pedido dentro da janela (o mês atual, parcial, distorceria), e o `peak` considera a janela toda.

O gasto do mês pedido sai desta mesma consulta (último mês da janela), então não há uma consulta extra para o mês. O período de comparação precisa da sua própria consulta só no mês em andamento (o trecho); fora dele, o mês anterior já está na janela.

### 5. "O que mudou" e pontos de atenção saem da mesma tabela de diferenças

Uma função pura monta, para a união de categorias do mês e do período de comparação, `{ categoria, gasto, anterior, diferença, variação }`. A partir dela:
- `categories` filtra `gasto > 0`;
- `changes` ordena as diferenças (altas e quedas, até 3);
- `attention` aplica as regras fixas.

Isso é o que faz a categoria que **zerou** aparecer em "Caíram", mesmo sem estar em `categories`.

**Regras de atenção como constantes nomeadas** (`SURGE_MIN_VARIATION_PERCENT = 30`, `SURGE_MIN_DIFFERENCE_CENTS = 5000`, `UNCATEGORIZED_ALERT_PERCENT = 10`, `MAX_LISTED_CHANGES = 3`), com testes de fronteira (29,9% e 30%; R$ 49,99 e R$ 50,00; 9,9% e 10%). São limites fixos, como os 80% e 100% do orçamento. Não são configuráveis (nenhuma configuração foi pedida).

**Por quê dois limites na alta:** só o percentual faz "R$ 10 → R$ 20" virar atenção; só o valor faz "R$ 1.000 → R$ 1.060" virar atenção. Juntos filtram ruído sem esconder o que importa.

### 6. Regra de assinatura extraída, não duplicada

`detectSubscriptions` hoje monta o `AlertSituation` direto de dentro da busca de sequências. Extrai-se a parte que **acha as assinaturas ativas** para `findActiveSubscriptions(rows, today): ActiveSubscription[]` (`{ latestCharge, chargesCount, amountCents }`), no mesmo arquivo. `detectSubscriptions` passa a chamá-la e só converte em `AlertSituation`. O novo service usa a mesma função.

**Por quê:** CLAUDE.md pede "não repita" e o produto não pode ter um alerta que diz "assinatura detectada" e uma tela que não lista (ou o contrário). Os testes atuais do detector continuam valendo e provam que o alerta não mudou; ganham-se testes da função nova.

**Janela:** a mesma do alerta (`PATTERN_LOOKBACK_MONTHS = 7`, hoje privada em `alert-evaluator.ts`). Move-se a constante para `charge-row.ts` (ou um arquivo de constantes do detector) e os dois usam. A consulta é `AlertChargesRepository.findOutflowsSince`, sem mudança.

**Sem categoria no item:** `ChargeRow` só traz `categoryKind`, não o nome. Mostrar a categoria de cada cobrança exigiria mudar a consulta e os dados de teste do alerta; o valor para decidir é o total fixo, não a categoria. Fica de fora.

**Limitação herdada:** exige o mesmo valor e a mesma descrição. Uma assinatura que mudou de preço some até repetir o novo valor 3 vezes. A nota do cartão diz isso.

### 7. Front: o mês na URL, o cartão e o detalhe

- **Rota e menu:** a análise é uma área própria, `/categorias`, no grupo "Dia a dia" depois de Orçamentos (`areas.ts`, `router.tsx` e a página `analysis-page.tsx`). A gestão (`categories-page.tsx`, abas Categorias, Regras e Pluggy) não muda por dentro e vai para `/categorias-e-regras`, no rodapé. **Por quê:** o rodapé é de configuração; a análise é uso do dia a dia e precisa estar à mão. As áreas usam endereço exato (sem prefixo), então os dois itens do menu nunca ficam ativos juntos. Nenhum link do app apontava para `/categorias`.
- **Mês:** reaproveita `MonthSelector` e `parseMonth`/`monthOf` de `features/budgets`. Como agora há dois consumidores, o seletor e os helpers de mês passam a ser importados de lá sem copiar (o import entre `features` já ocorre, por exemplo `reports` importa de `categories`). Se a aba "Análise" fizer o `MonthSelector` ficar com forma estranha para um segundo uso, move-se para `components/` na própria change.
- **Dados:** `useCategoryInsights(month)` com TanStack Query, `placeholderData` para manter a tela anterior enquanto o novo mês carrega (igual aos relatórios).
- **Estrutura** em `frontend/src/features/categories/analysis/`: `analysis-tab.tsx` (estados e composição), `spending-hero.tsx`, `attention-list.tsx`, `category-spending-list.tsx` (+ `category-trend-sparkline.tsx`, `budget-status-badge.tsx`), `changes-card.tsx`, `recurring-card.tsx`, `category-detail-panel.tsx` (+ `category-history-chart.tsx`). Textos e regras de apresentação (como "Novo", o rótulo da variação) ficam em funções puras testadas (`analysis-labels.ts`).
- **Detalhe:** `FormPanel` (mesmo componente dos formulários: sheet no celular, lateral no tablet, dialog no computador), com uma única área de rolagem (regra do Design System).

### 8. Gráficos e cores (Design System)

O Design System é a autoridade; esta change não cria cor nem token.

| Elemento | Forma | Cor |
|---|---|---|
| "Para onde foi" | barras horizontais, uma por categoria | `primary`, uma cor só |
| Mini-gráfico de tendência | linha de 6 pontos, sem eixos | série 1 da paleta (`--color-chart-1`), uma série |
| "O que mudou" | barras divergentes: altas e quedas, em dois grupos com título | `primary` nos dois (o grupo e o sinal dizem o sentido) |
| Detalhe: histórico | colunas por mês, uma série | slot 1; mês escolhido em cor cheia, os outros a 35%; mês em andamento com hachura |
| Orçamento | ícone + texto | `status-critical` só em "estourado", `status-warning` em "perto do limite" e `status-ok` em "dentro", como em Orçamentos |

**Por que não rosca nem treemap colorido:** com categorias quaisquer lado a lado, as 8 cores da paleta têm pares indistinguíveis (o teste do Design System mediu 0,8 de distância para daltônicos), e as categorias não têm cor. A resposta "bem visual" vem de **tamanho** (barras proporcionais), **posição** (ranking) e **forma** (linha de tendência), não de cor.

**Variação para cima não é vermelha:** gastar mais nem sempre é ruim (uma viagem, um mês de matrícula). O vermelho de status é reservado a orçamento estourado (e `destructive` a erro e saldo negativo). A leitura da subida vem da seta e do texto.

**Acessibilidade:** toda informação em cor tem ícone e texto; o mini-gráfico e o gráfico do detalhe têm resumo em texto para leitor de tela (a tabela dos meses); alvos de toque de 44 px; com "Ocultar valores", os valores são mascarados e os eixos de valor somem, como nos outros gráficos.

**Layout:** uma coluna até 1279 px; a partir daí "Para onde foi" ocupa 7 colunas de 12 e "O que mudou" mais "Cobranças recorrentes" empilham nas 5 restantes. O herói e os pontos de atenção usam a largura toda. A lista cresce com a página (sem rolagem própria), como pede o Design System.

## Risks / Trade-offs

- **[Lista longa de categorias em tela estreita]** → cada linha é compacta em duas linhas de texto; o mini-gráfico some abaixo de 400 px se faltar espaço (a variação e o orçamento têm prioridade). Verificar em 320 px com nomes longos.
- **[Comparação do trecho no começo do mês é ruidosa]** (dia 2: um gasto alto domina) → aceito; o herói mostra o trecho comparado, então o usuário sabe que é parcial. Um mínimo de dias não é imposto.
- **[Assinatura que mudou de preço some da detecção]** → herdada do alerta; a nota do cartão avisa. Mudar a regra seria uma change para o alerta e para esta tela juntos, graças à função compartilhada.
- **[Dois totais de "gasto" parecem divergir]** (o herói soma o gasto líquido por categoria, e "Despesas" do Início soma saídas) → é a mesma diferença que já existe entre o relatório de categorias e o de receitas e despesas (estorno que sobra numa categoria não vira receita). Usa-se a regra de categorias; a nota "Estornos reduzem o gasto da categoria" vai no rodapé do cartão "Para onde foi".
- **[Resposta única: se `recurring` falhar, a tela toda mostra erro]** → o cálculo roda no mesmo processo e a mesma conexão; falhar uma consulta e não outra é improvável. Se for necessário, o `recurring` vira um endpoint à parte sem mudar o resto.
- **[Janela de 7 meses de saídas para as assinaturas]** → a consulta já existe e roda na sincronização; a tela a executa a cada abertura. Para uso de uma pessoa, o custo é desprezível. Sem cache.

## Migration Plan

Nenhuma migração de banco, e o deploy é o de sempre (`infra/scripts/deploy.sh`). Voltar atrás é reverter a versão: nenhuma tabela é tocada. O refator do detector de assinatura é coberto pelos testes que já existem.

## Open Questions

Nenhuma bloqueia a implementação. Uma a observar no uso real: se os limites de atenção (30%, R$ 50, 10%) ficam sensíveis ou preguiçosos demais; mudá-los é trocar três constantes.
