# transaction-categorization Specification

## Purpose
Categorização automática das transações: tipos de categoria, categorias padrão, mapeamento das categorias do Pluggy, regras com prioridade, ordem de decisão (usuário, regra, Pluggy, sem categoria), aplicação na sincronização e ao histórico, aprendizado com correções, gestão de categorias e a tela "Categorias e regras".

## Requirements

### Requirement: Tipos de categoria
Toda categoria MUST ter um tipo: `expense` (despesa), `income` (receita) ou `transfer` (transferência interna). Categorias do tipo `transfer` MUST ficar fora de qualquer total de receitas ou despesas.

#### Scenario: Pagamento de fatura
- **WHEN** uma transação de R$ 1.500,00 está na categoria "Pagamento de fatura"
- **THEN** ela não entra no total de despesas do mês

### Requirement: Categorias padrão
Na primeira execução, a API MUST criar as categorias padrão:
- **Despesas:** Moradia, Mercado, Alimentação, Transporte, Saúde, Educação, Lazer, Compras, Assinaturas, Serviços, Impostos e taxas, Saque, Outras despesas.
- **Receitas:** Salário, Rendimentos, Reembolsos, Outras receitas.
- **Transferências:** Pagamento de fatura, Transferência entre contas, Aplicação e resgate.

A criação MUST ser idempotente e MUST NOT recriar uma categoria arquivada ou renomeada por você.

#### Scenario: Primeira execução
- **WHEN** a API inicia com a tabela de categorias vazia
- **THEN** as categorias padrão são criadas com os tipos corretos

#### Scenario: Reinício
- **WHEN** a API reinicia depois de você ter renomeado "Mercado" para "Supermercado"
- **THEN** nenhuma categoria "Mercado" nova é criada

### Requirement: Mapeamento das categorias do Pluggy
Cada categoria do Pluggy MAY estar mapeada para uma categoria do Valora em `pluggy_category_mappings`. A API MUST permitir listar e alterar esse mapeamento. A primeira execução MUST criar o mapeamento inicial.

#### Scenario: Categoria do Pluggy mapeada
- **WHEN** uma transação chega com a categoria do Pluggy mapeada para "Mercado" e nenhuma regra se aplica
- **THEN** a transação fica em "Mercado" com `category_source = 'pluggy'`

#### Scenario: Categoria do Pluggy sem mapeamento
- **WHEN** uma transação chega com uma categoria do Pluggy sem mapeamento e nenhuma regra se aplica
- **THEN** a transação fica sem categoria (`category_id` nulo, `category_source = 'none'`)

### Requirement: Regras de categorização
Uma regra MUST comparar um padrão com a descrição normalizada da transação usando `contains`, `starts_with` ou `equals`. O padrão MUST ser normalizado do mesmo jeito que a descrição antes de comparar. Quando mais de uma regra se aplica, MUST vencer a de maior prioridade e, em empate, a criada mais recentemente.

#### Scenario: Regra "contém"
- **WHEN** existe a regra "contém UBER → Transporte" e chega uma transação `UBER *TRIP 4521`
- **THEN** a transação fica em "Transporte" com `category_source = 'rule'`

#### Scenario: Padrão com acento
- **WHEN** a regra é "começa com Farmácia" e a descrição normalizada é `FARMACIA SAO JOAO`
- **THEN** a regra se aplica

#### Scenario: Duas regras
- **WHEN** "contém UBER → Transporte" tem prioridade 1, "contém UBER EATS → Alimentação" tem prioridade 2, e chega `UBER EATS 123`
- **THEN** a transação fica em "Alimentação"

### Requirement: Ordem de decisão
A categoria efetiva MUST ser decidida nesta ordem:
1. categoria escolhida por você (`category_source = 'user'`), que nunca é trocada automaticamente;
2. regra;
3. mapeamento do Pluggy;
4. sem categoria.

#### Scenario: Regra vence o Pluggy
- **WHEN** uma transação tem categoria do Pluggy mapeada para "Compras" e uma regra a coloca em "Assinaturas"
- **THEN** a transação fica em "Assinaturas" com `category_source = 'rule'`

#### Scenario: Escolha do usuário vence a regra
- **WHEN** uma transação está em "Lazer" com `category_source = 'user'` e uma regra nova diz "Compras"
- **THEN** a transação continua em "Lazer"

### Requirement: Categorização na sincronização
Ao final da sincronização de cada banco, a API MUST categorizar as transações daquele banco com `category_source` igual a `none`, `pluggy` ou `rule`, pela ordem de decisão.

#### Scenario: Transação nova
- **WHEN** a sincronização grava uma transação nova cuja descrição casa com uma regra
- **THEN** ao final da sincronização ela está na categoria da regra

### Requirement: Regra nova aplicada ao histórico
Ao criar ou alterar uma regra, a API MUST reaplicar a ordem de decisão às transações existentes que não têm `category_source = 'user'`.

#### Scenario: Regra criada depois
- **WHEN** existem 10 transações `NETFLIX.COM` sem categoria e você cria a regra "contém NETFLIX → Assinaturas"
- **THEN** as 10 transações passam para "Assinaturas"

### Requirement: Aprender com a correção
O service MUST oferecer uma função que, a partir de uma transação e de uma categoria, cria uma regra `equals` com a descrição normalizada da transação, preenche `learned_from_transaction_id` e aplica a regra ao histórico. Se já existir uma regra com o mesmo padrão e o mesmo tipo de comparação, MUST atualizar a categoria dela em vez de criar outra.

#### Scenario: Regra aprendida
- **WHEN** a função é chamada para a transação `PAG*JOSEDASILVA` com a categoria "Mercado"
- **THEN** existe a regra "igual a PAG*JOSEDASILVA → Mercado", ligada à transação de origem

#### Scenario: Regra já existente
- **WHEN** a função é chamada de novo para a mesma descrição com outra categoria
- **THEN** a regra existente passa a apontar para a nova categoria e nenhuma regra é duplicada

### Requirement: Gestão de categorias
A API MUST permitir criar e editar categorias (nome único, tipo e ícone Lucide) e arquivá-las. Uma categoria arquivada MUST continuar nas transações antigas e MUST NOT aparecer como opção para novas escolhas. Mudar o tipo de uma categoria que já tem transações MUST ser recusado com `code: "CATEGORY_IN_USE"`.

#### Scenario: Nome repetido
- **WHEN** você tenta criar a categoria "Lazer" e ela já existe
- **THEN** a resposta é 409 com `code: "CATEGORY_NAME_TAKEN"`

#### Scenario: Arquivar categoria em uso
- **WHEN** você arquiva "Educação", que tem transações
- **THEN** as transações continuam em "Educação" e a categoria some das opções de escolha

### Requirement: Tela de categorias e regras
A tela "Categorias e regras", acessível pelo rodapé do menu, MUST mostrar:
- as categorias agrupadas por tipo, com ícone;
- as regras, com padrão, tipo de comparação, categoria e prioridade;
- o mapeamento das categorias do Pluggy.

A tela MUST permitir criar, editar e arquivar categorias, e criar, editar e excluir regras. Ela MUST seguir o Design System, ter os estados carregando, vazio e erro, e ser responsiva.

#### Scenario: Criar regra pela tela
- **WHEN** você cria a regra "contém IFOOD → Alimentação" na tela
- **THEN** a regra aparece na lista e as transações existentes que casam com ela mudam de categoria

#### Scenario: Celular
- **WHEN** a tela é aberta com 320 px de largura
- **THEN** não há rolagem horizontal e os formulários abrem num painel vindo de baixo
