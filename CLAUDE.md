# CLAUDE.md — Valora

Instruções específicas deste projeto. As convenções gerais (nomes, funções, erros, testes, commits) estão no CLAUDE.md global do usuário e continuam valendo.

## O projeto

App de finanças pessoais para **um único usuário**, rodando num **servidor Linux em casa**. Os dados chegam pelo Open Finance via **Meu Pluggy** e ficam num PostgreSQL próprio.

**Status:** Fase 0 do [roadmap](docs/07-roadmap.md) em andamento. As changes `setup-repository` e `setup-api-foundation` estão implementadas; a próxima é `setup-web-foundation`.

## Onde está cada coisa

| Antes de... | Leia |
|---|---|
| Decidir escopo ou funcionalidade | [docs/01-produto.md](docs/01-produto.md) |
| Mexer na integração com o Pluggy | [docs/02-open-finance.md](docs/02-open-finance.md) |
| Criar módulo, rota ou mudar a sincronização | [docs/03-arquitetura.md](docs/03-arquitetura.md) |
| Criar ou mudar tabela | [docs/04-modelo-de-dados.md](docs/04-modelo-de-dados.md) |
| Mexer em Docker, Tailscale ou backup | [docs/05-deploy.md](docs/05-deploy.md) |
| Criar ou mudar qualquer tela ou componente | [docs/06-design-system.md](docs/06-design-system.md), [docs/design/](docs/design/) e o [Figma do Valora](https://www.figma.com/design/MNdGWT8ZnSZkTRxlvoI0Ie/Valora) (em construção) |
| Escolher a próxima tarefa | [docs/07-roadmap.md](docs/07-roadmap.md) |

## Fluxo de trabalho e skills

### OpenSpec: toda mudança começa por uma proposta

Nenhum código é escrito sem uma change do OpenSpec aprovada. Cada item do roadmap (ou um grupo pequeno de itens relacionados) vira uma change.

1. `/opsx:explore` (opcional): para pensar um problema ou requisito ainda em aberto antes de propor.
2. `/opsx:propose <nome>`: cria a change em `openspec/changes/<nome>/`, com proposta, design e tarefas.
   - O nome é em inglês e em kebab-case, por exemplo `setup-repository` ou `sync-transactions`.
   - O texto dos artefatos é em português do Brasil. Nas specs, os marcadores que o OpenSpec valida ficam em inglês: cabeçalhos (`### Requirement:`, `#### Scenario:`), **WHEN**/**THEN** e a palavra SHALL ou MUST em cada requisito (ex.: "O sistema MUST gravar cada transação pelo id do Pluggy.").
   - O contexto do projeto e as regras de cada artefato estão em [openspec/config.yaml](openspec/config.yaml).
3. **O usuário revisa e aprova** a proposta. Só então a implementação começa.
4. `/opsx:apply <nome>`: implementa as tarefas da change.
5. `/opsx:archive <nome>`: arquiva a change quando tudo estiver pronto. Para atualizar as specs sem arquivar, use `/opsx:sync`.

Regras:
- **As propostas seguem os documentos em `docs/` e as regras deste arquivo.** Se uma change precisar contrariar um documento, pergunte ao usuário. Se ele aprovar, o documento é atualizado na mesma change.
- Ao arquivar uma change, marque os itens correspondentes como `[x]` no roadmap.

### Front-end: skills de design

Antes de criar, redesenhar ou revisar qualquer tela ou componente visual, carregue as duas skills:

- `/frontend-design:frontend-design`: direção visual e acabamento ao construir a interface.
- `/ui-ux-pro-max` (skill `ui-ux-pro-max:ui-ux-pro-max`): decisões de UX, layout, acessibilidade, gráficos e revisão de telas prontas.

**O Design System vence.** O [Design System](docs/06-design-system.md) e o [guia de identidade](docs/design/identidade-visual.md) têm prioridade sobre o que as skills sugerirem. As skills ajudam a executar e revisar, mas não trocam cores, fontes, tokens, raios nem a paleta de gráficos.

Se uma skill sugerir algo diferente (outra paleta, outra fonte, rosca colorida por categoria), siga o Design System. Se a sugestão parecer melhor, proponha ao usuário. Se ele aprovar, atualize o Design System, recalculando o contraste.

## Stack

- **Repositório:** um único repositório git com três partes independentes, como no CellCare ([estrutura](docs/03-arquitetura.md#estrutura-do-repositório)):
  - `backend/` e `frontend/` são projetos Node separados, cada um com o próprio `package.json`, `package-lock.json` e configurações;
  - `infra/` guarda Docker Compose e scripts do servidor;
  - a raiz não é um projeto Node, só tem as configurações comuns (Prettier, EditorConfig, `.nvmrc`) e a documentação.
- **Linguagem:** TypeScript `strict` nas duas partes; npm como gerenciador de pacotes.
- **Backend:** Node + Fastify + Zod, PostgreSQL + Drizzle, `pluggy-sdk`, sincronização agendada dentro do backend.
- **Frontend:** React + Vite + Tailwind v4 + shadcn/ui, Recharts, TanStack Query, React Router, Lucide; PWA.
- **Testes:** Vitest e Testcontainers.
- **Deploy:** Docker Compose em `infra/` com `frontend` (nginx), `backend` e `db`; acesso só pela Tailscale.

## Regras que não podem ser quebradas

1. **Dinheiro em centavos, como inteiro** (`bigint` no banco, `*_cents` no nome). Nunca `number` com casas decimais para valores.
   - A conversão de reais para centavos acontece só no `PluggyClient`.
   - A formatação em R$ acontece só no front.
2. **Negativo = saída de dinheiro.** O `PluggyClient` normaliza o sinal, seja qual for a convenção do Pluggy.
3. **A sincronização nunca sobrescreve uma categoria escolhida pelo usuário** (`category_source = 'user'`).
4. **Gravar ou atualizar sempre pelo id do Pluggy.** Rodar a sincronização duas vezes não pode duplicar nada.
5. **Guardar o JSON bruto do Pluggy** em `raw jsonb`.
6. **Transferências internas** (categorias `kind = 'transfer'`, como pagamento de fatura) **ficam fora de todos os totais** de receita e despesa.
7. **Gravar fotos diárias** de saldo e de investimentos (`balance_snapshots`, `investment_snapshots`). Histórico perdido não volta.
8. **Só leitura.** Nunca implementar pagamento, Pix ou transferência.
9. **Lançamento manual só como complemento** ([regras](docs/01-produto.md#lançamento-manual)): dinheiro em espécie (conta "Dinheiro") e transações que o Open Finance não trouxe.
   - "Dinheiro" **não é carteira com saldo**: não tem saldo e fica fora do saldo total. Ignore o item "Carteiras" do guia visual.
   - Transação manual (`source = 'manual'`) pode ser editada e excluída por inteiro e a sincronização nunca a altera nem apaga.
   - Numa transação do Open Finance, só a categoria é editável.
   - Possível duplicata entre manual e Open Finance é sugerida; **nunca juntar sozinho**.
10. **Sem IA conversacional.** Funcionalidade nova vira tela ou regra, não pergunta a um modelo.
11. **Um único usuário.** Sem multiusuário, sem cadastro, sem tela de login na v1.

## Limites externos

- **Meu Pluggy:** até 5 conexões, só do mesmo titular, atualização a cada 24 h, só uso pessoal. Não adianta sincronizar mais de uma vez por dia além do botão manual.
- **Open Finance:** histórico de até 12 meses. O banco do Valora é a única cópia do que for mais antigo.
- **Testes nunca chamam a API real do Pluggy.** Use respostas gravadas e anonimizadas.

## Código

- **Idioma:**
  - identificadores, tabelas, colunas e rotas em inglês;
  - textos da interface e documentação em português do Brasil;
  - commits em Conventional Commits, em inglês.
- **Camadas:** Controller → Service → Repository. O `PluggyClient` é o único que fala com o Pluggy.
- **Validação:** Zod em toda entrada (requests, `.env`, respostas do Pluggy, e no front as respostas da API).
- **Partes independentes:** o frontend nunca importa código do `backend/`, e vice-versa. O backend é o dono do contrato da API; o front tem os próprios schemas em `frontend/src/lib/api/`. **Mudou um endpoint, os dois lados mudam na mesma change**, com testes nos dois ([Contrato da API](docs/03-arquitetura.md#contrato-da-api)).
- **API:** rotas sob `/api/v1`, listagens paginadas, DTOs na saída, erro no formato `{ "error": { "code", "message", "details" } }`.

## Interface

- **Siga o [Design System](docs/06-design-system.md)** e carregue as [skills de design](#front-end-skills-de-design) antes de mexer em tela. Use os tokens (`bg-card`, `text-muted-foreground`...), **nunca hex direto** em componente.
- **A aplicação tem que ser responsiva** ([regras](docs/06-design-system.md#responsividade)):
  - funciona de 320 px até monitores largos, sem rolagem horizontal da página;
  - celular primeiro: abaixo de 1024 px o menu lateral abre por cima, pelo botão de menu no topo; a partir de 1024 px fica fixo e pode ser recolhido (264 px aberto, 72 px só com ícones). Não existe barra inferior;
  - toda tela nova é conferida em 320, 390, 768, 1024 e 1440 px, nos dois temas.
- **Valores:**
  - receita em `positive` com `+`;
  - despesa na cor normal com `−` (U+2212);
  - vermelho (`destructive`) só para estouro, erro e saldo negativo.
- **Gastos por categoria** são uma lista de barras numa cor só. Categorias não têm cor. Nada de rosca colorida por categoria.
- **Paleta de gráficos:** use os slots em ordem, sem pular. Texto nunca na cor da série.
- **Estados:** toda tela tem carregando (skeleton), vazio e erro. Funcionalidade não pronta usa o selo "Demonstração", nunca dado falso parecendo real.
- **Formatação** de moeda, datas e percentuais só pelas funções de `frontend/src/lib`, sempre em pt-BR e `America/Sao_Paulo`.
- **Ao mudar uma cor,** recalcule o contraste e atualize as tabelas do Design System.

## Segurança

- Credenciais (Pluggy, banco) **só nos `.env`** (`backend/.env` em desenvolvimento, `infra/.env` em produção), ignorados pelo git em qualquer pasta. Os `.env.example` não têm valores reais.
- **Nunca registrar nos logs** valores, descrições de transações, tokens ou credenciais.
- Só o `frontend` (nginx) publica porta, presa ao `127.0.0.1`; o backend e o banco ficam só na rede interna do Compose. O app é publicado só por `tailscale serve`. **Nunca `tailscale funnel`.** Se um dia precisar de acesso fora da Tailscale, a tela de login vem antes.

## Comandos

Requisitos: Node 26 (`nvm use` lê o `.nvmrc` da raiz) e o npm que vem com ele.

**Cada parte tem o próprio `README.md` (como rodar) e `CLAUDE.md` (regras só dela).** O Claude Code carrega o `CLAUDE.md` da pasta quando você trabalha nela, então regras específicas ficam lá e não neste arquivo.

- [backend/README.md](backend/README.md) e [backend/CLAUDE.md](backend/CLAUDE.md)
- [frontend/README.md](frontend/README.md) e [frontend/CLAUDE.md](frontend/CLAUDE.md)
- [infra/README.md](infra/README.md) e [infra/CLAUDE.md](infra/CLAUDE.md)

Os comandos rodam dentro da pasta da parte (`cd backend` ou `cd frontend`). As duas partes têm os mesmos scripts de qualidade:

| Comando | O que faz |
|---|---|
| `npm ci` | Instala as dependências da parte, seguindo exatamente o `package-lock.json` |
| `npm run typecheck` | Verifica os tipos (TypeScript `strict`) |
| `npm run lint` / `npm run lint:fix` | ESLint (`any` proibido, ordem dos imports) / com correção automática |
| `npm run format` / `npm run format:check` | Formata / confere com o Prettier (estilo único, definido na raiz) |
| `npm test` | Roda os testes Vitest |

O backend ainda tem `dev`, `build`, `start`, `test:unit`, `test:integration`, `db:generate`, `fixtures:record` e `fixtures:categories` (veja o README dele). O `fixtures:record` chama a API real do Pluggy uma vez, com as credenciais do `backend/.env`, e regrava as fixtures anonimizadas de `backend/test/fixtures/pluggy/`; os testes nunca chamam o Pluggy.

Sincronizar na hora, em desenvolvimento (com o `npm run dev` rodando): `curl -X POST http://127.0.0.1:3000/api/v1/sync-runs`. O resultado sai em `curl http://127.0.0.1:3000/api/v1/sync-runs/latest`. O frontend ainda tem `dev` (Vite em `http://localhost:5173`, com proxy de `/api` para o backend em `localhost:3000`), `build`, `preview` e `check:tokens` (falha se achar cor em hex em `src/components` ou `src/features`; roda junto com o `lint`).

Antes de dar uma tarefa por pronta, rode `typecheck`, `lint`, `format:check` e `test` **em cada parte que mudou**. Os testes de integração do backend precisam do Docker rodando.

Banco de desenvolvimento (a partir da raiz): `docker compose -f infra/compose.dev.yml up -d`. Os comandos de produção estão em [docs/05-deploy.md](docs/05-deploy.md).

## Manter a documentação em dia

- Item do roadmap concluído → marcar `[x]` em [docs/07-roadmap.md](docs/07-roadmap.md).
- Decisão nova de arquitetura → tabela "Decisões" em [docs/03-arquitetura.md](docs/03-arquitetura.md).
- Tabela ou coluna nova → [docs/04-modelo-de-dados.md](docs/04-modelo-de-dados.md).
- Comando novo → seção "Comandos" deste arquivo.
