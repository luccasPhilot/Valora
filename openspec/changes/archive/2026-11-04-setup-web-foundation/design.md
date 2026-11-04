## Context

Depende de `setup-repository`, que já criou o projeto `frontend/` com TypeScript, ESLint, Prettier e Vitest. O Design System (`docs/06-design-system.md`) já traz:
- os tokens em CSS no formato do shadcn/ui com Tailwind v4;
- a tipografia (Manrope e Inter) e os raios;
- as regras de responsividade e a navegação.

O CLAUDE.md exige carregar as skills `/frontend-design:frontend-design` e `/ui-ux-pro-max` antes de construir telas, mas o Design System tem prioridade sobre as sugestões delas.

## Goals / Non-Goals

**Goals:**
- Qualquer tela nova já nasce com tokens, temas, layout responsivo, estados e formatação prontos.
- A formatação de valores é a única forma de mostrar dinheiro e datas.

**Non-Goals:**
- Telas com dados, gráficos e PWA.

## Decisions

**1. App de página única com Vite, React e React Router (data router).**
Cada área é uma rota carregada sob demanda (`lazy`).
- *Alternativa:* Next.js traria renderização no servidor, desnecessária para um app pessoal servido por um nginx.

**2. Tailwind v4 com `@tailwindcss/vite` e shadcn/ui.**
- Os componentes do shadcn/ui são copiados para `src/components/ui`.
- O `globals.css` é a cópia exata da seção "Tokens em CSS" do Design System.
- *Alternativa:* uma biblioteca de componentes fechada (MUI, Chakra) dificultaria seguir o Design System à risca.

**3. Tema com um provider próprio.**
- A classe `dark` vai no `<html>`; a escolha fica no `localStorage`, com `try/catch`.
- Um script inline no `index.html` aplica o tema antes da primeira pintura, para não piscar o tema errado.
- *Alternativa:* `next-themes` resolve o mesmo, mas é uma dependência a mais para cerca de 30 linhas de código.

**4. Menu lateral com o `Sidebar` do shadcn/ui.**
- O mesmo componente atende os dois tamanhos: abaixo do ponto de quebra ele vira um painel que abre por cima (`Sheet`); acima, fica fixo.
- O ponto de quebra do hook `useIsMobile` do shadcn/ui muda de 768 para **1024 px**, para bater com o Design System.
- O botão de menu do topo (`SidebarTrigger`) tem `lg:hidden`.
- O estado inicial do hook é lido com `matchMedia` antes da primeira pintura, para o menu não piscar aberto no celular.
- Os itens vêm de uma lista única de áreas com grupo e fase, e só as áreas existentes entram no menu.
- *Alternativas:* uma barra inferior (descartada pelo usuário: o app passa de dez áreas nas fases 2 e 3) ou um `Sheet` próprio para o celular mais um menu separado no computador (duas implementações para manter).

**5. Formatação em `src/lib/format.ts`, com `Intl` e `timeZone: 'America/Sao_Paulo'` fixos.**
- As funções recebem centavos inteiros e validam com `Number.isInteger`.
- O "hoje" vem de `todayInSaoPaulo()` em `frontend/src/lib/dates.ts`, com a mesma regra do backend. As duas partes não dividem código, então a regra é testada nos dois lados.
- O sinal de menos é trocado para `−` (U+2212) depois do `Intl`.

**6. Ocultar valores por contexto.**
- Um `HideValuesProvider` guarda a escolha (no `localStorage`).
- Um componente `<Money cents={...} signed? />` é o único que mostra dinheiro: ele chama a formatação e respeita o ocultar.

**7. Cliente da API.**
- `api-client.ts` usa `fetch`, interpreta o formato padrão de erro e lança um `ApiError` tipado.
- O TanStack Query tem `staleTime` de 60 s e uma nova tentativa em caso de falha.
- O Vite tem proxy de `/api` para a API em desenvolvimento.

**8. Verificação de hex direto.**
Um script `check:tokens` procura `#[0-9a-fA-F]{3,8}` em `src/components` e `src/features` e falha se encontrar. Ele roda junto com o `npm run lint`. O `globals.css` fica de fora da verificação.

**9. Testes.**
- Vitest com jsdom e Testing Library para formatação, tema, ocultar valores e navegação.
- A responsividade é conferida no navegador nas larguras obrigatórias (320, 390, 768, 1024, 1440).

## Risks / Trade-offs

- [O `Intl` pode mudar detalhes de formatação entre versões do Node e dos navegadores (por exemplo, o espaço depois de `R$`)] → Os testes comparam o resultado depois de normalizar o espaço para um espaço comum, e o `<Money>` aplica a mesma normalização.
- [Sem teste automatizado de responsividade, uma regressão pode passar] → Toda change com tela tem uma tarefa de conferência nas cinco larguras. Testes visuais automáticos podem vir depois, se fizerem falta.
- [As skills de design podem sugerir outra paleta ou outra fonte] → O Design System vence; qualquer mudança é proposta ao usuário antes.

## Open Questions

Nenhuma.
