# accounts-view Specification

## Purpose
Consulta de contas, cartões e totais (saldo total, faturas em aberto, limite disponível), ocultar conta dos totais, tela de Contas, status da sincronização no topo de todas as telas com disparo manual, e faixa de aviso quando uma conexão com o banco para de sincronizar.

## Requirements

### Requirement: Consulta de contas
`GET /api/v1/accounts` MUST devolver todas as contas, inclusive "Dinheiro". Cada conta MUST trazer:
- `id`, `name`, `type`, `lastDigits`, `balanceCents`, `isHidden`;
- `creditLimitCents` e `availableLimitCents` nos cartões;
- a conexão (`institutionName`, `status`, `statusDetail`, `lastSyncedAt`), ou nulo em "Dinheiro".

O JSON bruto do Pluggy MUST NOT ser exposto.

#### Scenario: Conta "Dinheiro"
- **WHEN** a consulta é feita
- **THEN** "Dinheiro" vem com `type: "cash"`, `balanceCents: null` e conexão nula

### Requirement: Saldo total
A resposta MUST trazer os totais calculados pela API:
- `totalBalanceCents`: soma dos saldos das contas `checking` e `savings` com `isHidden` falso;
- `openCreditCardBillsCents`: soma das faturas atuais dos cartões não ocultos;
- `availableCreditCents`: soma dos limites disponíveis dos cartões não ocultos.

Cartões e "Dinheiro" MUST NOT entrar no saldo total.

#### Scenario: Contas e cartão
- **WHEN** a conta corrente tem R$ 3.000,00, a poupança R$ 1.850,32 e o cartão uma fatura de R$ 900,00
- **THEN** `totalBalanceCents` é `485032` e `openCreditCardBillsCents` é `90000`

#### Scenario: Conta oculta
- **WHEN** a poupança está oculta dos totais
- **THEN** `totalBalanceCents` não inclui a poupança

#### Scenario: Cheque especial
- **WHEN** a conta corrente está com saldo de −R$ 200,00 e a poupança com R$ 1.000,00
- **THEN** `totalBalanceCents` é `80000`

### Requirement: Ocultar conta dos totais
`PATCH /api/v1/accounts/:id` com `isHidden` MUST mudar se a conta entra nos totais. A conta oculta MUST continuar na lista. Para a conta "Dinheiro", MUST responder 400 com `code: "VALIDATION_ERROR"`.

#### Scenario: Ocultar poupança
- **WHEN** você oculta a poupança dos totais
- **THEN** a poupança continua na tela de Contas, com a marcação "Fora dos totais", e o saldo total diminui

### Requirement: Tela de Contas
A tela de Contas MUST mostrar:
- um resumo com o saldo total e as faturas em aberto;
- as contas e os cartões agrupados por instituição;
- em cada instituição, o status da conexão (`Badge`) e a última sincronização.

Contas MUST mostrar nome, final do número e saldo. Cartões MUST mostrar a fatura atual e o limite disponível. Saldo negativo MUST aparecer em `destructive`. A conta "Dinheiro" MUST NOT aparecer na tela. Tocar numa conta MUST abrir um painel com a opção "Ocultar dos totais".

#### Scenario: Cheque especial na tela
- **WHEN** uma conta está com saldo negativo
- **THEN** o saldo aparece em `destructive`, com `−`

#### Scenario: Valores ocultos
- **WHEN** o ocultar valores está ligado
- **THEN** saldos, faturas e limites mostram `R$ ••••`

### Requirement: Conexão com problema
Uma instituição com conexão em `error` ou `consent_expired` MUST mostrar o status e uma explicação de como reconectar pelo Meu Pluggy. Enquanto houver uma conexão assim, todas as telas MUST mostrar uma faixa no topo com o nome do banco, a data da última sincronização bem-sucedida e um atalho para a tela de Contas.

#### Scenario: Consentimento expirado
- **WHEN** a conexão do Itaú está com `consent_expired` e a última sincronização boa foi em 1º de novembro
- **THEN** todas as telas mostram a faixa "Itaú não sincroniza desde 01/11", e tocar nela abre Contas

#### Scenario: Tudo certo
- **WHEN** todas as conexões estão `ok`
- **THEN** nenhuma faixa aparece

### Requirement: Status da sincronização no topo
O topo de todas as telas MUST mostrar quando foi a última sincronização ("Atualizado hoje, 07:02", "Atualizado ontem, 07:01" ou a data). Tocar no status MUST disparar `POST /api/v1/sync-runs` e mostrar "Sincronizando…" até a execução terminar. Ao terminar, um aviso MUST informar quantas transações novas chegaram ou que houve erro, e os dados das telas MUST ser recarregados. Se a API responder `SYNC_IN_PROGRESS`, o status MUST passar a "Sincronizando…" e acompanhar a execução em andamento.

#### Scenario: Sincronizar agora
- **WHEN** você toca no status e a sincronização traz 12 transações novas
- **THEN** o status mostra "Sincronizando…", depois "Atualizado hoje" com a hora, e um aviso diz "Sincronização concluída: 12 transações novas"

#### Scenario: Já sincronizando
- **WHEN** você toca no status durante a sincronização agendada
- **THEN** o status mostra "Sincronizando…" e acompanha a execução em andamento, sem erro

#### Scenario: Nunca sincronizou
- **WHEN** ainda não houve nenhuma sincronização
- **THEN** o status mostra "Nunca sincronizado" e tocar nele sincroniza

### Requirement: Estados e responsividade
A tela de Contas MUST ter os estados carregando, vazio (nenhum banco configurado, explicando como conectar pelo Meu Pluggy) e erro. A tela, a faixa e o status MUST funcionar sem rolagem horizontal em 320, 390, 768, 1024 e 1440 px, nos temas claro e escuro.

#### Scenario: Nenhum banco
- **WHEN** não existe nenhuma conexão
- **THEN** a tela mostra o estado vazio com o passo a passo resumido do Meu Pluggy
