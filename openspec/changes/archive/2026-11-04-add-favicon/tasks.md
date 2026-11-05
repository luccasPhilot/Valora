## 1. Ícone

- [x] 1.1 Criar `frontend/public/favicon.svg` com o símbolo (as duas fitas e os dois degradês de `valora-mark.tsx`), cores escritas no arquivo (`#17894F`, `#3FB873`, `#A6EBB4`), sem `var(` e com `viewBox` quadrado de `0 0 100 100`
- [x] 1.2 Declarar `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />` em `frontend/index.html`

## 2. Testes

- [x] 2.1 Teste do Vitest: o `index.html` contém o `<link rel="icon">` do tipo `image/svg+xml` apontando para `/favicon.svg`, e o arquivo existe em `public/`
- [x] 2.2 Teste do Vitest: o `favicon.svg` não usa `var(` e declara os três verdes do símbolo

## 3. Conferência

- [x] 3.1 Rodar `typecheck`, `lint`, `format:check`, `test` e `build` no `frontend` e conferir que `dist/favicon.svg` existe
- [x] 3.2 Conferir no navegador (`npm run dev`) que `GET /favicon.svg` responde 200 e que a aba mostra o símbolo, em abas claras e escuras

## 4. Documentação

- [x] 4.1 Atualizar a seção "Logotipo" de `docs/06-design-system.md`: o favicon é o símbolo em SVG (`frontend/public/favicon.svg`), duplicado de `valora-mark.tsx`, e o ícone do app instalável e as variações continuam pendentes
