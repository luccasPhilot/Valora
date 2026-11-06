## 1. Banco

- [ ] 1.1 Tabela `alerts` no Drizzle e migration: `type` com `CHECK` dos cinco tipos, `dedupe_key`, `resolved_at`, índice único parcial em `dedupe_key` onde `resolved_at` é nulo, índice por `created_at`
- [ ] 1.2 Repository de alertas: criar ignorando conflito, resolver por conjunto de chaves, listar ativos paginado, contar não lidos, ler, ler todos, dispensar

## 2. Avaliador

- [ ] 2.1 Funções puras que transformam o orçamento do mês (`budgetStatus`) e o status das conexões no conjunto de situações ativas com `dedupe_key` e mensagem
- [ ] 2.2 `AlertEvaluator` que reconcilia: cria o que falta, resolve o que sumiu, `exceeded` substitui `warning`, resolve alertas de meses passados
- [ ] 2.3 Testes unitários: 799,99 sem alerta, 800,00 `warning`, 1.000,01 `exceeded` e resolve o aviso, estorno resolve, limite removido resolve, conexão `error` e `consent_expired`, conexão `ok` resolve
- [ ] 2.4 Testes de integração (Testcontainers): avaliar duas vezes não duplica, dispensado não volta enquanto a causa continua, volta a nascer depois de resolvido e repetido

## 3. Ligações

- [ ] 3.1 Chamar o avaliador no fim da sincronização, em qualquer resultado; falha vira `alerts_failed` nas estatísticas e log sem valores
- [ ] 3.2 Chamar o avaliador de orçamento nos services de lançamento manual, troca de categoria, juntar duplicata e limites de orçamento, só para os meses afetados e sem falhar a operação principal
- [ ] 3.3 Testes de integração: lançamento manual que passa de 80% cria o alerta; sincronização com banco em erro cria o alerta de conexão; erro do avaliador não falha a sincronização

## 4. API

- [ ] 4.1 `GET /alerts` paginado com `unreadCount` e destino da interface no DTO
- [ ] 4.2 `POST /alerts/:id/read`, `POST /alerts/read-all`, `POST /alerts/:id/dismiss` idempotentes, 404 `NOT_FOUND`
- [ ] 4.3 Testes de integração das rotas: listar com não lidos, ler todos, dispensar, id inexistente, paginação

## 5. Sino de alertas

- [ ] 5.1 Carregar `/frontend-design:frontend-design` e `/ui-ux-pro-max`; reler o Design System (cabeçalho, ícones, status, responsividade)
- [ ] 5.2 Schemas Zod em `frontend/src/lib/api/`, consulta e mutações do TanStack Query; atualizar ao abrir, ao voltar o foco e ao fim da sincronização
- [ ] 5.3 Botão do sino no cabeçalho com contador ("9+") e `aria-label`
- [ ] 5.4 Painel (ancorado em telas largas, folha no celular) com a lista, ícone e texto por tipo, data relativa, ação para a tela relacionada, "Dispensar" e "Marcar todos como lidos"
- [ ] 5.5 Item genérico para tipo desconhecido
- [ ] 5.6 Estados carregando, vazio e erro
- [ ] 5.7 Testes de componente: contador e `aria-label`, ícone e texto por tipo, item genérico, estado vazio, abrir marca como lido

## 6. Conferência visual

- [ ] 6.1 Conferir em 320, 390, 768, 1024 e 1440 px, nos dois temas, sem rolagem horizontal
- [ ] 6.2 Revisar com `/ui-ux-pro-max`

## 7. Documentação

- [ ] 7.1 Documentar `dedupe_key`, `resolved_at` e o índice parcial em `docs/04-modelo-de-dados.md`
- [ ] 7.2 Registrar os endpoints, o passo 7 da sincronização e as decisões (avaliador idempotente, dispensar não recria) em `docs/03-arquitetura.md`
- [ ] 7.3 Descrever os alertas em `docs/01-produto.md` e marcar, em `docs/07-roadmap.md`, os alertas de orçamento e de conexão e o sino
