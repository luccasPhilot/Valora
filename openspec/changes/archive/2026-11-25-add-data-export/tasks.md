## 1. CSV do filtro (front)

- [x] 1.1 Testes unitários primeiro de `transactionsToCsv`: BOM, `;`, `\r\n`, aspas e aspas internas, acentos, `-89,90`, entrada sem sinal, transferência, sem categoria, parcela, pendente
- [x] 1.2 Função pura e a busca das páginas do filtro com progresso, cancelamento e o limite de 10.000
- [x] 1.3 Botão "Exportar CSV" em Transações (aviso com valores ocultos) e helper `downloadFile`
- [x] 1.4 Testes de tela: filtro aplicado em duas páginas, cancelar, limite, erro da API no meio

## 2. `.zip` (backend)

- [x] 2.1 Adicionar `fflate` ao `backend/` (dependência nova, justificada na proposta)
- [x] 2.2 Testes de integração primeiro: um CSV por tabela, sem `raw`, centavos inteiros, datas ISO, `LEIA-ME.txt`, `Content-Disposition`, log só com contagens
- [x] 2.3 Módulo `modules/exports/` (rota, service, repository com leitura `REPEATABLE READ` só de leitura)

## 3. Ajustes (front)

- [x] 3.1 Carregar `/frontend-design:frontend-design` e `/ui-ux-pro-max`; "Baixar meus dados" em Ajustes, com carregando e erro, e teste de tela
- [ ] 3.2 Conferir os dois botões em 320, 390, 768, 1024 e 1440 px, nos dois temas, e o download na PWA instalada no iPhone (folha de compartilhar)

## 4. Conferência

- [x] 4.1 Abrir um CSV exportado no Excel em pt-BR e conferir acentos, colunas e valores numéricos
- [x] 4.2 Rodar `typecheck`, `lint`, `format:check` e `test` no `backend/` e no `frontend/`

## 5. Documentação

- [x] 5.1 `docs/01-produto.md` (exportar), `docs/03-arquitetura.md` (rota e Decisões: CSV no front, `.zip` no backend, exceção à paginação)
- [x] 5.2 Ao arquivar: marcar "Exportar" como feito em `docs/08-revisao-e-proximas-fases.md`
