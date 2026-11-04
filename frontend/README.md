# frontend

Interface do Valora: React + Vite + Tailwind v4 + shadcn/ui. Projeto independente (tem o próprio `package.json` e `package-lock.json`). Visão geral em [docs/03-arquitetura.md](../docs/03-arquitetura.md).

**Status:** só o ferramental está pronto (TypeScript, ESLint, Prettier, Vitest). React, Vite e as telas chegam com a change `setup-web-foundation`; os comandos `dev` e `build` aparecem nela.

## Comandos

Requisitos: Node 26 (`nvm use` na raiz do repositório).

```bash
cd frontend
npm ci
```

| Comando | O que faz |
|---|---|
| `npm run typecheck` | Verifica os tipos |
| `npm run lint` / `npm run lint:fix` | ESLint / com correção automática |
| `npm run format` / `npm run format:check` | Prettier |
| `npm test` / `npm run test:watch` | Testes Vitest |

## Onde fica o design

[Design System](../docs/06-design-system.md), [guia de identidade](../docs/design/identidade-visual.md) e o [Figma do Valora](https://www.figma.com/design/MNdGWT8ZnSZkTRxlvoI0Ie/Valora).
