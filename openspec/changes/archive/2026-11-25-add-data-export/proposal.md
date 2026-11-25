## Why

Não há saída de dados legível (`docs/08-revisao-e-proximas-fases.md`, "Lacunas", item 10). O backup é um `pg_dump`, que só serve para restaurar o próprio Valora. Levar as transações para uma planilha, mandar um recorte para o contador ou ter uma cópia que se abre sem o app exige consultar o banco à mão.

É o item "Exportar" da Fase 4: "o CSV abre no Excel com acentos e valores certos".

## What Changes

- **CSV do filtro atual:** em Transações, "Exportar CSV" baixa as transações do filtro que está na tela (período, categoria, tipo, origem, conta e busca), com colunas Data, Descrição, Categoria, Tipo, Conta, Valor, Situação, Origem e Parcela. Feito para o Excel em pt-BR: UTF-8 com BOM, `;` como separador, data `dd/mm/aaaa` e valor com vírgula decimal e sinal (`-89,90`). O arquivo é montado no front, a partir da API, com as funções de formatação de `frontend/src/lib`, como qualquer outro valor da tela.
- **"Baixar meus dados":** em Ajustes, baixa um `.zip` com um CSV por tabela do Valora (transações, contas, conexões, categorias, regras, orçamentos, previsões e ocorrências, metas, aportes e vínculos, investimentos, fotos de saldo e de investimentos, faturas e execuções da sincronização). Os valores ficam em centavos, com o nome da coluna (`amount_cents`), e as datas em ISO: é uma cópia para guardar e reprocessar, não para ler no Excel. O JSON bruto do Pluggy (`raw`) fica de fora.
- Os dois respeitam a regra de não registrar valores nem descrições nos logs: o log só diz que houve uma exportação e quantas linhas.

### Contraria documentos

Nenhum. A formatação em R$ continua só no front (regra 1 do `CLAUDE.md`): o CSV do filtro é montado no front; o `.zip` do backend leva centavos sem formatação.

### Fora do escopo

- Importar CSV ou OFX (Fase 7, amplia a regra 9).
- Exportar relatórios ou gráficos (PDF, imagem).
- Agendar exportação ou mandá-la para fora do servidor (e-mail, nuvem): nenhum dado financeiro sai da casa sem o usuário baixar.
- Restaurar a partir do `.zip`: o backup continua sendo o `pg_dump`.
- Nenhum item da seção "Fora do escopo" de `docs/01-produto.md` é afetado.

### Roadmap

Não está em `docs/07-roadmap.md`: é o item "Exportar" da Fase 4 em `docs/08` (change nº 6 da "Ordem sugerida"). Ao arquivar, o item é marcado como feito.

## Capabilities

### New Capabilities

- `data-export`: CSV das transações do filtro e `.zip` com todos os dados.

### Modified Capabilities

Nenhuma.

## Impact

- **Backend:** módulo novo `modules/exports/` com `GET /api/v1/exports/all.zip` (rota, service, repository de leitura de cada tabela) e a biblioteca de zip.
- **Frontend:** "Exportar CSV" em Transações (busca todas as páginas do filtro e monta o CSV com `lib/format`), "Baixar meus dados" em Ajustes, um helper de download que funcione na PWA do iPhone.
- **Testes:** unitário do CSV (BOM, separador, aspas, acentos, sinal, vírgula decimal, transferência, parcela); integração do `.zip` (um arquivo por tabela, sem `raw`, centavos); teste de tela dos dois botões, com carregando e erro.
- **Dependências:** **nova** no backend, `fflate` (zip em JavaScript puro, sem dependências, com tipos), porque o Node não escreve `.zip` sozinho. Alternativa avaliada: `archiver` (mais dependências) e `yazl` (sem tipos próprios).
- **Documentação:** `docs/01-produto.md` (exportar), `docs/03-arquitetura.md` (rota e Decisões: CSV no front, zip no backend) e `docs/08-revisao-e-proximas-fases.md`.
