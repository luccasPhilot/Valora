## ADDED Requirements

### Requirement: Densidade no computador
Em telas de 1024 px ou mais com ponteiro de precisão (mouse, `pointer: fine`), o tamanho-base do texto MUST ser 14 px (87,5% do padrão do navegador). Como texto, espaços, menu e alvos de clique são medidos em `rem`, todas as medidas em px dos requisitos do app MUST ser lidas na base de 16 px e escalam por 87,5% nesse caso (por exemplo, o menu expandido tem 231 px, os itens do menu 38,5 px e o cabeçalho 63 px). Em telas de toque (`pointer: coarse`) e abaixo de 1024 px, o tamanho-base MUST continuar em 16 px, com área de toque de 44 px. O app MUST NOT usar `zoom` nem `transform: scale` para isso.

#### Scenario: Computador com mouse
- **WHEN** o app é aberto com 1440 px de largura e mouse
- **THEN** o tamanho-base do texto é 14 px e o menu expandido tem 231 px de largura

#### Scenario: Tablet em paisagem com toque
- **WHEN** o app é aberto com 1180 px de largura e só toque
- **THEN** o tamanho-base do texto continua 16 px e os itens do menu têm 44 px de altura

#### Scenario: Celular
- **WHEN** o app é aberto com 390 px de largura
- **THEN** o tamanho-base do texto é 16 px

## MODIFIED Requirements

### Requirement: Navegação por menu lateral
A navegação MUST ser um menu lateral com as áreas agrupadas, e o app MUST NOT ter barra inferior.

- **Conteúdo na v1:** o grupo "Dia a dia" (Início, Transações, Orçamentos, Contas) e, no rodapé do menu, Categorias e regras e Ajustes. O menu MUST mostrar só áreas que já existem.
- **Abaixo de 1024 px:** o menu MUST ficar escondido e abrir por cima do conteúdo, vindo da esquerda, pelo botão de menu no topo da tela. Ele tem 300 px de largura (no máximo 85% da tela) e fundo escurecido atrás. Ele MUST fechar ao tocar fora, no botão de fechar, ao escolher uma área ou com o gesto de voltar.
- **A partir de 1024 px:** o menu MUST ficar fixo à esquerda, com 264 px quando expandido e 72 px quando recolhido (medidas na base de 16 px; veja "Densidade no computador"), sem o botão de menu do topo e com o botão de recolher (veja "Menu retrátil no computador"). O conteúdo MUST ter no máximo 110 rem de largura (1760 px na base de 16 px, 1540 px com mouse) e ficar centralizado.
- **Item ativo:** o item da tela atual MUST ficar com fundo `secondary`, texto `secondary-foreground` e rótulo em negrito.

#### Scenario: Celular
- **WHEN** o app é aberto com 390 px de largura
- **THEN** o menu não aparece, o topo mostra o botão de menu, e não há barra inferior

#### Scenario: Abrir e escolher uma área
- **WHEN** o usuário toca no botão de menu e escolhe Orçamentos
- **THEN** o menu abre por cima do conteúdo e, ao escolher Orçamentos, fecha e a tela de Orçamentos abre

#### Scenario: Computador
- **WHEN** o app é aberto com 1440 px de largura e mouse
- **THEN** o menu fica fixo à esquerda com 231 px (264 px na base de 16 px), o botão de menu do topo não aparece, e o conteúdo tem no máximo 1540 px de largura

#### Scenario: Tela larga
- **WHEN** o app é aberto com 1920 px de largura e mouse
- **THEN** o conteúdo ocupa 1540 px, centralizado, com a mesma margem nos dois lados

#### Scenario: Item ativo
- **WHEN** o usuário está na tela de Orçamentos
- **THEN** o item Orçamentos aparece com fundo `secondary` e rótulo em negrito
