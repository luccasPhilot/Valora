## MODIFIED Requirements

### Requirement: Ocultar valores
O botão de ocultar valores MUST trocar todo valor em dinheiro da interface por `R$ ••••`. A escolha MUST ficar salva no aparelho. Com os valores ocultos, nenhum valor MUST mudar de cor por ser entrada, saída, resultado ou saldo negativo: todos ficam na cor normal do texto. Os campos de valor dos formulários de edição MUST abrir vazios, com o aviso "Valores ocultos. Deixe em branco para manter o valor atual.", e um campo deixado em branco MUST manter o valor salvo.

#### Scenario: Ocultar
- **WHEN** o usuário toca no botão de ocultar valores
- **THEN** todos os valores em dinheiro visíveis passam a mostrar `R$ ••••`

#### Scenario: Escolha persiste
- **WHEN** os valores estão ocultos e a página é recarregada
- **THEN** os valores continuam ocultos

#### Scenario: Cor não revela a entrada
- **WHEN** os valores estão ocultos e a lista mostra um salário
- **THEN** o valor aparece como `R$ ••••` na cor normal do texto, e não em `positive`

#### Scenario: Saldo negativo oculto
- **WHEN** os valores estão ocultos e o saldo total é negativo
- **THEN** o saldo aparece como `R$ ••••` na cor normal do texto, e não em `destructive`

#### Scenario: Editar orçamento com valores ocultos
- **WHEN** os valores estão ocultos e o usuário abre a edição do limite de "Mercado"
- **THEN** o campo de valor está vazio, com o aviso "Valores ocultos. Deixe em branco para manter o valor atual."

#### Scenario: Salvar em branco
- **WHEN** o usuário salva a edição de uma meta com o campo de valor em branco e os valores ocultos
- **THEN** o valor-alvo continua o mesmo e só os outros campos mudam

## ADDED Requirements

### Requirement: Alvos de toque e nomes acessíveis
O botão "Fechar" dos painéis que vêm de baixo ou do lado e o botão "Vincular" do painel de ocorrência MUST ter pelo menos 44 × 44 px de área de toque. Os ícones oferecidos no seletor de ícone de categoria MUST ter nome acessível em pt-BR. Nas listas de Regras e de Categorias, o nome acessível MUST ficar no botão de ação, e a linha MUST NOT ter um `aria-label` que esconda o texto visível.

#### Scenario: Fechar no celular
- **WHEN** o usuário abre o formulário de uma previsão num celular de 390 px
- **THEN** o botão "Fechar" mede pelo menos 44 × 44 px

#### Scenario: Ícone pelo leitor de tela
- **WHEN** o leitor de tela passa pelo ícone de carrinho no seletor
- **THEN** ele lê "Carrinho de compras", e não o nome do ícone em inglês

#### Scenario: Linha de regra
- **WHEN** o leitor de tela passa pela regra "UBER → Transporte"
- **THEN** ele lê o texto visível da linha, e o botão de ação é lido como "Editar regra UBER"
