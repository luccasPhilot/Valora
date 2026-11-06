## ADDED Requirements

### Requirement: Manifesto e ícones
O app MUST publicar um manifesto com nome "Valora", idioma `pt-BR`, `start_url` e `scope` `/`, `display` `standalone`, e ícones PNG de 192 e 512 pixels, mais um ícone 512 `maskable` e um `apple-touch-icon` de 180 pixels. As cores `theme_color` e `background_color` MUST ser iguais às dos tokens do Design System. O `index.html` MUST declarar `theme-color` para o tema claro e para o escuro e as meta tags para abrir em tela cheia no iOS.

#### Scenario: Manifesto válido
- **WHEN** o navegador lê o manifesto do app construído
- **THEN** ele encontra o nome, os ícones e `display` `standalone`, e considera o app instalável

#### Scenario: Cores iguais aos tokens
- **WHEN** o teste compara as cores do manifesto com as do `globals.css`
- **THEN** elas são iguais

#### Scenario: Ícone maskable
- **WHEN** o sistema recorta o ícone em círculo
- **THEN** a marca do Valora continua inteira dentro da zona segura

### Requirement: Funcionar sem rede com o app já carregado
O service worker MUST guardar o app (HTML, JS, CSS, fontes e ícones) para que ele abra sem rede, e as rotas do app MUST abrir o mesmo shell. Rotas de `/api/` MUST NOT receber o HTML como resposta.

#### Scenario: Abrir sem rede
- **WHEN** o app já foi aberto uma vez com rede e é aberto de novo em modo avião
- **THEN** a tela abre, no tema escolhido

#### Scenario: Rota interna sem rede
- **WHEN** o usuário abre `/orcamentos` diretamente, sem rede
- **THEN** o app abre na tela de Orçamentos

#### Scenario: API fora do fallback
- **WHEN** uma chamada a `/api/v1/` falha sem rede
- **THEN** ela falha como erro de rede, não devolve o HTML

### Requirement: Cache de leitura da API
O service worker MUST guardar as respostas 200 de `GET /api/v1/*` e MUST servir a guardada quando não houver rede ou a rede passar de 5 segundos. Com rede, MUST preferir a resposta nova. MUST NOT guardar `/api/v1/sync-runs*`, `/api/v1/health` nem qualquer requisição que não seja `GET`. Entradas MUST expirar em 7 dias e o cache MUST ter no máximo 100 entradas.

#### Scenario: Dados da última vez
- **WHEN** o usuário abre o Início sem rede depois de tê-lo aberto com rede
- **THEN** a tela mostra os números da última vez

#### Scenario: Com rede
- **WHEN** há rede e a resposta chega a tempo
- **THEN** a tela mostra a resposta nova, não a guardada

#### Scenario: Status da sincronização
- **WHEN** o app consulta `/api/v1/sync-runs/latest`
- **THEN** a resposta nunca vem do cache

#### Scenario: Escrita
- **WHEN** o app envia um `POST` ou `PATCH`
- **THEN** nada dele é guardado pelo service worker

### Requirement: Dados antigos identificados
Quando o app mostrar dados vindos do cache ou estiver sem rede, MUST exibir o aviso "Sem conexão" com a data e a hora dos dados exibidos, no fuso de São Paulo. O aviso MUST sumir quando a rede voltar e as consultas MUST ser atualizadas.

#### Scenario: Aviso com data e hora
- **WHEN** o app está sem rede e a resposta guardada é de 05/11 às 08:12
- **THEN** o aviso diz "Sem conexão. Mostrando os dados de 05/11 às 08:12."

#### Scenario: Rede voltou
- **WHEN** a conexão é restabelecida
- **THEN** o aviso some e as consultas são refeitas

### Requirement: Escritas exigem rede e não ficam em fila
Criar, editar e excluir MUST tentar na hora e falhar imediatamente sem rede, mostrando "Sem conexão: esta ação precisa de internet". Nenhuma escrita MUST ser guardada para envio posterior. Os botões de sincronizar e de salvar MUST ficar desabilitados enquanto o app estiver sem rede.

#### Scenario: Lançamento sem rede
- **WHEN** o usuário salva um lançamento manual sem rede
- **THEN** a operação falha na hora com a mensagem e nada é enviado depois, quando a rede voltar

#### Scenario: Sincronizar sem rede
- **WHEN** o app está sem rede
- **THEN** o botão "Sincronizar agora" fica desabilitado com a explicação

### Requirement: Atualização do app por aviso
Quando houver uma versão nova do app, MUST aparecer o aviso "Nova versão disponível" com a ação "Atualizar". A versão nova MUST NOT ser aplicada nem recarregar a página sem a ação do usuário.

#### Scenario: Versão nova disponível
- **WHEN** uma versão nova é publicada e o app é aberto
- **THEN** o aviso aparece e a tela atual continua intacta até o usuário tocar em "Atualizar"

#### Scenario: Atualizar
- **WHEN** o usuário toca em "Atualizar"
- **THEN** a página recarrega já na versão nova

### Requirement: Servidor sem cache do service worker e do manifesto
O nginx MUST responder `sw.js` e o manifesto com `Cache-Control: no-cache`, e o manifesto com o tipo `application/manifest+json`. Os arquivos de `/assets/` MUST continuar com cache longo.

#### Scenario: Cabeçalhos
- **WHEN** o navegador pede `/sw.js`
- **THEN** a resposta traz `Cache-Control: no-cache`

### Requirement: Instalação documentada e verificada
A documentação MUST explicar como instalar no iPhone (Safari: Compartilhar → Adicionar à Tela de Início) e no Android (Chrome: Instalar app), pela URL da Tailscale com HTTPS. O app instalado MUST abrir em tela cheia, com o ícone do Valora, respeitando as áreas seguras do celular.

#### Scenario: Instalado no celular
- **WHEN** o usuário instala o app a partir da URL da Tailscale
- **THEN** ele abre pelo ícone, em tela cheia, sem a barra do navegador
