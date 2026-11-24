## Why

Parte dos investimentos não chega pelo Open Finance: fundos da INCO, criptomoedas na Binance e corretoras que o Meu Pluggy não cobre. Hoje eles ficam de fora da tela Investimentos, do patrimônio e das metas vinculadas, e o patrimônio mostrado é menor do que o real. O histórico também não volta: sem foto diária desde já, a curva de patrimônio não terá esses meses.

## What Changes

- **Posição manual de investimento:** o usuário cadastra um investimento (nome, instituição, tipo e valor atual em reais) e atualiza o valor quando quiser. É um complemento, na mesma lógica da conta "Dinheiro", e cobre INCO, Binance e qualquer corretora fora do Open Finance.
- **Tela Investimentos:** botão "Adicionar investimento"; as posições manuais aparecem agrupadas por tipo junto com as do Open Finance, com selo "Manual" e a data da última atualização; novo tipo "Criptomoedas". Posição do Open Finance continua só leitura.
- **API:** `POST /investments`, `PATCH /investments/:id` e `DELETE /investments/:id`, só para posições manuais (as do Open Finance respondem 409 `OPEN_FINANCE_READ_ONLY`). `GET /investments` passa a trazer `source` e `balanceUpdatedOn` em cada item.
- **Foto diária:** cada sincronização grava a foto do dia de todas as posições manuais, repetindo o último valor informado. Sem isso a posição sairia do patrimônio depois de 7 dias sem foto.
- **Patrimônio e metas:** posições manuais entram no total de investimentos, na curva de patrimônio e podem ser vinculadas a metas.
- **Modelo de dados:** `investments` passa a aceitar posição sem conexão (`source`, `connection_id` e `pluggy_investment_id` opcionais, `institution_name`, `balance_updated_on`), do mesmo jeito que a conta "Dinheiro" já não tem conexão.
- **Documentação e regra do projeto:** a regra 9 do `CLAUDE.md` e os documentos em `docs/` passam a prever a posição manual (veja "Contraria documentos" abaixo).

### Contraria documentos (decisão do usuário, já tomada na conversa)

Esta change **contraria** estes trechos, que serão atualizados na mesma change:

- `CLAUDE.md`, regra 9: o lançamento manual hoje só vale para dinheiro em espécie e transações que o Open Finance não trouxe.
- `docs/01-produto.md`: a seção "Lançamento manual" (duas situações apenas), a seção "Investimentos" (só leitura, só bancos e corretoras do Open Finance) e o item "bens que não vêm do Open Finance" em "O que não entra" do patrimônio.
- `docs/02-open-finance.md`: a lista "Fica de fora" diz que cripto não vem; continua verdade, mas passa a apontar para a posição manual.
- `docs/03-arquitetura.md` e `docs/04-modelo-de-dados.md`: tabela `investments` e lista de endpoints.

### Fora do escopo

- Integração automática com a Binance (ou com qualquer corretora) por API. Fica como possível change futura, que preencheria as mesmas posições.
- Aportes, resgates e rentabilidade. O Valora continua guardando só a posição, e a variação dela mistura aporte e rendimento, como já está em `docs/01-produto.md`.
- Quantidade × cotação, conversão de moeda e preço de criptomoedas: o usuário informa o valor já em reais.
- Informar valor numa data passada ou editar fotos antigas.
- Importar planilha ou extrato.
- Nenhum dos itens da seção "Fora do escopo" de `docs/01-produto.md` é afetado: a posição manual **não é carteira de dinheiro com saldo** (a conta "Dinheiro" continua sem saldo), e o app continua sem movimentar dinheiro.

### Roadmap

Item novo na Fase 3 de `docs/07-roadmap.md`: "Investimentos manuais" (INCO, Binance e corretoras fora do Open Finance). Será marcado `[x]` ao arquivar a change.

## Capabilities

### New Capabilities

- `manual-investments`: cadastro, edição de valor, exclusão e foto diária das posições manuais de investimento, e as regras de que a sincronização nunca as altera nem zera.

### Modified Capabilities

- `investments-view`: a lista passa a incluir posições manuais (sem exigir conexão), com `source`, `balanceUpdatedOn`, o tipo "Criptomoedas", o botão de adicionar e os selos na tela.
- `net-worth`: investimentos manuais entram no valor de hoje e nas fotos por dia, sem conexão e nunca como "banco arquivado".
- `savings-goals`: posições manuais podem ser vinculadas a uma meta.

## Impact

- **Banco:** migration em `investments` (colunas novas, `connection_id` e `pluggy_investment_id` passam a aceitar nulo, `CHECK` de coerência por origem). Linhas existentes ficam com `source = 'open_finance'`.
- **Backend:** `modules/investments` ganha escrita (routes, service, repository); `modules/sync` ganha o passo que grava as fotos das posições manuais; `modules/net-worth` e `modules/goals` trocam `innerJoin` com `connections` por `leftJoin` nas consultas de investimentos.
- **Frontend:** `features/investments` (botão, painel de formulário, selos, linha de última atualização) e schemas em `frontend/src/lib/api/`; seletor de vínculo das metas passa a mostrar as posições manuais.
- **Documentação:** `CLAUDE.md`, `docs/01` a `docs/04` e `docs/07-roadmap.md`.
- **Dependências:** nenhuma nova.
