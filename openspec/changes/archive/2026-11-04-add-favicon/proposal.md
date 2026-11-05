## Why

O logotipo do Valora já aparece no menu, mas a aba do navegador continua sem ícone: o `frontend/index.html` não declara nenhum e não existe a pasta `frontend/public/`. A `refresh-visual-identity` deixou o favicon de fora do escopo; o usuário pediu que ele entre agora.

## What Changes

- Novo `frontend/public/favicon.svg` com só o símbolo das duas fitas, desenhado a partir do componente `valora-mark.tsx`. As cores ficam escritas no próprio arquivo, porque um favicon não enxerga as variáveis CSS do app. Ele usa os verdes do tema escuro (`#17894F`, `#3FB873`, `#A6EBB4`), que aparecem bem em abas claras e escuras.
- `frontend/index.html` passa a declarar o ícone com `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`. O título "Valora" já existe.
- `docs/06-design-system.md`, seção "Logotipo": a frase "Favicon, ícone do app instalável e variações do logotipo … ainda não existem" passa a dizer que o favicon é o símbolo em SVG e que o ícone do app instalável e as variações continuam pendentes.

Itens do roadmap: nenhum item novo é coberto. É um complemento da identidade visual já arquivada (`refresh-visual-identity`, item "Identidade visual atualizada" da Fase 0 → Front-end).

Não contraria nenhum documento: só atualiza a frase do Design System que registrava a ausência do favicon.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `web-shell`: entra o requisito "Ícone da aba", que exige a declaração do ícone na página e a existência do arquivo.

## Impact

- **Código** (só `frontend/`): `public/favicon.svg` (novo), `index.html`.
- **Testes:** um teste do Vitest lê o `index.html` e confere o `<link rel="icon">` e a existência do arquivo em `public/`.
- **Documentação:** `docs/06-design-system.md`.
- **Sem mudança** em backend, API, banco, rotas, dependências ou infra. O `dist/` do build já inclui o conteúdo de `public/`, então o nginx do deploy serve o arquivo sem ajuste.

## Fora do escopo

- Ícone do app instalável (PNG de 192 e 512 px e `manifest`): é da Fase 2 (PWA).
- `apple-touch-icon` e favicon `.ico` para navegadores antigos: exigem gerar PNG a partir do SVG e não são necessários para o uso pessoal.
- Variações do logotipo (monocromático, para impressão).
- Itens de "Fora do escopo" de `docs/01-produto.md`: nada nesta change os toca.
