## MODIFIED Requirements

### Requirement: Página não encontrada
Para qualquer endereço do app que não tenha rota, o sistema MUST mostrar a página "404 Página não encontrada" em tela cheia, **sem** o menu lateral nem o topo, com a mensagem "Esta página não existe" e um único botão "Ir para o Início". A página MUST funcionar de 320 px a 1440 px nos dois temas sem rolagem horizontal, MUST respeitar as áreas seguras do celular, MUST NOT mostrar o endereço digitado nem detalhes técnicos. As rotas que já existem MUST continuar abrindo as mesmas telas.

#### Scenario: Endereço que não existe
- **WHEN** o usuário abre `/patrimonio`
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
