## 1. Preparação

- [ ] 1.1 Carregar as skills `/frontend-design:frontend-design` e `/ui-ux-pro-max`, e reler `docs/06-design-system.md` e `docs/design/`
- [ ] 1.2 Transformar o `frontend/` (criado pela `setup-repository`) num app Vite + React, com React Router, TanStack Query e o proxy `/api` para a API
- [ ] 1.3 Instalar Tailwind v4 (`@tailwindcss/vite`) e inicializar o shadcn/ui em `src/components/ui`
- [ ] 1.4 Configurar o Vitest do `frontend` (o `vitest.config.ts` já existe) com jsdom e Testing Library
- [ ] 1.5 Implementar `todayInSaoPaulo` em `frontend/src/lib/dates.ts`, com os mesmos testes de fuso do backend (inclusive o servidor em UTC perto da meia-noite)

## 2. Design System

- [ ] 2.1 Copiar os tokens da seção "Tokens em CSS" do Design System para `src/styles/globals.css`
- [ ] 2.2 Instalar e importar `@fontsource-variable/inter` e `@fontsource-variable/manrope`; definir `font-sans` e `font-display`
- [ ] 2.3 Implementar o provider de tema (Claro, Escuro, Sistema), com o script inline anti-piscada no `index.html` e `lang="pt-BR"`
- [ ] 2.4 Criar o script `check:tokens` (falha com hex em `src/components` e `src/features`) e ligá-lo ao `npm run lint`
- [ ] 2.5 Testes do tema: padrão segue o sistema, escolha manual persiste, funciona sem `localStorage`

## 3. Formatação

- [ ] 3.1 Implementar `formatCurrency`, `formatSignedCurrency` (com U+2212), `formatCompactCurrency` e `formatPercent` em `src/lib/format.ts`
- [ ] 3.2 Implementar `formatDate`, `formatMonth` e `formatDayHeader` (Hoje, Ontem, `ter., 3 de nov.`) usando `todayInSaoPaulo`
- [ ] 3.3 Testes de todos os cenários da spec `value-formatting`, incluindo zero, valor não inteiro e aparelho em UTC

## 4. Layout e navegação

- [ ] 4.1 Implementar o `AppShell` com o `Sidebar` do shadcn/ui: ponto de quebra do `useIsMobile` em 1024 px, painel que abre por cima abaixo disso (300 px, no máximo 85%), menu fixo de 240 px acima; conteúdo com no máximo 1200 px e margens de 16/24/32 px
- [ ] 4.2 Lista única de áreas (nome, ícone, grupo, fase) que alimenta o menu: grupo "Dia a dia" e rodapé com Categorias e regras e Ajustes
- [ ] 4.3 Implementar o topo de tela (botão de menu abaixo de 1024 px, título, espaço do status da sincronização, botão de ocultar valores) e as áreas seguras
- [ ] 4.4 Criar as rotas lazy: Início, Transações, Orçamentos, Contas, Categorias e regras, Ajustes (Ajustes com a escolha de tema)
- [ ] 4.5 Testes: item ativo destacado; no celular o menu abre pelo botão e fecha ao escolher uma área, ao tocar fora e no botão de fechar; no computador o menu fica fixo e o botão de menu não aparece

## 5. Estados e valores

- [ ] 5.1 Criar os componentes `EmptyState`, `ErrorState` (com "Tentar de novo"), skeletons e `DemoBadge`
- [ ] 5.2 Implementar o `HideValuesProvider` e o componente `<Money>` (único jeito de mostrar dinheiro)
- [ ] 5.3 Implementar o `api-client` com o `ApiError` tipado
- [ ] 5.4 Colocar o estado vazio "ainda não está pronta" nas rotas sem funcionalidade
- [ ] 5.5 Testes: ocultar valores troca por `R$ ••••` e persiste; `ErrorState` refaz a consulta

## 6. Conferência visual

- [ ] 6.1 Conferir todas as rotas em 320, 390, 768, 1024 e 1440 px, nos temas claro e escuro, sem rolagem horizontal
- [ ] 6.2 Conferir que nenhuma requisição vai para serviços de fontes externos
- [ ] 6.3 Revisar o layout com `/ui-ux-pro-max` (acessibilidade, foco visível, áreas de toque de 44 px)

## 7. Documentação

- [ ] 7.1 Atualizar a seção "Comandos" do `CLAUDE.md` (rodar o front, `check:tokens`)
- [ ] 7.2 Se algum token mudar, atualizar `docs/06-design-system.md` com o contraste recalculado
- [ ] 7.3 Marcar como `[x]` os itens de "Front-end" da Fase 0 e "Ocultar valores" da Fase 1 em `docs/07-roadmap.md`
