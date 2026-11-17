## ADDED Requirements

### Requirement: Uma rolagem só no formulário
O painel do formulário de nova transação MUST ser a única área com rolagem: a lista de categorias MUST NOT ter altura limitada nem rolagem própria. O botão "Salvar" MUST ficar fixo no rodapé do painel e, no diálogo (a partir de 1024 px), rente à borda de baixo, sem faixa por onde o conteúdo apareça, tanto no topo quanto no fim da rolagem.

#### Scenario: Lista de categorias
- **WHEN** o formulário é aberto e a lista mostra todas as categorias do tipo escolhido
- **THEN** a lista cresce com o conteúdo e só o painel tem barra de rolagem

#### Scenario: Salvar no diálogo
- **WHEN** o formulário abre num diálogo de 1440 px de largura e o conteúdo é mais alto que a tela
- **THEN** o rodapé com o botão "Salvar" fica rente à borda de baixo do diálogo, com a rolagem no topo e no fim
