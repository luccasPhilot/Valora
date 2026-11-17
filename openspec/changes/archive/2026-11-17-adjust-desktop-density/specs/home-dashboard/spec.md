## ADDED Requirements

### Requirement: Resultado do mês
O Início MUST mostrar o card "Resultado do mês" junto de "Receitas do mês" e "Despesas do mês", com o valor de `monthIncomeCents` menos `monthExpenseCents`, calculado no front e sem campo novo na API. O valor MUST usar o sinal da interface (`+` quando positivo, `−` quando negativo), a cor normal do texto (nunca vermelho) e respeitar "Ocultar valores". A partir de 1024 px, os três cards MUST ficar empilhados na coluna da direita com a mesma altura, ocupando a altura dos blocos de saldo e atalhos. Abaixo de 1024 px, receitas e despesas MUST ficar lado a lado quando couberem (a partir de 400 px) e o resultado MUST ocupar a largura toda abaixo deles.

#### Scenario: Resultado positivo
- **WHEN** o mês tem `monthIncomeCents` de `500000` e `monthExpenseCents` de `200000`
- **THEN** o card "Resultado do mês" mostra `+ R$ 3.000,00`

#### Scenario: Resultado negativo
- **WHEN** o mês tem `monthIncomeCents` de `100000` e `monthExpenseCents` de `250000`
- **THEN** o card mostra `− R$ 1.500,00` na cor normal do texto

#### Scenario: Valores ocultos
- **WHEN** o usuário ativa "Ocultar valores"
- **THEN** o card "Resultado do mês" não mostra o valor

## MODIFIED Requirements

### Requirement: Layout responsivo
O Início MUST ter uma coluna abaixo de 768 px, duas colunas de 768 a 1023 px e, a partir de 1024 px, uma grade de 12 colunas com a largura máxima do conteúdo definida em "Navegação por menu lateral":
- primeira linha: card de saldo e números do mês (receitas, despesas e resultado);
- segunda linha: gráfico e categorias;
- terceira linha: orçamentos e transações.

O Início MUST funcionar sem rolagem horizontal em 320, 390, 768, 1024 e 1440 px, nos temas claro e escuro.

#### Scenario: Celular pequeno
- **WHEN** o Início é aberto com 320 px
- **THEN** os blocos ficam em uma coluna, os gráficos ocupam a largura do card, e nenhum valor em dinheiro é cortado

#### Scenario: Computador sem cards vazios
- **WHEN** o Início é aberto com 1440 px e mouse
- **THEN** os cards de receitas, despesas e resultado têm a mesma altura e juntos ocupam a altura dos blocos de saldo e atalhos, sem espaço vazio dentro deles
