# Produto

## Visão

O Valora é um app de finanças pessoais para **uso pessoal de um único titular**. Ele junta contas, cartões, orçamentos, metas e investimentos num lugar só, com dados que chegam sozinhos pelo Open Finance.

Não é um produto comercial e não vai ter outros usuários. Isso simplifica muita coisa: não tem cadastro, planos, cobrança nem várias contas de usuário.

## Princípios

- **Seus dados, no seu servidor.** Tudo fica num PostgreSQL rodando em casa. O Pluggy só abastece esse banco uma vez por dia.
- **Automático primeiro.** Quase tudo vem do Open Finance, sem digitar nada. O lançamento manual existe só para o que o Open Finance não traz: dinheiro em espécie e alguma transação que faltou (veja [Lançamento manual](#lançamento-manual)).
- **Previsível.** Categorias, alertas e projeções saem de regras escritas no código, não de IA. A mesma entrada dá sempre o mesmo resultado.
- **Só leitura.** O app nunca movimenta dinheiro: nada de pagamento, Pix ou transferência.
- **Qualidade de fintech.** O visual segue o [guia de identidade](design/identidade-visual.md) e o [Design System](06-design-system.md). Não pode parecer um sistema administrativo nem uma planilha.

## Áreas e funcionalidades

A fase de cada item está detalhada no [roadmap](07-roadmap.md).

### Saldo total

O **saldo total** é a soma do saldo das contas **corrente e poupança** que você não ocultou dos totais. Ficam de fora:

- os **cartões de crédito**: a fatura não é saldo, e aparece à parte como "faturas em aberto" (a soma das faturas atuais dos cartões não ocultos), junto com o limite disponível;
- a conta **"Dinheiro"**, que não tem saldo;
- as contas que você marcou com **"Ocultar dos totais"** (no painel de cada conta, na tela de Contas). A conta oculta continua na lista, com a marcação "Fora dos totais".

Cheque especial entra como número negativo e reduz o total. O Início e a tela de Contas usam a mesma definição, calculada pela API.

| Área | O que tem | Fase |
|---|---|---|
| **Início (Dashboard)** | Saldo total, receitas e despesas do mês, gráfico receitas x despesas, gastos por categoria, últimas transações, ocultar valores | v1 |
| | Projeção do fim do mês, resumo das metas, alertas | v2 |
| | Evolução do patrimônio | v3 |
| **Transações** | Lista agrupada por dia; filtros por período, categoria, tipo e conta; pesquisa; detalhe; trocar a categoria | v1 |
| | Lançamento manual de receitas e despesas, aviso de possível duplicata | v1 |
| **Contas e cartões** | Contas e cartões, saldo de cada um e o total, status de cada conexão | v1 |
| | Faturas do cartão: fatura atual com vencimento e situação (aberta, vencida, paga), próximas faturas e parcelas futuras por mês | v2 |
| **Categorias e regras** | Categorias próprias, regras automáticas, regras que nascem quando você corrige uma categoria | v1 |
| **Orçamentos** | Limite por categoria no mês, quanto já foi gasto, aviso perto do limite e quando estoura | v1 |
| **Planejamento** | Receitas e despesas previstas (avulsas ou que se repetem todo mês ou todo ano), por mês: o que falta acontecer, o que já foi realizado e o que foi pulado, com os totais previstos. Você vincula uma previsão à transação real (o app sugere candidatas, mas nunca vincula sozinho), marca como realizada sem vincular, pula o mês ou desfaz; também pode pausar e excluir | v2 |
| | Projeção do saldo no fim do mês: o saldo de hoje mais o que está previsto e menos as faturas que vencem, dia a dia, com o ponto mais baixo e o aviso de saldo negativo. Fica no topo da tela de Planejamento ([regras](#projeção-do-fim-do-mês)) | v2 |
| **Metas** | Objetivo, valor desejado, valor acumulado (informado à mão), progresso, prazo estimado | v2 |
| | Meta vinculada a um investimento ou conta, que se atualiza sozinha | v3 |
| **Alertas** | Cobrança duplicada, assinatura nova, orçamento perto do limite ou estourado, conexão com banco caída | v2 |
| **Investimentos** | Posição de cada investimento e o total | v3 |
| **Relatórios** | Evolução financeira, histórico de receitas e despesas, análise por categoria, evolução do patrimônio | v3 |

## Lançamento manual

O Open Finance traz quase tudo, mas não tudo. O lançamento manual cobre duas situações:

1. **Dinheiro em espécie.** Você recebeu algo em dinheiro e gastou em dinheiro. A entrada e a saída são lançadas à mão, na conta **"Dinheiro"**.
2. **Uma transação que o Open Finance não trouxe.** Ela é lançada à mão na conta ou no cartão em que aconteceu.

Regras:

- **"Dinheiro" não é uma carteira com saldo.** É só a origem do lançamento. As entradas e saídas em dinheiro contam nas receitas, nas despesas, nos orçamentos e nos relatórios, mas não existe "saldo em dinheiro" e ele não entra no saldo total.
- **Uma transação manual pode ser editada e excluída por inteiro.** Numa transação do Open Finance, só a categoria muda.
- **A sincronização nunca altera nem apaga uma transação manual.**
- **Possível duplicata:** se você lançou à mão uma transação numa conta conectada e depois ela chega pelo Open Finance (mesma conta, mesmo valor, data até 3 dias de diferença), o app avisa. Você escolhe:
  - **Juntar:** fica a do banco, com a categoria que você escolheu;
  - **São diferentes:** as duas ficam, e o aviso não volta.
  - O app nunca junta sozinho.
- **Saque:** um saque no banco chega pelo Open Finance como saída, com a categoria "Saque". Se você também lançar à mão o que gastou com aquele dinheiro, troque a categoria do saque para uma transferência, para não contar a despesa duas vezes.

## Projeção do fim do mês

Responde "como vou chegar ao fim do mês?" com uma conta que dá para conferir à mão:

`saldo projetado = saldo de hoje + receitas previstas − despesas previstas − faturas que vencem até o último dia do mês`

- **Saldo de hoje** é o saldo total de Contas (a mesma definição do Início).
- **Só entra o que ainda vai acontecer.** Previsões realizadas já estão no saldo e as puladas não vão acontecer; as duas ficam de fora.
- **Faturas, não parcelas.** Entra a parte não paga de cada fatura de cartão que vence no mês. A fatura já contém as parcelas do mês, então descontar as duas contaria a mesma saída duas vezes. Cartão oculto não entra, como no saldo.
- **Atrasado entra hoje.** Previsão pendente com data passada e fatura vencida e não paga são descontadas hoje, e a tela marca "Atrasada" para você resolver. Esconder um gasto provável seria pior do que mostrá-lo.
- **Saídas primeiro.** No mesmo dia, as saídas vêm antes das entradas, para o ponto mais baixo não ser otimista.
- **Cartão sem vencimento** (o banco não informou e não há como estimar) não entra na conta, e a tela avisa qual cartão ficou de fora. Vencimento **estimado** entra e vem marcado.
- **Não prevê gastos do dia a dia** (mercado, lazer) nem meses futuros, e os gastos no cartão ainda fora de fatura fechada entram só na fatura que vencer depois. A tela diz isso.

## Orçamentos

Um orçamento é o limite de gasto de uma **categoria de despesa** em um **mês**. Categorias de receita e de transferência não têm orçamento.

- **Gasto líquido.** O gasto da categoria no mês é a soma dos valores das transações dela, com o sinal invertido e **mínimo de zero**. Entram transações do Open Finance e lançadas à mão (inclusive "Dinheiro"), pendentes ou não. **Estornos reduzem o gasto**: uma compra de R$ 200 com estorno de R$ 50 gasta R$ 150. Uma categoria só com estornos gasta zero.
- **Status**, calculado em centavos inteiros, sem arredondar antes de comparar:
  - **Dentro:** abaixo de 80% do limite;
  - **Atenção:** de 80% até 100%, inclusive (R$ 800,00 e R$ 1.000,00 de um limite de R$ 1.000,00);
  - **Estourou:** acima de 100% (R$ 1.000,01 já estoura).
- **Transação sem categoria** não entra em nenhum orçamento.
- **Copiar do mês anterior** traz os limites do mês anterior só para as categorias ativas que ainda não têm limite no mês. Nunca sobrescreve um limite já definido.
- O orçamento não se repete sozinho: um mês novo começa vazio, e você copia o anterior ou cria os limites.

## Metas

Uma meta é algo que você quer juntar: a reserva de emergência, a viagem, a entrada do apartamento. O valor acumulado é **informado à mão**, por aportes e retiradas com data; o app nunca movimenta dinheiro. Todas as contas são em centavos inteiros, sem IA.

- **Valor acumulado.** É sempre a soma dos aportes e retiradas. O valor que você já tinha ao criar a meta entra como um aporte `initial`. Uma retirada maior que o acumulado é recusada, e remover um aporte desfaz o efeito dele (recusado se deixaria o acumulado negativo).
- **Progresso.** `floor(acumulado × 100 ÷ desejado)`, limitado a 100%: R$ 0,01 faltando ainda mostra 99%, e passar do valor desejado mostra 100%.
- **Ritmo.** A média mensal líquida dos últimos 90 dias: `(aportes − retiradas) × 30 ÷ 90`, arredondada para baixo. O **valor inicial não conta**, porque não foi guardado enquanto você usava o app. Meta com menos de 90 dias usa a idade dela em dias, com **mínimo de 30**, para o primeiro aporte não ser diluído. A tela mostra o ritmo usado para você entender a estimativa.
- **Prazo estimado.** `ceil(faltante ÷ ritmo)` meses a partir de hoje. Sem ritmo (nenhum aporte, ou retiradas que anulam os aportes) não há estimativa e a situação é "Sem ritmo ainda". Acima de 600 meses (50 anos) a tela diz "mais de 50 anos", sem data.
- **Situação**, sempre em ícone e texto, nunca só a cor:
  - **Concluída:** acumulado maior ou igual ao desejado, qualquer que seja o prazo;
  - **No ritmo:** a estimativa chega até o prazo (sem prazo informado, basta ter ritmo);
  - **Atrasada:** a estimativa passa do prazo, ou o prazo venceu e a meta não foi atingida. A tela diz quanto guardar por mês (`ceil(faltante ÷ meses até o prazo)`, no mínimo 1 mês);
  - **Sem ritmo ainda:** não há ritmo para estimar.
- **Ordem da lista.** Não concluídas primeiro, pelo prazo mais próximo (sem prazo por último); concluídas no fim.

## Fora do escopo

Estes itens ficam de fora, inclusive no futuro:

- **IA conversacional.** Nada de fazer perguntas a uma IA sobre os gastos. Toda funcionalidade nova vira uma tela ou regra.
- **Carteira de dinheiro com saldo.** Isso inclui o item "Carteiras" do guia de identidade visual. Gastos em dinheiro são lançados como transações (veja [Lançamento manual](#lançamento-manual)), sem controle de saldo.
- **Mais de um usuário ou contas de outras pessoas**, mesmo da família. O plano gratuito do Meu Pluggy também não permite.
- **WhatsApp ou outro canal de chat.**
- **Movimentar dinheiro** (pagamentos, Pix, transferências).
- **Uso comercial.**

## Referência: Pierre

O [Pierre](https://lp.pierre.finance/) é o app mais próximo do Valora: um assistente de finanças com IA, comprado pela CloudWalk (dona da InfinitePay) em 2025. Ele conecta mais de 100 instituições pelo Open Finance e funciona por app, web e WhatsApp. O plano grátis conecta 1 banco; o Pro custa R$ 39/mês para até 5 bancos.

**Ideias que o Valora aproveita (sem IA):**
- categorização automática que aprende com as suas correções;
- alerta de cobrança duplicada;
- detecção de assinaturas e parcelamentos;
- projeção do fim do mês;
- alerta de limite de gasto.

**O que o Valora faz diferente:**
- **Orçamento planejado.** Receitas e despesas previstas para planejar o mês, que usuários do Pierre pedem e ele não tem.
- **Dados no seu servidor**, e não com uma empresa que também vende CDB e cartão próprios.
- **Sem IA e sem limite de mensagens.** Regras previsíveis, ajustadas ao seu uso.
- **Custo zero.** O Meu Pluggy é gratuito para até 5 conexões.

Fontes:
- [Pierre: site oficial](https://lp.pierre.finance/)
- [App Store: Pierre](https://apps.apple.com/br/app/pierre-controle-de-gastos-ia/id6749781755)
- [Exame: Pierre vira aposta da CloudWalk](https://exame.com/inteligencia-artificial/pierre-assistente-de-ia-para-financas-vira-aposta-da-cloudwalk-para-crescer-no-consumo/)
- [Let's Money: CloudWalk revela Pierre, IA multiagente](https://www.letsmoney.com.br/noticias/cloudwalk-pierre-ia-multiagente-financas-pessoais/)
- [Nunto: alternativa ao Pierre (texto de um concorrente)](https://nunto.com.br/blog/alternativa-ao-pierre)
