# Projeto Valora — Identidade Visual e Design System

Quero desenvolver a identidade visual e a experiência de interface de um aplicativo de finanças pessoais chamado **Valora**.

O nome já está definido e agora quero estabelecer uma identidade visual consistente, moderna, intuitiva e agradável de utilizar.

## 1. Sobre o produto

Valora é um aplicativo completo de gestão de finanças pessoais, com proposta de fintech.

O objetivo é permitir que o usuário tenha controle sobre sua vida financeira em um único lugar, podendo acompanhar receitas, despesas, contas, cartões, orçamentos, metas financeiras e patrimônio.

Não quero que o produto tenha aparência de um sistema administrativo ou de uma planilha financeira. Ele deve parecer um produto digital moderno, com experiência de uso próxima à qualidade de fintechs reconhecidas.

A experiência deve transmitir:
- Clareza e organização.
- Confiança e segurança.
- Simplicidade.
- Controle financeiro.
- Tranquilidade e liberdade.

## 2. Direcionamento visual

A identidade deve seguir uma linha **Clean Fintech + Organic Green**.

Quero um design minimalista, amigável e sofisticado, sem exageros visuais.

### Paleta de cores

O verde deve ser a principal identidade da marca.

Paleta atual (os valores exatos e o contraste de cada par estão no [Design System](../06-design-system.md#paleta-da-marca)):

- Forest Green: #05603A
- Primary Green: #027A48
- Bright Green: #32D583
- Mint: #E7F6EC
- Off-white: #F7F8F7
- Charcoal: #141C17
- Near-black: #0A0A0B

O verde tem vários tons e fica nos detalhes: ação, item ativo, foco e valores positivos. A paleta inicial deste guia era Forest Green #173D32, Primary Green #286B50, Sage Green #75A98A, Mint #DDE9DF, Off-white #F5F6F1 e Charcoal #202923. Ela foi atualizada na change `refresh-visual-identity` para um verde mais vivo e um tema escuro quase preto, com o contraste recalculado.

### Tema claro (Light Mode)

- Fundo principal em off-white.
- Cards e superfícies predominantemente brancos.
- Verde para ações principais, indicadores positivos e elementos de destaque.
- Textos em tons de grafite.
- Bordas discretas e separação visual sutil entre componentes.

### Tema escuro (Dark Mode)

- Fundo quase preto e neutro (#0A0A0B), com cards um degrau mais claros. Todas as superfícies são cinzas sem tom de verde.
- Verde claro e vivo (#32D583) para ações e elementos de destaque, só nos detalhes. O verde não pinta as superfícies grandes.
- Textos claros, com contraste adequado.

Os dois temas precisam compartilhar a mesma identidade visual e oferecer uma experiência igualmente bem trabalhada.

## 3. Linguagem visual

Quero explorar:

- Layouts limpos e bem organizados.
- Bordas bem arredondadas (cards com 20 px, painéis com 24 px, botões com 16 px, chips em pílula).
- Tipografia moderna, como Inter, Geist ou Manrope, com números grandes em destaque e rótulos pequenos em caixa-alta com ícone.
- Ícones consistentes, preferencialmente Lucide.
- Gráficos minimalistas e fáceis de interpretar.
- Microinterações sutis.
- Hierarquia visual bem definida.
- Espaçamentos consistentes.
- Componentes reutilizáveis.

Evite:
- Gradientes.
- Glassmorphism (desfoque de fundo).
- Sombras muito fortes.
- Verde saturado em superfícies grandes (ele fica nos detalhes).
- Muitos elementos competindo pela atenção.
- Cards dentro de cards sem necessidade.
- Aparência genérica de dashboard administrativo.
- Elementos decorativos que não agreguem à experiência.

Quero algo diferenciado pela qualidade dos detalhes, não pela quantidade de efeitos visuais.

## 4. Estrutura do aplicativo

A interface deve contemplar as seguintes áreas:

**Dashboard**
- Saldo total.
- Receitas e despesas do período.
- Evolução do patrimônio.
- Gráfico de receitas versus despesas.
- Distribuição dos gastos por categoria.
- Últimas transações.
- Resumo das metas financeiras.

**Transações**
- Listagem de receitas e despesas.
- Categorias.
- Filtros por período, categoria e tipo.
- Pesquisa.
- Detalhamento de cada transação.

**Contas e cartões**
- Contas bancárias.
- Carteiras.
- Cartões de crédito.
- Saldos individuais e consolidados.

**Orçamentos**
- Limites de gastos por categoria.
- Acompanhamento do consumo.
- Indicadores de proximidade ou ultrapassagem dos limites.

**Metas financeiras**
- Criação de objetivos.
- Valor desejado.
- Valor acumulado.
- Progresso visual.
- Prazo estimado.

**Relatórios**
- Evolução financeira.
- Histórico de receitas e despesas.
- Análise de categorias.
- Evolução patrimonial.

## 5. Experiência do usuário

A experiência precisa ser intuitiva, inclusive para pessoas que não possuem familiaridade com organização financeira.

Priorize:
- Ações principais facilmente acessíveis.
- Informações financeiras importantes em destaque.
- Formulários simples.
- Feedback visual para ações.
- Estados de carregamento, vazio e erro bem trabalhados.
- Responsividade.
- Acessibilidade.
- Consistência entre todas as telas.

O idioma da interface deve ser português brasileiro, com valores em Real (BRL), datas no padrão brasileiro e terminologia financeira adequada.

## 6. Diretrizes de implementação

Antes de começar, analise a estrutura existente do projeto, as tecnologias utilizadas, a arquitetura e os componentes disponíveis.

Não assuma uma stack diferente da existente.

Quero que você estabeleça um Design System para a Valora, contemplando:

- Tokens de cores.
- Tipografia.
- Espaçamentos.
- Bordas e raios.
- Elevações.
- Componentes de interface.
- Variantes de tema claro e escuro.
- Estados de interação.

Crie componentes reutilizáveis e mantenha consistência visual entre as funcionalidades.

Não implemente funcionalidades fictícias apenas para preencher a interface. Respeite a arquitetura e os dados existentes. Quando alguma funcionalidade ainda não estiver implementada, utilize estados demonstrativos claramente identificados.

## 7. Como quero que você trabalhe

Primeiro, analise o projeto e identifique a melhor maneira de introduzir essa identidade visual sem comprometer a arquitetura existente.

Depois, apresente uma proposta objetiva de Design System e estrutura visual.

Em seguida, implemente a identidade de maneira consistente nas telas do aplicativo, começando pelo Dashboard e pelos componentes compartilhados.

Não quero apenas uma tela bonita isolada. Quero que a Valora tenha uma identidade própria e reconhecível em todo o produto.

**Referência principal:** utilize a imagem de identidade visual anexada como inspiração, não como um layout que precisa ser copiado literalmente.

O resultado esperado é um produto com aparência de uma fintech real: moderno, confiável, intuitivo, minimalista e com uma identidade verde marcante.