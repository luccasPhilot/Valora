# Changelog

Todas as mudanças relevantes do Valora ficam aqui. O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e as versões seguem o [versionamento semântico](https://semver.org/lang/pt-BR/) (enquanto estiver em `0.x`, qualquer versão pode trazer mudanças grandes).

O texto de cada versão é escrito à mão. Ao publicar o release, o GitHub Actions ([release.yml](.github/workflows/release.yml)) usa a seção da versão e anexa a lista de commits do intervalo. Como publicar: [docs/05-deploy.md](docs/05-deploy.md#versões-e-releases).

## v0.1.0 - 2026-11-26

Fases 3 e 4: patrimônio e relatórios, uma rotina de revisão das transações, conferência dos dados, notas e etiquetas e notificações no iPhone.

### Ao atualizar

- Há migrations novas. O `deploy.sh` faz o backup antes de trocar a versão.
- O push é opcional: sem as três variáveis `VAPID_*` no `infra/.env` ele fica desligado e a seção "Notificações" não aparece em Ajustes. Para ligar, veja [docs/05-deploy.md](docs/05-deploy.md).
- O alerta da foto de 31/12 só protege o ano se este deploy sair **antes de 31/12/2026**.

### Adicionado

- **Relatórios:** área nova com período compartilhado e "Ver em tabela". Histórico de receitas e despesas, gasto por categoria ao longo dos meses, evolução da poupança e evolução do patrimônio, cada um com um cartão de destaque e as respostas do período.
- **Análise de categorias** (`/categorias`): todas as categorias do mês com comparação, tendência de 6 meses, orçamento, pontos de atenção e cobranças recorrentes.
- **Investimentos manuais:** posições de instituições fora do Open Finance (INCO, Binance, corretoras sem conector), com o valor informado à mão. A sincronização grava a foto diária delas e nunca as altera.
- **Metas vinculadas** a um investimento ou a uma conta, que se atualizam sozinhas, sem limite de itens por meta.
- **Caixa "Para revisar":** fila com as transações novas, as sem categoria e as possíveis duplicatas, com "Ok", "Trocar categoria" e "Marcar tudo como revisado", e o contador no Início.
- **Categoria em massa** na lista de Transações e na caixa de revisão, e **regra sugerida**: depois de duas correções iguais da mesma descrição, o app oferece "Criar regra?".
- **Saúde dos dados:** aviso de consentimento a vencer (30 e 7 dias antes), conciliação entre o saldo e as transações ("possível transação faltando entre dd/mm e dd/mm"), alerta de conta sem transações há 10 dias ou mais e histórico das sincronizações em Ajustes.
- **Foto de 31/12 garantida:** o sino avisa se o dia terminar sem a foto de saldo e de investimentos, base dos bens e direitos no IR.
- **Notas e etiquetas:** nota livre de até 500 caracteres e até 10 etiquetas por transação, do Open Finance ou manual, com filtro em Transações e nos relatórios, busca na nota e uma aba "Etiquetas" em "Categorias e regras". A sincronização nunca altera nem apaga nota e etiqueta.
- **Notificações push no iPhone:** o PWA instalado recebe um aviso quando um alerta novo é criado e quando a caixa de revisão chega a 10 transações ou mais. O texto é fixo por tipo, sem valor nem descrição, porque passa pelo servidor da Apple. Seção "Notificações" em Ajustes para ativar, testar e desativar.
- **Exportar:** "Exportar CSV" em Transações, com o filtro atual, e "Baixar meus dados" em Ajustes, um `.zip` com um CSV por tabela. O `.zip` não leva o JSON bruto do Pluggy nem as inscrições de push.
- **Backups mais seguros:** nome com a origem e a hora, sem sobrescrever; retenção em camadas; conferência semanal que restaura o backup num banco temporário; avisos de falha do backup, da sincronização e do disco pelo healthchecks.io, com só o sinal de ok ou falha.
- **Comando `/opsx:verify`** e a skill `openspec-verify-change`, para conferir uma change contra a implementação antes de arquivar.

### Alterado

- **Transações:** filtros reorganizados, com o resumo "quanto entrou e saiu neste filtro", filtro "Sem categoria", lista de seleção com busca e ícones de categoria e um só rolamento nos painéis.
- **Densidade no computador:** a interface ganhou uma base de 14 px em telas largas com mouse; no celular nada muda. Menu lateral, título da aba e gesto de voltar refinados.
- **"Ocultar valores"** passou a ocultar também as cores de entrada e saída e os valores dos formulários de edição.
- **Estorno** reduz a despesa em vez de contar como receita, no Início, nos relatórios, nos orçamentos e nos gastos por categoria.
- **Numa transação do Open Finance,** além da categoria, a nota e as etiquetas agora são editáveis. Os dados do banco continuam só de leitura.
- **Atualização dos dados na tela:** depois de salvar uma regra, uma categoria, uma meta ou uma previsão, o Início, os orçamentos e os relatórios se atualizam na hora, em vez de mostrar números velhos.

### Corrigido

- **A sincronização deixou de perder dado em silêncio:** transações de um banco parado há mais de 30 dias, a categoria escolhida pelo usuário numa transação pendente que vira postada e os investimentos, que não são mais zerados quando o Pluggy devolve uma coleta parcial.
- **Foto diária recuperada** quando o horário da sincronização passa com o servidor desligado: ao subir, a API sincroniza só o que faltou.
- **Saldo do Início:** a curva e a variação do mês deixaram de contar o saldo inteiro de um banco como ganho quando a foto dele faltou num dia.
- **Tela de erro:** uma falha ao abrir uma tela (por exemplo, depois de um deploy com a aba aberta) mostra uma tela em português com saída, em vez da página padrão em inglês.
- **Celular:** seletores de data que estouravam a largura da tela e o gesto de avançar que reabria o menu.
- **Gráficos:** eixos arredondados, barras proporcionais à participação e o esqueleto de carregamento visível no tema claro.

### Documentação

- Documentação, Design System e specs do OpenSpec atualizados para as fases 3 e 4, com o fim de linha LF exigido no `CLAUDE.md`.

## v0.0.3 - 2026-11-11

Início da fase 3: investimentos e patrimônio.

### Adicionado

- **Tela de Investimentos:** posição de cada investimento, agrupada por tipo, e o total.
- **Evolução do patrimônio:** contas e investimentos menos a fatura em aberto, mês a mês, a partir das fotos diárias.
- **Início:** linha de patrimônio no cartão de saldo.

### Corrigido

- O workflow de release resolve o commit da tag sem fazer checkout dele.

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
