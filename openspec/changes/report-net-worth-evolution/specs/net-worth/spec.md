## ADDED Requirements

### Requirement: Link para o relatório de patrimônio
O cartão "Patrimônio" da tela Investimentos MUST ter o link "Ver relatório completo" para `/relatorios/patrimonio`, com área de toque de pelo menos 44 px de altura, funcionando de 320 px a 1440 px sem rolagem horizontal.

#### Scenario: Abrir o relatório
- **WHEN** o usuário aciona "Ver relatório completo"
- **THEN** o app abre `/relatorios/patrimonio`

#### Scenario: Celular estreito
- **WHEN** a largura é 320 px
- **THEN** o link aparece inteiro, com pelo menos 44 px de altura, sem rolagem horizontal
