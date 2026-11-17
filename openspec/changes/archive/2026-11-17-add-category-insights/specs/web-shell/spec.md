## MODIFIED Requirements

### Requirement: Navegação por menu lateral
A navegação MUST ser um menu lateral com as áreas agrupadas, e o app MUST NOT ter barra inferior.

- **Conteúdo na v1:** o grupo "Dia a dia" (Início, Transações, Orçamentos, Categorias, Contas) e, no rodapé do menu, Categorias e regras (`/categorias-e-regras`) e Ajustes. "Categorias" (`/categorias`) é a análise de gastos; "Categorias e regras" é a configuração. O menu MUST mostrar só áreas que já existem.
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

#### Scenario: Categorias no menu principal
- **WHEN** o app abre com o menu expandido
- **THEN** "Categorias" aparece no grupo "Dia a dia", entre "Orçamentos" e "Contas", e "Categorias e regras" aparece só no rodapé
