## Context

O modelo de dados prevê `goals` com `saved_cents` informado à mão e diz que o prazo estimado é "calculado, não guardado", pelo ritmo de aporte. Com um único número guardado não existe ritmo; é preciso saber as datas dos aportes. A tela segue o padrão das telas de lista com painel (Orçamentos, Categorias).

## Goals / Non-Goals

**Goals:**
- Valor acumulado sempre igual à soma dos aportes, sem divergência.
- Estimativa explicável: média dos últimos 90 dias.
- Meta concluída e meta sem ritmo tratadas sem números absurdos.

**Non-Goals:**
- Vínculo automático com contas e investimentos.

## Decisions

**1. `goal_contributions` como fonte da verdade; `saved_cents` é soma mantida na mesma transação.**
- Colunas: `id`, `goal_id` (`ON DELETE CASCADE`), `date`, `amount_cents` (positivo = aporte, negativo = retirada, nunca zero), `kind` (`initial`, `deposit`, `withdrawal`), `created_at`.
- Criar a meta com valor inicial grava um aporte `initial`. Aporte e retirada atualizam `goals.saved_cents` na **mesma transação do banco**.
- O `initial` não conta no ritmo: é o que já existia antes de você usar o app.
- *Alternativa:* só `saved_cents` editável. Descartada: sem datas não há ritmo.
- O valor acumulado pode ficar abaixo de zero? Não: a retirada que levaria a soma abaixo de zero é recusada.

**2. Ritmo de aporte.**
- `monthlyRateCents = soma líquida de aportes e retiradas (sem initial) dos últimos 90 dias × 30 ÷ 90`, arredondada para baixo.
- Janela de 90 dias contados de hoje (São Paulo). Se a meta tem menos de 90 dias, usa a idade dela em dias (mínimo 30) para não diluir o ritmo.
- Ritmo zero ou negativo = sem ritmo.
- Função pura `estimateGoalPace(goal, contributions, today)`.

**3. Prazo estimado e situação.**
- `remainingCents = max(0, target − saved)`. Se zero: situação `completed`, sem estimativa.
- Com ritmo positivo: `monthsToGo = ceil(remaining ÷ monthlyRate)` e `estimatedDate = hoje + monthsToGo meses`. Acima de 600 meses (50 anos), devolve sem estimativa e a tela diz "mais de 50 anos".
- Sem ritmo: `no_pace`, sem estimativa.
- Com `target_date`: `requiredMonthlyCents = ceil(remaining ÷ meses até o prazo)` (mínimo 1 mês). `on_track` se a estimativa chegar até o prazo, senão `behind`. Prazo já vencido e meta não concluída = `behind`.
- Tudo em inteiros; nada em ponto flutuante.

**4. Progresso.**
- `percent = min(100, floor(saved × 100 ÷ target))`. Meta com saldo acima do valor desejado aparece 100%.
- `target_cents` deve ser maior que zero.

**5. API.**
- `GET /goals` devolve todas as metas com os números calculados e os últimos aportes (até 10 de cada), sem paginação: poucas dezenas no máximo, exceção consciente a registrar nas Decisões. `GET /goals/:id/contributions` lista o histórico completo paginado.
- Ordem: não concluídas primeiro, pelo prazo mais próximo (sem prazo por último), concluídas no fim.
- O DTO nunca expõe colunas v3.

**6. Tela.**
- Rota `/metas`, ícone `Flag`, no grupo "daily" depois de Planejamento.
- Cartão por meta: ícone, nome, `Progress` (cor única; verde só no preenchimento, texto nunca na cor da série), "R$ X de R$ Y", e a linha de situação com ícone e texto: "No ritmo — chega em mar/2027", "Atrasada — precisa guardar R$ 500/mês", "Sem ritmo ainda — registre um aporte", "Concluída".
- Painel de detalhe: histórico de aportes, "Registrar aporte" e "Registrar retirada", editar e excluir (com confirmação).
- Ícone escolhido da mesma lista de ícones das categorias.
- Estados carregando, vazio e erro; "Ocultar valores".

## Risks / Trade-offs

- [Ritmo oscila com aportes irregulares] → A janela de 90 dias suaviza; a tela mostra o ritmo usado para você entender o número.
- [Retirada grande derruba o ritmo a zero] → É o comportamento correto; a situação vira "Sem ritmo".
- [Esquecer de registrar aportes deixa a meta desatualizada] → Aceito: o valor é informado à mão por escolha do roadmap; a v3 traz o vínculo automático.

## Open Questions

Nenhuma.
