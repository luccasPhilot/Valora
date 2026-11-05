## Context

O símbolo do Valora existe só como componente React (`frontend/src/components/brand/valora-mark.tsx`), com as cores vindas de tokens CSS. A aba do navegador carrega o ícone como um arquivo separado, fora da página, e por isso não enxerga as variáveis CSS do app nem o tema escolhido nos Ajustes. A página ainda não declara ícone, então a aba mostra o ícone genérico do navegador.

O Design System vence as skills de design; o favicon segue o que a seção "Logotipo" já define (o símbolo, sem o nome).

## Goals / Non-Goals

**Goals:**

- A aba mostra o símbolo do Valora.
- O ícone fica legível em abas claras e escuras.

**Non-Goals:**

- Ícone do app instalável, `apple-touch-icon` e `.ico`.
- Variações do logotipo.

## Decisions

**1. Um único `favicon.svg` em `frontend/public/`.**

O Vite copia o conteúdo de `public/` para a raiz do `dist/`, e o nginx do deploy serve o `dist/`. O ícone fica em `/favicon.svg`, sem etapa de geração.

- _Alternativa:_ gerar PNGs e `.ico` a partir do SVG. Descartado: pede ferramenta nova (ou script) e os navegadores atuais aceitam SVG. O ícone do app instalável entra na Fase 2, com o PWA.

**2. Cores escritas no arquivo, as do tema escuro.**

O favicon não enxerga `var(--logo-*)`. Ele usa `#17894F` (fita escura), `#3FB873` (fita do meio) e `#A6EBB4` (fita clara), os valores do tema escuro. O verde claro `#A6EBB4` some sobre uma aba branca, mas as outras duas fitas continuam visíveis e o formato "V" se mantém.

- _Alternativa:_ `@media (prefers-color-scheme)` dentro do SVG, com um conjunto de cores por tema do navegador. Descartado: mais código para um ganho pequeno, e o tema do navegador nem sempre é o do sistema.
- _Alternativa:_ usar os tons do tema claro (`#0E7A47`, `#2FA866`, `#5FCB86`). Descartado: abas escuras são comuns e o `#0E7A47` quase some sobre elas.

**3. Só o símbolo, num quadrado.**

O símbolo tem proporção 100 × 72. O `viewBox` do favicon é `0 0 100 100`, com o desenho deslocado 14 unidades para baixo, para ficar centralizado e ocupar a largura toda. Sem o nome "Valora", que não é legível em 16 px.

**4. O mesmo degradê do logotipo.**

O favicon repete os dois `linearGradient` do componente, com `stop-color` direto. É uma cópia do desenho: o teste da spec confere que o arquivo não usa `var(`, mas não confere que o desenho é igual ao do componente.

## Risks / Trade-offs

- [O desenho está duplicado: componente e `favicon.svg`] → Se o usuário trocar o símbolo por um SVG final dele, o `favicon.svg` deve ser atualizado junto. A seção "Logotipo" do Design System registra os dois lugares.
- [Fita clara some em abas brancas] → As duas fitas mais escuras sustentam a forma; aceito para o uso pessoal do app.
- [Navegador antigo sem suporte a favicon SVG] → Mostra o ícone genérico. Aceito: o app é de uso pessoal, nos navegadores do próprio usuário.

## Open Questions

Nenhuma.
