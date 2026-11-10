# Open Finance e Meu Pluggy

Pesquisa feita em outubro de 2026. Regras e preços mudam; confira as fontes antes de decisões importantes.

## O que é o Open Finance

É o sistema do Banco Central (Resolução Conjunta nº 1/2020) em que bancos, fintechs e corretoras compartilham dados e serviços por APIs padronizadas, **sempre com o consentimento do cliente**. O cliente autoriza no app de quem vai receber os dados, confirma no próprio banco e pode revogar quando quiser.

Para o cliente, compartilhar os próprios dados não custa nada.

## Por que não dá para acessar direto

Só **instituições autorizadas pelo Banco Central e cadastradas como participantes** podem consumir as APIs. Para isso é preciso ter autorização para funcionar, entrar na governança do Open Finance, ter certificados ICP-Brasil e passar por homologação. Não é questão de "entrar em contato" com banco ou governo: para uma pessoa física, esse caminho não existe.

A saída é um **agregador** que já está conectado ao Open Finance e oferece uma API própria. O Valora usa o **Meu Pluggy**.

## Meu Pluggy

O Meu Pluggy é o app gratuito do Pluggy para pessoas físicas. Você conecta seus bancos nele, e uma aplicação de desenvolvedor sua lê esses dados pela API do Pluggy.

| Item | Como funciona |
|---|---|
| Custo | Gratuito por tempo indeterminado para uso pessoal |
| Conexões | Até 5 conexões ativas (por exemplo, 5 bancos ou corretoras) |
| Titular | Só contas do mesmo CPF. Nem cônjuge ou família |
| Atualização | Automática, a cada 24 horas |
| Limite de requisições | A página oficial não cita limite |
| Uso | Só pessoal; não pode ser usado em produto para outras pessoas |
| Aviso de "teste de 15 dias" | Aparece no dashboard de desenvolvedor, mas é do lado comercial. A página oficial manda ignorar: não limita o uso pessoal |

**Cuidado:** a documentação do Actual Budget (de terceiros) diz que só dá para ligar bancos novos durante o trial. A página oficial diz o contrário. Por precaução, conecte todos os bancos logo nos primeiros dias.

Como os dados só atualizam uma vez por dia, consultar a API mais vezes não traz nada novo. O Valora sincroniza uma vez por dia, e tem um botão para sincronizar na hora.

### Passo a passo de configuração

Segundo a [página oficial](https://www.pluggy.ai/meu-pluggy):

1. Crie uma conta em [meu.pluggy.ai](https://meu.pluggy.ai).
2. Clique em "Conectar Minha Conta", escolha o banco e termine a autorização no site do banco. Espere voltar para o Meu Pluggy. Repita para cada banco.
3. Crie uma conta em [dashboard.pluggy.ai](https://dashboard.pluggy.ai), de preferência com o mesmo e-mail.
4. Crie **uma** aplicação no dashboard. Ela guarda todas as suas contas conectadas.
5. Na aba "Aplicação", copie o Client ID e o Client Secret. Eles vão para o `.env` do servidor, nunca para o código (veja o [deploy](05-deploy.md)).
6. Ative o conector "MeuPluggy" nas configurações de conectores da aplicação, se ele não aparecer no seletor. No seletor, escolha "MeuPluggy" (não o seu banco, nem o Sandbox) e entre com a sua conta do Meu Pluggy. Repita esse passo sempre que conectar um banco novo.

Cada banco autorizado vira um **item** no Pluggy. É pelo id do item que o Valora busca contas, transações e investimentos.

### Ids dos itens no Valora

O Valora não consegue descobrir sozinho quais itens existem: listar os itens da aplicação pela API (`fetchAllItems`) só existe nos planos pagos do Pluggy. Por isso os ids ficam no `.env`.

1. Depois do passo 6, cada banco conectado pelo MeuPluggy aparece como um item na sua aplicação do [dashboard](https://dashboard.pluggy.ai). O id é um texto longo, no formato de um UUID.
2. Coloque os ids numa variável só, separados por vírgula, no `backend/.env` (desenvolvimento) e no `infra/.env` (produção):

   ```
   PLUGGY_ITEM_IDS=id-do-banco-1,id-do-banco-2,id-do-banco-3
   ```

3. Reinicie o backend. Ele recusa subir se a lista estiver vazia ou tiver um id repetido, citando só o nome da variável.

Na próxima sincronização, cada id novo vira uma conexão. Tirar um id da lista faz a sincronização parar de ler aquele banco, mas o histórico dele continua guardado.

**Tirar um banco das telas.** Tirar o id do `.env` (ou remover o banco do Meu Pluggy) só para a leitura: a conexão continua no Valora, parada no último estado, e o aviso "não sincroniza desde…", o alerta, as contas e o saldo dela continuam aparecendo. Para tirá-la de verdade, use **"Remover do Valora"** (no aviso ou na tela Contas): o banco é **arquivado**, sai do saldo, das listas e dos avisos, a sincronização o pula e **nada é apagado**. O id pode ficar no `.env`; o app o ignora. O Valora reconhece sozinho os dois casos: o Pluggy responde que o item não existe mais (status `item_not_found`) e o id que saiu do `PLUGGY_ITEM_IDS`. Um banco arquivado volta pelo botão **"Reativar"** da seção "Arquivados".

No MeuPluggy, o conector se chama sempre "MeuPluggy", qualquer que seja o banco. O nome que aparece no Valora vem da conta corrente do item (veja as [convenções do Pluggy](04-modelo-de-dados.md#convenções-do-pluggy)).

## Dados disponíveis

| Categoria | Exemplos |
|---|---|
| Cadastro | nome, CPF, endereço, renda |
| Contas | saldo, extrato, limite do cheque especial |
| Cartão de crédito | faturas, transações, limites, parcelas |
| Crédito | empréstimos, financiamentos, parcelas |
| Investimentos | CDB, LCI, LCA, debêntures, CRI, CRA, Tesouro, fundos, renda variável, câmbio |

A página do Meu Pluggy avisa que alguns conectores de corretoras e bancos de investimento funcionam de forma diferente. Na dúvida sobre uma instituição específica, pergunte no Discord do Pluggy.

**Fica de fora:**
- cripto em corretoras de criptomoedas;
- previdência e seguros, que ficam em outro sistema, o Open Insurance (SUSEP);
- instituições pequenas que não participam do Open Finance.

## Atualização e limites

Os dados não chegam em tempo real. Quem recebe consulta quando quer, e cada tipo de dado tem um limite mensal de consultas por CPF. Os números abaixo são da documentação da Belvo, não do regulador:

| Dado | Limite por mês | Na prática |
|---|---|---|
| Saldo | 420 | ~14 por dia |
| Transações recentes (menos de 6 dias) | 240 | ~8 por dia |
| Histórico de transações (até 365 dias) | 8 | carga inicial |
| Faturas do cartão | 30 | ~1 por dia |
| Posição de investimentos | 30 | ~1 por dia |
| Movimentações de investimentos | 8 | carga inicial |

O histórico vai até **12 meses** para trás. Por isso **o banco de dados do Valora é a única cópia do que for mais antigo que isso**, e o backup não é opcional (veja o [deploy](05-deploy.md#backup)).

No Valora, quem consulta o Open Finance é o Meu Pluggy, uma vez por dia. O Valora consulta a API do Pluggy, que devolve o que o Meu Pluggy já trouxe.

## Consentimento

Até agora o consentimento valia no máximo 12 meses, e renovar exigia refazer todo o processo. O Banco Central aprovou a **Resolução Conjunta nº 7**, noticiada pelo Finsiders:

- o limite de 12 meses deixa de existir; o prazo passa a ser combinado entre a instituição e o cliente;
- a renovação fica simplificada: o cliente só confirma na instituição que recebe os dados;
- começa pelas pessoas físicas, com as funcionalidades previstas até o fim de novembro.

Não confirmei a data em que a regra passa a valer; confira no [site do Banco Central](https://normativos.bcb.gov.br).

De qualquer forma, conexões podem expirar ou ser revogadas. **O Valora precisa mostrar quando uma conexão parar de sincronizar.**

## Fontes

- [Meu Pluggy: página oficial](https://www.pluggy.ai/meu-pluggy)
- [Meu Pluggy: GitHub oficial](https://github.com/pluggyai/meu-pluggy)
- [Pluggy: preços](https://www.pluggy.ai/en/pricing)
- [Actual Budget: integração com Pluggy.ai](https://actualbudget.org/docs/advanced/bank-sync/pluggyai)
- [Belvo: limites de consulta do Open Finance Brasil](https://developers.belvo.com/products/aggregation_brazil/aggregation-brazil-data-retrieval-limits)
- [Finsiders: BC acaba com limite de 12 meses](https://finsidersbrasil.com.br/regulamentacao/bc-acaba-com-limite-de-12-meses-para-compartilhamento-de-dados-no-open-finance)
- [Resolução Conjunta nº 1/2020 (BCB)](https://normativos.bcb.gov.br/Lists/Normativos/Attachments/51028/Res_Conj_0001_v9_L.pdf)
- [Agência Brasil: BC desobriga participação de algumas instituições](https://agenciabrasil.ebc.com.br/economia/noticia/2023-02/bc-desobriga-participacao-de-instituicoes-em-compartilhamento-de-dados)
- [TabNews: relato de uso do Meu Pluggy após o trial](https://www.tabnews.com.br/marlindo71/d39804a3-211a-4d45-8491-e4a36e85a6e8)
