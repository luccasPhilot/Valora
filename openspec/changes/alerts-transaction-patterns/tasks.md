## 1. Detectores

- [ ] 1.1 `detectDuplicateCharges(rows, today)` como função pura (mesma conta, descrição e valor; até 3 dias; só postadas do Open Finance; sem parcelas, transferências, `pluggy_category` "Transfer…", abaixo de R$ 5,00 ou fora dos 7 dias)
- [ ] 1.2 Testes de limite: 3 dias entram, 4 não; R$ 5,00 entra, R$ 4,99 não; contas diferentes; pendente; parcelada; manual; Pix ("Transfer - PIX"); 3 cobranças iguais geram 2 alertas
- [ ] 1.3 `detectSubscriptions(rows, today)` como função pura (3 ou mais cobranças em sequência, intervalos de 25 a 35 dias, última com até 45 dias)
- [ ] 1.4 Testes de limite: 25 e 35 dias entram, 24 e 36 não; 45 dias entra, 46 não; só duas cobranças; valores diferentes; encerrada; Pix mensal e taxa de R$ 3,85 não alertam; quarta cobrança não duplica a chave

## 2. Avaliador e dados

- [ ] 2.1 Acrescentar ao avaliador de `alerts-center` o tipo de detector "de evento", que só insere com `ON CONFLICT DO NOTHING` e nunca resolve
- [ ] 2.2 Consulta do repository com as saídas postadas do Open Finance dos últimos 7 meses, só com as colunas necessárias
- [ ] 2.3 Montar `dedupe_key`, `transaction_id` e a mensagem sem valores (descrição limitada a 60 caracteres)
- [ ] 2.4 Rodar os dois detectores no fim da sincronização
- [ ] 2.5 Testes de integração (Testcontainers): sincronizar duas vezes não duplica; alerta dispensado não volta; alerta continua ativo depois de 7 dias; assinatura encerrada não alerta; fixtures anonimizadas sem dados reais

## 3. Sino

- [ ] 3.1 Carregar `/frontend-design:frontend-design` e `/ui-ux-pro-max`; reler o Design System (ícones e status)
- [ ] 3.2 Ícone, texto e destino `transactions` (dia e descrição) dos dois tipos no painel do sino
- [ ] 3.3 Atualizar o schema Zod do item de alerta com o novo destino
- [ ] 3.4 Testes de componente: ícone e texto de cada tipo, "Ver transações" navega com os filtros certos e marca como lido

## 4. Conferência visual

- [ ] 4.1 Conferir o painel do sino em 320, 390, 768, 1024 e 1440 px, nos dois temas, sem rolagem horizontal
- [ ] 4.2 Revisar com `/ui-ux-pro-max`

## 5. Documentação

- [ ] 5.1 Registrar as regras dos dois detectores em `docs/01-produto.md` e a decisão "alertas de evento só inserem" em `docs/03-arquitetura.md`
- [ ] 5.2 Marcar os dois itens de alerta (cobrança duplicada e assinatura) em `docs/07-roadmap.md`
