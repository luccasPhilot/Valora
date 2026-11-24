## Why

A revisão de 18/11/2026 (`docs/08-revisao-e-proximas-fases.md`) achou falhas no front que mostram números velhos ou uma tela sem saída:

- **F1, Alta:** não há error boundary. Uma exceção de render, ou um chunk `lazy` que falha (aba aberta durante um deploy, cache do service worker apagado pelo iOS), cai na tela padrão do React Router, em inglês e com stack. Na PWA instalada não há botão de recarregar.
- **F2, Alta:** salvar uma regra ou um mapeamento do Pluggy recategoriza tudo no backend, mas o front só invalida a lista de regras e `['transactions']`. Início, orçamentos, relatórios, análise de categorias e alertas ficam com números velhos por até 60 s.
- **F3, Média:** outras invalidações faltam (metas não atualizam o Início; previsões não atualizam o Início; lançar transação não atualiza previsões nem faturas), e `['category-rules']` está declarada duas vezes.
- **F4, Média (e a parte do front da P4):** os testes dos relatórios falham por timeout com a máquina fria e passam na execução seguinte. Suíte que falha ao acaso ensina a ignorar falha.
- **F13, Baixa:** `retry: 1` vale também para 4xx e respostas fora do contrato, o que atrasa o erro em 1 s sem chance de dar certo.

## What Changes

- **Erro inesperado numa tela (F1):** a rota do `AppShell` e a rota `*` ganham `errorElement` com o `ErrorState` em pt-BR ("Algo deu errado nesta tela" e "Tentar de novo"), dentro do shell quando o shell está de pé, sem stack nem mensagem técnica. Um erro de import dinâmico (chunk que não carrega) recarrega a página uma vez, sozinho, porque a causa costuma ser uma versão nova publicada.
- **Chaves das consultas num lugar só (F3):** `src/lib/query-keys.ts` com todas as chaves do TanStack Query, e um mapa "o que foi gravado → o que muda" (`invalidationsAfter`), usado por todas as mutations. Acaba a chave declarada duas vezes.
- **Invalidações completas (F2, F3):** salvar, editar ou excluir regra e mapeamento do Pluggy invalida tudo que depende de categoria (lista, resumo, orçamentos, Início, relatórios, análise de categorias, alertas). Metas e previsões invalidam o Início. Lançar, editar ou excluir transação invalida também previsões, projeção e faturas.
- **Repetição só quando pode dar certo (F13):** a consulta é repetida uma vez só em erro de rede e em resposta 5xx. Um 4xx ou uma resposta fora do contrato mostra o erro na hora.
- **Testes estáveis (F4):** respostas padrão para as rotas do shell nos testes, `QueryClient` injetável com `retry: false`, `unstubGlobals: true` no Vitest e asserções de chamada filtradas por URL, em vez de `mock.calls.at(-1)`.

### Contraria documentos

Nenhum.

### Fora do escopo

- F5 (faixa offline), F6 (timeout de fetch e Início travado), F7 (ocultar valores), F8, F9 (lint de hooks), F10, F12, F14 a F17. F7, F8, F15 e F17 estão na `refine-transactions-ux`.
- A parte do backend da P4 (testes da API que passam de 5 s): na última execução completa (24/11/2026) não falhou. Entra se voltar a falhar.
- Mudança de endpoint: nada no `backend/` muda.
- Nenhum item da seção "Fora do escopo" de `docs/01-produto.md` é afetado.

### Roadmap

Não está em `docs/07-roadmap.md`: é a change nº 4 da "Ordem sugerida" de `docs/08`. Ao arquivar, F1, F2, F3, F4 e F13 (e a parte do front da P4) são marcados como resolvidos, assim como as prioridades 8 e 9 do resumo.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `web-shell`: tela de erro inesperado com "Tentar de novo" e recarga automática quando um chunk não carrega; os números de todas as telas acompanham uma gravação; uma consulta só é repetida em erro de rede ou 5xx.

## Impact

- **Frontend:** `app/router.tsx`, `app/query-client.ts`, um componente de erro de rota em `components/states/`, `lib/query-keys.ts` (novo), os `*-queries.ts` de `accounts`, `alerts`, `budgets`, `categories`, `credit-card-bills`, `dashboard`, `goals`, `investments`, `planning`, `reports` e `transactions`, `hooks/use-sync.ts`, `test/setup.ts`, `test/helpers/` e `vitest.config.ts`.
- **Testes:** cada mutation com um teste do que ela invalida; error boundary (exceção de render e chunk que falha); retry por tipo de erro; os testes de relatório reescritos sem timer real vazando.
- **Backend, banco e API:** nada muda.
- **Documentação:** `docs/03-arquitetura.md` (frontend: chaves e invalidações centralizadas) e `docs/08-revisao-e-proximas-fases.md`.
- **Dependências:** nenhuma nova.
