# web-shell Specification

## Purpose
Base da interface web: tokens do Design System, temas, fontes locais, menu lateral responsivo, topo de tela, ocultar valores, estados de tela e idioma.

## Requirements

### Requirement: Tokens do Design System
A interface MUST usar os tokens de cor, raio, sombra e fonte definidos em `docs/06-design-system.md`, nos temas claro e escuro. Componentes MUST NOT usar cores em hexadecimal direto; uma verificação automática MUST falhar se encontrar hex em `src/components` ou `src/features`.

#### Scenario: Card no tema claro e no escuro
- **WHEN** um componente usa a classe `bg-card`
- **THEN** o fundo é `#FFFFFF` no tema claro e `#121214` no tema escuro

#### Scenario: Hex direto num componente
- **WHEN** um arquivo em `src/components` contém `#027A48` numa classe ou estilo
- **THEN** a verificação de tokens falha apontando o arquivo

### Requirement: Temas claro, escuro e sistema
O app MUST oferecer as opções Claro, Escuro e Sistema. O padrão MUST ser Sistema, que segue `prefers-color-scheme`. A escolha MUST ficar salva no aparelho e, se o armazenamento local não estiver disponível, o app MUST funcionar usando Sistema.

#### Scenario: Padrão segue o sistema
- **WHEN** o aparelho está no modo escuro e nenhuma escolha foi salva
- **THEN** o app abre no tema escuro

#### Scenario: Escolha manual persiste
- **WHEN** o usuário escolhe Claro com o aparelho no modo escuro e recarrega a página
- **THEN** o app continua no tema claro

### Requirement: Fontes servidas pelo app
As fontes Inter e Manrope MUST ser servidas pelo próprio app. O app MUST NOT fazer requisições a serviços de fontes de terceiros.

#### Scenario: Carregamento da página
- **WHEN** a página carrega
- **THEN** nenhuma requisição é feita para domínios de fontes externos e os títulos aparecem em Manrope

### Requirement: Navegação por menu lateral
A navegação MUST ser um menu lateral com as áreas agrupadas, e o app MUST NOT ter barra inferior.

- **Conteúdo na v1:** o grupo "Dia a dia" (Início, Transações, Orçamentos, Contas) e, no rodapé do menu, Categorias e regras e Ajustes. O menu MUST mostrar só áreas que já existem.
- **Abaixo de 1024 px:** o menu MUST ficar escondido e abrir por cima do conteúdo, vindo da esquerda, pelo botão de menu no topo da tela. Ele tem 300 px de largura (no máximo 85% da tela) e fundo escurecido atrás. Ele MUST fechar ao tocar fora, no botão de fechar, ao escolher uma área ou com o gesto de voltar.
- **A partir de 1024 px:** o menu MUST ficar fixo à esquerda, com 264 px quando expandido e 72 px quando recolhido, sem o botão de menu do topo e com o botão de recolher (veja "Menu retrátil no computador").
- **Item ativo:** o item da tela atual MUST ficar com fundo `secondary`, texto `secondary-foreground` e rótulo em negrito.

#### Scenario: Celular
- **WHEN** o app é aberto com 390 px de largura
- **THEN** o menu não aparece, o topo mostra o botão de menu, e não há barra inferior

#### Scenario: Abrir e escolher uma área
- **WHEN** o usuário toca no botão de menu e escolhe Orçamentos
- **THEN** o menu abre por cima do conteúdo e, ao escolher Orçamentos, fecha e a tela de Orçamentos abre

#### Scenario: Computador
- **WHEN** o app é aberto com 1440 px de largura
- **THEN** o menu fica fixo à esquerda com 264 px, o botão de menu do topo não aparece, e o conteúdo tem no máximo 1200 px de largura

#### Scenario: Item ativo
- **WHEN** o usuário está na tela de Orçamentos
- **THEN** o item Orçamentos aparece com fundo `secondary` e rótulo em negrito

### Requirement: Sem rolagem horizontal
Nenhuma tela MUST ter rolagem horizontal da página em 320, 390, 768, 1024 ou 1440 px de largura, nos temas claro e escuro.

#### Scenario: Largura mínima
- **WHEN** qualquer rota é aberta com 320 px de largura
- **THEN** a largura do documento não passa da largura da tela

### Requirement: Áreas seguras do celular
O menu, os painéis e qualquer rodapé fixo MUST respeitar `env(safe-area-inset-bottom)`, e o topo MUST respeitar `env(safe-area-inset-top)`.

#### Scenario: iPhone com indicador
- **WHEN** o app roda num aparelho com área segura inferior
- **THEN** o último item do menu e os botões fixos no rodapé ficam acima da área segura

### Requirement: Topo de tela
Toda tela MUST ter um topo com o título da tela e o botão de ocultar valores e, abaixo de 1024 px, o botão de menu à esquerda do título. O espaço do status da sincronização MUST existir no topo, preenchido pela change `accounts-screen`.

#### Scenario: Título
- **WHEN** o usuário abre a tela de Contas com 390 px de largura
- **THEN** o topo mostra o botão de menu, o título "Contas" e o botão de ocultar valores

### Requirement: Ocultar valores
O botão de ocultar valores MUST trocar todo valor em dinheiro da interface por `R$ ••••`. A escolha MUST ficar salva no aparelho.

#### Scenario: Ocultar
- **WHEN** o usuário toca no botão de ocultar valores
- **THEN** todos os valores em dinheiro visíveis passam a mostrar `R$ ••••`

#### Scenario: Escolha persiste
- **WHEN** os valores estão ocultos e a página é recarregada
- **THEN** os valores continuam ocultos

### Requirement: Estados de tela
O app MUST ter componentes reutilizáveis para carregando (skeleton no formato do conteúdo), vazio (ícone, frase e ação), erro (mensagem simples e "Tentar de novo") e o selo "Demonstração". O estado de erro MUST NOT mostrar detalhes técnicos.

#### Scenario: Falha ao carregar
- **WHEN** uma consulta à API falha
- **THEN** a tela mostra o estado de erro com "Tentar de novo", e tocar no botão refaz a consulta

### Requirement: Áreas ainda não prontas
Rotas cuja funcionalidade ainda não foi implementada MUST mostrar um estado vazio dizendo que a área ainda não está pronta, sem nenhum dado inventado.

#### Scenario: Área sem funcionalidade
- **WHEN** o usuário abre Orçamentos antes da change `budgets`
- **THEN** a tela mostra o estado vazio, sem valores nem listas de exemplo

### Requirement: Idioma do documento
O documento HTML MUST declarar `lang="pt-BR"`, e todos os textos da interface MUST estar em português do Brasil.

#### Scenario: Leitor de tela
- **WHEN** um leitor de tela lê a página
- **THEN** ele usa a pronúncia do português do Brasil

### Requirement: Paleta de verdes e tema escuro quase preto
O verde MUST ser a cor dos detalhes, com vários tons: `primary` (verde forte) para botão principal, link, foco e ícone do item ativo, e `positive` para receitas. No tema claro, `secondary` e `accent` MUST ser tons claros de verde (fundo de destaque e hover). No tema escuro, todas as superfícies (`background`, `card`, `popover`, `sidebar`, `muted`, `secondary`, `accent`) e as bordas MUST ser cinzas neutros, sem tom de verde (a diferença entre os canais vermelho, verde e azul de cada cor de até 4 em 255), e o verde MUST aparecer só nos detalhes. No tema escuro, `background` MUST ser `#0A0A0B`. Todo par de texto e fundo dos tokens MUST ter contraste de pelo menos 4,5:1, e `input` sobre `card` e `ring` sobre `background` de pelo menos 3:1, nos dois temas.

#### Scenario: Botão principal
- **WHEN** um botão primário é mostrado
- **THEN** o fundo é `#027A48` com texto `#FFFFFF` no tema claro, e `#32D583` com texto `#04150C` no tema escuro

#### Scenario: Fundo do tema escuro
- **WHEN** o app abre no tema escuro
- **THEN** o fundo da página é `#0A0A0B`

#### Scenario: Superfícies do tema escuro sem verde
- **WHEN** o teste lê os tokens de superfície e de borda do tema escuro
- **THEN** em cada um a diferença entre os canais vermelho, verde e azul é de no máximo 4

#### Scenario: Contraste dos tokens
- **WHEN** o teste de contraste calcula os pares de texto e fundo dos tokens nos dois temas
- **THEN** todos os pares de texto passam de 4,5:1 e `input` e `ring` passam de 3:1

### Requirement: Menu retrátil no computador
A partir de 1024 px, o menu MUST ter um botão no cabeçalho para recolher e expandir. Recolhido, o menu MUST mostrar só os ícones das áreas (cada um com 44 px de área de toque), sem nomes de grupo e sem rótulos, e cada ícone MUST mostrar o nome da área num tooltip ao passar o mouse ou receber o foco. O botão MUST ter nome acessível "Recolher menu" ou "Expandir menu" conforme o estado e `aria-expanded`. A escolha MUST ficar salva no aparelho e, se o armazenamento local não estiver disponível, o menu MUST abrir expandido. Abaixo de 1024 px o botão de recolher MUST NOT aparecer.

#### Scenario: Recolher
- **WHEN** o usuário toca em "Recolher menu" com 1440 px de largura
- **THEN** o menu passa para 72 px, mostra só os ícones, e o botão passa a se chamar "Expandir menu"

#### Scenario: Tooltip do ícone
- **WHEN** o menu está recolhido e o ícone de Orçamentos recebe o foco do teclado
- **THEN** aparece o tooltip "Orçamentos"

#### Scenario: Escolha persiste
- **WHEN** o usuário recolhe o menu e recarrega a página
- **THEN** o menu continua recolhido

#### Scenario: Sem armazenamento local
- **WHEN** o armazenamento local não está disponível
- **THEN** o menu abre expandido e continua podendo ser recolhido

### Requirement: Espaçamento do menu
O menu expandido MUST ter margem interna de 16 px, itens com 44 px de altura separados por 4 px, 24 px entre o grupo "Dia a dia" e o rodapé, e uma linha divisória acima dos itens do rodapé. O cabeçalho do menu MUST ter 72 px de altura.

#### Scenario: Itens do menu
- **WHEN** o menu está expandido com 1440 px de largura
- **THEN** cada item tem 44 px de altura e a distância entre um item e o seguinte é de 4 px

### Requirement: Logotipo do Valora
O cabeçalho do menu MUST mostrar o logotipo do Valora: o símbolo (um "V" formado por duas fitas verdes, uma mais escura e outra mais clara) seguido do nome "Valora" em Manrope 700. Com o menu recolhido, MUST aparecer só o símbolo. O símbolo MUST usar cores de tokens, não hex, e funcionar nos dois temas. O logotipo MUST ter nome acessível "Valora" e MUST ser um link para a tela inicial. O símbolo é a única peça da interface que pode ter degradê.

#### Scenario: Menu expandido
- **WHEN** o menu está expandido
- **THEN** o cabeçalho mostra o símbolo e o nome "Valora"

#### Scenario: Menu recolhido
- **WHEN** o menu está recolhido
- **THEN** o cabeçalho mostra só o símbolo, com nome acessível "Valora"

#### Scenario: Ir para o início
- **WHEN** o usuário toca no logotipo estando em Orçamentos
- **THEN** a tela de Início abre

### Requirement: Cantos arredondados
Os componentes MUST usar a escala de raios do Design System: cards com 20 px, card de saldo e painéis com 24 px, botões e campos com 16 px, e chips e badges em pílula (`9999px`).

#### Scenario: Card
- **WHEN** um card é mostrado
- **THEN** o raio dos cantos é 20 px

#### Scenario: Botão
- **WHEN** um botão é mostrado
- **THEN** o raio dos cantos é 16 px e a altura mínima é 44 px

### Requirement: Rótulo de seção e números de destaque
O app MUST ter o estilo de texto "rótulo de seção": 12 px, peso 600, caixa-alta, espaçamento entre letras de 0,06em, cor `muted-foreground`, com um ícone de 16 px em `primary` à esquerda. O estilo `display` MUST ter 36 px no celular e 48 px a partir de 1024 px, e o estilo `value-lg` 28 px, ambos em Manrope. Valores em listas e tabelas continuam com `tabular-nums`.

#### Scenario: Título de card
- **WHEN** um card de resumo é mostrado
- **THEN** o título aparece em caixa-alta, com ícone verde à esquerda, e o valor aparece abaixo em `value-lg`

#### Scenario: Número de destaque no celular e no computador
- **WHEN** o saldo é mostrado em `display` com 390 px e com 1440 px de largura
- **THEN** o tamanho da fonte é 36 px e 48 px

### Requirement: Escolha de tema em Ajustes
A tela de Ajustes MUST mostrar as opções Claro, Escuro e Sistema como um controle segmentado dentro de um card, com o rótulo de seção "Tema", a opção escolhida destacada em `secondary` com texto `secondary-foreground`, cada opção com 44 px de altura no mínimo e o foco do teclado visível.

#### Scenario: Opção escolhida
- **WHEN** o usuário abre Ajustes com o tema Sistema escolhido
- **THEN** a opção Sistema aparece marcada (`aria-checked="true"`) e as outras duas não

#### Scenario: Trocar de tema
- **WHEN** o usuário toca em Escuro
- **THEN** o app passa para o tema escuro na hora e a opção Escuro fica marcada

### Requirement: Sem gradiente, desfoque ou sombra forte nas superfícies
Cards, menus, topo e botões MUST NOT usar gradiente (`bg-gradient-*`, `bg-linear-*`), desfoque de fundo (`backdrop-blur-*`) nem sombra com opacidade acima de 0,10. A verificação de tokens MUST falhar se encontrar gradiente ou desfoque de fundo em `src/components` ou `src/features`. O preenchimento suave dos gráficos, definido na seção Gráficos do Design System, e o símbolo do logotipo ficam fora desta regra.

#### Scenario: Desfoque no topo
- **WHEN** um arquivo em `src/components` contém `backdrop-blur`
- **THEN** a verificação de tokens falha apontando o arquivo

#### Scenario: Gradiente num card
- **WHEN** um arquivo em `src/features` contém `bg-gradient-to-r`
- **THEN** a verificação de tokens falha apontando o arquivo

### Requirement: Ícone da aba
A página MUST declarar no `index.html` um ícone com o símbolo do Valora, em SVG, e o arquivo apontado pelo ícone MUST existir em `frontend/public/`. O ícone MUST ser só o símbolo, sem o nome, com as cores escritas no próprio arquivo, e MUST ficar legível em abas de navegador claras e escuras.

#### Scenario: Ícone declarado
- **WHEN** o `index.html` é lido
- **THEN** ele contém um `<link rel="icon">` do tipo `image/svg+xml` apontando para `/favicon.svg`

#### Scenario: Arquivo do ícone
- **WHEN** o build é gerado
- **THEN** `dist/favicon.svg` existe e é o símbolo do Valora

#### Scenario: Ícone sem dependência do tema
- **WHEN** o arquivo `favicon.svg` é lido
- **THEN** ele não usa variáveis CSS (`var(`), porque a aba do navegador não enxerga os tokens do app

### Requirement: Página não encontrada
Para qualquer endereço do app que não tenha rota, o sistema MUST mostrar a página "404 Página não encontrada" em tela cheia, **sem** o menu lateral nem o topo, com a mensagem "Esta página não existe" e um único botão "Ir para o Início". A página MUST funcionar de 320 px a 1440 px nos dois temas sem rolagem horizontal, MUST respeitar as áreas seguras do celular, MUST NOT mostrar o endereço digitado nem detalhes técnicos. As rotas que já existem MUST continuar abrindo as mesmas telas.

#### Scenario: Endereço que não existe
- **WHEN** o usuário abre `/investimentos`
- **THEN** a página mostra "404 Página não encontrada" e "Esta página não existe", sem o menu lateral

#### Scenario: Só um caminho de volta
- **WHEN** a página é mostrada
- **THEN** o único link da tela é o botão "Ir para o Início"

#### Scenario: Voltar ao Início
- **WHEN** o usuário aciona "Ir para o Início"
- **THEN** o app abre o Início (`/`)

#### Scenario: Endereço filho de uma rota existente
- **WHEN** o usuário abre `/metas/abc`
- **THEN** a página "404 Página não encontrada" é mostrada, e não a tela de Metas

#### Scenario: Rota existente
- **WHEN** o usuário abre `/orcamentos`
- **THEN** a tela de Orçamentos é mostrada, com o menu, sem a página "404 Página não encontrada"

#### Scenario: Sem rede
- **WHEN** o app já está instalado, não há rede e o usuário abre um endereço sem rota
- **THEN** a página "404 Página não encontrada" é mostrada, e não a tela de erro do navegador

#### Scenario: Celular estreito
- **WHEN** a largura é 320 px
- **THEN** a página cabe na tela, sem rolagem horizontal, e o botão "Ir para o Início" tem pelo menos 44 px de altura
