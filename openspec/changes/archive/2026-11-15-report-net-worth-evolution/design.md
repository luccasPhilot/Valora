## Context

`net-worth-evolution` já calcula o patrimônio por mês no servidor (`GET /net-worth?from=&to=`: `points` com as quatro cifras, `current`, `firstSnapshotDate`) e o cartão de Investimentos o mostra em 6 ou 12 meses. O relatório é a mesma informação com o período dos relatórios, a composição e a tabela. Nenhuma regra nova: tudo que muda é apresentação.

## Goals / Non-Goals

**Goals:**
- O relatório e o cartão da tela Investimentos mostrarem os mesmos números para o mesmo mês.
- Mostrar de que o patrimônio é feito (contas, investimentos, faturas) sem inventar cor por tipo.

**Non-Goals:**
- Qualquer regra de cálculo, endpoint novo ou tipo de investimento por série.

## Decisions

**1. Reaproveitar `GET /net-worth`; nenhuma conta no front.**
- O período vira `from`/`to` pelo mesmo conversor dos outros relatórios. Os pontos já vêm prontos; o front só formata. Os únicos números derivados no front são aritmética de apresentação sobre o que a API devolveu: a **variação no período** (último ponto − primeiro ponto, e o percentual sobre o valor absoluto do primeiro, nulo se zero) e a **parte em investimentos** (`investimentos ÷ (contas + investimentos)`). Se isso virar regra de negócio, vai para o servidor.
- *Alternativa:* um endpoint `/reports/net-worth`. Descartada: duplicaria `GET /net-worth` sem acrescentar regra.

**2. Números do topo.**
- "Patrimônio hoje": `current.netWorthCents` (vermelho só se negativo).
- "Variação no período": primeiro ponto do período até o último, em reais e em percentual, com ícone e `+`/`−`, e o texto "desde 04/11" (a data do primeiro ponto). Sem 2 pontos: "—".
- "Em investimentos": percentual da soma de contas e investimentos que está em investimentos, com o valor.

**3. Gráficos.**
- **Patrimônio total:** área de série única (slot 1), 2 px, 15% sumindo para 0, eixo X abreviado, tooltip com o mês e o patrimônio. Só com 2 ou mais pontos.
- **Composição:** colunas por mês com três séries nos slots em ordem: Contas (1), Investimentos (2) e Faturas em aberto (3), esta com valores **negativos** (desce abaixo do zero). Legenda sempre; tooltip com as três cifras e o patrimônio do mês. Linha do zero visível. Também só com 2 ou mais pontos.
- Texto nunca na cor da série; mês em andamento marcado em texto; resumos para leitor de tela.
- Com 1 ponto só: no lugar dos gráficos, "O histórico começa em 04/11. Os gráficos aparecem quando houver dois meses de dados." e a tabela já mostra o ponto.

**4. Tabela.**
- `ReportTable`: mês, Contas, Investimentos, Faturas em aberto (com `−`) e Patrimônio, do mais antigo ao mais recente. Mês em andamento marcado em texto. Sem linha de total (patrimônio não se soma entre meses); a última linha é o mês atual.

**5. Nota e o degrau do banco arquivado.**
- Nota fixa abaixo: "Patrimônio = contas + investimentos − faturas em aberto, dos bancos ativos. Um banco removido do Valora sai do patrimônio a partir do dia em que foi arquivado." e "O histórico começa em {data}". Gastos no cartão ainda fora de fatura fechada não entram.

**6. Ligação com a tela Investimentos.**
- O cartão de patrimônio ganha "Ver relatório completo" para `/relatorios/patrimonio`. O período não é levado (o relatório abre no padrão de 12 meses).

**7. Estados.**
- Carregando (skeleton do formato), vazio (sem nenhuma foto: "O patrimônio aparece depois da primeira sincronização" + "Ver contas") e erro ("Tentar de novo"). "Ocultar valores" mascara valores e eixos e mantém os percentuais.

## Risks / Trade-offs

- [Variação no período mistura rendimento e aporte] → A tela fala em "variação do patrimônio", sem prometer rentabilidade; rentabilidade está fora do escopo.
- [Um ponto só nas primeiras semanas] → Estado explicativo e tabela, em vez de um gráfico vazio.
- [O ponto do mês atual muda a cada sincronização] → Marcado "em andamento".
- [Percentual em investimentos some quando contas + investimentos é zero] → Mostra "—".

## Open Questions

Nenhuma.
