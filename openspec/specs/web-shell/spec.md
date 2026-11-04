# web-shell Specification

## Purpose
Base da interface web: tokens do Design System, temas, fontes locais, menu lateral responsivo, topo de tela, ocultar valores, estados de tela e idioma.

## Requirements

### Requirement: Tokens do Design System
A interface MUST usar os tokens de cor, raio, sombra e fonte definidos em `docs/06-design-system.md`, nos temas claro e escuro. Componentes MUST NOT usar cores em hexadecimal direto; uma verificação automática MUST falhar se encontrar hex em `src/components` ou `src/features`.

#### Scenario: Card no tema claro e no escuro
- **WHEN** um componente usa a classe `bg-card`
- **THEN** o fundo é `#FFFFFF` no tema claro e `#18241E` no tema escuro

#### Scenario: Hex direto num componente
- **WHEN** um arquivo em `src/components` contém `#286B50` numa classe ou estilo
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
- **A partir de 1024 px:** o menu MUST ficar fixo à esquerda, com 240 px, sem botão de menu.
- **Item ativo:** o item da tela atual MUST ficar com fundo `secondary`, texto `secondary-foreground` e rótulo em negrito.

#### Scenario: Celular
- **WHEN** o app é aberto com 390 px de largura
- **THEN** o menu não aparece, o topo mostra o botão de menu, e não há barra inferior

#### Scenario: Abrir e escolher uma área
- **WHEN** o usuário toca no botão de menu e escolhe Orçamentos
- **THEN** o menu abre por cima do conteúdo e, ao escolher Orçamentos, fecha e a tela de Orçamentos abre

#### Scenario: Computador
- **WHEN** o app é aberto com 1440 px de largura
- **THEN** o menu fica fixo à esquerda, o botão de menu não aparece, e o conteúdo tem no máximo 1200 px de largura

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
