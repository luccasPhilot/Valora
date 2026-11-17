## Why

Hoje dá para ver os gastos por categoria no Início (só as 5 maiores, de um mês) e em `/relatorios/categorias` (top 5 + "Outros", empilhado por mês). Nenhum dos dois responde às perguntas de quem quer **decidir**: "para onde foi todo o meu dinheiro?", "o que subiu em relação ao mês passado?", "estou gastando demais em assinaturas?". Falta uma visão com **todas** as categorias, comparação com o mês anterior, tendência e o que já está estourando o orçamento, tudo à primeira vista.

## What Changes

- Nova área **"Categorias"** (`/categorias`) no menu principal, no grupo "Dia a dia", **depois de "Orçamentos"**. A configuração não muda por dentro, só de lugar: a tela de gestão (abas Categorias, Regras e Pluggy) segue no **rodapé** do menu como "Categorias e regras", agora em `/categorias-e-regras`. Análise é uso do dia a dia; configuração fica separada.
- A tela analisa **um mês** (o mesmo seletor de mês de Orçamentos, padrão o mês atual, guardado na URL em `?month=AAAA-MM`) e mostra:
  - **Cartão-herói** com o total gasto no mês, a variação contra o mês anterior e a categoria que mais pesou.
  - **"Para onde foi o dinheiro":** **todas** as categorias com gasto no mês (mais "Sem categoria"), em barras numa cor só, com valor, % do gasto, variação contra o mês anterior, mini-gráfico de 6 meses e o status do orçamento quando há limite.
  - **"O que mudou":** as categorias que mais subiram e as que mais caíram contra o mês anterior, em barras divergentes, com o valor da diferença.
  - **"Cobranças recorrentes":** as assinaturas e cobranças mensais detectadas (mesma regra do alerta de assinatura), com o total fixo por mês e por ano. Reflete a situação de **hoje**, não do mês escolhido, e pega assinaturas fora da categoria "Assinaturas".
  - **Pontos de atenção** (texto + ícone) para o que pede decisão: orçamento estourado, "Sem categoria" com valor relevante, categoria que subiu muito.
  - **Detalhe de uma categoria** (ao tocar numa linha): colunas dos últimos 6 meses, média, maior mês, orçamento e o atalho para as transações dela.
- Novo endpoint `GET /api/v1/category-insights?month=AAAA-MM` que devolve tudo já calculado (o front só mostra).
- A regra de assinatura detectada é **extraída** de `detectSubscriptions` para uma função compartilhada, usada pelo alerta e por esta aba, para as duas telas nunca discordarem.
- Quando o mês escolhido é o mês em andamento, a comparação é feita com o **mesmo trecho do mês anterior** (do dia 1 até o mesmo dia), para não parecer que o gasto caiu só porque o mês ainda não acabou.

Itens do roadmap cobertos: **nenhum**. Todos os itens das Fases 0 a 3 já estão concluídos, e este pedido é novo. Se a proposta for aprovada, entra um item novo na Fase 3, em **Relatórios** ("Análise de categorias do mês, com comparação, tendência e cobranças recorrentes"), já marcado como concluído ao arquivar.

## Capabilities

### New Capabilities

- `category-insights`: endpoint de análise do mês por categoria (totais, comparação, tendência de 6 meses, orçamento, cobranças recorrentes, pontos de atenção) e a aba "Análise" de `/categorias`.

### Modified Capabilities

- `transaction-categorization`: a tela "Categorias e regras" muda para `/categorias-e-regras` e continua só de gestão (sem a análise).
- `web-shell`: o menu ganha "Categorias" no grupo "Dia a dia", depois de "Orçamentos".

O spec `alerts` **não muda**: a regra de assinatura é extraída para uma função compartilhada, mas o comportamento do alerta continua idêntico (os testes atuais seguem valendo).

## Impact

- **Código novo:**
  - `backend/src/modules/category-insights/` (rota, service, cálculos);
  - `frontend/src/features/categories/analysis/` (tela, cartões, gráficos, detalhe) e `frontend/src/lib/api/category-insights.ts`.
- **Código alterado:**
  - `backend/src/modules/alerts/detectors/subscriptions.ts` (extrai a busca das sequências ativas), `alert-charges.repository.ts` (reutilizado, sem mudança de consulta), `app.ts` (registra a rota);
  - `frontend/src/lib/areas.ts` e `frontend/src/app/router.tsx` (área "Categorias" no menu principal; a gestão vai para `/categorias-e-regras`).
- **API:** `GET /api/v1/category-insights` (nova). Nenhum endpoint existente muda.
- **Banco:** nenhuma tabela ou coluna nova. Tudo sai de `transactions`, `categories`, `budgets`.
- **Reutiliza:** `TransactionTotalsRepository` (gasto líquido por categoria e por mês), `BudgetsRepository` e `budgetStatus` (limites e status), `AlertChargesRepository`, `buildSpendingBreakdown`, `CategoryBadgeIcon`, `categoryTransactionsPath`, `DataCard`, `Money`, `FormPanel` (detalhe) e os estados de carregando, vazio e erro.
- **Dependências novas:** nenhuma.
- **Documentos a atualizar:** `docs/06-design-system.md` (o menu, a tela e os gráficos novos), `docs/01-produto.md` (Categorias e regras e Relatórios), `docs/03-arquitetura.md` (decisão da regra compartilhada de assinatura), `docs/07-roadmap.md` (item novo marcado) e `CLAUDE.md` (status).

### Conferência com os documentos

- **Design System:** respeita "categorias não têm cor" e "lista de barras numa cor só"; nenhum gráfico usa cor por categoria nem rosca colorida. Variação para cima **não** usa vermelho (o vermelho de status é só para orçamento estourado, e `destructive` para erro e saldo negativo). O contraste de qualquer token novo é recalculado, se houver.
- **CLAUDE.md, regra 6:** transferências (`kind = 'transfer'`) ficam fora de todos os totais, como no Início.
- **CLAUDE.md, regra 10:** sem IA conversacional. Os pontos de atenção são regras fixas e determinísticas.
- **CLAUDE.md, regra 8:** só leitura; nada de pagar ou transferir.
- **Decisão para você:** o endereço `/categorias` passa a ser a análise, e a tela de gestão muda para `/categorias-e-regras`. Isso altera o menu descrito no spec `web-shell` e em `docs/06-design-system.md`, e o endereço da tela descrito em `transaction-categorization`. Nenhum link do app apontava para o endereço antigo. Se preferir outro lugar no menu (por exemplo, no grupo "Patrimônio"), é só trocar o grupo.

## Fora do escopo

- **Receitas por categoria:** a tela é só de despesas, como o gasto por categoria do Início.
- **Escolher o período livre (6/12/24 meses):** isso já existe em `/relatorios/categorias`, que **não muda**.
- **Criar ou editar orçamento dentro da tela:** ela mostra o status e leva à tela de Orçamentos.
- **Metas de economia por categoria, sugestões automáticas de corte ou previsão de gasto** (seriam funcionalidades novas, não análise do que já aconteceu).
- **Marcar ou cancelar assinatura:** só leitura. Valor que muda de preço (a detecção exige o mesmo valor) fica de fora e a limitação é a mesma do alerta.
- **Cores por categoria, rosca ou treemap colorido:** proibidos pelo Design System.
- **Notificações ou alertas novos no sino:** os pontos de atenção só aparecem na tela.
- Itens da seção "Fora do escopo" de `docs/01-produto.md` (IA conversacional, carteira com saldo, multiusuário, WhatsApp, movimentar dinheiro, uso comercial): nenhum é tocado.
