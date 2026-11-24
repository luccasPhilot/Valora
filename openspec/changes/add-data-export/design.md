## Context

- `GET /transactions` é paginado (máximo 100 por página) e aceita todos os filtros da tela; o front já tem os filtros na URL e as funções de formatação em `lib/format.ts` e `lib/dates.ts`.
- Regra 1 do `CLAUDE.md`: a formatação em R$ acontece só no front.
- O app é uma PWA, usada no iPhone instalada na tela de início e no computador.

## Goals / Non-Goals

**Goals:**
- Um CSV que abre certo no Excel em pt-BR com dois cliques.
- Uma cópia de todos os dados que não depende do Valora para ser lida.

**Non-Goals:**
- Importar, agendar ou enviar para fora do servidor.

## Decisions

### 1. CSV do filtro no front

- O front busca as páginas de `GET /transactions` com o filtro atual (`limit=100`) até o fim, mostrando o progresso ("Preparando 340 de 1.200…") e com "Cancelar". Limite de 10.000 linhas: acima disso, pede para estreitar o período.
- Colunas: Data (`dd/mm/aaaa`), Descrição, Categoria ("Sem categoria" quando nula), Tipo (Receita, Despesa, Transferência, pela mesma regra da API), Conta, Valor (`-89,90`, com o hífen comum para o Excel reconhecer como número, sem "R$"), Situação (Pendente, Confirmada), Origem (Banco, Manual), Parcela ("3/10" ou vazio).
- UTF-8 com BOM, separador `;`, fim de linha `\r\n`, aspas duplas em todo campo de texto (aspas internas dobradas). Uma função pura `transactionsToCsv(rows)` em `features/transactions/`, com teste.
- **"Ocultar valores" ligado:** a exportação continua com os valores (é uma ação explícita), mas o botão avisa "O arquivo terá os valores, mesmo com eles ocultos na tela".
- Nome: `valora-transacoes-2026-11-01-a-2026-11-30.csv`.
- **Por que no front:** a regra 1 deixa a formatação no front, e o front já tem o filtro. O backend não ganha um segundo formatador de dinheiro.

### 2. `.zip` com todos os dados no backend

- `GET /api/v1/exports/all.zip` responde `application/zip` com `Content-Disposition: attachment; filename="valora-dados-2026-11-24.zip"`.
- Um CSV por tabela, com as colunas do banco em inglês, valores em centavos como inteiros, datas `AAAA-MM-DD` e instantes ISO 8601 em UTC. Sem BOM, separador `,` (formato de máquina). `raw` (JSON do Pluggy) fica de fora; um `LEIA-ME.txt` explica as colunas e que os valores estão em centavos.
- Leitura de cada tabela numa transação `REPEATABLE READ` só de leitura, para o `.zip` ser uma foto consistente mesmo com a sincronização rodando.
- Montado em memória com `fflate` (`zipSync`): com um usuário, os dados cabem com folga (centenas de KB a poucos MB). Se um dia passar de 50 MB, troca para o modo de streaming do `fflate`.
- **Exceção à paginação:** é um arquivo, não uma listagem da API. Fica registrado nas Decisões do doc 03.
- Log: `exports created` com o número de linhas por tabela, nunca conteúdo.

### 3. Download na PWA

Helper `downloadFile(blob, fileName)` com `URL.createObjectURL` e um `<a download>`; no iPhone instalado, o Safari abre a folha de compartilhar, o que é aceitável ("Salvar em Arquivos"). Conferido no aparelho na tarefa de verificação.

## Risks / Trade-offs

- **CSV grande no celular:** 10.000 linhas montadas no navegador é pouco (alguns MB), mas a busca de 100 páginas leva tempo. → Progresso e "Cancelar"; o limite de 10.000 evita travar.
- **Dependência nova:** `fflate` é pequena, sem dependências e mantida. → Entra pelo Dependabot da `harden-infra`, se já estiver pronta.
