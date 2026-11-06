## 1. Regras

- [x] 1.1 `expandOccurrences(entry, month)` como função pura: `none`, `monthly` com início e fim, `yearly`, dia 31 em fevereiro (comum e bissexto), previsão pausada
- [x] 1.2 `rankMatchCandidates(occurrence, transactions)`: mesmo sinal, janela de 7 dias, categoria ou ±20% no valor, exclui vinculadas, ordena e limita a 5
- [x] 1.3 Testes de limite: 20% exatos entram, 20,01% não; 7 dias entram, 8 não; sinal diferente fora

## 2. Banco

- [x] 2.1 Tabelas `planned_entries` e `planned_entry_occurrences` no Drizzle e migration (chave (`planned_entry_id`, `month`); `ON DELETE CASCADE` na previsão; `ON DELETE SET NULL` na transação; índice único parcial em `transaction_id`)
- [x] 2.2 Repository de previsões e de decisões

## 3. API

- [x] 3.1 Schemas Zod: previsão (valor inteiro > 0 com tipo, dia 1 a 31, repetição, meses `AAAA-MM`, `endMonth` não anterior a `startMonth`) e ação da ocorrência
- [x] 3.2 Validar categoria ativa e compatível com o tipo (reaproveitar a regra do lançamento manual)
- [x] 3.3 `GET/POST /planned-entries`, `PUT/DELETE /planned-entries/:id`
- [x] 3.4 `PUT/DELETE /planned-entries/:id/occurrences/:month` (`realize`, `skip`, desfazer) com `TRANSACTION_ALREADY_LINKED` e `TRANSACTION_NOT_COMPATIBLE`
- [x] 3.5 Testes de integração: mensal com fim, anual, pausada, vínculo válido, transação já usada, sinal diferente, exclusão da transação vinculada, pular não afeta outro mês, excluir previsão apaga decisões

## 4. Tela de Planejamento

- [x] 4.1 Carregar `/frontend-design:frontend-design` e `/ui-ux-pro-max`; reler o Design System (valores, painéis, responsividade)
- [x] 4.2 Schemas Zod em `frontend/src/lib/api/`, consultas e mutações do TanStack Query
- [x] 4.3 Nova área "Planejamento" em `areas.ts`, rota `/planejamento` e item no menu
- [x] 4.4 Seletor de mês, totais previstos e lista agrupada em pendentes, realizadas e puladas
- [x] 4.5 Formulário de previsão (tipo, valor, descrição, categoria, dia, repetição, início, fim) com o aviso de edição
- [x] 4.6 Ações da ocorrência: vincular (lista de candidatas), realizar sem vincular, pular, desfazer; pausar e excluir a previsão com confirmação
- [x] 4.7 Estados carregando, vazio e erro; "Ocultar valores"
- [x] 4.8 Testes de componente: texto da repetição, sinais e cores dos valores, estado vazio, aviso de edição

## 5. Conferência visual

- [x] 5.1 Conferir em 320, 390, 768, 1024 e 1440 px, nos dois temas, sem rolagem horizontal
- [x] 5.2 Revisar com `/ui-ux-pro-max`

## 6. Documentação

- [x] 6.1 Documentar `planned_entry_occurrences` e a regra de realização em `docs/04-modelo-de-dados.md` (e tirar a frase "fica para definir na v2")
- [x] 6.2 Registrar os endpoints e as decisões (ocorrências calculadas, lista sem paginação, vínculo sempre manual) em `docs/03-arquitetura.md`
- [x] 6.3 Descrever o Planejamento em `docs/01-produto.md` e marcar o item "Receitas e despesas previstas" em `docs/07-roadmap.md`
