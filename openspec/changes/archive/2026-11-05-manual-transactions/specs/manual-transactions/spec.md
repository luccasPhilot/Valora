## ADDED Requirements

### Requirement: Conta "Dinheiro"
Na primeira execução, a API MUST criar uma única conta "Dinheiro" com `type = 'cash'`, sem conexão e com `balance_cents` nulo. O banco MUST impedir uma segunda conta `cash`. A conta "Dinheiro" MUST ficar fora do saldo total e MUST NOT ganhar foto diária de saldo.

#### Scenario: Primeira execução
- **WHEN** a API inicia sem nenhuma conta `cash`
- **THEN** a conta "Dinheiro" é criada

#### Scenario: Reinício
- **WHEN** a API reinicia
- **THEN** continua existindo uma única conta "Dinheiro"

### Requirement: Lançar transação manual
`POST /api/v1/transactions` MUST aceitar `type` (`income` ou `expense`), `amountCents` (inteiro maior que zero), `description` (1 a 120 caracteres), `date` (até hoje, no fuso de São Paulo), `categoryId` e `accountId`. A transação MUST ser gravada com:
- `source = 'manual'`, `status = 'posted'` e `category_source = 'user'`;
- `pluggy_transaction_id` e `raw` nulos;
- `description_normalized` preenchida;
- valor negativo para despesa e positivo para receita.

A categoria MUST estar ativa e ter o mesmo tipo do lançamento (`expense` ou `income`).

#### Scenario: Gasto em dinheiro
- **WHEN** você lança uma despesa de `amountCents: 1250`, "Pastel", na categoria "Alimentação", conta "Dinheiro", data de hoje
- **THEN** a resposta é 201 e a transação fica gravada com `amount_cents = -1250` e `source = 'manual'`

#### Scenario: Transação que faltou no banco
- **WHEN** você lança uma despesa na sua conta corrente conectada
- **THEN** a transação fica gravada nessa conta com `source = 'manual'`

#### Scenario: Data no futuro
- **WHEN** a data enviada é amanhã
- **THEN** a resposta é 400 com `code: "VALIDATION_ERROR"` apontando o campo `date`

#### Scenario: Categoria do tipo errado
- **WHEN** uma despesa é lançada na categoria "Salário" (tipo `income`)
- **THEN** a resposta é 400 com `code: "VALIDATION_ERROR"` apontando o campo `categoryId`

#### Scenario: Valor zero
- **WHEN** `amountCents` é `0`
- **THEN** a resposta é 400 com `code: "VALIDATION_ERROR"` apontando o campo `amountCents`

### Requirement: Editar transação manual
`PATCH /api/v1/transactions/:id` numa transação manual MUST aceitar `type`, `amountCents`, `description`, `date`, `categoryId` e `accountId`, com as mesmas validações do lançamento. Numa transação do Open Finance, qualquer campo além de `categoryId` e `applyAlways` MUST ser recusado com 409 e `code: "OPEN_FINANCE_READ_ONLY"`.

#### Scenario: Corrigir o valor
- **WHEN** você muda o valor de uma despesa manual de R$ 12,50 para R$ 15,00
- **THEN** a transação passa a ter `amount_cents = -1500`

#### Scenario: Valor de transação do banco
- **WHEN** o `PATCH` tenta mudar `amountCents` de uma transação do Open Finance
- **THEN** a resposta é 409 com `code: "OPEN_FINANCE_READ_ONLY"` e nada muda

### Requirement: Excluir transação manual
`DELETE /api/v1/transactions/:id` MUST apagar uma transação manual e responder 204. Para uma transação do Open Finance, MUST responder 409 com `code: "OPEN_FINANCE_READ_ONLY"`. A interface MUST pedir confirmação antes de excluir.

#### Scenario: Excluir manual
- **WHEN** você confirma a exclusão de uma transação manual
- **THEN** a resposta é 204 e a transação some da lista

#### Scenario: Excluir do banco
- **WHEN** um `DELETE` é feito numa transação do Open Finance
- **THEN** a resposta é 409 com `code: "OPEN_FINANCE_READ_ONLY"`

### Requirement: Sincronização não toca nas manuais
A sincronização MUST NOT alterar nem apagar transações manuais, inclusive as lançadas em contas conectadas dentro da janela de sincronização.

#### Scenario: Manual em conta conectada
- **WHEN** existe uma despesa manual de ontem na conta corrente e a sincronização roda
- **THEN** a despesa manual continua igual

### Requirement: Detectar possível duplicata
Quando a sincronização **insere** uma transação do Open Finance, a API MUST procurar uma transação manual na mesma conta, com o mesmo `amount_cents` e data até 3 dias antes ou depois, que ainda não seja possível duplicata de outra transação. Se houver mais de uma, MUST escolher a de data mais próxima e, em empate, a lançada primeiro. A transação do Open Finance MUST receber `possible_duplicate_of_id` apontando para a manual. A API MUST NOT juntar as duas sozinha.

#### Scenario: Lançou e depois chegou do banco
- **WHEN** você lançou à mão uma despesa de R$ 45,00 no dia 2 na conta corrente e a sincronização insere uma transação de R$ 45,00 do dia 3 na mesma conta
- **THEN** a transação do banco fica marcada como possível duplicata da manual, e as duas continuam na lista

#### Scenario: Valor diferente
- **WHEN** a transação do banco é de R$ 45,10
- **THEN** nenhuma possível duplicata é marcada

#### Scenario: Mais de 3 dias
- **WHEN** a manual é do dia 2 e a do banco é do dia 6
- **THEN** nenhuma possível duplicata é marcada

#### Scenario: Transação já existente
- **WHEN** a sincronização só atualiza uma transação do banco que já existia
- **THEN** a detecção não roda para ela

### Requirement: Resolver possível duplicata
`POST /api/v1/transactions/:id/duplicate-resolution`, chamado na transação do Open Finance, MUST aceitar `action` igual a `merge` ou `keep_both`.
- **`merge`:** numa única transação de banco, a do Open Finance MUST receber a categoria da manual com `category_source = 'user'`, a manual MUST ser apagada e a marcação limpa.
- **`keep_both`:** a marcação MUST ser limpa e as duas MUST continuar.
- Se a transação não tiver possível duplicata pendente, MUST responder 409 com `code: "NO_DUPLICATE_PENDING"`.

#### Scenario: Juntar
- **WHEN** você escolhe "Juntar" numa possível duplicata em que a manual está em "Mercado"
- **THEN** só a transação do banco continua, em "Mercado", com `category_source = 'user'`

#### Scenario: São diferentes
- **WHEN** você escolhe "São diferentes"
- **THEN** as duas transações continuam, sem marcação, e o aviso não volta

#### Scenario: Nada pendente
- **WHEN** a resolução é pedida numa transação sem possível duplicata
- **THEN** a resposta é 409 com `code: "NO_DUPLICATE_PENDING"`

### Requirement: Filtros de origem e de duplicatas
A lista de transações MUST aceitar `source` (`open_finance` ou `manual`) e `possibleDuplicate=true`. Cada item MUST trazer `source` e `possibleDuplicateOfId`.

#### Scenario: Só manuais
- **WHEN** a lista é pedida com `source=manual`
- **THEN** só aparecem transações lançadas à mão

#### Scenario: Duplicatas pendentes
- **WHEN** a lista é pedida com `possibleDuplicate=true`
- **THEN** só aparecem as transações do banco com possível duplicata pendente, e `pagination.total` é a quantidade

### Requirement: Formulário de nova transação
O formulário MUST ter, nesta ordem:
1. tipo (Despesa ou Receita);
2. valor, com foco automático e teclado numérico;
3. descrição;
4. categoria, com busca, mostrando só as categorias ativas do tipo escolhido;
5. conta, com "Dinheiro" já escolhida e as contas e cartões conectados como opção;
6. data, com "Hoje" já escolhido e os atalhos "Ontem" e "Escolher data", sem datas futuras.

O valor MUST ser digitado da direita para a esquerda (digitar `8990` mostra `R$ 89,90`) e virar centavos sem passar por número com casas decimais. O formulário MUST abrir num painel vindo de baixo abaixo de 768 px, num painel lateral de 768 a 1023 px e num diálogo a partir de 1024 px. Erros MUST aparecer embaixo de cada campo, em linguagem simples. Depois de salvar, um aviso MUST confirmar ("Despesa registrada" ou "Receita registrada").

#### Scenario: Digitar o valor
- **WHEN** você digita 8, 9, 9, 0 no campo de valor
- **THEN** o campo mostra `R$ 89,90` e o valor enviado é `amountCents: 8990`

#### Scenario: Apagar dígito
- **WHEN** o campo mostra `R$ 89,90` e você apaga um dígito
- **THEN** o campo mostra `R$ 8,99`

#### Scenario: Salvar sem categoria
- **WHEN** você toca em "Salvar" sem escolher categoria
- **THEN** aparece "Escolha uma categoria" embaixo do campo e nada é enviado

### Requirement: Interface das transações manuais
- A tela de Transações MUST ter o botão "Nova transação" no topo.
- O detalhe de uma transação manual MUST permitir editar (no mesmo formulário) e excluir (com confirmação).
- Transações manuais MUST mostrar o badge "Manual".
- Transações do banco com possível duplicata MUST mostrar o badge "Possível duplicata", em texto `warning` sobre `warning-surface`.
- Quando houver duplicatas pendentes, a tela MUST mostrar no topo uma faixa com a quantidade e um atalho para vê-las.
- O detalhe de uma possível duplicata MUST mostrar as duas transações lado a lado, com "Juntar" e "São diferentes".
- O filtro de origem MUST estar junto dos outros filtros.

Tudo MUST seguir o Design System e funcionar sem rolagem horizontal em 320, 390, 768, 1024 e 1440 px, nos temas claro e escuro.

#### Scenario: Faixa de duplicatas
- **WHEN** existem 2 possíveis duplicatas pendentes
- **THEN** a tela de Transações mostra a faixa "2 possíveis duplicatas para conferir", e tocar nela filtra a lista

#### Scenario: Celular pequeno
- **WHEN** o formulário é aberto com 320 px de largura
- **THEN** todos os campos e o botão "Salvar" ficam visíveis sem rolagem horizontal, com o botão acima da área segura
