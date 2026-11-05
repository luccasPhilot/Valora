# Arquitetura

## Visão geral

```
Seus bancos ──Open Finance──▶ Meu Pluggy (atualiza 1x/dia)
                                    │
                                    │ API do Pluggy (SDK pluggy-sdk)
                                    ▼
┌─ Servidor em casa (Docker Compose, infra/compose.yml) ───────┐
│                                                               │
│  frontend (nginx)  ← única porta publicada: 127.0.0.1:3000    │
│   ├─ entrega o front React já compilado                       │
│   └─ repassa /api para o backend                              │
│                     │                                         │
│                     ▼                                         │
│  backend (Node + Fastify)                                     │
│   ├─ API REST em /api/v1                                      │
│   │    Controller → Service → Repository                      │
│   └─ sincronização: agendada 1x/dia + botão "sincronizar"     │
│        busca contas, transações, faturas, investimentos       │
│        grava no banco, aplica regras de categoria             │
│                     │                                         │
│                     ▼                                         │
│  db (PostgreSQL, dados num volume do disco)                   │
│                                                               │
│  backup diário (pg_dump) ─────────────────────────────────────────▶ outro disco
└───────────────────────────────────────────────────────────────┘
                     ▲
                     │ Tailscale (HTTPS, só os seus aparelhos)
              celular / notebook (PWA)
```

O app **lê sempre do seu banco de dados**. O Pluggy só abastece esse banco. Se ele cair, mudar de preço ou um consentimento expirar, o histórico continua com você.

Os [lançamentos manuais](01-produto.md#lançamento-manual) (dinheiro em espécie ou uma transação que o Open Finance não trouxe) entram pela API, direto no mesmo banco.

## Stack

| Parte | Escolha | Por quê |
|---|---|---|
| Linguagem | TypeScript (modo `strict`) nas duas pontas | Uma linguagem só para manter |
| Repositório | Um repositório git com `backend/`, `frontend/` e `infra/` independentes (como no CellCare) | Cada parte se instala, testa e vira imagem sozinha |
| Pacotes | npm (vem com o Node) | Nada a instalar, inclusive no Docker |
| Back-end | Node + Fastify | Leve e rápido; validação por schema nas rotas |
| Validação | Zod | Toda entrada externa (request e respostas do Pluggy) passa por schema |
| Banco | PostgreSQL | Robusto, com `jsonb` para guardar o JSON bruto do Pluggy |
| Acesso a dados | Drizzle ORM | Leve, tipado, próximo do SQL, migrations em SQL legível |
| Integração | `pluggy-sdk` (SDK oficial do Pluggy para Node) | Menos código para autenticar e paginar |
| Agendamento | Agendador dentro do próprio app (cron) | Não precisa de outro container nem de webhook |
| Front-end | React + Vite | App de página única; não precisa de renderização no servidor |
| Visual | Tailwind CSS + shadcn/ui | Componentes copiados para o projeto, ajustados ao [Design System](06-design-system.md) |
| Ícones | Lucide | Pedido do guia de identidade; é o padrão do shadcn/ui |
| Gráficos | Recharts (base dos gráficos do shadcn/ui) | Combina com o resto dos componentes |
| Dados no front | TanStack Query | Cache, recarregamento e estados de carregando e erro |
| Rotas no front | React Router | Padrão e suficiente para poucas telas |
| App no celular | PWA (`vite-plugin-pwa`) | Instala pelo navegador; uma base para celular e computador |
| Testes | Vitest + Testcontainers (PostgreSQL real) | Unitários nos services; integração com banco de verdade |
| Deploy | Docker Compose num PC com Linux + Tailscale; front servido por nginx | Veja [deploy](05-deploy.md) |

## Estrutura do repositório

Um único repositório git, com três partes independentes, como no CellCare. A raiz não é um projeto Node: só guarda as configurações comuns e a documentação.

```
valora/
├── backend/                         projeto Node independente (@valora/backend)
│   ├── src/
│   │   ├── modules/
│   │   │   ├── accounts/            controller, service, repository, schemas
│   │   │   ├── transactions/
│   │   │   ├── categories/          categorias + regras
│   │   │   ├── budgets/
│   │   │   ├── dashboard/           consultas agregadas para a tela inicial
│   │   │   └── sync/                cliente Pluggy + rotina de sincronização
│   │   ├── db/                      schema Drizzle + migrations
│   │   ├── shared/                  erros, logger, config, datas, centavos
│   │   └── server.ts
│   ├── test/
│   ├── package.json, package-lock.json, tsconfig.json, eslint.config.js, vitest.config.ts
│   ├── README.md, CLAUDE.md         como rodar / regras só do backend
│   ├── .env.example, drizzle.config.ts, drizzle/ (migrations)
│   └── Dockerfile
├── frontend/                        projeto Node independente (@valora/frontend)
│   ├── src/
│   │   ├── components/ui/           componentes do shadcn/ui, já com os tokens
│   │   ├── components/              componentes do Valora (saldo, item de transação...)
│   │   ├── features/                uma pasta por área (dashboard, transactions...)
│   │   ├── hooks/                   consultas do TanStack Query
│   │   ├── lib/                     formatação BRL/datas, cliente da API
│   │   │   └── api/                 schemas Zod das respostas da API
│   │   └── styles/                  tokens do Design System
│   ├── package.json, package-lock.json, tsconfig.json, eslint.config.js, vitest.config.ts
│   ├── README.md, CLAUDE.md         como rodar / regras só do frontend
│   ├── nginx.conf
│   └── Dockerfile
├── infra/                          Docker Compose e scripts do servidor
│   ├── compose.dev.yml              PostgreSQL para desenvolvimento
│   ├── compose.yml                  produção: frontend, backend, db
│   ├── README.md, CLAUDE.md
│   ├── .env.example
│   └── scripts/                     backup e conferência da restauração
├── docs/  openspec/  docs/design/
├── .editorconfig  .gitattributes  .gitignore  .nvmrc  .prettierrc.json  .prettierignore
└── CLAUDE.md  README.md
```

## Contrato da API

O backend e o frontend **não dividem código**: o front nunca importa nada de `backend/`.

- **O backend é o dono do contrato.** Os schemas Zod das rotas validam a entrada, e os DTOs definem a saída.
- **O frontend valida o que recebe** com os próprios schemas Zod, em `frontend/src/lib/api/`. Se a API mandar algo fora do esperado, o front mostra o estado de erro em vez de quebrar.
- **Mudou um endpoint, mudam os dois lados na mesma change** do OpenSpec, com testes nos dois.
- **Utilitários pequenos usados dos dois lados** (fuso de São Paulo, centavos) existem uma vez em cada parte, cada um com os próprios testes.

## Camadas da API

```
Route/Controller  →  Service  →  Repository  →  PostgreSQL
                        │
                        └──────→  PluggyClient  →  API do Pluggy
```

- **Controller:** recebe a requisição, valida com Zod, chama o service e devolve a resposta. Sem regra de negócio.
- **Service:** toda a regra de negócio (categorização, orçamento, projeção, sincronização). Não conhece HTTP.
- **Repository:** único ponto de acesso ao banco. Sem regra de negócio.
- **PluggyClient:** único ponto de contato com o Pluggy. Valida as respostas com Zod e converte para os tipos do Valora (por exemplo, reais para centavos).

As respostas usam DTOs próprios; tabela do banco e JSON do Pluggy nunca saem direto na API. As listagens são paginadas.

## Endpoints da v1 (proposta inicial)

Tudo sob `/api/v1`.

| Método e rota | Para quê |
|---|---|
| `GET /health` | Verificar se o app e o banco estão de pé |
| `GET /connections` | Bancos conectados, status e última sincronização |
| `POST /sync-runs` | Disparar uma sincronização agora |
| `GET /sync-runs/latest` | Resultado da última sincronização |
| `GET /accounts` | Contas e cartões com saldo |
| `GET /transactions` | Lista paginada; filtros `from`, `to`, `categoryId`, `type`, `accountId`, `source`, `search`, `page`, `limit` |
| `GET /transactions/:id` | Detalhe de uma transação |
| `POST /transactions` | Lançamento manual (receita ou despesa) |
| `PATCH /transactions/:id` | Trocar a categoria (opcionalmente criando uma regra). Numa transação manual, também muda valor, data, descrição e conta |
| `DELETE /transactions/:id` | Excluir uma transação manual. Transação do Open Finance não pode ser excluída |
| `POST /transactions/:id/duplicate-resolution` | Resolver possível duplicata: `merge` (juntar) ou `keep_both` (são diferentes) |
| `GET/POST/PUT /categories`, `POST /categories/:id/archive` | Categorias. Não existe exclusão: a categoria é arquivada e continua nas transações antigas |
| `GET/POST/PUT/DELETE /category-rules` | Regras de categorização |
| `GET /pluggy-category-mappings`, `PUT /pluggy-category-mappings/:pluggyCategory` | Mapeamento das categorias do Pluggy para as do Valora (`categoryId` nulo limpa) |
| `GET /budgets?month=` / `PUT /budgets/:categoryId?month=` | Orçamento do mês |
| `GET /dashboard?month=` | Números agregados da tela inicial |

Os erros seguem o formato `{ "error": { "code", "message", "details" } }`.

## Sincronização

Roda uma vez por dia no horário do `SYNC_CRON` (padrão 07:00, fuso `America/Sao_Paulo`) e também pelo botão "sincronizar agora". Um lock no PostgreSQL impede duas sincronizações ao mesmo tempo.

Para cada item (banco) do Meu Pluggy:

1. **Conferir o status do item.** Se houver erro ou consentimento expirado, marcar a conexão e seguir para o próximo banco. Um banco com problema não pode travar os outros.
2. **Contas:** gravar ou atualizar usando o id do Pluggy como chave. Gravar a **foto do saldo do dia** em `balance_snapshots`.
3. **Transações:**
   - na primeira vez, buscar os **12 meses** disponíveis;
   - nas próximas, buscar os **últimos 30 dias**. A janela é maior que um dia de propósito, porque transações pendentes do cartão mudam ou somem antes de serem confirmadas;
   - gravar ou atualizar pelo id do Pluggy, de modo que rodar duas vezes nunca duplica nada;
   - transação **pendente** que sumiu dentro da janela é apagada;
   - **transações manuais (`source = 'manual'`) nunca são alteradas nem apagadas** pela sincronização.
4. **Categorizar** só as transações sem categoria do usuário, nesta ordem: regra do usuário → mapeamento da categoria do Pluggy → "Sem categoria". **Uma categoria escolhida por você nunca é sobrescrita.**
5. **Possíveis duplicatas:** só quando uma transação do Open Finance é **inserida** pela primeira vez, procurar uma transação manual na mesma conta, com o mesmo valor e data até 3 dias de diferença. Se achar, marcar `possible_duplicate_of_id` na transação do banco. **Nunca juntar sozinho:** quem decide é você.
   - **Juntar:** a manual é apagada e a do banco fica, herdando a categoria da manual se ela tinha uma escolhida por você.
   - **São diferentes:** a marcação é limpa e as duas ficam. Como a checagem só roda na inserção, o par não volta.
6. **Investimentos:** gravar a posição e a **foto do dia** em `investment_snapshots`. Começa já na Fase 1, mesmo sem tela, porque histórico não volta depois.
7. **Faturas do cartão** (v2) e **alertas** (v2).
8. Registrar o resultado em `sync_runs`: horário, quantidades e erro, se houver.

O Pluggy usa convenções de sinal diferentes para conta e cartão: no cartão, a compra vem positiva. O `PluggyClient` normaliza para a regra do Valora (**negativo = saída**) pelo `type` da transação. Isso foi confirmado com dados reais e está detalhado nas [convenções do Pluggy](04-modelo-de-dados.md#convenções-do-pluggy).

Cada banco é gravado numa transação própria do banco de dados, e os dados dele são buscados inteiros no Pluggy antes de abrir essa transação. Se a resposta vier inválida ou a gravação falhar, nada daquele banco fica gravado: a conexão fica com `status = 'error'` e a execução termina como `partial`.

## Testes

- **Unitários (Vitest)** nos services: categorização, cálculo de orçamento, projeção, normalização de valores do Pluggy, detecção de possível duplicata. Meta de 80% de cobertura nos services.
- **Integração (Vitest + Testcontainers):** repositories e a sincronização completa contra um PostgreSQL de verdade. O Pluggy é mockado com respostas gravadas e anonimizadas (fixtures em JSON).
- **Front-end:** testes de componentes só onde houver lógica (formatação, filtros).

## Decisões

| Decisão | Motivo |
|---|---|
| Dados via Meu Pluggy | É o único caminho gratuito; aceita o limite de 5 conexões e a atualização diária |
| Servidor em casa com Tailscale | Custo zero; extratos não ficam em servidor de terceiros; nada fica exposto na internet |
| Sem tela de login na v1 | Só os seus aparelhos na Tailscale alcançam o app. Se um dia expor fora da Tailscale, login vira obrigatório |
| Sincronização agendada, sem webhook | O Meu Pluggy só atualiza 1x/dia; webhook exigiria um endereço público |
| Sincronização dentro do app | Um container a menos; o mesmo service atende o agendamento e o botão |
| Uma sincronização por vez com `pg_try_advisory_lock` | O lock fica na sessão do PostgreSQL: some sozinho se o processo cair e valeria até com mais de um processo. Uma flag em memória não teria nenhuma das duas coisas. O disparo manual responde 409 (`SYNC_IN_PROGRESS`) e o agendamento só registra que pulou |
| Ids dos bancos no `.env` (`PLUGGY_ITEM_IDS`) | Listar os itens pela API do Pluggy só existe nos planos pagos. Para até 5 bancos que quase nunca mudam, editar o `.env` e reiniciar basta |
| `GET /connections` sem paginação | O Meu Pluggy permite no máximo 5 conexões. É uma exceção consciente à regra de paginar listagens, como a lista de contas |
| Categorias, regras e mapeamentos sem paginação | São dezenas de categorias, no máximo algumas centenas de regras e pouco mais de cem categorias do Pluggy. Mais uma exceção consciente à regra de paginar listagens |
| Categorização por função pura em lote | `decideCategory` não acessa o banco; o `Categorizer` carrega regras e mapeamentos uma vez e aplica em lotes de 1.000. Roda dentro da transação de cada banco na sincronização e de novo sempre que uma regra ou um mapeamento muda |
| Categorias padrão achadas por `seed_key` | O seed procura pela chave estável, não pelo nome: uma categoria renomeada ou arquivada por você não é recriada, e o mapeamento inicial do Pluggy só é criado junto com a categoria, então um mapeamento que você limpou não volta |
| Agendamento com `croner` | Suporte nativo a fuso (`America/Sao_Paulo`), escrito em TypeScript e sem dependências |
| JSON bruto guardado | Permite reprocessar quando as regras mudarem, sem buscar tudo de novo |
| Dinheiro em centavos (inteiro) | Evita erro de arredondamento do ponto flutuante |
| Fotos diárias de saldo e investimentos desde a Fase 1 | O Open Finance devolve a posição atual; a evolução só existe se for guardada |
| PWA em vez de app nativo | Uma base de código; instala no celular pelo navegador |
| React + shadcn/ui em vez de Angular | Caminho mais curto para um visual caprichado e totalmente ajustável |
| Fontes servidas pelo próprio app | Funciona sem internet e não faz requisição para terceiros |
| Sem IA | Escolha de produto (veja [produto](01-produto.md#fora-do-escopo)) |
| Lançamento manual só como complemento | Cobre dinheiro em espécie e o que o Open Finance não trouxer. "Dinheiro" é uma conta sem saldo, não uma carteira |
| Possível duplicata é sugerida, nunca juntada sozinha | Um par parecido pode ser de duas compras reais; a decisão fica com você |
| Um repositório com `backend/`, `frontend/` e `infra/` independentes | Mesma organização do CellCare; cada parte se instala, testa e vira imagem sozinha. Monorepo com pacote compartilhado foi descartado |
| README.md e CLAUDE.md em cada parte | O README diz como rodar; o CLAUDE.md guarda só as regras daquela pasta e é carregado pelo Claude Code quando se trabalha nela. O CLAUDE.md da raiz fica com o que vale para tudo, o que economiza contexto |
| Nomes das pastas | `backend/` e `frontend/` como no CellCare; `infra/` em vez de `deploy/` porque guarda também o banco de desenvolvimento; guia visual em `docs/design/`. Pastas em inglês, minúsculas, sem espaço e sem prefixo `valora-` (o repositório e os pacotes `@valora/*` já identificam o projeto) |
| Back e front sem código compartilhado | Cada parte se entende sozinha. O custo é repetir alguns schemas e utilitários; o front valida as respostas da API com os dele |
| Front servido por nginx, em container próprio | Como no CellCare; o nginx entrega o front e repassa `/api` para o backend, que não publica porta |
| npm em vez de pnpm | O npm já vem com o Node, inclusive no Docker; o Node 26 não traz mais o Corepack |
| Menu lateral em vez de barra inferior | O app passa de dez áreas nas fases 2 e 3; o mesmo menu serve celular (abre por cima) e computador (fixo). Detalhes no [Design System](06-design-system.md#layout-e-navegação) |
