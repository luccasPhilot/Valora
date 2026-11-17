## Why

A crítica de design da tela de Transações (`.impeccable/critique/2026-11-16T17-34-03Z__frontend-src-features-transactions.md`, nota 24/36) achou três problemas confirmados no navegador:

- a barra de filtros mostra seis campos de peso igual, com o texto dos selects cortado ("Todas as cat", "Todos os tipo") e a lista só começa a 316 px do topo em 1024 px: parece planilha, o que o `DESIGN.md` recusa;
- a tela mostra totais por dia, mas nada responde "quanto entrou e saiu neste filtro?", e o Design System diz que o número que responde vem primeiro;
- o botão de status da sincronização ("Atualizado hoje") tem área de toque de 40 px no celular, abaixo dos 44 px do Design System.

## What Changes

- **Filtros enxutos.** Busca, Período e o botão "Filtros" ficam sempre à vista. Categoria, Tipo, Origem e Conta passam a abrir sob demanda (popover no computador, painel no celular), e os chips dos filtros ativos continuam como estão. O texto de nenhum seletor aparece cortado.
- **Resumo do filtro.** Uma linha acima da lista mostra receitas, despesas e o número de transações do filtro atual, sem transferências internas, com `R$ ••••` quando os valores estão ocultos. Para isso nasce `GET /api/v1/transactions/summary`, com os mesmos filtros de `GET /transactions`, que reaproveita a definição de receita e despesa do `TransactionTotalsRepository`.
- **Status da sincronização com 44 px.** A área de toque do botão passa de 40 px para 44 px abaixo de 640 px, sem mudar o visual.
- Os dois lados do contrato mudam juntos (backend e `frontend/src/lib/api/`), com testes.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `transactions-view`: o requisito "Filtros na tela" muda (quais filtros ficam à vista e onde os demais abrem) e entra um requisito novo para o resumo do filtro e seu endpoint `GET /transactions/summary`.
- `accounts-view`: o requisito "Status da sincronização no topo" passa a exigir área de toque de pelo menos 44 px de altura.

## Impact

- **Backend:** `backend/src/modules/transactions/` (rota, service e consulta de totais por filtro, reaproveitando `buildConditions` e `transactionTypeCondition`); testes de integração.
- **Frontend:** `frontend/src/features/transactions/` (barra de filtros, resumo, consulta), `frontend/src/lib/api/transactions.ts` (schema do resumo), `frontend/src/components/sync-status.tsx` (área de toque); testes dos componentes.
- **Docs:** `docs/03-arquitetura.md` (tabela de endpoints), `docs/06-design-system.md` (a tela de Transações e o status da sincronização); `docs/01-produto.md` só se a descrição dos filtros precisar mudar.
- **Roadmap:** `docs/07-roadmap.md` já marca como feitos os itens "Transações" da v1 (lista agrupada, filtros, pesquisa, detalhe); esta change é um refinamento deles, sem item novo a marcar.
- **Dependências novas:** nenhuma.

## Fora do escopo

- Ordenação, seleção em lote, atalhos de teclado e filtros salvos.
- Trocar categoria direto da linha e "Desfazer" na exclusão (problemas P2 e P3 da crítica, para outra change).
- Truncamento de descrição no celular, valores muito longos e ocultar valores nas linhas (a conferir à parte).
- Exportar transações (CSV) e busca fora da descrição.
- Nada disso contraria o "Fora do escopo" de `docs/01-produto.md`: a change não adiciona IA, multiusuário, carteira com saldo nem movimentação de dinheiro. Também não contraria nenhum outro documento de `docs/` nem o `CLAUDE.md`.
