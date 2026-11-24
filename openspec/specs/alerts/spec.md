# alerts Specification

## Purpose
Central de alertas: tabela, avaliação idempotente, API e sino no topo. Cobre orçamento em 80% e estourado, conexão caída, cobrança duplicada e assinatura detectada.
## Requirements
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
O sistema MUST criar um alerta `connection_error` para cada conexão **ativa** com status `error`, `consent_expired` ou `item_not_found`, com a mensagem derivada de `status_detail`, no máximo um ativo por conexão. Quando a conexão voltar a `ok`, ou for arquivada, o alerta MUST ser resolvido. A mensagem MUST NOT conter valores nem descrições de transações.

#### Scenario: Consentimento expirou
- **WHEN** uma conexão passa para `consent_expired`
- **THEN** nasce um alerta `connection_error` ligado a essa conexão

#### Scenario: Banco voltou
- **WHEN** a conexão volta a `ok` na sincronização seguinte
- **THEN** o alerta é resolvido

#### Scenario: Erro que continua
- **WHEN** a conexão continua com erro em várias sincronizações
- **THEN** existe um único alerta ativo

#### Scenario: Banco removido do Meu Pluggy
- **WHEN** uma conexão passa para `item_not_found`
- **THEN** nasce um alerta `connection_error` com a mensagem "Este banco foi removido do Meu Pluggy. Remova-o do Valora."

#### Scenario: Banco arquivado
- **WHEN** o usuário arquiva um banco que tem um alerta de conexão ativo
- **THEN** o alerta é resolvido e não volta enquanto o banco estiver arquivado

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

### Requirement: Alerta de cobrança duplicada
O sistema MUST criar um alerta `duplicate_charge` quando uma saída do Open Finance, postada, dos últimos 7 dias, tiver outra saída postada na mesma conta com a mesma descrição normalizada e o mesmo valor, com até 3 dias de diferença. O alerta MUST ser da transação mais recente do par. O sistema MUST NOT considerar transações pendentes, lançamentos manuais, parcelas, transferências (inclusive as de categoria Pluggy iniciada por "Transfer"), valores abaixo de R$ 5,00 nem pares de contas diferentes. Deve existir no máximo um alerta por transação.

#### Scenario: Mesma compra no mesmo dia
- **WHEN** a conta tem duas saídas postadas de R$ 89,90 com a descrição "LOJA EXEMPLO" no mesmo dia
- **THEN** nasce um alerta `duplicate_charge` ligado à transação mais recente

#### Scenario: Dentro da janela
- **WHEN** as duas cobranças iguais têm 3 dias de diferença
- **THEN** o alerta é criado

#### Scenario: Fora da janela
- **WHEN** as duas cobranças iguais têm 4 dias de diferença
- **THEN** nenhum alerta é criado

#### Scenario: Valor diferente
- **WHEN** as cobranças são de R$ 89,90 e R$ 89,91
- **THEN** nenhum alerta é criado

#### Scenario: Valor pequeno
- **WHEN** duas saídas iguais de R$ 4,50 acontecem no mesmo dia
- **THEN** nenhum alerta é criado

#### Scenario: Contas diferentes
- **WHEN** a mesma compra aparece em duas contas diferentes
- **THEN** nenhum alerta é criado

#### Scenario: Pendente
- **WHEN** uma das duas cobranças ainda está pendente
- **THEN** nenhum alerta é criado

#### Scenario: Compra parcelada
- **WHEN** as duas transações são parcelas de compras parceladas
- **THEN** nenhum alerta é criado

#### Scenario: Lançamento manual
- **WHEN** uma das transações é um lançamento manual
- **THEN** nenhum alerta é criado

#### Scenario: Pix para uma pessoa
- **WHEN** duas saídas iguais têm a categoria do Pluggy "Transfer - PIX"
- **THEN** nenhum alerta é criado

#### Scenario: Histórico antigo
- **WHEN** o par de cobranças iguais é de 3 meses atrás
- **THEN** nenhum alerta é criado

#### Scenario: Sincronizar de novo
- **WHEN** a sincronização roda outra vez sem transações novas
- **THEN** continua existindo um único alerta para a transação

### Requirement: Alerta de assinatura detectada
O sistema MUST criar um alerta `subscription_detected` quando houver pelo menos 3 saídas postadas do Open Finance com a mesma descrição normalizada e o mesmo valor em sequência, com 25 a 35 dias entre cobranças consecutivas, e a última delas tiver até 45 dias. O sistema MUST NOT considerar parcelas, transferências (inclusive as de categoria Pluggy iniciada por "Transfer"), valores abaixo de R$ 5,00, pendentes nem lançamentos manuais. O alerta MUST nascer uma vez por descrição e valor, e uma nova cobrança do mesmo grupo MUST NOT gerar outro.

#### Scenario: Três meses seguidos
- **WHEN** há cobranças de R$ 39,90 de "STREAMING EXEMPLO" em 05/08, 04/09 e 05/10 e hoje é 10/10
- **THEN** nasce um alerta `subscription_detected`

#### Scenario: Só duas cobranças
- **WHEN** há apenas as cobranças de 04/09 e 05/10
- **THEN** nenhum alerta é criado

#### Scenario: Intervalo irregular
- **WHEN** as cobranças têm 10 dias e depois 60 dias de intervalo
- **THEN** nenhum alerta é criado

#### Scenario: Valor muda
- **WHEN** as três cobranças têm valores diferentes
- **THEN** nenhum alerta é criado

#### Scenario: Assinatura encerrada
- **WHEN** a última de três cobranças mensais foi há 100 dias
- **THEN** nenhum alerta é criado

#### Scenario: Quarta cobrança
- **WHEN** a assinatura já foi avisada e chega a cobrança do mês seguinte
- **THEN** continua existindo um único alerta

#### Scenario: Pix mensal para uma pessoa
- **WHEN** há um Pix de R$ 30,00 para a mesma pessoa todo mês, com a categoria do Pluggy "Transfer - PIX"
- **THEN** nenhum alerta é criado

#### Scenario: Taxa abaixo do mínimo
- **WHEN** uma cobrança de R$ 3,85 se repete todo mês
- **THEN** nenhum alerta é criado

#### Scenario: Alerta dispensado
- **WHEN** o usuário dispensou o alerta e a próxima cobrança chega
- **THEN** nenhum alerta novo aparece

### Requirement: Alertas de evento não se resolvem sozinhos
Os alertas `duplicate_charge` e `subscription_detected` MUST permanecer ativos até o usuário dispensá-los, independentemente do tempo, e MUST NOT ser resolvidos pelo avaliador.

#### Scenario: Passou o tempo
- **WHEN** a cobrança duplicada fica com mais de 7 dias
- **THEN** o alerta continua ativo até ser dispensado

### Requirement: Sino com os alertas de padrão
O sino de alertas MUST mostrar os dois tipos com ícone e texto próprios e a ação "Ver transações", que MUST abrir a lista de transações filtrada pelo dia e pela descrição do alerta. As mensagens MUST NOT conter valores em dinheiro.

#### Scenario: Abrir uma cobrança duplicada
- **WHEN** o usuário aciona "Ver transações" no alerta de cobrança duplicada
- **THEN** o app abre Transações no dia da cobrança, pesquisando pela descrição, e o alerta fica lido

#### Scenario: Ícone e texto
- **WHEN** o painel mostra um alerta de assinatura
- **THEN** ele traz o ícone de repetição e o texto "Assinatura detectada: <descrição>"

### Requirement: Alerta da foto de 31/12 no próprio dia
Em 31/12 (fuso de São Paulo), ao fim de cada sincronização, o sistema MUST contar as contas de banco ativo (exceto a conta "Dinheiro", inclusive as ocultas dos totais) sem foto de saldo do dia e as posições de investimento de banco ativo ou manuais, com saldo diferente de zero, sem foto do dia. Se a contagem for maior que zero, MUST existir um único alerta ativo `year_end_snapshot_pending`, com a mensagem "Ainda falta a foto de 31/12 de {itens}. Sincronize hoje: ela é a base dos bens e direitos no IR." e destino na tela de Contas. Quando a contagem chegar a zero, ou o dia acabar, o alerta MUST ser resolvido. A mensagem MUST NOT conter valores, nomes de conta nem descrições.

#### Scenario: Um banco falhou na sincronização de 31/12
- **WHEN** a sincronização das 07:00 de 31/12 termina como `partial`, e o banco que falhou tem 2 contas e 1 investimento com saldo
- **THEN** nasce um alerta `year_end_snapshot_pending` com a mensagem "Ainda falta a foto de 31/12 de 2 contas e 1 investimento. Sincronize hoje: ela é a base dos bens e direitos no IR."

#### Scenario: A sincronização seguinte completa as fotos
- **WHEN** o usuário sincroniza de novo em 31/12 e todas as contas e posições ganham a foto do dia
- **THEN** o alerta é resolvido

#### Scenario: Posição resgatada
- **WHEN** a única posição sem foto do dia tem saldo zero
- **THEN** nenhum alerta é criado

#### Scenario: Conta "Dinheiro"
- **WHEN** só a conta "Dinheiro" não tem foto do dia
- **THEN** nenhum alerta é criado

#### Scenario: Outro dia do ano
- **WHEN** a sincronização de 30/12 deixa um banco sem foto
- **THEN** nenhum alerta de foto de 31/12 é criado

### Requirement: Alerta de 31/12 sem foto depois da virada
De 01/01 a 31/01, ao fim de cada sincronização, o sistema MUST contar as contas e posições que deveriam ter foto em 31/12 do ano anterior e não têm, pelos mesmos critérios do alerta do próprio dia, considerando só as contas e posições criadas até 31/12. Se a contagem for maior que zero, MUST criar um alerta de evento `year_end_snapshot_missing` com a mensagem "31/12/{ano} terminou sem a foto de {itens}. Confira esses saldos nos informes de rendimentos dos bancos." e destino na tela de Contas. O alerta MUST NOT ser resolvido sozinho e, depois de dispensado, MUST NOT voltar para o mesmo ano. Na primeira avaliação de 01/01, o alerta `year_end_snapshot_pending` ainda ativo MUST ser resolvido.

#### Scenario: Virada com foto faltando
- **WHEN** 31/12/2026 terminou sem a foto de 2 contas e a sincronização de 01/01/2027 roda
- **THEN** o alerta pendente de 31/12 é resolvido e nasce um alerta `year_end_snapshot_missing` com a mensagem "31/12/2026 terminou sem a foto de 2 contas. Confira esses saldos nos informes de rendimentos dos bancos."

#### Scenario: Sincronizações seguintes em janeiro
- **WHEN** a sincronização de 02/01/2027 roda e 31/12/2026 continua sem as fotos
- **THEN** continua existindo um único alerta `year_end_snapshot_missing`

#### Scenario: Dispensado
- **WHEN** o usuário dispensa o alerta e a sincronização de 03/01/2027 roda
- **THEN** nenhum alerta novo é criado

#### Scenario: API desligada na virada
- **WHEN** a API ficou desligada de 31/12/2026 a 04/01/2027 e a primeira sincronização roda em 05/01/2027
- **THEN** nasce o alerta `year_end_snapshot_missing` de 2026

#### Scenario: Posição cadastrada em janeiro
- **WHEN** uma posição manual foi cadastrada em 10/01/2027 e não tem foto em 31/12/2026
- **THEN** ela não conta para o alerta

#### Scenario: Fevereiro
- **WHEN** a sincronização roda em 01/02/2027
- **THEN** a avaliação não olha 31/12/2026 e nenhum alerta novo de foto de 31/12 é criado

### Requirement: Foto de 31/12 no sino
O sino MUST mostrar os alertas `year_end_snapshot_pending` e `year_end_snapshot_missing` com o ícone de calendário e o rótulo "Foto de 31/12", e a ação MUST abrir a tela de Contas.

#### Scenario: Abrir pelo sino
- **WHEN** o usuário aciona a ação de um alerta de foto de 31/12
- **THEN** o app abre a tela de Contas e o alerta fica lido

