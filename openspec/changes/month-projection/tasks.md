## 1. Regra de cálculo

- [ ] 1.1 `projectEndOfMonth(input)` como função pura: totais, eventos, série diária, ponto mais baixo, saídas antes das entradas no mesmo dia
- [ ] 1.2 Testes: conta completa, realizada e pulada ficam de fora, fatura parcial, fatura no mês seguinte, atrasada entra hoje, entrada e saída no mesmo dia, nada previsto, dia 31 e mês de 28 dias

## 2. API

- [ ] 2.1 `ProjectionService`: buscar saldo total (`calculateAccountTotals`), ocorrências pendentes do mês e faturas não pagas, sem reescrever as regras delas
- [ ] 2.2 Tratar cartão sem vencimento: não estimar e devolver `warnings`
- [ ] 2.3 `GET /api/v1/projection` com DTO e controller com validação Zod
- [ ] 2.4 Testes de integração (Testcontainers): resposta completa com previsões, fatura parcialmente paga, cartão oculto, cartão sem vencimento, mês sem nada

## 3. Bloco de projeção

- [ ] 3.1 Carregar `/frontend-design:frontend-design` e `/ui-ux-pro-max`; reler o Design System (paleta de gráficos, rótulos e números de destaque, uso do vermelho)
- [ ] 3.2 Schemas Zod em `frontend/src/lib/api/` e consulta do TanStack Query
- [ ] 3.3 Cartão do saldo projetado e composição (hoje, previstas, faturas)
- [ ] 3.4 Gráfico de linha do saldo dia a dia (Recharts, primeiro slot da paleta, marcador no ponto mais baixo) e tabela de eventos com "Atrasada"
- [ ] 3.5 Aviso de saldo negativo com ícone e texto; texto fixo sobre o que a projeção não cobre; avisos de `warnings`
- [ ] 3.6 Estados carregando e erro independentes do resto da tela; "Ocultar valores"
- [ ] 3.7 Testes de componente: aviso de negativo com ícone e texto, ausência de vermelho com saldo positivo, atrasada marcada

## 4. Conferência visual

- [ ] 4.1 Conferir em 320, 390, 768, 1024 e 1440 px, nos dois temas, sem rolagem horizontal
- [ ] 4.2 Revisar com `/ui-ux-pro-max`

## 5. Documentação

- [ ] 5.1 Documentar a fórmula e as convenções (atrasadas, saídas primeiro, só faturas) em `docs/01-produto.md`
- [ ] 5.2 Registrar o endpoint e a decisão em `docs/03-arquitetura.md`
- [ ] 5.3 Marcar o item "Projeção do fim do mês" em `docs/07-roadmap.md`, ajustando "parcelas que vencem" para "faturas que vencem" (se aprovado)
