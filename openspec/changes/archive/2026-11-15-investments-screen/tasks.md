## 1. Banco e sincronização

- [x] 1.1 Coluna `subtype` em `investments` no Drizzle e migration nova (`npm run db:generate`), com `UPDATE` que preenche as linhas existentes a partir de `raw->>'subtype'`
- [x] 1.2 `pluggyInvestmentSchema` com `subtype` opcional; `PluggyClient` e `SyncedInvestment` levam o `subtype`
- [x] 1.3 `InvestmentsRepository.upsertWithSnapshots` grava o `subtype`, zera os investimentos da conexão que não vieram (e grava a foto `0`) e deixa de sair cedo quando a lista vem vazia
- [x] 1.4 Testes de integração (Testcontainers, fixtures anonimizadas): subtipo gravado, investimento que sumiu zerado com foto `0`, lista vazia zera tudo, banco com erro não altera, volta depois de sumir, rodar duas vezes não duplica foto

## 2. API

- [x] 2.1 `groupInvestments(positions)` puro: agrupamento por tipo, totais, percentuais com uma casa, ordem dos grupos e itens, total zero; testes unitários de cada caso
- [x] 2.2 `InvestmentsRepository` de leitura (posições de conexões ativas com o nome da instituição, usando `active-connection.ts`), `InvestmentsService` e rota `GET /investments` com DTO sem `raw` nem id do Pluggy
- [x] 2.3 Testes de integração: banco arquivado fora do total, posição zerada em `closedCount`, ordem, resposta sem investimentos
- [x] 2.4 Teste de rota com `app.inject()` (formato da resposta e ausência de campos internos)

## 3. Tela de Investimentos

- [x] 3.1 Carregar `/frontend-design:frontend-design` e `/ui-ux-pro-max`; reler o Design System (lista de barras, cartão de resumo, estados, responsividade)
- [x] 3.2 Schemas Zod em `frontend/src/lib/api/investments.ts` e consulta do TanStack Query
- [x] 3.3 `investment-labels.ts` (tipos e subtipos em português, fallback para "Outros"), com testes
- [x] 3.4 Nova área "Investimentos" em `areas.ts`, rota `/investimentos` e item no menu depois de Contas
- [x] 3.5 Cartão de resumo, lista de barras por tipo numa cor só e seções com as posições
- [x] 3.6 Linha de rodapé das posições zeradas; estados carregando, vazio ("Ver contas") e erro; "Ocultar valores"
- [x] 3.7 Atualizar `not-found-page.test.tsx` para usar `/patrimonio` como endereço inexistente
- [x] 3.8 Testes de componente: grupos e ordem, rótulo de tipo desconhecido, estado vazio, valores ocultos, rodapé de zeradas

## 4. Conferência visual

- [x] 4.1 Conferir em 320, 390, 768, 1024 e 1440 px, nos dois temas, sem rolagem horizontal (inclusive com nome de investimento longo)
- [x] 4.2 Revisar com `/ui-ux-pro-max`

## 5. Documentação

- [x] 5.1 `docs/04-modelo-de-dados.md`: coluna `subtype` e a regra de zerar a posição que sumiu; tirar "tela só na v3" do título de `investments`
- [x] 5.2 `docs/03-arquitetura.md`: endpoint `GET /investments`, a etapa 6 da sincronização (posição que sumiu) e as decisões (sem paginação; posição que sumiu = zerada)
- [x] 5.3 `docs/01-produto.md`: seção curta "Investimentos" (agrupamento, o que entra, zeradas); `docs/06-design-system.md`: tela de Investimentos; `docs/07-roadmap.md`: marcar o item "Investimentos"; `docs/07-roadmap.md` (Fase 2, 404): trocar o exemplo `/investimentos`
