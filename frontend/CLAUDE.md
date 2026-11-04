# CLAUDE.md — frontend

Vale só para `frontend/`. As regras gerais do projeto estão em [../CLAUDE.md](../CLAUDE.md); comandos em [README.md](README.md).

## Antes de criar ou mudar qualquer tela

1. Carregue as skills `/frontend-design:frontend-design` e `/ui-ux-pro-max`.
2. Siga o [Design System](../docs/06-design-system.md) e o [guia de identidade](../docs/design/identidade-visual.md). Eles vencem as skills.
3. Use os tokens (`bg-card`, `text-muted-foreground`...), nunca hex direto.

## Regras do frontend

- **Independente do backend:** nunca importe código do `backend/`. As respostas da API são validadas com schemas Zod próprios em `src/lib/api/`. Mudou um endpoint, os dois lados mudam na mesma change.
- **Formatação** de moeda, datas e percentuais só pelas funções de `src/lib` (pt-BR, `America/Sao_Paulo`). O backend manda centavos inteiros; o front converte para R$ só na exibição.
- **Responsivo** de 320 px até monitores largos, com menu lateral (gaveta abaixo de 1024 px). Sem barra inferior. Confira 320, 390, 768, 1024 e 1440 px, nos dois temas.
- **Estados:** toda tela tem carregando (skeleton), vazio e erro. Funcionalidade não pronta usa o selo "Demonstração".
- Componentes com props tipadas por `interface`; sem lógica de negócio dentro do componente (extraia para hooks).

## Antes de dar por pronto

`npm run typecheck`, `npm run lint`, `npm run format:check` e `npm test`.
