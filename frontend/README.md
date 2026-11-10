# frontend

Interface do Valora: React + Vite + Tailwind v4 + shadcn/ui. Projeto independente (tem o próprio `package.json` e `package-lock.json`). Visão geral em [docs/03-arquitetura.md](../docs/03-arquitetura.md).

**Status:** base pronta (tokens, temas, menu lateral responsivo, rotas, formatação, estados de tela e ocultar valores). As áreas ainda mostram "ainda não está pronta"; cada uma chega na sua change da Fase 1.

## Comandos

Requisitos: Node 26 (`nvm use` na raiz do repositório).

```bash
cd frontend
npm ci
```

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe o Vite em `http://localhost:5173`, com proxy de `/api` para o backend em `localhost:3000` |
| `npm run build` / `npm run preview` | Verifica os tipos e gera o `dist/` (com o service worker e o manifesto do PWA) / serve o `dist/` localmente. O PWA fica desligado no `npm run dev`: para testar o service worker, use build + preview |
| `npm run typecheck` | Verifica os tipos |
| `npm run lint` / `npm run lint:fix` | `check:tokens` + ESLint / ESLint com correção automática |
| `npm run check:tokens` | Falha se achar cor em hex em `src/components` ou `src/features` (use os tokens) |
| `npm run format` / `npm run format:check` | Prettier |
| `npm test` / `npm run test:watch` | Testes Vitest |

## Onde fica o design

[Design System](../docs/06-design-system.md), [guia de identidade](../docs/design/identidade-visual.md) e o [Figma do Valora](https://www.figma.com/design/MNdGWT8ZnSZkTRxlvoI0Ie/Valora).
