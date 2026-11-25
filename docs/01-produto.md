# Produto

## Visão

O Valora é um app de finanças pessoais para **uso pessoal de um único titular**. Ele junta contas, cartões, orçamentos, metas e investimentos num lugar só, com dados que chegam sozinhos pelo Open Finance.

Não é um produto comercial e não vai ter outros usuários. Isso simplifica muita coisa: não tem cadastro, planos, cobrança nem várias contas de usuário.

## Princípios

- **Seus dados, no seu servidor.** Tudo fica num PostgreSQL rodando em casa. O Pluggy só abastece esse banco uma vez por dia.
- **Automático primeiro.** Quase tudo vem do Open Finance, sem digitar nada. O lançamento manual existe só para o que o Open Finance não traz: dinheiro em espécie, alguma transação que faltou e os investimentos de instituições fora dele (veja [Lançamento manual](#lançamento-manual)).
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

A **evolução do saldo** no Início soma, em cada dia com foto, as mesmas contas, cada uma pela sua foto mais recente até o dia (no máximo 7 dias), como o patrimônio. Um banco que não gravou a foto do dia 1 entra com a do dia 31 do mês anterior, e não vira "ganho" no resto do mês. A variação "no mês" só existe no mês atual.

### Receita, despesa e estorno

A mesma definição vale no Início, nos relatórios e no resumo e no filtro de tipo de Transações. As transferências internas (categorias do tipo transferência, como o pagamento da fatura) ficam fora das duas.

- **Despesa:** toda transação numa **categoria de despesa**, qualquer que seja o sinal, e toda saída sem categoria. O **estorno** (uma entrada numa categoria de despesa) **reduz a despesa** e não conta como receita: uma compra de R$ 200 com estorno de R$ 50 dá R$ 150 de despesa, o mesmo número dos gastos por categoria. O resultado do mês (receitas − despesas) não muda com essa regra; só a divisão entre as duas.
- **Receita:** toda entrada numa categoria de receita ou sem categoria.
- **Saída numa categoria de receita** (por exemplo, a devolução de um salário pago a mais) continua despesa, pelo sinal.
- O total de despesas do mês **não tem mínimo de zero**, para o resultado continuar sendo a soma de tudo que não é transferência. Por isso ele pode ficar abaixo da soma da lista de gastos por categoria num mês em que uma categoria só tem estornos (o estorno de uma compra do mês anterior): na lista, cada categoria tem mínimo de zero.

### Remover um banco do Valora

Quando um banco sai do Meu Pluggy (ou o id dele sai do `PLUGGY_ITEM_IDS`), ele não some sozinho: fica parado com o aviso "não sincroniza desde…". O botão **"Remover do Valora"**, no aviso e em cada banco da tela Contas, **arquiva** o banco inteiro, com confirmação:

- **Sai:** das contas, do saldo total, das faturas, da projeção do mês, do aviso e dos alertas, e a sincronização para de lê-lo.
- **Fica:** todas as transações, faturas, investimentos e fotos de saldo. Receitas, despesas, categorias e orçamentos continuam contando o que o banco gerou, e a lista de Transações continua mostrando as transações dele.
- **Saldo no passado:** a curva "evolução do saldo" do Início continua somando o banco nos dias anteriores ao arquivamento e o tira a partir dele, então ela tem um degrau nesse dia. A variação do mês (o "no mês" do cartão de saldo) só considera os bancos ativos, para não mostrar uma queda que não aconteceu.
- **Dá para voltar:** a seção recolhida **"Arquivados"**, no fim da tela Contas, lista os bancos arquivados com **"Reativar"**.
- O Valora avisa a causa: "foi removido do Meu Pluggy" ou "saiu da lista de sincronização". Qualquer banco pode ser arquivado, não só os com problema.
- Contas de bancos arquivados não aparecem no filtro de Transações nem no lançamento manual.

| Área | O que tem | Fase |
|---|---|---|
| **Início (Dashboard)** | Saldo total, receitas e despesas do mês, gráfico receitas x despesas, gastos por categoria, últimas transações, ocultar valores | v1 |
| | Projeção do fim do mês e resumo das metas (até 3, com a situação de cada uma) no Início; alertas no sino | v2 |
| | Variação do patrimônio no card de saldo, com o link para a curva em Investimentos | v3 |
| **Transações** | Lista agrupada por dia; filtros por período, categoria, tipo, origem e conta; pesquisa; resumo do filtro (quantas transações, quanto entrou e quanto saiu); detalhe; trocar a categoria | v1 |
| | Lançamento manual de receitas e despesas, aviso de possível duplicata | v1 |
| **Contas** | Contas e cartões, saldo de cada um e o total, status de cada conexão | v1 |
| | Faturas do cartão: fatura atual com vencimento e situação (aberta, vencida, paga), próximas faturas e parcelas futuras por mês | v2 |
| **Categorias e regras** | Categorias próprias, regras automáticas, regras que nascem quando você corrige uma categoria | v1 |
| **Categorias** | O gasto de um mês em todas as categorias, com comparação, tendência, orçamento e cobranças recorrentes ([regras](#análise-de-categorias)). É a análise do dia a dia, no menu principal; a configuração fica em "Categorias e regras", no rodapé | v3 |
| **Orçamentos** | Limite por categoria no mês, quanto já foi gasto, aviso perto do limite e quando estoura | v1 |
| **Planejamento** | Receitas e despesas previstas (avulsas ou que se repetem todo mês ou todo ano), por mês: o que falta acontecer, o que já foi realizado e o que foi pulado, com os totais previstos. Você vincula uma previsão à transação real (o app sugere candidatas, mas nunca vincula sozinho), marca como realizada sem vincular, pula o mês ou desfaz; também pode pausar e excluir | v2 |
| | Projeção do saldo no fim do mês: o saldo de hoje mais o que está previsto e menos as faturas que vencem, dia a dia, com o ponto mais baixo e o aviso de saldo negativo. Fica no topo da tela de Planejamento ([regras](#projeção-do-fim-do-mês)) | v2 |
| **Metas** | Objetivo, valor desejado, valor acumulado (informado à mão), progresso, prazo estimado | v2 |
| | Meta vinculada a um investimento ou conta, que se atualiza sozinha | v3 |
| **Alertas** | Cobrança duplicada, assinatura nova, orçamento perto do limite ou estourado, conexão com banco caída | v2 |
| **Investimentos** | Posição de cada investimento e o total | v3 |
| | Investimentos manuais: INCO, Binance e corretoras fora do Open Finance, com valor informado à mão ([regras](#posições-manuais)) | v3 |
| | Patrimônio no topo da tela: contas + investimentos − faturas em aberto, a variação no mês e a evolução mês a mês ([regras](#patrimônio)) | v3 |
| **Relatórios** | Evolução financeira, histórico de receitas e despesas, análise por categoria, evolução do patrimônio, todos com período e "Ver em tabela" ([regras](#relatórios)) | v3 |

## Lançamento manual

O Open Finance traz quase tudo, mas não tudo. O lançamento manual cobre três situações:

1. **Dinheiro em espécie.** Você recebeu algo em dinheiro e gastou em dinheiro. A entrada e a saída são lançadas à mão, na conta **"Dinheiro"**.
2. **Uma transação que o Open Finance não trouxe.** Ela é lançada à mão na conta ou no cartão em que aconteceu.
3. **Um investimento de uma instituição fora do Open Finance**, como um fundo da INCO ou criptomoedas na Binance. Você cadastra a posição e informa o valor ([regras](#posições-manuais)).

Regras:

- **"Dinheiro" não é uma carteira com saldo.** É só a origem do lançamento. As entradas e saídas em dinheiro contam nas receitas, nas despesas, nos orçamentos e nos relatórios, mas não existe "saldo em dinheiro" e ele não entra no saldo total.
- **Uma transação manual pode ser editada e excluída por inteiro.** Numa transação do Open Finance, só a categoria muda.
- **A sincronização nunca altera nem apaga uma transação manual.**
- **Possível duplicata:** se você lançou à mão uma transação numa conta conectada e depois ela chega pelo Open Finance (mesma conta, mesmo valor, data até 3 dias de diferença), o app avisa. Você escolhe:
  - **Juntar:** fica a do banco, com a categoria que você escolheu;
  - **São diferentes:** as duas ficam, e o aviso não volta.
  - O app nunca junta sozinho.
- **Saque:** um saque no banco chega pelo Open Finance como saída, com a categoria "Saque". Se você também lançar à mão o que gastou com aquele dinheiro, troque a categoria do saque para uma transferência, para não contar a despesa duas vezes.

## Rotina de revisão

Dois minutos por dia deixam tudo revisado: o que chegou do banco desde a última visita fica numa caixa, e as correções repetidas viram regra.

### Caixa "Para revisar"

Uma visão de Transações (`/transacoes/revisar`, aba "Para revisar" ao lado de "Todas").

- **O que entra:** toda transação que a sincronização insere chega **para revisar**. Lançar à mão, trocar a categoria ou marcar como revisada tira a transação da caixa. A sincronização nunca devolve à caixa uma transação que já existe. Quando uma pendente revisada vira postada com outro id, a postada herda a revisão, como herda a categoria escolhida por você.
- **O que aparece:** as não revisadas de bancos ativos (e as manuais, que nascem revisadas), de qualquer mês, **da mais antiga para a mais nova**. Um banco arquivado sai da caixa e do contador.
- **Em cada linha:** "Ok" (marca como revisada) e "Trocar categoria". As etiquetas "Sem categoria" e "Possível duplicata" ficam à vista; a duplicata tem "Conferir", que abre a conferência de sempre. "Ok" numa duplicata só marca como revisada: a conferência continua no fluxo dela.
- **"Marcar tudo como revisado"**, com confirmação, marca só o que estava na caixa quando a tela foi carregada. O que chegou depois fica. Não dá para desfazer.
- **Vazia**, a caixa mostra "Tudo revisado".
- **No Início**, o aviso "12 para revisar" fica acima dos cartões e leva à caixa; some quando ela zera.
- Na criação da coluna, todas as transações que já existiam entraram revisadas: a caixa começou vazia.

### Categoria em massa

Na lista de Transações e na caixa, **"Selecionar"** liga o modo de seleção: cada linha ganha uma caixa de seleção e uma barra no pé da tela mostra quantas foram escolhidas, com "Trocar categoria", "Marcar como revisadas" e "Cancelar". No computador, Shift+clique marca o intervalo.

- Até 100 de uma vez.
- Vale para transações do Open Finance e manuais. Todas ficam com a categoria escolhida por você (`category_source = 'user'`) e revisadas.
- Categoria arquivada é recusada. Numa transação manual, a categoria precisa ser do tipo do valor (despesa ou receita); se alguma não casar, nada muda.
- Não existe "Aplicar sempre" na troca em massa: a regra sugerida cobre o caso.

### Regra sugerida

Quando há **2 ou mais** transações do Open Finance com a mesma descrição, todas com a mesma categoria escolhida por você, e nenhuma regra já decide essa descrição para essa categoria, o app oferece **"Criar regra para 'UBER *TRIP' → Transporte?"**.

- Aparece logo depois de uma troca de categoria (no detalhe, na caixa e na troca em massa), com "Criar regra" e "Agora não", e numa lista "Sugestões" no topo da aba Regras, com "Criar regra" e "Dispensar".
- Aceitar cria a regra "igual a" pelo caminho de sempre, que também recategoriza o histórico.
- "Agora não" e "Dispensar" guardam o par descrição e categoria: ele não volta a ser sugerido, nem depois de uma terceira correção.
- Lançamentos manuais não contam. Regra fixa, sem IA; só "igual a" (como "Aplicar sempre").

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

## Análise de categorias

A área **Categorias** (`/categorias`, no grupo "Dia a dia" do menu, depois de Orçamentos) responde "para onde foi o dinheiro e o que devo decidir sobre isso". Ela olha **um mês** (seletor de mês de Orçamentos, padrão o mês atual, `?month=AAAA-MM`; nunca depois do mês atual) e só despesas.

- **Gasto no mês:** a mesma conta dos orçamentos e de `/relatorios/categorias` (líquido por categoria, com mínimo de zero, sem transferências, com manuais e pendentes, saída sem categoria em "Sem categoria"). O total bate com o relatório por categoria do mesmo mês.
- **Comparação justa:** num mês encerrado, contra o mês anterior inteiro. No **mês em andamento**, contra o **mesmo trecho** do mês anterior (dia 1 até hoje, limitado ao último dia dele), para o gasto parcial não parecer uma queda. A tela diz o trecho comparado. Categoria que não gastou nada no período de comparação aparece como "Novo".
- **Todas as categorias**, sem "Outros", do maior gasto para o menor: valor, % do gasto, variação, selo do orçamento (se houver limite), e uma linha dos últimos 6 meses (só com 2 ou mais meses de histórico). Tocar numa categoria abre o detalhe: colunas dos meses, média dos meses anteriores, maior mês, orçamento e o link para as transações dela no mês.
- **O que mudou:** as 3 maiores altas e as 3 maiores quedas contra o período de comparação, em reais (uma categoria que zerou conta como queda inteira). Não aparece se o período de comparação não teve gasto.
- **Pede atenção**, com regras fixas (nada de IA):
  - orçamento **estourado** no mês;
  - **alta forte**: categoria que subiu 30% ou mais **e** R$ 50,00 ou mais (categoria nova não conta, porque não há base);
  - **sem categoria** com 10% ou mais do gasto do mês.
- **Cobranças recorrentes:** as assinaturas detectadas pela **mesma regra do alerta de assinatura** ([Alertas](#alertas)), com o total por mês e por ano. Mostra a situação de **hoje**, qualquer que seja o mês escolhido, e pega assinaturas fora da categoria "Assinaturas". Como a regra exige o mesmo valor, uma assinatura que mudou de preço some até repetir o novo valor 3 vezes.
- **Só leitura:** não cria nem altera orçamento, não cancela assinatura e não cria alertas novos no sino.
- Sem gasto no mês, a tela diz "Nenhum gasto neste mês" e o seletor de mês continua à vista.

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

Uma meta é algo que você quer juntar: a reserva de emergência, a viagem, a entrada do apartamento. O valor acumulado é **informado à mão**, por aportes e retiradas com data, ou acompanha o saldo de contas e investimentos numa [meta vinculada](#meta-vinculada); o app nunca movimenta dinheiro. Todas as contas são em centavos inteiros, sem IA.

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

### Meta vinculada

Em vez de informar aportes, você pode **vincular a meta a contas e investimentos**: o valor acumulado passa a ser o saldo deles e muda sozinho a cada sincronização. O app continua só leitura.

- **O que dá para vincular.** Sem limite de itens por meta: contas corrente e poupança (inclusive as ocultas dos totais) e investimentos, sempre de bancos ativos. Não vale cartão de crédito, a conta "Dinheiro" nem item de banco arquivado.
- **Valor acumulado.** `max(0, soma dos saldos atuais dos itens)`, o saldo inteiro de cada item, sem descontar nada. Saldo negativo (cheque especial) não deixa o valor abaixo de zero. Um item de banco arquivado continua listado, marcado "Banco removido do Valora: não conta", e conta zero.
- **Valor inicial e vínculo não convivem:** criar uma meta vinculada com valor inicial é recusado. Aporte e retirada manuais também são recusados enquanto a meta é vinculada.
- **Aportes antigos são preservados.** Vincular não apaga o histórico: os aportes ficam guardados, não contam enquanto a meta é vinculada e **voltam a valer se ela for desvinculada**. O formulário avisa nos dois sentidos.
- **Ritmo.** Vem da variação dos saldos nas fotos diárias dos últimos 90 dias: `max(0, floor(Σ variações × 30 ÷ janela))`, onde a variação de cada item é o saldo atual menos a primeira foto dele na janela, e a janela vai de 30 a 90 dias (os dias desde a foto mais antiga usada). Item que só tem a foto de hoje soma zero: dinheiro novo não vira ritmo sem histórico. O ritmo mistura aporte e rendimento, e a tela avisa. Prazo, teto de 50 anos e situação seguem as regras acima.
- **Mesmo item em mais de uma meta** conta inteiro em cada uma; o formulário avisa. Dividir um item entre metas fica fora do escopo.

## Investimentos

A tela **Investimentos** mostra a posição de cada investimento dos seus bancos e corretoras, mais as [posições manuais](#posições-manuais), agrupada por tipo, e o total. O Valora não compra nem resgata nada.

- **O que entra:** as posições de bancos **ativos** e todas as posições manuais (que não têm banco para arquivar). Um banco arquivado sai da tela e do total, mas as fotos dele continuam guardadas ([regras](#remover-um-banco-do-valora)).
- **Agrupamento:** pelo tipo do Pluggy: Renda fixa, Fundos, Ações, ETFs, Títulos e previdência, COE, Criptomoedas e Outros. O subtipo (CDB, Tesouro Direto, fundo multimercado...) e a instituição aparecem em cada linha.
- **Percentuais:** a fatia de cada tipo e de cada posição no total, com uma casa decimal.
- **Posições zeradas** (resgatadas, ou que o banco deixou de devolver) ficam fora da lista e aparecem só como "N posições zeradas não aparecem na lista".
- **Não é o saldo total:** o "Saldo total" do Início continua sendo só corrente e poupança. Investimentos entram no [patrimônio](#patrimônio).
- **Não mostra rentabilidade.** O Valora guarda só a posição, e a variação dela mistura aporte e rendimento.

### Posições manuais

Para o que o Open Finance não traz: fundos da INCO, criptomoedas na Binance, corretoras sem conector no Meu Pluggy. O botão **"Adicionar investimento"** cadastra a posição; ela aparece na tela, no [patrimônio](#patrimônio) e pode ser vinculada a uma [meta](#meta-vinculada).

- **O que você informa:** nome, instituição (texto livre), tipo (Renda fixa, Fundos, Ações, ETFs, Criptomoedas ou Outros) e o **valor atual em reais**. Não há cotação, quantidade nem conversão de moeda: se for cripto, informe quanto vale em reais hoje.
- **Atualizar o valor** é feito à mão, quando você quiser. A linha mostra o selo "Manual" e "Atualizado em dd/mm/aaaa". Passados **30 dias** sem atualizar, a linha diz "Desatualizado" em texto, na cor normal (vermelho é só para estouro, erro e saldo negativo).
- **Encerrar a posição** zera o valor e guarda o histórico; ela sai da lista e passa a contar em "N posições zeradas", por isso a tela pede confirmação. **Excluir** apaga a posição, as fotos dela e os vínculos com metas (a meta e os aportes ficam); a tela pede confirmação e avisa que o histórico sai do patrimônio.
- **Foto diária:** cada sincronização grava a foto do dia de todas as posições manuais, repetindo o último valor informado, **mesmo que algum banco tenha falhado**. Sem isso a posição sairia do patrimônio depois de 7 dias.
- **A sincronização nunca altera, zera nem apaga** uma posição manual.
- **Sem histórico retroativo:** a curva do patrimônio começa no dia em que a posição foi cadastrada. Quem entra no meio do mês aparece na variação do mês como aumento, porque o Valora não separa aporte de rendimento.
- **Não é uma carteira de dinheiro com saldo** ([fora do escopo](#fora-do-escopo)): é só a posição de um investimento que já existe em outra instituição.

## Patrimônio

O **patrimônio** é quanto você tem de fato: `contas + investimentos − faturas em aberto`. Aparece no topo da tela **Investimentos**, com o total, a variação no mês, as três partes e um gráfico de área mês a mês (6 ou 12 meses) e o link "Ver relatório completo", que abre a [evolução do patrimônio](#evolução-do-patrimônio) nos relatórios.

- **O que entra:**
  - contas corrente e poupança não ocultas (o mesmo [saldo total](#saldo-total));
  - todos os investimentos, inclusive as posições manuais;
  - as faturas atuais dos cartões não ocultos, que **descontam**.
  - Contas e faturas só de bancos **ativos**. A conta "Dinheiro" não tem saldo e fica de fora. A posição manual não tem banco e nunca é "arquivada".
- **O que não entra:** gastos no cartão que ainda não estão numa fatura fechada (o Pluggy só informa a fatura), financiamentos, empréstimos, imóveis, veículos e outros bens que não são investimentos (a [posição manual](#posições-manuais) de investimento entra). A tela avisa isso numa nota fixa.
- **Hoje x passado:** o total de hoje vem das posições atuais, então confere com o que Contas e Investimentos mostram. A curva vem das **fotos diárias**.
- **Foto que faltou:** cada conta e cada investimento vale a foto mais recente de até 7 dias antes do dia calculado. Uma falha curta da sincronização não abre um buraco no gráfico; depois de 7 dias sem foto, o item sai do total daquele dia.
- **Um ponto por mês:** o último dia do mês com foto (hoje, no mês atual). Mês sem nenhuma foto fica sem ponto, sem zero inventado.
- **Histórico só desde a primeira foto.** O Valora não reconstrói o passado a partir das transações. Com menos de dois meses de dados a tela diz "O histórico começa em…" e não desenha o gráfico.
- **Banco arquivado:** o passado dele continua na curva, que tem um degrau no mês em que ele saiu, como a curva do saldo ([regras](#remover-um-banco-do-valora)). A variação do mês só usa bancos ativos, para não mostrar uma queda que não aconteceu.
- **Variação no mês:** o patrimônio de hoje menos o da primeira foto do mês, com o percentual sobre o valor inicial. Sem foto de um dia anterior a hoje no mês, não aparece.

## Relatórios

A área **Relatórios** (`/relatorios`) reúne as telas para olhar o passado com mais fôlego do que o Início. Cada relatório tem o próprio endereço (`/relatorios/receitas-e-despesas`, `/relatorios/categorias`, `/relatorios/evolucao-financeira` e `/relatorios/patrimonio`); `/relatorios` abre o primeiro. A navegação entre relatórios só aparece quando existem dois ou mais.

- **Período:** "6 meses", "12 meses" (padrão), "24 meses" ou "Este ano" (de janeiro ao mês atual), sempre terminando no mês atual. Fica na URL (`?periodo=`), vale para todos os relatórios e se mantém ao trocar de um para outro. Um valor inválido na URL volta ao padrão. Não há calendário livre, comparação entre períodos nem exportação.
- **Ver em tabela:** todo relatório tem "Gráfico" / "Tabela" (`?visao=tabela`). A tabela traz os mesmos números do gráfico, com a linha de total, e nunca aparece junto com ele.
- **Mês em andamento:** o mês atual é marcado como parcial (hachura nos gráficos de barras agrupadas, e o texto "em andamento" na tabela, na legenda, no tooltip e, no gráfico por categoria, numa linha abaixo da legenda), porque ele ainda não terminou e parece uma queda. O total do período inclui o que já aconteceu nele.
- **Só o que aconteceu:** sem meses futuros e sem previsão.

### Receitas e despesas

Receitas, despesas e resultado (receitas − despesas) mês a mês, e os três números do período.

- **A mesma regra do Início** ([receita, despesa e estorno](#receita-despesa-e-estorno)): sem transferências internas, com lançamentos manuais e transações pendentes, uma despesa sem categoria conta como despesa e o estorno reduz a despesa. O mês do relatório mostra exatamente o número do Início.
- **Começa na primeira transação:** meses anteriores à primeira transação guardada não aparecem (um período de 24 meses não vem com 12 meses vazios de antes de o app existir). Mês sem movimento no meio do período aparece com zero.
- **Sem transações:** a tela diz "Ainda não há transações neste período" e leva ao filtro de período.

### Por categoria

O gasto de cada categoria mês a mês (`/relatorios/categorias`), para ver se um gasto sobe ou qual categoria pesou mais no ano. É um relatório de **despesas**: receitas por categoria não entram.

- **Gasto líquido por mês:** a mesma conta dos orçamentos e do Início. Em cada mês e categoria vale o gasto menos os estornos, com mínimo de zero; sem transferências internas; lançamentos manuais e transações pendentes entram; uma saída sem categoria conta em "Sem categoria". O total de cada mês bate com o gasto do Início para aquele mês.
- **O total do período é a soma dos meses**, não o líquido do período inteiro: um estorno em março não apaga um gasto de janeiro, e cada mês continua batendo com o Início e com os orçamentos.
- **5 maiores + "Outros":** as 5 categorias de maior total no período (empate pelo nome), com "Sem categoria" disputando vaga como qualquer outra, e "Outros" somando o resto mês a mês. A cor no gráfico é a da posição no ranking do período, então uma categoria pode mudar de cor quando o período muda; a legenda e a lista dizem sempre o nome.
- **Na tela:** colunas empilhadas por mês, a lista ranqueada do período (ícone, nome, total e percentual) e, em "Tabela", um mês por linha com uma coluna por categoria e o total. Sem rosca e sem cor fixa por categoria.
- **Sem gastos:** a tela diz "Nenhum gasto neste período" e leva ao filtro de período.

### Evolução financeira

Responde "estou guardando dinheiro?" (`/relatorios/evolucao-financeira`): quanto sobrou em cada mês, que fatia da renda isso representa e quanto já sobrou no total. Usa os mesmos totais mensais do Início e do histórico de receitas e despesas (sem transferências internas, com manuais e pendentes), então os números de receitas, despesas e resultado de um mês batem com os dois.

- **Resultado do mês:** receitas − despesas. Negativo quando se gastou mais do que entrou.
- **Taxa de poupança:** resultado ÷ receitas, com uma casa decimal, podendo ser negativa. Mês sem receita não tem taxa ("—"). A taxa do **período** é a soma dos resultados ÷ a soma das receitas, não a média das taxas mensais: um mês de renda baixa não pode pesar como um de renda alta.
- **Sobra acumulada:** a soma dos resultados desde o primeiro mês do período. **Não é saldo nem patrimônio** (investimentos e saldo das contas não entram); só soma o que sobrou ou faltou. Para o patrimônio ao longo do tempo, veja "Evolução do patrimônio".
- **Meses com sobra:** quantos meses **fechados** tiveram resultado maior que zero ("7 de 10 meses fechados"). O mês em andamento fica de fora para não parecer um mês ruim por estar incompleto.
- **Na tela:** três números do período (resultado, taxa e meses com sobra) e três gráficos, cada um com a sua escala: barras do resultado do mês, linha da taxa de poupança e área da sobra acumulada. Em "Tabela": receitas, despesas, resultado, taxa e sobra acumulada de cada mês, com o total do período.
- **Resultado negativo não é vermelho nos gráficos:** a barra desce da linha do zero e o sinal `−` e o texto dizem o resto. O vermelho só aparece no número do período quando o resultado é negativo.
- **Começa na primeira transação**, como o histórico de receitas e despesas. Sem previsão, sem meta de poupança e sem comparação com o planejado.
- **Sem transações:** a tela diz "Ainda não há transações neste período" e leva ao filtro de período.

### Evolução do patrimônio

De que o patrimônio é feito e como ele andou (`/relatorios/patrimonio`), no período dos relatórios. **Não há regra nova**: usa o mesmo cálculo do [patrimônio](#patrimônio) da tela Investimentos (`contas + investimentos − faturas em aberto`, dos bancos ativos, a partir das fotos diárias), então o mês atual mostra o mesmo número nas duas telas.

- **Três números:** "Patrimônio hoje" (vermelho só se negativo); "Variação no período", do primeiro ao último ponto, em reais e em percentual sobre o valor do primeiro ponto, com "desde" e a data dele ("—" com menos de 2 pontos, e sem percentual quando o primeiro ponto é zero); "Em investimentos", a fatia dos investimentos na soma de contas e investimentos ("—" quando essa soma não é positiva). A variação mistura rendimento e aportes: a tela diz "variação do patrimônio", sem prometer rentabilidade.
- **Gráficos** (só com 2 ou mais pontos): o patrimônio total em área e a composição mês a mês em colunas, com Contas, Investimentos e as faturas em aberto abaixo do zero. Cada mês mostra só os dias que têm foto; um período maior que o histórico mostra só o que existe.
- **Histórico curto:** com um ponto só, no lugar dos gráficos a tela diz "O histórico começa em 04/11. Os gráficos aparecem quando houver dois meses de dados", e a tabela mostra o ponto. A tabela não tem linha de total: o patrimônio não se soma entre meses; a última linha é o mês atual.
- **O que não entra:** gastos no cartão ainda fora de fatura fechada; um banco removido do Valora sai do patrimônio a partir do dia do arquivamento (a curva do passado não muda); bens que não vêm do Open Finance; patrimônio por tipo de investimento ao longo do tempo; projeção, meta de patrimônio e comparação com inflação.
- **Sem nenhuma foto:** a tela diz "O patrimônio aparece depois da primeira sincronização" e leva a "Ver contas".

## Fora do escopo

Estes itens ficam de fora, inclusive no futuro:

- **IA conversacional.** Nada de fazer perguntas a uma IA sobre os gastos. Toda funcionalidade nova vira uma tela ou regra.
- **Carteira de dinheiro com saldo.** Isso inclui o item "Carteiras" do guia de identidade visual. Gastos em dinheiro são lançados como transações (veja [Lançamento manual](#lançamento-manual)), sem controle de saldo.
- **Mais de um usuário ou contas de outras pessoas**, mesmo da família. O plano gratuito do Meu Pluggy também não permite.
- **WhatsApp ou outro canal de chat.**
- **Movimentar dinheiro** (pagamentos, Pix, transferências).
- **Uso comercial.**

## Alertas

O sino no topo de cada tela lista os alertas ativos, com um contador de não lidos. Cada alerta nasce **uma vez** por situação e **não volta se você o dispensou**. Os de orçamento, conexão e foto de 31/12 do próprio dia somem sozinhos quando a situação acaba; os de cobrança duplicada, assinatura e 31/12 sem foto são avisos de um fato e ficam até você dispensar.

| Alerta | Quando nasce | Quando some |
|---|---|---|
| Orçamento em 80% | o gasto da categoria no mês chega a 80% do limite | o gasto cai (estorno), o limite sobe ou é removido, ou o mês acaba |
| Orçamento estourado | o gasto passa do limite; substitui o aviso de 80% da mesma categoria | igual ao anterior |
| Conexão com banco caída | a conexão fica com erro ou com o consentimento expirado | a conexão volta ao normal |
| Cobrança duplicada | uma saída postada de uma conta repete a descrição e o valor de outra da mesma conta, com até 3 dias de diferença (só cobranças dos últimos 7 dias); o alerta é da mais recente | só quando você dispensa |
| Assinatura detectada | 3 ou mais cobranças de mesmo valor e descrição em sequência, com 25 a 35 dias entre elas, a última com até 45 dias | só quando você dispensa |
| Foto de 31/12 pendente | em 31/12, ao fim de uma sincronização, alguma conta ou posição de investimento ainda está sem a foto do dia | uma sincronização completa as fotos, ou o dia acaba |
| 31/12 sem foto | de 1º a 31 de janeiro, ao fim de uma sincronização, 31/12 do ano anterior terminou sem a foto de alguma conta ou posição | só quando você dispensa; não volta para o mesmo ano |

- Os percentuais (80% e 100%) são fixos e as mensagens não mostram valores.
- A faixa de aviso de banco fora do ar continua; o sino é um aviso a mais.
- Cobrança duplicada e assinatura só olham saídas **postadas do Open Finance**. Ficam de fora pendentes, lançamentos manuais, parcelas, transferências (categoria do Valora `transfer` ou categoria do Pluggy iniciada por "Transfer", como Pix e TED para pessoas) e valores abaixo de R$ 5,00. Três cobranças iguais seguidas geram dois alertas, um por cobrança a mais.
- Descrição e valor precisam ser exatamente iguais; assinatura com valor que muda só é detectada depois de 3 cobranças no novo valor. Cobrança duplicada não compara contas diferentes.
- Na primeira sincronização depois de ativar, cada assinatura em andamento gera um alerta de uma vez só ("Marcar todos como lidos" zera o contador).
- "Ver transações" abre a lista do dia da cobrança, pesquisando pela descrição.
- A foto de 31/12 é a base dos bens e direitos no IR e só pode ser gravada naquele dia. Contam as contas de banco ativo (inclusive as ocultas dos totais, menos a conta "Dinheiro", que não tem foto) e as posições de investimento de banco ativo ou manuais com saldo diferente de zero. Em janeiro, só conta o que já existia em 31/12. Os dois alertas dizem só quantas contas e posições faltam e levam para Contas.

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
