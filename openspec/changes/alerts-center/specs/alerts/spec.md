## ADDED Requirements

### Requirement: Alerta de orçamento
O sistema MUST criar um alerta `budget_warning` quando o status do orçamento de uma categoria no mês atual for `warning` e um alerta `budget_exceeded` quando for `exceeded`, usando as mesmas regras de status da tela de Orçamentos. Deve existir no máximo um alerta ativo por tipo, categoria e mês. Quando o orçamento passar de `warning` para `exceeded`, o alerta `budget_warning` da categoria MUST ser resolvido. Quando o status voltar a `ok`, ou o limite for removido, os alertas ativos da categoria e do mês MUST ser resolvidos.

#### Scenario: Chegou a 80%
- **WHEN** o limite de "Mercado" em novembro é R$ 1.000,00 e o gasto passa a ser R$ 800,00
- **THEN** nasce um alerta `budget_warning` com "Mercado chegou a 80% do orçamento de novembro"

#### Scenario: Abaixo de 80%
- **WHEN** o gasto é R$ 799,99 de um limite de R$ 1.000,00
- **THEN** nenhum alerta é criado

#### Scenario: Estourou
- **WHEN** o gasto passa a ser R$ 1.000,01
- **THEN** nasce um alerta `budget_exceeded` e o `budget_warning` da mesma categoria é resolvido

#### Scenario: Sincronizar de novo
- **WHEN** a avaliação roda outra vez sem mudança de gasto
- **THEN** continua existindo um único alerta ativo

#### Scenario: Estorno
- **WHEN** um estorno devolve o gasto para R$ 700,00
- **THEN** o alerta ativo da categoria é resolvido

#### Scenario: Limite aumentado
- **WHEN** o usuário sobe o limite e o gasto fica abaixo de 80%
- **THEN** os alertas ativos da categoria são resolvidos

#### Scenario: Mês acabou
- **WHEN** o mês do alerta já terminou
- **THEN** o alerta é resolvido na próxima avaliação

### Requirement: Alerta de conexão
O sistema MUST criar um alerta `connection_error` para cada conexão com status `error` ou `consent_expired`, com a mensagem derivada de `status_detail`, no máximo um ativo por conexão. Quando a conexão voltar a `ok`, o alerta MUST ser resolvido. A mensagem MUST NOT conter valores nem descrições de transações.

#### Scenario: Consentimento expirou
- **WHEN** uma conexão passa para `consent_expired`
- **THEN** nasce um alerta `connection_error` ligado a essa conexão

#### Scenario: Banco voltou
- **WHEN** a conexão volta a `ok` na sincronização seguinte
- **THEN** o alerta é resolvido

#### Scenario: Erro que continua
- **WHEN** a conexão continua com erro em várias sincronizações
- **THEN** existe um único alerta ativo

### Requirement: Dispensar não recria o alerta
Um alerta dispensado MUST permanecer dispensado enquanto a situação que o gerou continuar. Quando a situação acabar e voltar, um novo alerta MUST ser criado.

#### Scenario: Dispensado e a causa continua
- **WHEN** o usuário dispensa o alerta de conexão e a conexão continua com erro
- **THEN** a sincronização seguinte não cria outro alerta

#### Scenario: Acabou e voltou
- **WHEN** a conexão volta a `ok` e depois falha de novo
- **THEN** nasce um novo alerta

### Requirement: Quando a avaliação roda
O sistema MUST avaliar os alertas ao final de cada sincronização, qualquer que seja o resultado, e MUST reavaliar os alertas de orçamento depois de criar, editar ou excluir um lançamento manual, trocar a categoria de uma transação e definir, remover ou copiar limites. Uma falha na avaliação MUST NOT falhar a sincronização nem a operação do usuário.

#### Scenario: Despesa manual que passa de 80%
- **WHEN** o usuário lança uma despesa manual que leva a categoria a 85% do limite
- **THEN** o alerta de orçamento já existe na próxima consulta, sem esperar a sincronização

#### Scenario: Banco com erro na sincronização
- **WHEN** um banco falha e a execução termina como `partial`
- **THEN** o alerta de conexão desse banco é criado

#### Scenario: Avaliação falha
- **WHEN** a avaliação lança um erro
- **THEN** a sincronização termina com o resultado que teria, com `alerts_failed` nas estatísticas, e o log não contém valores

### Requirement: API de alertas
`GET /api/v1/alerts` MUST listar os alertas ativos (não dispensados e não resolvidos), mais recentes primeiro, paginados, com `unreadCount`. Cada item MUST trazer tipo, mensagem, datas e o destino na interface, sem expor dados internos. `POST /api/v1/alerts/:id/read`, `POST /api/v1/alerts/read-all` e `POST /api/v1/alerts/:id/dismiss` MUST ser idempotentes. Um id inexistente MUST responder 404.

#### Scenario: Listar com não lidos
- **WHEN** há 3 alertas ativos e 1 já lido
- **THEN** a lista traz os 3 e `unreadCount` vale 2

#### Scenario: Ler todos
- **WHEN** o usuário marca todos como lidos
- **THEN** `unreadCount` passa a 0 e os alertas continuam na lista

#### Scenario: Dispensar
- **WHEN** o usuário dispensa um alerta
- **THEN** ele sai da lista e do contador

#### Scenario: Id inexistente
- **WHEN** o id não existe
- **THEN** a API responde 404 `NOT_FOUND`

### Requirement: Sino de alertas
O cabeçalho do app MUST mostrar o sino com o contador de não lidos ("9+" acima de 9) e `aria-label` com a contagem. Ao abrir, MUST listar os alertas com ícone e texto, data relativa, a ação para a tela relacionada e "Dispensar", e MUST permitir "Marcar todos como lidos". Abrir um alerta MUST marcá-lo como lido. MUST ter os estados carregando, vazio e erro e funcionar de 320 px a 1440 px nos dois temas.

#### Scenario: Contador
- **WHEN** há 12 alertas não lidos
- **THEN** o sino mostra "9+" e o `aria-label` diz "Alertas, 12 não lidos"

#### Scenario: Ir para o orçamento
- **WHEN** o usuário aciona "Ver orçamento" num alerta de orçamento
- **THEN** o app abre a tela de Orçamentos no mês do alerta e o alerta fica lido

#### Scenario: Sem alertas
- **WHEN** não há alertas ativos
- **THEN** o painel mostra "Nenhum alerta" e o sino não mostra contador

#### Scenario: Tipo sem ícone próprio
- **WHEN** chega um alerta de um tipo que a interface ainda não conhece
- **THEN** o painel o mostra com o ícone genérico e a mensagem, sem quebrar
