// Grava respostas reais do Pluggy, anonimizadas, em test/fixtures/pluggy/. Roda só em desenvolvimento,
// com `npm run fixtures:record`; os testes nunca chamam o Pluggy.
//
// O que sai do Pluggy e entra nas fixtures passa por uma lista de campos permitidos: ids viram
// item-1/acc-1/tx-1/inv-1, textos e números de conta são inventados, e todo valor em R$ vira um
// número aleatório com o mesmo sinal. Na tela aparece só um resumo com contagens, sem valores.
import { randomInt } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import {
  type Account,
  type CreditCardBills,
  type Investment,
  type Item,
  PluggyClient,
  type Transaction,
  TransactionStatus,
} from 'pluggy-sdk';

import { loadConfig } from '../src/shared/config.js';
import { subtractDays, todayInSaoPaulo } from '../src/shared/dates.js';

const FIXTURES_DIRECTORY = new URL('../test/fixtures/pluggy/', import.meta.url);
const HISTORY_DAYS = 365;
const INVESTMENTS_PAGE_SIZE = 500;
const BILLS_PAGE_SIZE = 100;
const MAX_TRANSACTIONS_PER_ACCOUNT = 20;
const PENDING_SAMPLE_QUOTA = 6;
const INSTALLMENT_SAMPLE_QUOTA = 3;
const CREDIT_SAMPLE_QUOTA = 5;
const MIN_FAKE_CENTS = 100;
const MAX_FAKE_CENTS = 50_000;
const CENTS_PER_REAL = 100;

const FAKE_DEBIT_DESCRIPTIONS = [
  'Mercado Exemplo',
  '  Farmácia   São Teste ',
  'Padaria Fictícia',
  'Posto Combustível Demo',
  'Restaurante Açaí Teste',
  'Assinatura Streaming Demo',
  'Pagamento de fatura',
];
const FAKE_CREDIT_DESCRIPTIONS = ['Pix recebido Fulano', 'Salário Empresa Exemplo', 'Estorno Loja'];

interface RecordedItem {
  readonly item: Item;
  readonly accounts: readonly Account[];
  readonly transactionsByAccount: ReadonlyMap<string, readonly Transaction[]>;
  readonly investments: readonly Investment[];
  /** Faturas por cartão. Cartão cuja busca falhou fica fora, e o resumo conta a falha. */
  readonly billsByAccount: ReadonlyMap<string, readonly CreditCardBills[]>;
  readonly billsFailedCount: number;
}

class FakeIds {
  private readonly ids = new Map<string, string>();
  private readonly counters = new Map<string, number>();

  for(prefix: string, realId: string): string {
    const known = this.ids.get(realId);
    if (known) return known;
    const next = (this.counters.get(prefix) ?? 0) + 1;
    this.counters.set(prefix, next);
    const fakeId = `${prefix}-${next}`;
    this.ids.set(realId, fakeId);
    return fakeId;
  }
}

class Counter {
  private readonly counts = new Map<string, number>();

  add(key: string): void {
    this.counts.set(key, (this.counts.get(key) ?? 0) + 1);
  }

  lines(): string[] {
    return [...this.counts.entries()].sort().map(([key, count]) => `  ${key}: ${count}`);
  }
}

function print(line = ''): void {
  process.stdout.write(`${line}\n`);
}

function signOf(amount: number): string {
  if (amount > 0) return '+';
  if (amount < 0) return '-';
  return '0';
}

function fakeAmountLike(realAmount: number): number {
  if (realAmount === 0) return 0;
  const cents = randomInt(MIN_FAKE_CENTS, MAX_FAKE_CENTS);
  return (Math.sign(realAmount) * cents) / CENTS_PER_REAL;
}

async function fetchInvestments(client: PluggyClient, itemId: string): Promise<Investment[]> {
  const investments: Investment[] = [];
  for (let page = 1; ; page += 1) {
    const response = await client.fetchInvestments(itemId, undefined, {
      page,
      pageSize: INVESTMENTS_PAGE_SIZE,
    });
    investments.push(...response.results);
    if (page >= response.totalPages) return investments;
  }
}

async function fetchBills(client: PluggyClient, accountId: string): Promise<CreditCardBills[]> {
  const bills: CreditCardBills[] = [];
  for (let page = 1; ; page += 1) {
    const response = await client.fetchCreditCardBills(accountId, {
      page,
      pageSize: BILLS_PAGE_SIZE,
    });
    bills.push(...response.results);
    if (page >= response.totalPages) return bills;
  }
}

async function recordBills(client: PluggyClient, accounts: readonly Account[]) {
  const billsByAccount = new Map<string, CreditCardBills[]>();
  let billsFailedCount = 0;
  for (const account of accounts.filter((candidate) => candidate.type === 'CREDIT')) {
    try {
      billsByAccount.set(account.id, await fetchBills(client, account.id));
    } catch (error) {
      billsFailedCount += 1;
      print(`  faturas do cartão não lidas: ${describeFailure(error)}`);
    }
  }
  return { billsByAccount, billsFailedCount };
}

async function recordItem(client: PluggyClient, itemId: string): Promise<RecordedItem> {
  const today = todayInSaoPaulo();
  const window = { dateFrom: subtractDays(today, HISTORY_DAYS), dateTo: today };
  const item = await client.fetchItem(itemId);
  const accounts = (await client.fetchAccounts(itemId)).results;
  const transactionsByAccount = new Map<string, Transaction[]>();
  for (const account of accounts) {
    transactionsByAccount.set(account.id, await client.fetchAllTransactions(account.id, window));
  }
  const investments = await fetchInvestments(client, itemId);
  const { billsByAccount, billsFailedCount } = await recordBills(client, accounts);
  return { item, accounts, transactionsByAccount, investments, billsByAccount, billsFailedCount };
}

// Pendentes, parceladas e entradas primeiro, para as fixtures cobrirem esses casos.
function sampleTransactions(transactions: readonly Transaction[]): Transaction[] {
  const newestFirst = [...transactions].sort((a, b) => b.date.getTime() - a.date.getTime());
  const rules: readonly [(transaction: Transaction) => boolean, number][] = [
    [(transaction) => transaction.status === TransactionStatus.PENDING, PENDING_SAMPLE_QUOTA],
    [
      (transaction) => (transaction.creditCardMetadata?.totalInstallments ?? 0) > 1,
      INSTALLMENT_SAMPLE_QUOTA,
    ],
    [(transaction) => transaction.type === 'CREDIT', CREDIT_SAMPLE_QUOTA],
    [() => true, MAX_TRANSACTIONS_PER_ACCOUNT],
  ];
  const picked = new Set<Transaction>();
  for (const [matches, quota] of rules) {
    const candidates = newestFirst.filter(
      (transaction) => matches(transaction) && !picked.has(transaction),
    );
    for (const transaction of candidates.slice(0, quota)) {
      if (picked.size < MAX_TRANSACTIONS_PER_ACCOUNT) picked.add(transaction);
    }
  }
  return [...picked];
}

// O conector (MeuPluggy) é público e igual para todos os itens; o banco aparece no nome da conta.
function anonymizeItem(item: Item, fakeIds: FakeIds): object {
  return {
    id: fakeIds.for('item', item.id),
    status: item.status,
    executionStatus: item.executionStatus,
    error: item.error ? { code: item.error.code, message: 'Erro anonimizado' } : null,
    consentExpiresAt: item.consentExpiresAt,
    lastUpdatedAt: item.lastUpdatedAt,
    connector: {
      id: item.connector.id,
      name: item.connector.name,
      imageUrl: item.connector.imageUrl,
    },
  };
}

function anonymizeCreditData(account: Account): object | null {
  if (!account.creditData) return null;
  const creditLimit =
    account.creditData.creditLimit === null ? null : fakeAmountLike(account.creditData.creditLimit);
  return {
    brand: account.creditData.brand,
    balanceCloseDate: account.creditData.balanceCloseDate,
    balanceDueDate: account.creditData.balanceDueDate,
    creditLimit,
    availableCreditLimit:
      account.creditData.availableCreditLimit === null || creditLimit === null
        ? null
        : Math.min(creditLimit, fakeAmountLike(account.creditData.availableCreditLimit)),
  };
}

// Como no Pluggy: a conta corrente leva o nome do banco; o cartão, o nome do produto com espaços sobrando.
function anonymizeAccount(account: Account, fakeIds: FakeIds, letter: string): object {
  const fakeId = fakeIds.for('acc', account.id);
  const isCard = account.subtype === 'CREDIT_CARD';
  return {
    id: fakeId,
    itemId: fakeIds.for('item', account.itemId),
    type: account.type,
    subtype: account.subtype,
    number: `0000${String(randomInt(1000, 9999))}`,
    name: isCard ? `CARTAO ${fakeId.toUpperCase()}   ` : `Banco ${letter}`,
    marketingName: null,
    owner: null,
    taxNumber: null,
    currencyCode: account.currencyCode,
    balance: fakeAmountLike(account.balance),
    bankData: null,
    creditData: anonymizeCreditData(account),
  };
}

function fakeDescription(transaction: Transaction, index: number): string {
  const options =
    transaction.type === 'CREDIT' ? FAKE_CREDIT_DESCRIPTIONS : FAKE_DEBIT_DESCRIPTIONS;
  return options[index % options.length] ?? 'Transação';
}

function anonymizeInstallments(transaction: Transaction): object | null {
  const metadata = transaction.creditCardMetadata;
  if (!metadata) return null;
  return {
    installmentNumber: metadata.installmentNumber ?? null,
    totalInstallments: metadata.totalInstallments ?? null,
    billForecastDate: metadata.billForecastDate ?? null,
    paymentType: metadata.paymentType ?? null,
  };
}

function anonymizeTransaction(transaction: Transaction, fakeIds: FakeIds, index: number): object {
  const fakeAmount = fakeAmountLike(transaction.amount);
  const amountInAccountCurrency = transaction.amountInAccountCurrency;
  return {
    id: fakeIds.for('tx', transaction.id),
    accountId: fakeIds.for('acc', transaction.accountId),
    date: transaction.date,
    description: fakeDescription(transaction, index),
    descriptionRaw: null,
    type: transaction.type,
    amount: fakeAmount,
    amountInAccountCurrency:
      amountInAccountCurrency === null
        ? null
        : Math.sign(amountInAccountCurrency) * Math.abs(fakeAmount),
    balance: fakeAmountLike(transaction.balance),
    currencyCode: transaction.currencyCode,
    category: transaction.category,
    categoryId: transaction.categoryId,
    status: transaction.status ?? null,
    operationType: transaction.operationType,
    creditCardMetadata: anonymizeInstallments(transaction),
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
  };
}

function anonymizeInvestment(investment: Investment, fakeIds: FakeIds): object {
  const fakeId = fakeIds.for('inv', investment.id);
  const fakeBalance = fakeAmountLike(investment.balance);
  return {
    id: fakeId,
    itemId: fakeIds.for('item', investment.itemId),
    type: investment.type,
    subtype: investment.subtype,
    name: `Investimento ${fakeId}`,
    currencyCode: investment.currencyCode,
    date: investment.date,
    balance: fakeBalance,
    amount: investment.amount === null ? null : fakeBalance,
    status: investment.status,
    code: null,
    isin: null,
    issuer: null,
    issuerCNPJ: null,
    number: null,
  };
}

// Mantém a proporção paga/total de cada fatura, para as fixtures cobrirem paga, parcial e em aberto.
function anonymizeBill(bill: CreditCardBills, fakeIds: FakeIds, accountId: string): object {
  const fakeTotal = fakeAmountLike(bill.totalAmount);
  const paidRatio = bill.totalAmount === 0 ? 0 : 1 / bill.totalAmount;
  return {
    id: fakeIds.for('bill', bill.id),
    accountId: fakeIds.for('acc', accountId),
    dueDate: bill.dueDate,
    billClosingDate: bill.billClosingDate,
    totalAmount: fakeTotal,
    totalAmountCurrencyCode: bill.totalAmountCurrencyCode,
    minimumPaymentAmount:
      bill.minimumPaymentAmount === null
        ? null
        : Math.round(fakeTotal * 0.15 * CENTS_PER_REAL) / CENTS_PER_REAL,
    allowsInstallments: bill.allowsInstallments,
    financeCharges: [],
    payments: bill.payments.map((payment) => ({
      id: fakeIds.for('pay', payment.id),
      valueType: payment.valueType,
      paymentDate: payment.paymentDate,
      paymentMode: payment.paymentMode,
      amount: Math.round(payment.amount * paidRatio * fakeTotal * CENTS_PER_REAL) / CENTS_PER_REAL,
      currencyCode: payment.currencyCode,
    })),
    createdAt: bill.createdAt,
    updatedAt: bill.updatedAt,
  };
}

function buildFixture(recorded: RecordedItem, fakeIds: FakeIds, letter: string): object {
  const transactions = recorded.accounts.flatMap((account) =>
    sampleTransactions(recorded.transactionsByAccount.get(account.id) ?? []),
  );
  return {
    recordedAt: new Date().toISOString(),
    item: anonymizeItem(recorded.item, fakeIds),
    accounts: recorded.accounts.map((account) => anonymizeAccount(account, fakeIds, letter)),
    transactions: transactions.map((transaction, index) =>
      anonymizeTransaction(transaction, fakeIds, index),
    ),
    investments: recorded.investments.map((investment) => anonymizeInvestment(investment, fakeIds)),
    bills: [...recorded.billsByAccount].flatMap(([accountId, bills]) =>
      bills.map((bill) => anonymizeBill(bill, fakeIds, accountId)),
    ),
  };
}

function summarizeItem(recorded: RecordedItem, letter: string): void {
  const { item } = recorded;
  const isConsentExpired = item.consentExpiresAt !== null && item.consentExpiresAt < new Date();
  print(`Banco ${letter} (conector "${item.connector.name}")`);
  print(`  status=${item.status} executionStatus=${item.executionStatus}`);
  print(`  error=${item.error?.code ?? 'nenhum'} consentimentoVencido=${String(isConsentExpired)}`);
  const accounts = new Counter();
  for (const account of recorded.accounts) {
    accounts.add(`${account.type}/${account.subtype} saldo ${signOf(account.balance)}`);
  }
  print(' contas:');
  accounts.lines().forEach((line) => print(line));
  const investments = new Counter();
  recorded.investments.forEach((investment) => investments.add(investment.type));
  print(` investimentos: ${recorded.investments.length}`);
  investments.lines().forEach((line) => print(line));
  summarizeBills(recorded);
}

// Só contagens e presença de campos, nunca valores ou datas.
function summarizeBills(recorded: RecordedItem): void {
  const fields = new Counter();
  let billCount = 0;
  for (const bills of recorded.billsByAccount.values()) {
    for (const bill of bills) {
      billCount += 1;
      fields.add(`fechamento ${bill.billClosingDate === null ? 'ausente' : 'presente'}`);
      fields.add(`mínimo ${bill.minimumPaymentAmount === null ? 'ausente' : 'presente'}`);
      fields.add(`pagamentos ${bill.payments.length > 0 ? 'com registro' : 'sem registro'}`);
      fields.add(`total ${signOf(bill.totalAmount)}`);
    }
  }
  const failed = recorded.billsFailedCount;
  print(` faturas: ${billCount} em ${recorded.billsByAccount.size} cartões (${failed} com falha)`);
  fields.lines().forEach((line) => print(line));
}

function summarizeTransactions(recordedItems: readonly RecordedItem[]): void {
  const signs = new Counter();
  const dateTimes = new Counter();
  const currencies = new Counter();
  for (const recorded of recordedItems) {
    for (const account of recorded.accounts) {
      for (const transaction of recorded.transactionsByAccount.get(account.id) ?? []) {
        const converted = transaction.amountInAccountCurrency;
        const convertedSign = converted === null ? 'sem' : signOf(converted);
        signs.add(
          `${account.subtype} type=${transaction.type} amount ${signOf(transaction.amount)} ` +
            `emReais ${convertedSign} status=${transaction.status ?? 'ausente'}`,
        );
        dateTimes.add(new Date(transaction.date).toISOString().slice(11, 19));
        currencies.add(transaction.currencyCode);
      }
    }
  }
  print('Transações por subtipo × type × sinal × status:');
  signs.lines().forEach((line) => print(line));
  print('Hora UTC do campo date:');
  dateTimes.lines().forEach((line) => print(line));
  print('Moedas:');
  currencies.lines().forEach((line) => print(line));
}

async function main(): Promise<void> {
  const config = loadConfig(process.env);
  const client = new PluggyClient({
    clientId: config.pluggyClientId,
    clientSecret: config.pluggyClientSecret,
  });
  const fakeIds = new FakeIds();
  const recordedItems: RecordedItem[] = [];
  await mkdir(FIXTURES_DIRECTORY, { recursive: true });
  for (const [index, itemId] of config.pluggyItemIds.entries()) {
    const letter = String.fromCharCode('A'.charCodeAt(0) + index);
    const recorded = await recordItem(client, itemId);
    recordedItems.push(recorded);
    summarizeItem(recorded, letter);
    const fixture = buildFixture(recorded, fakeIds, letter);
    const file = new URL(`item-${index + 1}.json`, FIXTURES_DIRECTORY);
    await writeFile(file, `${JSON.stringify(fixture, null, 2)}\n`);
  }
  print();
  summarizeTransactions(recordedItems);
  print();
  print(`Fixtures gravadas em test/fixtures/pluggy/ (${recordedItems.length} itens).`);
}

function httpStatusOf(error: Error): unknown {
  if (!('response' in error)) return undefined;
  const { response } = error;
  if (typeof response !== 'object' || response === null || !('statusCode' in response)) {
    return undefined;
  }
  return response.statusCode;
}

// Erros HTTP do SDK trazem o status; a mensagem pode ter dados da resposta, então não é impressa.
function describeFailure(error: unknown): string {
  if (!(error instanceof Error)) return 'erro desconhecido';
  const statusCode = httpStatusOf(error);
  return statusCode === undefined ? error.name : `${error.name} (HTTP ${String(statusCode)})`;
}

main().catch((error: unknown) => {
  process.stderr.write(`Falha ao gravar as fixtures: ${describeFailure(error)}\n`);
  process.exit(1);
});
