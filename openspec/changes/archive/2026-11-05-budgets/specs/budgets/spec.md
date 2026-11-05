## ADDED Requirements

### Requirement: Orçamento do mês
`GET /api/v1/budgets?month=AAAA-MM` MUST devolver, para cada categoria com limite no mês:
- `categoryId`, nome e ícone;
- `limitCents`, `spentCents`, `percent` e `status`.

A resposta MUST trazer também os totais do mês (`limitCents` e `spentCents`). Sem `month`, MUST usar o mês atual no fuso de São Paulo. Os itens MUST vir ordenados do maior percentual para o menor.

#### Scenario: Mês com orçamentos
- **WHEN** novembro tem limites para Mercado e Lazer
- **THEN** a resposta traz as duas categorias, com o gasto de cada uma e os totais

#### Scenario: Mês sem orçamentos
- **WHEN** o mês pedido não tem nenhum limite
- **THEN** a resposta traz a lista vazia e os totais zerados

### Requirement: Cálculo do gasto
O gasto de uma categoria no mês MUST ser o valor líquido das suas transações no mês (Open Finance e manuais, inclusive pendentes): a soma dos valores com o sinal invertido, com mínimo de zero. Estornos (valores positivos na categoria) MUST reduzir o gasto.

#### Scenario: Gasto em dinheiro conta
- **WHEN** "Alimentação" tem R$ 300,00 em compras do banco e R$ 25,00 lançados à mão em "Dinheiro"
- **THEN** o gasto de "Alimentação" é `32500`

#### Scenario: Estorno
- **WHEN** "Compras" tem uma compra de R$ 200,00 e um estorno de R$ 50,00 no mês
- **THEN** o gasto de "Compras" é `15000`

#### Scenario: Só estornos
- **WHEN** a categoria só tem um estorno de R$ 30,00 no mês
- **THEN** o gasto é `0`

### Requirement: Status do orçamento
O status MUST ser:
- `ok` quando o percentual gasto for menor que 80%;
- `warning` de 80% até 100%, inclusive;
- `exceeded` acima de 100%.

O percentual MUST ser calculado com os centavos inteiros, sem arredondar antes da comparação.

#### Scenario: Logo abaixo de 80%
- **WHEN** o limite é R$ 1.000,00 e o gasto é R$ 799,99
- **THEN** o status é `ok`

#### Scenario: Exatamente 80%
- **WHEN** o limite é R$ 1.000,00 e o gasto é R$ 800,00
- **THEN** o status é `warning`

#### Scenario: Exatamente no limite
- **WHEN** o limite é R$ 1.000,00 e o gasto é R$ 1.000,00
- **THEN** o status é `warning`

#### Scenario: Um centavo acima
- **WHEN** o limite é R$ 1.000,00 e o gasto é R$ 1.000,01
- **THEN** o status é `exceeded`

### Requirement: Definir e remover limite
`PUT /api/v1/budgets/:categoryId?month=AAAA-MM` com `limitCents` (inteiro maior que zero) MUST criar ou atualizar o limite da categoria no mês. A categoria MUST ser ativa e do tipo `expense`. `DELETE` na mesma rota MUST remover o limite.

#### Scenario: Categoria de receita
- **WHEN** o limite é pedido para "Salário"
- **THEN** a resposta é 400 com `code: "VALIDATION_ERROR"`

#### Scenario: Atualizar limite
- **WHEN** "Mercado" já tem R$ 1.000,00 em novembro e o `PUT` envia `limitCents: 120000`
- **THEN** o limite de novembro passa a R$ 1.200,00, sem criar outro orçamento

### Requirement: Copiar do mês anterior
`POST /api/v1/budgets/copy-previous?month=AAAA-MM` MUST copiar para o mês pedido os limites do mês anterior, só nas categorias que ainda não têm limite no mês pedido e que continuam ativas. A resposta MUST informar quantos limites foram copiados.

#### Scenario: Mês novo
- **WHEN** outubro tem 5 limites, novembro não tem nenhum, e a cópia é pedida para novembro
- **THEN** novembro passa a ter os mesmos 5 limites e a resposta informa 5

#### Scenario: Limite já definido
- **WHEN** novembro já tem limite para "Mercado" e a cópia é pedida
- **THEN** o limite de "Mercado" em novembro não muda

### Requirement: Tela de Orçamentos
A tela MUST ter:
- um seletor de mês (anterior e próximo);
- o resumo "R$ X de R$ Y" do mês;
- uma barra por categoria, com ícone, nome, "R$ gasto de R$ limite", preenchimento na cor do status, ícone e texto do status.

O texto do status MUST ser:
- "R$ 410 de R$ 1.000" (dentro);
- "82% do limite" (atenção);
- "R$ 120 acima do limite" (estourou).

A cor MUST NOT ser a única indicação do status. Tocar numa categoria MUST abrir um painel para editar ou remover o limite e ver as transações da categoria no mês. A tela MUST permitir criar um limite novo, escolhendo uma categoria de despesa sem limite e o valor com o campo de valor do lançamento manual.

#### Scenario: Estourou
- **WHEN** "Lazer" tem limite de R$ 300,00 e gasto de R$ 420,00
- **THEN** a barra aparece cheia em `status-critical`, com o ícone `circle-alert` e o texto "R$ 120 acima do limite"

#### Scenario: Ver transações
- **WHEN** você toca em "Ver transações" no painel de "Mercado" de novembro
- **THEN** a tela de Transações abre filtrada por "Mercado" e novembro

### Requirement: Estados e responsividade
A tela MUST ter:
- carregando (skeleton das barras);
- vazio, com as ações "Copiar do mês anterior" e "Criar orçamento";
- erro.

Ela MUST respeitar o ocultar valores e funcionar sem rolagem horizontal em 320, 390, 768, 1024 e 1440 px, nos temas claro e escuro.

#### Scenario: Mês vazio
- **WHEN** o mês não tem orçamentos
- **THEN** a tela mostra "Nenhum orçamento neste mês" com "Copiar do mês anterior" e "Criar orçamento"
