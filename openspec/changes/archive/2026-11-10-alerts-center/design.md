## Context

`docs/04-modelo-de-dados.md` define `alerts` com tipo, referências opcionais (transação, categoria, conexão), mensagem e datas de leitura e dispensa. A sincronização reserva o passo 7 para alertas. `budgetStatus` e o gasto líquido do mês já existem em `budgets`, e a conexão guarda `status` e `status_detail`. O Início já tem uma faixa de aviso de conexão.

## Goals / Non-Goals

**Goals:**
- Um alerta por situação: sem repetir a cada sincronização.
- Alertas que se resolvem sozinhos quando a causa some.
- Falha na avaliação nunca atrapalha a sincronização nem uma gravação do usuário.

**Non-Goals:**
- Detectores de transação e notificações fora do app.

## Decisions

**1. Colunas extras em `alerts`: `dedupe_key` e `resolved_at`.**
- `dedupe_key` (`text`, obrigatória) identifica a situação: `budget_warning:<categoryId>:<AAAA-MM>`, `budget_exceeded:<categoryId>:<AAAA-MM>`, `connection_error:<connectionId>`.
- `resolved_at` (`timestamptz`, nula) marca que a causa acabou.
- Índice único **parcial** em `dedupe_key` onde `resolved_at` é nulo: uma situação ativa tem um alerta só, e depois de resolvida pode nascer outro. Dispensar (`dismissed_at`) **não** resolve: se a causa continua, o alerta dispensado segura o índice e nada volta a aparecer.
- `type` com `CHECK` para os cinco tipos do modelo de dados, já agora.
- *Alternativa:* sem `dedupe_key`, comparando colunas. Descartada: cada tipo olha campos diferentes.

**2. Avaliador idempotente: calcula as situações ativas e reconcilia.**
- `AlertEvaluator.evaluate(scope)` calcula o conjunto de situações ativas, cria os alertas que faltam (`INSERT ... ON CONFLICT DO NOTHING`) e marca `resolved_at` nos ativos cujas situações sumiram.
- Rodar duas vezes seguidas não muda nada.

**3. Regras de orçamento.**
- Só o mês atual (São Paulo). Para cada orçamento do mês: status `warning` → alerta `budget_warning`; status `exceeded` → alerta `budget_exceeded`.
- `exceeded` **substitui** o `warning` da mesma categoria e mês: o aviso de 80% é resolvido quando o de estouro nasce.
- Se o gasto cai (estorno) ou o limite sobe, o alerta é resolvido; se depois voltar a passar, nasce de novo (o índice parcial permite).
- Alertas de orçamento de meses passados são resolvidos na avaliação (mês acabou).
- Mensagem estática, sem valores: "Mercado chegou a 80% do orçamento de novembro" e "Mercado estourou o orçamento de novembro".

**4. Regra de conexão.**
- Conexão com `status` `error` ou `consent_expired` gera `connection_error`, com a mensagem a partir de `status_detail` (que já não tem dados financeiros). Voltando a `ok`, o alerta é resolvido.
- A faixa de aviso do Início continua; o sino acrescenta o histórico recente e a lista única.

**5. Quando o avaliador roda.**
- No fim da sincronização (fora das transações por banco, depois de gravar tudo), em qualquer resultado, inclusive `partial` e `failed` por banco: conexão com erro é justamente o caso.
- Depois de gravações do usuário que mudam gasto ou limite: criar, editar ou excluir lançamento manual, trocar categoria (inclusive "Aplicar sempre"), juntar duplicata, definir, remover ou copiar limite de orçamento. Só o avaliador de orçamento, só para os meses afetados.
- **Falha na avaliação nunca falha a operação principal**: o erro é registrado no log sem valores, e a sincronização guarda `alerts_failed` nas estatísticas.
- A chamada fica nos services (camada de regra), nunca nos controllers.

**6. API.**
- `GET /alerts` lista os ativos (não dispensados e não resolvidos), mais recentes primeiro, paginada (`limit` padrão 20, máximo 50), com `unreadCount` total. Cada item: `id`, `type`, `message`, `createdAt`, `readAt` e a referência da tela (`target`: `{ screen: 'budgets', month, categoryId }` ou `{ screen: 'accounts' }`), nunca o `raw`.
- `POST /alerts/:id/read`, `POST /alerts/read-all` e `POST /alerts/:id/dismiss` são idempotentes. Alerta inexistente: 404 `NOT_FOUND`.

**7. Sino.**
- No cabeçalho do app, ao lado do botão de ocultar valores. Contador de não lidos ("9+" acima de 9) com `aria-label` ("Alertas, 3 não lidos").
- Em telas largas abre um painel ancorado; no celular, uma folha por cima. Cada item: ícone do tipo + texto (cor nunca sozinha), data relativa, ação principal ("Ver orçamento", "Ver contas") e "Dispensar".
- Abrir um item o marca como lido; "Marcar todos como lidos" no topo do painel.
- A consulta é atualizada ao abrir a tela, ao voltar o foco para a janela e ao terminar uma sincronização (como `use-sync` já faz para outras consultas).
- Tipos ainda sem detector têm um item genérico (ícone de sino + a mensagem), para a change seguinte só acrescentar o ícone próprio.
- Estados: carregando, vazio ("Nenhum alerta"), erro.

## Risks / Trade-offs

- [A avaliação de orçamento toda gravação pode pesar] → É uma consulta agregada do mês atual por categoria com limite; no volume de um usuário, milissegundos.
- [Alerta dispensado fica "preso" enquanto a causa continuar] → É o comportamento desejado; quando a causa acaba e volta, nasce um novo.
- [Estorno que tira do alerta e outra compra que o recoloca gera alerta repetido no mês] → Aceito: reflete a situação real.

## Open Questions

Nenhuma.
