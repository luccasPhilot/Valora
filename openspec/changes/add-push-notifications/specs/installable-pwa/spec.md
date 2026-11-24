## ADDED Requirements

### Requirement: Receber e abrir notificações
O service worker MUST mostrar a notificação recebida por push com o título, o texto e o ícone do app, e, ao tocar nela, MUST focar uma janela aberta do app e levá-la ao destino da notificação, ou abrir o app nesse destino. O service worker MUST continuar funcionando sem rede como antes.

#### Scenario: Tocar com o app fechado
- **WHEN** chega "Um orçamento passou do limite" com o app fechado e o usuário toca nela
- **THEN** o app abre com o painel de alertas aberto

#### Scenario: Tocar com o app aberto
- **WHEN** o app já está aberto em Transações e o usuário toca em "Há transações para revisar"
- **THEN** a mesma janela vai para a caixa "Para revisar"
