# push-notifications Specification

## Purpose
Notificações push dos alertas e da caixa "Para revisar": chaves VAPID opcionais, inscrição por aparelho, disparo sem dados e a seção "Notificações" em Ajustes.

## Requirements

### Requirement: Push opcional, com chaves só no .env
O push MUST ficar ligado só quando `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT` estiverem no `.env`; a inicialização MUST falhar quando houver só parte delas. Sem as chaves, `GET /api/v1/push/public-key` MUST responder 404 `PUSH_DISABLED`, nenhum push MUST ser enviado e Ajustes MUST NOT mostrar a seção de notificações. As chaves e os endereços das inscrições MUST NOT aparecer nos logs.

#### Scenario: Sem chaves
- **WHEN** o `.env` não tem as variáveis VAPID
- **THEN** a API sobe normalmente, a seção "Notificações" não aparece e nenhum alerta gera push

#### Scenario: Configuração incompleta
- **WHEN** o `.env` tem só `VAPID_PUBLIC_KEY`
- **THEN** a API não sobe e a mensagem cita os nomes das variáveis que faltam, sem valores

### Requirement: Inscrição por aparelho
`POST /api/v1/push/subscriptions` MUST gravar ou atualizar a inscrição pelo `endpoint`, aceitando só `endpoint` `https://` e as chaves da inscrição. `DELETE /api/v1/push/subscriptions` MUST apagar pelo `endpoint`, responder 204 e ser idempotente. `POST /api/v1/push/test` MUST mandar "Notificações do Valora ativadas" para todas as inscrições.

#### Scenario: Dois aparelhos
- **WHEN** o usuário ativa as notificações no iPhone e no computador
- **THEN** existem duas inscrições, e um alerta novo chega nos dois

#### Scenario: Ativar de novo no mesmo aparelho
- **WHEN** o mesmo aparelho envia a mesma inscrição duas vezes
- **THEN** continua existindo uma só

### Requirement: Disparo nos alertas novos
Ao fim de cada avaliação de alertas, o sistema MUST mandar um push para cada inscrição quando a avaliação criou alertas novos: com um alerta, o texto fixo do tipo; com dois ou mais, "{N} alertas novos no Valora". Alertas que já existiam, resolvidos ou dispensados MUST NOT gerar push. Uma falha ao enviar MUST NOT falhar a sincronização nem a operação do usuário. Uma inscrição recusada pelo serviço de push como inexistente (404 ou 410) MUST ser apagada.

#### Scenario: Orçamento estourado
- **WHEN** uma despesa manual leva "Mercado" a 110% do limite e cria o alerta
- **THEN** cada aparelho inscrito recebe "Um orçamento passou do limite", sem o nome da categoria nem o valor

#### Scenario: Vários de uma vez
- **WHEN** a sincronização cria 3 alertas novos
- **THEN** cada aparelho recebe um push só, "3 alertas novos no Valora"

#### Scenario: Alerta que continua
- **WHEN** a sincronização seguinte encontra o mesmo banco ainda com erro
- **THEN** nenhum push é mandado

#### Scenario: Serviço de push fora
- **WHEN** o envio falha por erro de rede durante a sincronização
- **THEN** a sincronização termina com o resultado que teria, e o log tem só o tipo do erro

#### Scenario: Inscrição que não existe mais
- **WHEN** o serviço de push responde 410 para uma inscrição
- **THEN** a inscrição é apagada

### Requirement: Caixa para revisar
Ao fim da sincronização agendada, quando houver 10 ou mais transações para revisar, o sistema MUST mandar "Há transações para revisar", com destino na caixa "Para revisar", no máximo uma vez por dia (fuso de São Paulo).

#### Scenario: Caixa cheia de manhã
- **WHEN** a sincronização das 07:00 deixa 14 transações para revisar
- **THEN** cada aparelho recebe "Há transações para revisar"

#### Scenario: Segunda tentativa no mesmo dia
- **WHEN** a segunda tentativa das 10:00 também termina com a caixa cheia
- **THEN** nenhum push novo de caixa é mandado

### Requirement: Conteúdo sem dados
Todo push MUST ter o título "Valora" e um texto fixo por tipo, e MUST NOT conter valor, descrição de transação, nome de categoria, de banco, de conta, de meta ou de etiqueta.

#### Scenario: Conferência dos textos
- **WHEN** os textos de todos os tipos de alerta são gerados
- **THEN** nenhum contém dígitos de valor, "R$" ou dado vindo do banco de dados

### Requirement: Notificações em Ajustes
Ajustes MUST ter a seção "Notificações" quando o push estiver ligado e o navegador suportar, com "Ativar neste aparelho" (a permissão é pedida no toque), "Enviar teste" e "Desativar". No iPhone fora da tela de início, MUST explicar que é preciso instalar o app. Com a permissão negada, MUST explicar como liberar nos ajustes do sistema. A seção MUST funcionar de 320 px a 1440 px nos dois temas.

#### Scenario: Ativar no iPhone instalado
- **WHEN** o usuário toca em "Ativar neste aparelho" e permite
- **THEN** a seção mostra "Ativado neste aparelho" e "Enviar teste" faz chegar a notificação de teste

#### Scenario: Safari fora da tela de início
- **WHEN** o app é aberto no Safari, sem estar instalado
- **THEN** a seção diz "Instale o Valora na tela de início para receber notificações"
