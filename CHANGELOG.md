# Changelog

Todas as mudanças relevantes do Valora ficam aqui. O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e as versões seguem o [versionamento semântico](https://semver.org/lang/pt-BR/) (enquanto estiver em `0.x`, qualquer versão pode trazer mudanças grandes).

O texto de cada versão é escrito à mão. Ao publicar o release, o GitHub Actions ([release.yml](.github/workflows/release.yml)) usa a seção da versão e anexa a lista de commits do intervalo. Como publicar: [docs/05-deploy.md](docs/05-deploy.md#versões-e-releases).

## v0.0.2 - 2026-11-10

Fase 2: planejamento, alertas e o app instalável no celular.

### Adicionado

- **Faturas de cartão de crédito:** sincronização das faturas, API e tela de faturas.
- **Lançamentos planejados:** API e tela de planejamento para receitas e despesas que ainda vão acontecer.
- **Projeção do mês:** estimativa do saldo no fim do mês, a partir do saldo atual e dos lançamentos planejados.
- **Metas de economia:** API e tela de metas.
- **Central de alertas:** API, sino e painel de alertas no app, inclusive alertas de padrões nas transações.
- **Arquivar banco:** conexões que não são mais usadas podem ser arquivadas na tela de Contas, sem perder o histórico.
- **App instalável e offline (PWA):** ícones, telas de abertura e uso sem internet.
- **Início:** cartões de projeção e de metas na tela inicial.
- **Página 404** em tela cheia, sem o menu lateral.
- **Release automático:** este changelog e o workflow que publica os releases no GitHub.

### Alterado

- Fonte da marca aplicada na interface e curva do símbolo do logo corrigida.
- Documentação atualizada para as funcionalidades da fase 2.
- Changes do OpenSpec da fase 2 arquivadas e specs sincronizadas.

## v0.0.1 - 2026-11-06

Fases 0 e 1: fundação do projeto e as telas principais, com os dados chegando pelo Open Finance.

### Adicionado

- **Fundação:** repositório com `backend/`, `frontend/` e `infra/` independentes; API Fastify com health check e erros padronizados; schema v1 do banco com a primeira migration; base do front com tema claro e escuro, menu lateral responsivo e recolhível, e formatação em pt-BR.
- **Identidade visual:** logo, favicon e guia de identidade atualizados.
- **Sincronização com o Open Finance:** dados do Meu Pluggy gravados no PostgreSQL próprio, sem duplicar ao sincronizar de novo.
- **Categorização automática** de transações, por regras e pelo mapeamento de categorias do Pluggy.
- **Tela de Transações:** filtros e correção de categoria.
- **Lançamentos manuais** com detecção de possíveis duplicatas.
- **Tela de Contas:** status da última sincronização e alerta de conexão com problema.
- **Tela de Orçamentos:** limites mensais por categoria.
- **Tela inicial:** saldo, gráficos e atalhos.
- **CI** no GitHub (typecheck, lint, formatação, testes e build das duas partes).
- **Deploy no servidor de casa:** Docker Compose, `deploy.sh` e backups do banco.
