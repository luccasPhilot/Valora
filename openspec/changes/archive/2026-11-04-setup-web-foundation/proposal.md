## Why

Todas as telas da v1 precisam do mesmo visual, dos mesmos temas, da mesma navegação responsiva e da mesma formatação de valores. Montar essa base antes das telas garante que o Design System seja aplicado desde o primeiro componente, e não remendado depois.

## What Changes

- Cria o app React + Vite em `frontend`, com Tailwind v4 e shadcn/ui.
- Aplica os tokens do Design System (`docs/06-design-system.md`) e as fontes Inter e Manrope, servidas pelo próprio app.
- Implementa os temas claro e escuro, com a escolha Claro, Escuro e Sistema.
- Implementa o layout base responsivo:
  - menu lateral com as áreas agrupadas, que abre por cima pelo botão de menu abaixo de 1024 px e fica fixo a partir de 1024 px (sem barra inferior);
  - topo de tela;
  - áreas seguras do celular.
- Cria as rotas das áreas da v1 (Início, Transações, Orçamentos, Contas, Categorias e regras, Ajustes), cada uma com um estado vazio explicando que ainda não está pronta.
- Implementa as funções de formatação: moeda, sinal, valores compactos, percentual e datas, sempre em pt-BR e `America/Sao_Paulo`.
- Implementa o "ocultar valores".
- Cria os componentes de estado: carregando (skeleton), vazio, erro e selo "Demonstração".
- Configura o cliente da API e o TanStack Query, com o proxy de desenvolvimento para a API.

Itens do roadmap cobertos (Fase 0 → Front-end):
- React + Vite + Tailwind v4 + shadcn/ui.
- Tokens do Design System no `globals.css`, fontes servidas localmente.
- Temas claro e escuro, com escolha Claro, Escuro e Sistema.
- Layout base responsivo.
- Funções de formatação com testes.
- Componentes base com os estados carregando, vazio e erro.

O "ocultar valores" aparece no roadmap na Fase 1 (Telas). Ele entra aqui porque é parte do topo de todas as telas e da formatação de valores.

## Capabilities

### New Capabilities

- `web-shell`: tokens, temas, fontes, layout e navegação responsivos, rotas, estados de tela e ocultar valores.
- `value-formatting`: formatação de moeda, sinal, percentuais e datas em pt-BR, no fuso de São Paulo.

### Modified Capabilities

Nenhuma.

## Impact

- **Código novo:** `frontend` inteiro: `src/styles/globals.css`, `src/components/ui/`, `src/components/`, `src/lib/format.ts`, `src/lib/api-client.ts`, layout e rotas.
- **Dependências:**
  - `react`, `react-dom`, `react-router`, `@tanstack/react-query`;
  - `tailwindcss` e `@tailwindcss/vite`;
  - componentes do shadcn/ui (Radix);
  - `lucide-react`;
  - `@fontsource-variable/inter` e `@fontsource-variable/manrope`;
  - para testes: `@testing-library/react` e `jsdom`.
- **Documentação:** comandos no `CLAUDE.md`; o `docs/06-design-system.md` é atualizado se algum token for ajustado (com o contraste recalculado).

## Fora do escopo

- Telas com dados reais: cada área chega na sua própria change da Fase 1.
- Gráficos (entram com `dashboard-home`).
- PWA instalável (Fase 2).
- Tela de login (o projeto não tem login na v1).
