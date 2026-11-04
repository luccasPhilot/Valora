## Context

O Início junta dados de várias changes:
- saldos (`accounts-screen`);
- orçamentos (`budgets`);
- transações (`transactions-screen`);
- o formulário de lançamento (`manual-transactions`).

O Design System define a ordem dos blocos, os atalhos, as regras dos gráficos (paleta validada, slots em sequência, texto fora da cor da série) e a lista de categorias numa cor só.

## Goals / Non-Goals

**Goals:**
- Uma requisição para o Início inteiro.
- Os mesmos números que as telas de Contas, Orçamentos e Transações mostram.

**Non-Goals:**
- Projeção, metas, alertas e patrimônio com investimentos.

## Decisions

**1. Um endpoint agregado, `GET /dashboard`.**
- O service chama os services existentes (totais de contas, gasto por categoria, `budgetStatus`, consulta de transações) e monta o DTO.
- *Alternativa:* várias requisições do front criariam um efeito cascata de carregamento e espalhariam regras.

**2. Regras reutilizadas, não reescritas.**
- Saldo total: service de totais de `accounts-screen`.
- Gasto por categoria: repository de `budgets`.
- Receitas e despesas: filtro de tipo compartilhado de `transactions-screen`.
- Um teste de integração confere que o Início e cada tela dão o mesmo número com os mesmos dados.

**3. Evolução do saldo a partir das fotos.**
`balance_snapshots` agrupado por data, somando só as contas incluídas no saldo total. Dias sem foto não aparecem; o gráfico liga os pontos existentes.

**4. Recharts pelos gráficos do shadcn/ui.**
- `ResponsiveContainer` com altura fixa por faixa de tela.
- Barras com topo arredondado de 4 px e 2 px de espaço; linha de 2 px; área com a cor da série a 15%.
- Cores pelos tokens `--chart-1` e `--chart-2`.
- *Alternativa:* desenhar SVG à mão daria mais controle, mas mais código para tooltip e acessibilidade.

**5. Lista de categorias sem biblioteca de gráfico.**
São barras de HTML e CSS (`div` com largura percentual), mais simples, acessíveis e fáceis de deixar responsivas.

**6. Recarga depois de lançar.**
O formulário de `manual-transactions` invalida as consultas `dashboard`, `transactions` e `budgets` ao salvar.

**7. Grade.**
- CSS Grid com `grid-cols-1`, `md:grid-cols-2` e `lg:grid-cols-12`.
- Os blocos ocupam spans fixos no computador (card de saldo `lg:col-span-7`, números do mês `lg:col-span-5`, e assim por diante).
- A ordem no DOM é a do celular, para leitores de tela e teclado.

## Risks / Trade-offs

- [Endpoint agregado lento com muitos dados] → Todas as consultas são do mês ou de 6 meses, com índices por data; para o volume de um usuário fica bem abaixo de 1 segundo.
- [Variação do saldo enganosa no início do uso, com poucas fotos] → A variação só aparece com uma foto anterior a hoje no mês; antes disso, o card mostra só o saldo.
- [Recharts e tokens CSS no tema escuro] → As cores vêm das variáveis CSS, que mudam com a classe `dark`; conferir nos dois temas faz parte das tarefas.

## Open Questions

Nenhuma.
