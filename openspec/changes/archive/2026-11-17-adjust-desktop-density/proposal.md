## Why

No computador, o app parece grande demais: o usuário só fica confortável com o navegador em 80% ou 90% de zoom. As medidas do Design System (texto de 16 px, itens de menu de 44 px, cabeçalho de 72 px) foram pensadas para o toque do celular e valem também com mouse. Além disso, o conteúdo para em 1200 px e deixa faixas vazias nas laterais de telas largas, e o Início tem cards de receitas e despesas que esticam sem conteúdo.

Dois painéis (Detalhes da transação e Nova transação) também tinham uma rolagem dentro da rolagem, por causa da lista de categorias, e o botão "Salvar" ficava solto da borda do diálogo.

## What Changes

- **Densidade no computador:** a partir de 1024 px e só com mouse (`pointer: fine`), o tamanho-base do texto cai de 16 para 14 px (87,5%). Tudo o que é medido em `rem` (texto, espaços, menu, alvos de clique) encolhe junto. Celular, tablet e qualquer tela de toque ficam em 16 px, com os 44 px de área de toque.
- **Largura:** o limite do conteúdo sobe de 1200 px para 110 rem (cerca de 1540 px na escala de 14 px). A altura do cabeçalho de 72 px passa a ser `4,5 rem`, para continuar alinhada ao cabeçalho do menu.
- **Início:** novo card "Resultado do mês" (receitas menos despesas, sem dado novo do backend) ao lado de "Receitas do mês" e "Despesas do mês". Os três dividem a altura dos blocos de saldo e atalhos, sem cards vazios.
- **Painéis com uma rolagem só:** a lista de categorias dos Detalhes da transação e do formulário Nova transação perde o limite de altura com rolagem interna. Só o painel rola.
- **Botão Salvar do diálogo:** no computador, o rodapé do formulário fica rente à borda de baixo do diálogo, sem a faixa de 24 px por onde o conteúdo aparecia.
- **Design System:** [docs/06-design-system.md](../../../docs/06-design-system.md) é atualizado nesta change (tipografia, espaçamento, largura, Dashboard, formulários).

**Contraria documentos existentes** (decisão aprovada pelo usuário em 17/11/2026, depois de testar o resultado): o Design System fixa o texto base em 16 px, a área de toque mínima em 44 px (CLAUDE.md, "Responsividade") e o conteúdo em 1200 px máximos. A regra de toque continua valendo em telas de toque; com mouse os alvos têm 38,5 px (44 px × 0,875).

## Capabilities

### New Capabilities
<!-- Nenhuma. -->

### Modified Capabilities
- `web-shell`: novo requisito de densidade no computador com mouse; a largura máxima do conteúdo passa de 1200 px para 110 rem.
- `home-dashboard`: o layout passa a usar a nova largura e o Início ganha o card "Resultado do mês".
- `manual-transactions`: o formulário de nova transação rola só no painel e mantém o botão "Salvar" rente à borda do diálogo.
- `transactions-view`: o detalhe da transação rola só no painel, com a lista de categorias sem rolagem própria.

## Impact

- **Frontend apenas.** Nenhum endpoint, tabela ou schema muda; o backend não é tocado.
- `frontend/src/styles/globals.css` (base de 14 px com mouse e `--container-content`).
- `frontend/src/components/layout/` (cabeçalho, shell, menu) e banners/skeletons que repetiam `max-w-[1200px]`.
- `frontend/src/features/dashboard/month-summary.tsx` e o teste do Início.
- `frontend/src/features/transactions/` (`category-picker.tsx`, `new-transaction/category-choice.tsx`, `new-transaction/transaction-form.tsx`).
- `docs/06-design-system.md`.
- Gráficos (Recharts) medem fonte em px e não escalam junto com a base de 14 px.

## Fora do escopo

- Escala própria por faixa de largura (por exemplo, base maior em telas acima de 1920 px). A base é um valor só e pode ser ajustado depois.
- Mais colunas no Início em telas muito largas (2xl).
- Trocar a lista de categorias por outro componente (por exemplo, o seletor com popover). Só a rolagem interna sai.
- Nada do "Fora do escopo" de `docs/01-produto.md` é tocado: a change só mexe em medidas e layout de telas já entregues, sem pagamento, IA ou multiusuário.

Roadmap: não cobre um item novo de [docs/07-roadmap.md](../../../docs/07-roadmap.md); é um ajuste de interface sobre as telas da Fase 1 (layout base responsivo e Início), então nenhum item é marcado ao arquivar.
