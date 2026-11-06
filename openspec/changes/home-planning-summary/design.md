## Context

A decisão "um endpoint agregado para o Início" (`docs/03-arquitetura.md`) mantém todas as regras no servidor e evita carregamentos em cascata. O `DashboardService` já chama os services de contas, orçamentos e transações. Esta change só adiciona mais duas chamadas, aos services de projeção e metas, e dois cartões na grade do Início.

## Goals / Non-Goals

**Goals:**
- O número da projeção e o progresso das metas serem exatamente os das telas próprias.
- Continuar com uma única requisição para o Início.

**Non-Goals:**
- Gráficos novos no Início.

## Decisions

**1. Campos novos no mesmo endpoint, sem quebrar os atuais.**
- `projection`: `projectedBalanceCents`, `lowestBalanceCents`, `lowestBalanceDate`, `hasPlannedItems` (há ocorrência pendente ou fatura no período).
- `goals`: `items` (até 3) com `id`, `name`, `icon`, `targetCents`, `savedCents`, `percent`, `status`, `estimatedDate` e `requiredMonthlyCents`; e `activeCount`.
- *Alternativa:* o Início chamar `/projection` e `/goals` direto. Descartada pela decisão do endpoint agregado, e porque criaria mais estados de carregamento e erro na tela.

**2. Reuso, nunca recálculo.**
- O `DashboardService` chama `ProjectionService` e `GoalsService` e reduz a resposta deles ao resumo. Os testes comparam o resumo com a resposta das rotas completas para garantir que não divergem.

**3. Projeção só no mês atual.**
- O Início aceita `month`. Se for diferente do mês atual (São Paulo), `projection` vem `null` e o cartão não aparece, em vez de mostrar uma projeção que não faz sentido para o passado.

**4. Metas em destaque.**
- Mesma ordem da tela de Metas (não concluídas, prazo mais próximo primeiro, sem prazo por último), cortada em 3. Metas concluídas não entram no resumo.

**5. Erros.**
- Se um dos services falhar, o endpoint inteiro falha com o erro padrão, como já acontece com os demais blocos; a tela mostra o estado de erro do Início. Dividir em erros parciais seria complexidade sem uso real num app de um usuário.

**6. Telas.**
- Cartão de projeção: o saldo projetado como número de destaque, rótulo de seção "Projeção do fim do mês", aviso "Saldo negativo em 20/11" (ícone e texto, `destructive`) só quando o menor saldo é negativo, e o link "Ver planejamento". Sem itens previstos (`hasPlannedItems` falso): estado vazio "Planeje o mês" com a ação para a tela de Planejamento.
- Cartão de metas: até 3 linhas (ícone, nome, barra, percentual, uma frase de situação) e "Ver metas"; vazio com "Criar meta".
- Posição na grade definida na tarefa de design com as skills, respeitando a ordem de leitura no celular (1 coluna), 2 no tablet e 12 no computador.
- "Ocultar valores" mascara os valores dos dois cartões; carregando usa o skeleton do Início.

## Risks / Trade-offs

- [O Início fica mais pesado por chamar mais dois services] → São consultas pequenas e o dado é de um usuário só; medir o tempo da resposta no teste de integração e aceitar enquanto ficar na casa de dezenas de milissegundos.
- [Depende de quatro changes anteriores] → A ordem de aplicação do roadmap garante isso; esta é a penúltima.

## Open Questions

Nenhuma.
