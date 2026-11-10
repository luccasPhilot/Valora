# Roadmap

Projeto pessoal, sem datas. Cada fase só começa quando a anterior cumpre o critério de **pronto**. Marque os itens conforme forem concluídos.

| Fase | Tema | Resultado |
|---|---|---|
| 0 | Fundação | Projeto rodando localmente, com o visual do Valora e banco de dados |
| 1 (v1) | Dia a dia | Transações chegando sozinhas, categorizadas, com orçamento; rodando no servidor de casa |
| 2 (v2) | Planejamento | Faturas, previsões, projeção do mês, metas e alertas; app instalável no celular |
| 3 (v3) | Patrimônio | Investimentos, evolução do patrimônio e relatórios |

---

## Fase 0 — Fundação

### Passos manuais (você)

- [x] Criar conta no [Meu Pluggy](https://meu.pluggy.ai) e conectar todos os bancos (até 5).
- [x] Criar conta no [dashboard do Pluggy](https://dashboard.pluggy.ai), criar a aplicação e ativar o conector MeuPluggy ([passo a passo](02-open-finance.md#passo-a-passo-de-configuração)).
- [X] Guardar o Client ID e o Client Secret num gerenciador de senhas. Nunca no repositório.

### Projeto

- [x] Repositório git com `.gitignore` (inclui `.env`) e `.env.example`.
- [x] Um repositório com `backend/`, `frontend/` e `infra/` independentes ([estrutura](03-arquitetura.md#estrutura-do-repositório)).
- [x] TypeScript com `strict: true` no backend e no frontend.
- [x] ESLint e Prettier.
- [x] Vitest configurado no backend e no frontend.

### Back-end

- [x] Docker Compose com PostgreSQL para desenvolvimento.
- [x] Drizzle configurado, com a primeira migration (tabelas da v1 do [modelo de dados](04-modelo-de-dados.md)).
- [x] Fastify com `GET /api/v1/health` (checa o banco).
- [x] Configuração lida do `.env` e validada com Zod; o app para com mensagem clara se faltar algo.
- [x] Formato padrão de erro e logger que não registra dados financeiros.
- [x] Teste de integração com Testcontainers rodando.

### Front-end

- [x] React + Vite + Tailwind v4 + shadcn/ui.
- [x] Tokens do [Design System](06-design-system.md#tokens-em-css) no `globals.css`, fontes Inter e Montserrat Alternates servidas localmente.
- [x] Temas claro e escuro, com escolha Claro, Escuro e Sistema.
- [x] Layout base responsivo: menu lateral que abre pelo botão de menu no celular e no tablet e fica fixo no computador, áreas seguras do celular ([regras](06-design-system.md#responsividade)).
- [x] Funções de formatação (moeda, sinal, datas pt-BR, fuso `America/Sao_Paulo`) com testes.
- [x] Componentes base com os estados: carregando, vazio, erro.
- [x] Identidade visual atualizada: verde vivo nos detalhes, tema escuro quase preto, cantos maiores, rótulos e números de destaque.

**Pronto quando:**
- o banco sobe com `docker compose -f infra/compose.dev.yml up -d`, e o backend e o frontend sobem com `npm run dev`, cada um na sua pasta;
- a tela inicial abre com o layout do Valora nos dois temas, sem rolagem horizontal em 320, 390, 768, 1024 e 1440 px;
- os testes passam.

---

## Fase 1 (v1) — Dia a dia

### Sincronização

- [x] `PluggyClient` com o `pluggy-sdk`, validando as respostas com Zod e convertendo valores para centavos.
- [x] **Confirmar com dados reais** a convenção de sinal do Pluggy para conta e cartão, e registrar no [modelo de dados](04-modelo-de-dados.md).
- [x] Sincronização de conexões, contas e transações ([regras](03-arquitetura.md#sincronização)):
  - [x] carga inicial de 12 meses, depois janela de 30 dias;
  - [x] gravação pelo id do Pluggy, sem duplicar;
  - [x] remoção de transações pendentes que sumiram;
  - [x] um banco com erro não trava os outros.
- [x] Fotos diárias de saldo (`balance_snapshots`).
- [x] Investimentos e fotos diárias (`investments`, `investment_snapshots`) já gravados, mesmo sem tela. Histórico não volta depois.
- [x] Agendamento diário (`SYNC_CRON`) + `POST /api/v1/sync-runs` + lock contra execução dupla.
- [x] Registro em `sync_runs`.
- [x] Testes de integração da sincronização com respostas do Pluggy gravadas e anonimizadas.

### Categorias

- [x] Categorias padrão criadas na primeira execução. Incluem "Pagamento de fatura", "Transferência entre contas" e "Aplicação e resgate", do tipo `transfer`, e "Saque", do tipo `expense`.
- [x] Mapeamento das categorias do Pluggy para as suas (`pluggy_category_mappings`).
- [x] Regras: contém, começa com, igual; com prioridade.
- [x] Ordem de decisão: você → regra → Pluggy → "Sem categoria". A sincronização nunca muda uma categoria escolhida por você.
- [x] Ao corrigir uma categoria, opção "Aplicar sempre para '<descrição>'", que cria a regra.
- [x] Tela de categorias e regras.

### Lançamento manual

Regras em [produto](01-produto.md#lançamento-manual).

- [x] Conta "Dinheiro" (tipo `cash`) criada na primeira execução, sem saldo e fora do saldo total.
- [x] Formulário de receita e despesa: tipo, valor, descrição, data, categoria, conta (Dinheiro ou uma conta conectada).
- [x] Editar e excluir transação manual. Transação do Open Finance continua só com a categoria editável.
- [x] Sincronização nunca altera nem apaga transação manual (com teste).
- [x] Aviso de possível duplicata (mesma conta, mesmo valor, até 3 dias), com as ações "Juntar" e "São diferentes" (com testes).
- [x] Filtro de origem na lista de transações: Open Finance, manual.

### Telas

- [x] **Contas e cartões:** saldo de cada conta, total, limite do cartão, status de cada conexão e última sincronização.
- [x] **Transações:**
  - [x] lista agrupada por dia, paginada;
  - [x] filtros por período, categoria, tipo e conta;
  - [x] pesquisa;
  - [x] detalhe;
  - [x] troca de categoria.
- [x] **Orçamentos:** limite por categoria e mês, consumo, status com ícone e texto, "copiar do mês anterior".
- [x] **Início:**
  - [x] card de saldo;
  - [x] atalhos (Adicionar receita, Registrar despesa, Transações, Orçamentos);
  - [x] receitas e despesas do mês;
  - [x] receitas x despesas (6 meses);
  - [x] gastos por categoria (lista de barras);
  - [x] orçamentos perto do limite;
  - [x] últimas transações.
- [x] Ocultar valores.
- [x] Faixa de aviso quando um banco não sincroniza.

### Servidor de casa

- [x] `Dockerfile` do backend, `Dockerfile` do frontend (nginx) e `infra/compose.yml` de produção com `frontend`, `backend` e `db` ([deploy](05-deploy.md)).
- [x] Só o front publica porta, presa ao `127.0.0.1`, e o app é publicado só pela Tailscale com HTTPS.
- [x] Backup semanal (domingo) com retenção de 30 dias, e **uma restauração testada**.

**Pronto quando:**
- o app roda no servidor e abre no celular pela Tailscale;
- as transações de todos os bancos chegam sozinhas todo dia;
- um gasto em dinheiro lançado à mão aparece nas despesas e no orçamento da categoria;
- uma transação lançada à mão e depois trazida pelo Open Finance gera o aviso de possível duplicata;
- pagamento de fatura não conta como despesa duas vezes;
- uma categoria corrigida por você continua corrigida depois da sincronização seguinte;
- o backup foi restaurado com sucesso pelo menos uma vez.

---

## Fase 2 (v2) — Planejamento

- [x] **Faturas do cartão:** fatura atual, próximas faturas, vencimento, parcelas futuras (`credit_card_bills`).
- [x] **Receitas e despesas previstas** (`planned_entries`), avulsas ou recorrentes. Marcar como realizada: vincular a uma transação (sempre por escolha sua), realizar sem vincular ou pular o mês (`planned_entry_occurrences`).
- [x] **Projeção do fim do mês:** saldo de hoje + receitas previstas − despesas previstas − faturas que vencem (a fatura já contém as parcelas do mês).
- [x] **Metas** (`goals`, `goal_contributions`): nome, ícone, valor desejado, valor acumulado informado à mão, progresso, prazo estimado pelo ritmo de aporte.
- [x] **Alertas** (`alerts`):
  - [x] cobrança duplicada: mesmo valor e mesmo estabelecimento em poucos dias;
  - [x] assinatura detectada: mesmo valor se repetindo todo mês;
  - [x] orçamento em 80% e estourado;
  - [x] conexão com banco caída ou consentimento expirado.
- [x] Sino de alertas no topo.
- [x] Resumo de metas e projeção no Início.
- [x] **PWA instalável** (`vite-plugin-pwa`): ícone, tela de abertura, funciona com os dados já carregados mesmo sem rede.
- [x] **Página "não encontrado"** dentro do app para endereços sem rota (como `/investimentos`, que ainda não existe).
- [x] **Arquivar banco removido do Meu Pluggy** (`connections.archived_at`): "Remover do Valora" tira o banco das telas, do saldo e dos avisos mantendo o histórico, com "Reativar" na seção "Arquivados".

**Pronto quando:**
- dá para planejar o mês com previsões e ver a projeção do saldo;
- metas aparecem no Início;
- os quatro tipos de alerta disparam em dados reais;
- o app está instalado no celular.

---

## Fase 3 (v3) — Patrimônio

- [ ] **Investimentos:** posição de cada um, agrupada por tipo, e o total. Os dados já existem desde a Fase 1.
- [ ] **Evolução do patrimônio:** contas + investimentos − fatura em aberto, mês a mês, a partir das fotos diárias.
- [ ] **Metas vinculadas** a um investimento ou conta, que se atualizam sozinhas.
- [ ] **Relatórios**, todos com a opção "Ver em tabela":
  - [ ] evolução financeira;
  - [ ] histórico de receitas e despesas;
  - [ ] análise por categoria ao longo dos meses;
  - [ ] evolução do patrimônio.
- [ ] Variação do patrimônio no card de saldo do Início.

**Pronto quando:**
- o patrimônio total confere com a soma dos bancos e corretoras;
- o gráfico de evolução mostra o histórico guardado desde a Fase 1.

---

## Ideias para depois

Sem compromisso. Entram no roadmap só se fizerem falta no uso real.

- Notificações no celular (alerta de orçamento, conexão caída).
- Exportar transações em CSV.
- Importar extrato OFX de bancos que não estão no Open Finance.
- Renovação de consentimento facilitada, quando a Resolução Conjunta nº 7 estiver valendo ([consentimento](02-open-finance.md#consentimento)).
- Tela de login, se um dia o app precisar ficar acessível fora da Tailscale.
