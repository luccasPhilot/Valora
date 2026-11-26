import { addDays, subtractDays, todayInSaoPaulo } from '../../shared/dates.js';
import type { AlertEvaluator } from '../alerts/alert-evaluator.js';
import type {
  ConnectionRecord,
  ConnectionsRepository,
} from '../connections/connections.repository.js';
import type { InvestmentsService } from '../investments/investments.service.js';
import type { ItemConnectionState } from './item-status.js';
import {
  matchVanishedPending,
  PENDING_MATCH_DAYS_AFTER,
  PENDING_MATCH_DAYS_BEFORE,
  type PendingReplacementPlan,
} from './pending-replacement.js';
import type { PluggyAccountList, PluggyClient, PluggyItemOverview } from './pluggy-client.js';
import { PluggyItemNotFoundError } from './pluggy-errors.js';
import type {
  SyncedCreditCardBill,
  SyncedInvestment,
  SyncedTransaction,
  TransactionWindow,
} from './sync.types.js';
import type { ItemRepositories, SyncUnitOfWork } from './sync.unit-of-work.js';
import type { SyncLock, SyncLockHandle } from './sync-lock.repository.js';
import { addStats, EMPTY_STATS, type ItemOutcome, summarizeRun } from './sync-outcome.js';
import type {
  FinishedSyncRunStatus,
  SyncRunOutcome,
  SyncRunPage,
  SyncRunPageRequest,
  SyncRunRecord,
  SyncRunsRepository,
  SyncStats,
  SyncTrigger,
} from './sync-runs.repository.js';
import { transactionWindowFor } from './transaction-window.js';
import type { VanishedPending, VanishedPendingScope } from './transactions.repository.js';

const PLACEHOLDER_INSTITUTION_NAME = 'Banco não identificado';
const UNEXPECTED_FAILURE_MESSAGE = 'Erro inesperado na sincronização. Tente de novo mais tarde.';
const INTERRUPTED_RUN_MESSAGE = 'A sincronização foi interrompida porque a API reiniciou.';
const ITEM_NOT_FOUND_MESSAGE = 'Este banco foi removido do Meu Pluggy. Remova-o do Valora.';

type ItemStage = 'fetch_item' | 'fetch_data' | 'save_data';

// Mensagens para a tela, escritas pelo Valora: nunca o texto do erro, que pode ter dados.
const STAGE_FAILURE_MESSAGES: Readonly<Record<ItemStage, string>> = {
  fetch_item:
    'Não foi possível consultar este banco no Pluggy. A próxima sincronização tenta de novo.',
  fetch_data:
    'Não foi possível ler os dados deste banco no Pluggy. A próxima sincronização tenta de novo.',
  save_data: 'Não foi possível gravar os dados deste banco. A próxima sincronização tenta de novo.',
};

/** Logger mínimo (compatível com o do Fastify). Recebe só ids internos, tipos de erro e contagens. */
export interface SyncLogger {
  info(details: Record<string, unknown>, message: string): void;
  warn(details: Record<string, unknown>, message: string): void;
  error(details: Record<string, unknown>, message: string): void;
}

export interface SyncServiceDependencies {
  readonly pluggy: PluggyClient;
  readonly itemIds: readonly string[];
  readonly lock: SyncLock;
  readonly syncRuns: SyncRunsRepository;
  readonly connections: ConnectionsRepository;
  readonly unitOfWork: SyncUnitOfWork;
  readonly alerts: Pick<AlertEvaluator, 'evaluateAll'>;
  readonly manualInvestments: Pick<InvestmentsService, 'snapshotManualPositions'>;
  readonly logger: SyncLogger;
  readonly now: () => Date;
}

export type StartSyncResult =
  | {
      readonly status: 'started';
      readonly run: SyncRunRecord;
      /**
       * Termina com o status final quando a execução acaba. Nunca rejeita: falhas viram `failed`
       * em `sync_runs`.
       */
      readonly finished: Promise<FinishedSyncRunStatus>;
    }
  | { readonly status: 'already_running' };

export interface StartSyncOptions {
  /** Bancos desta execução; sem a lista, todos os do `PLUGGY_ITEM_IDS`. */
  readonly itemIds?: readonly string[];
}

/**
 * Resultado de um disparo do agendamento: `skipped` quando outra sincronização já rodava e
 * `nothing_due` quando todos os bancos já tinham sincronizado hoje (nenhuma execução foi criada).
 */
export type ScheduledSyncResult = FinishedSyncRunStatus | 'skipped' | 'nothing_due';

export interface ScheduledSyncReport {
  readonly result: ScheduledSyncResult;
  /** Bancos ativos ainda sem sincronização bem-sucedida hoje, depois do disparo. */
  readonly pendingItemCount: number;
}

const SKIPPED_REPORT: ScheduledSyncReport = { result: 'skipped', pendingItemCount: 0 };
const NOTHING_DUE_REPORT: ScheduledSyncReport = { result: 'nothing_due', pendingItemCount: 0 };

interface ItemData {
  readonly accountList: PluggyAccountList;
  readonly transactionsByAccount: ReadonlyMap<string, readonly SyncedTransaction[]>;
  readonly investments: readonly SyncedInvestment[];
  readonly billsByAccount: ReadonlyMap<string, readonly SyncedCreditCardBill[]>;
  /** Cartões cujas faturas não puderam ser lidas: o banco sincroniza mesmo assim. */
  readonly billsFailed: number;
}

interface RunExecution {
  readonly runId: string;
  readonly lock: SyncLockHandle;
  readonly itemIds: readonly string[];
}

interface ItemSave {
  readonly connection: ConnectionRecord;
  readonly overview: PluggyItemOverview;
  readonly data: ItemData;
  readonly window: TransactionWindow;
}

function errorTypeOf(error: unknown): string {
  return error instanceof Error ? error.name : 'unknown';
}

const UNEXPECTED_FAILURE_OUTCOME: SyncRunOutcome = {
  status: 'failed',
  stats: EMPTY_STATS,
  errorMessage: UNEXPECTED_FAILURE_MESSAGE,
};

const FAILED_ITEM: ItemOutcome = { status: 'failed' };
const SKIPPED_ITEM: ItemOutcome = { status: 'skipped' };

export class SyncService {
  constructor(private readonly deps: SyncServiceDependencies) {}

  /** Começa uma sincronização em segundo plano, ou avisa que já existe uma em andamento. */
  async start(
    trigger: SyncTrigger,
    { itemIds = this.deps.itemIds }: StartSyncOptions = {},
  ): Promise<StartSyncResult> {
    const lock = await this.deps.lock.tryAcquire();
    if (!lock) return { status: 'already_running' };
    try {
      const run = await this.deps.syncRuns.create(trigger);
      return { status: 'started', run, finished: this.execute({ runId: run.id, lock, itemIds }) };
    } catch (error) {
      await lock.release();
      throw error;
    }
  }

  /** Disparo do cron: todos os bancos. Se já houver uma sincronização rodando, só registra que pulou. */
  runScheduled(): Promise<ScheduledSyncReport> {
    return this.runScheduledFor(this.deps.itemIds);
  }

  /**
   * Recuperação do dia (ao subir a API e na segunda tentativa): só os bancos ativos ainda sem
   * sincronização bem-sucedida hoje. Sem nenhum, não cria execução.
   */
  async catchUpToday(): Promise<ScheduledSyncReport> {
    const dueItemIds = await this.itemIdsDueToday();
    if (dueItemIds.length === 0) return NOTHING_DUE_REPORT;
    return this.runScheduledFor(dueItemIds);
  }

  private async runScheduledFor(itemIds: readonly string[]): Promise<ScheduledSyncReport> {
    const started = await this.start('schedule', { itemIds });
    if (started.status === 'already_running') {
      this.deps.logger.info({}, 'scheduled sync skipped: another sync is running');
      return SKIPPED_REPORT;
    }
    const result = await started.finished;
    return { result, pendingItemCount: await this.countItemsDueToday() };
  }

  /** Bancos do `PLUGGY_ITEM_IDS` sem conexão ou ativos sem sincronização bem-sucedida hoje. */
  private async itemIdsDueToday(): Promise<string[]> {
    const today = todayInSaoPaulo(this.deps.now());
    const upToDateIds = await this.deps.connections.findUpToDateItemIds(this.deps.itemIds, today);
    const upToDate = new Set(upToDateIds);
    return this.deps.itemIds.filter((itemId) => !upToDate.has(itemId));
  }

  // Sem a contagem, não há segunda tentativa: a execução já terminou e o resultado dela vale.
  private async countItemsDueToday(): Promise<number> {
    try {
      return (await this.itemIdsDueToday()).length;
    } catch (error) {
      this.deps.logger.error({ errorType: errorTypeOf(error) }, 'pending banks count failed');
      return 0;
    }
  }

  findLatestRun(): Promise<SyncRunRecord | null> {
    return this.deps.syncRuns.findLatest();
  }

  listRuns(request: SyncRunPageRequest): Promise<SyncRunPage> {
    return this.deps.syncRuns.findPage(request);
  }

  /** Ao iniciar a API: fecha as execuções que ficaram `running` porque o processo parou no meio. */
  failInterruptedRuns(): Promise<number> {
    return this.deps.syncRuns.failInterrupted(INTERRUPTED_RUN_MESSAGE);
  }

  private async execute({ runId, lock, itemIds }: RunExecution): Promise<FinishedSyncRunStatus> {
    try {
      const outcome = await this.computeOutcome(itemIds);
      await this.recordFinish(runId, outcome);
      return outcome.status;
    } finally {
      await lock.release().catch((error: unknown) => {
        this.deps.logger.error({ errorType: errorTypeOf(error) }, 'sync lock release failed');
      });
    }
  }

  private async computeOutcome(itemIds: readonly string[]): Promise<SyncRunOutcome> {
    try {
      const itemsOutcome = await this.syncAllItems(itemIds);
      await this.snapshotManualInvestments();
      return await this.evaluateAlerts(itemsOutcome);
    } catch (error) {
      this.deps.logger.error({ errorType: errorTypeOf(error) }, 'sync failed unexpectedly');
      return UNEXPECTED_FAILURE_OUTCOME;
    }
  }

  /**
   * Se só o registro do fim falhar, o resultado calculado vale mesmo assim: regravar como `failed`
   * trocaria um resultado verdadeiro por um falso. A execução que ficou `running` é fechada por
   * `failInterruptedRuns` na próxima subida.
   */
  private async recordFinish(runId: string, outcome: SyncRunOutcome): Promise<void> {
    try {
      await this.deps.syncRuns.finish(runId, outcome);
      this.deps.logger.info({ runId, status: outcome.status, ...outcome.stats }, 'sync finished');
    } catch (error) {
      this.deps.logger.error({ runId, errorType: errorTypeOf(error) }, 'sync run not closed');
    }
  }

  /**
   * Foto do dia das posições manuais, com ou sem falha nos bancos: o valor delas não vem do Pluggy.
   * Falhar aqui só deixa o log (o tipo do erro) e não muda o resultado dos bancos.
   */
  private async snapshotManualInvestments(): Promise<void> {
    try {
      await this.deps.manualInvestments.snapshotManualPositions();
    } catch (error) {
      this.deps.logger.error(
        { errorType: errorTypeOf(error) },
        'manual investments snapshot failed',
      );
    }
  }

  /** Passo 7: avalia os alertas com o resultado de qualquer sincronização. Falhar aqui só deixa o rastro nas estatísticas. */
  private async evaluateAlerts(outcome: SyncRunOutcome): Promise<SyncRunOutcome> {
    try {
      await this.deps.alerts.evaluateAll();
      return outcome;
    } catch (error) {
      this.deps.logger.error({ errorType: errorTypeOf(error) }, 'alerts evaluation failed');
      return { ...outcome, stats: { ...outcome.stats, alertsFailed: 1 } };
    }
  }

  private async syncAllItems(itemIds: readonly string[]): Promise<SyncRunOutcome> {
    const itemOutcomes: ItemOutcome[] = [];
    // Um banco de cada vez: o Meu Pluggy tem no máximo 5, e assim cada um usa uma conexão só.
    for (const itemId of itemIds) {
      itemOutcomes.push(await this.syncItemSafely(itemId));
    }
    return summarizeRun(itemOutcomes);
  }

  /**
   * Isola o banco inteiro, inclusive as gravações fora dos estágios (criar a conexão, gravar o
   * status): um erro do banco de dados aqui vira falha deste banco, e os outros seguem.
   */
  private async syncItemSafely(itemId: string): Promise<ItemOutcome> {
    let connection: ConnectionRecord | null = null;
    try {
      connection = await this.deps.connections.ensure(itemId, PLACEHOLDER_INSTITUTION_NAME);
      return await this.syncConnection(connection);
    } catch (error) {
      this.deps.logger.warn(
        { connectionId: connection?.id ?? null, errorType: errorTypeOf(error) },
        'bank sync failed unexpectedly',
      );
      if (connection) await this.markAsUnexpectedFailure(connection);
      return FAILED_ITEM;
    }
  }

  private async markAsUnexpectedFailure(connection: ConnectionRecord): Promise<void> {
    try {
      await this.deps.connections.updateStatus(connection.id, {
        status: 'error',
        statusDetail: UNEXPECTED_FAILURE_MESSAGE,
      });
    } catch (error) {
      this.deps.logger.error(
        { connectionId: connection.id, errorType: errorTypeOf(error) },
        'bank status not saved',
      );
    }
  }

  private async syncConnection(connection: ConnectionRecord): Promise<ItemOutcome> {
    const itemId = connection.pluggyItemId;
    // Banco arquivado: nenhuma chamada ao Pluggy e nenhuma mudança de status, mesmo com o id no `.env`.
    if (connection.archivedAt !== null) return SKIPPED_ITEM;
    const overview = await this.attempt(connection, 'fetch_item', () =>
      this.deps.pluggy.getItem(itemId),
    );
    if (!overview) return FAILED_ITEM;
    // Antes de ler os dados: o vencimento fica gravado mesmo que a leitura falhe depois.
    await this.deps.connections.updateConsentExpiry(connection.id, overview.consentExpiresAt);
    await this.updateConnectionStatus(connection, overview.connection);
    if (!overview.connection.canReadData) return FAILED_ITEM;
    const window = this.windowFor(connection);
    const data = await this.attempt(connection, 'fetch_data', () =>
      this.fetchItemData(itemId, window),
    );
    if (!data) return FAILED_ITEM;
    const stats = await this.attempt(connection, 'save_data', () =>
      this.saveItemData({ connection, overview, data, window }),
    );
    return stats ? { status: 'synced', stats } : FAILED_ITEM;
  }

  /** Isola a falha de um banco: registra o tipo do erro, marca a conexão e deixa os outros seguirem. */
  private async attempt<T>(
    connection: ConnectionRecord,
    stage: ItemStage,
    work: () => Promise<T>,
  ): Promise<T | null> {
    try {
      return await work();
    } catch (error) {
      await this.recordFailure(connection, stage, error);
      return null;
    }
  }

  /** O banco que não existe mais no Pluggy tem o próprio status; qualquer outra falha é `error`. */
  private async recordFailure(
    connection: ConnectionRecord,
    stage: ItemStage,
    error: unknown,
  ): Promise<void> {
    this.deps.logger.warn(
      { connectionId: connection.id, stage, errorType: errorTypeOf(error) },
      'bank sync failed',
    );
    const isItemMissing = error instanceof PluggyItemNotFoundError;
    await this.deps.connections.updateStatus(connection.id, {
      status: isItemMissing ? 'item_not_found' : 'error',
      statusDetail: isItemMissing ? ITEM_NOT_FOUND_MESSAGE : STAGE_FAILURE_MESSAGES[stage],
    });
  }

  private async updateConnectionStatus(
    connection: ConnectionRecord,
    state: ItemConnectionState,
  ): Promise<void> {
    await this.deps.connections.updateStatus(connection.id, {
      status: state.status,
      statusDetail: state.detail,
    });
    if (!state.canReadData) {
      this.deps.logger.warn({ connectionId: connection.id, status: state.status }, 'bank skipped');
    }
  }

  private windowFor(connection: ConnectionRecord): TransactionWindow {
    return transactionWindowFor(connection.lastSyncedAt, this.deps.now());
  }

  // Busca tudo antes de abrir a transação do banco: uma resposta inválida não deixa nada gravado.
  private async fetchItemData(itemId: string, window: TransactionWindow): Promise<ItemData> {
    const accountList = await this.deps.pluggy.listAccounts(itemId);
    const transactionsByAccount = new Map<string, SyncedTransaction[]>();
    for (const account of accountList.accounts) {
      const transactions = await this.deps.pluggy.listTransactions(account.pluggyAccountId, window);
      transactionsByAccount.set(account.pluggyAccountId, transactions);
    }
    const investments = await this.deps.pluggy.listInvestments(itemId);
    const { billsByAccount, billsFailed } = await this.fetchBills(accountList);
    return { accountList, transactionsByAccount, investments, billsByAccount, billsFailed };
  }

  // Fatura é complemento: o saldo e as transações valem mais, então a falha de um cartão não derruba o banco.
  private async fetchBills(accountList: PluggyAccountList) {
    const billsByAccount = new Map<string, SyncedCreditCardBill[]>();
    let billsFailed = 0;
    for (const account of accountList.accounts) {
      if (account.type !== 'credit_card') continue;
      try {
        billsByAccount.set(
          account.pluggyAccountId,
          await this.deps.pluggy.listCreditCardBills(account.pluggyAccountId),
        );
      } catch (error) {
        billsFailed += 1;
        this.deps.logger.warn({ errorType: errorTypeOf(error) }, 'credit card bills fetch failed');
      }
    }
    return { billsByAccount, billsFailed };
  }

  // Ordem: contas e fotos → transações → categorias → investimentos e fotos → faturas → conexão sincronizada.
  private saveItemData({ connection, overview, data, window }: ItemSave): Promise<SyncStats> {
    const today = todayInSaoPaulo(this.deps.now());
    return this.deps.unitOfWork.run(async (repositories) => {
      const { accounts } = data.accountList;
      const accountIds = await saveAccounts(repositories, {
        connectionId: connection.id,
        data,
        today,
      });
      const transactionStats = await saveTransactions(repositories, {
        accountIds,
        data,
        window,
        today,
        logger: this.deps.logger,
      });
      await repositories.categorizer.categorizeConnection(connection.id);
      const investmentCount = await saveInvestments(repositories, {
        connectionId: connection.id,
        overview,
        data,
        today,
      });
      const billCount = await saveBills(repositories, { accountIds, data });
      await repositories.connections.markSynced(connection.id, {
        institutionName: data.accountList.institutionName ?? overview.connectorName,
        institutionLogoUrl: overview.institutionLogoUrl,
        syncedAt: this.deps.now(),
      });
      const counts = {
        ...EMPTY_STATS,
        accounts: accounts.length,
        investments: investmentCount,
        bills: billCount,
        billsFailed: data.billsFailed,
      };
      return addStats(transactionStats, counts);
    });
  }
}

interface AccountsSave {
  readonly connectionId: string;
  readonly data: ItemData;
  readonly today: string;
}

interface TransactionsSave {
  readonly accountIds: ReadonlyMap<string, string>;
  readonly data: ItemData;
  readonly window: TransactionWindow;
  readonly today: string;
  readonly logger: SyncLogger;
}

function idOf(accountIds: ReadonlyMap<string, string>, pluggyAccountId: string): string {
  const accountId = accountIds.get(pluggyAccountId);
  if (!accountId) throw new Error(`Conta ${pluggyAccountId} do Pluggy não foi gravada`);
  return accountId;
}

/** Grava as contas e a foto do saldo de hoje. Devolve o id interno de cada conta, pelo id do Pluggy. */
async function saveAccounts(
  repositories: ItemRepositories,
  { connectionId, data, today }: AccountsSave,
): Promise<ReadonlyMap<string, string>> {
  const { accounts } = data.accountList;
  const accountIds = await repositories.accounts.upsertMany(connectionId, accounts);
  const snapshots = accounts.map((account) => ({
    accountId: idOf(accountIds, account.pluggyAccountId),
    balanceCents: account.balanceCents,
  }));
  await repositories.accounts.saveSnapshots(snapshots, today);
  return accountIds;
}

interface InvestmentsSave {
  readonly connectionId: string;
  readonly overview: PluggyItemOverview;
  readonly data: ItemData;
  readonly today: string;
}

/** Zera o que sumiu só com coleta completa: numa parcial, a ausência não quer dizer resgate. */
async function saveInvestments(
  repositories: ItemRepositories,
  { connectionId, overview, data, today }: InvestmentsSave,
): Promise<number> {
  const investmentCount = await repositories.investments.upsertWithSnapshots(
    connectionId,
    data.investments,
    today,
  );
  if (overview.investmentsCollection === 'complete') {
    const returnedIds = data.investments.map(({ pluggyInvestmentId }) => pluggyInvestmentId);
    await repositories.investments.zeroVanishedWithSnapshots(connectionId, returnedIds, today);
  }
  return investmentCount;
}

async function saveBills(
  repositories: ItemRepositories,
  { accountIds, data }: Pick<TransactionsSave, 'accountIds' | 'data'>,
): Promise<number> {
  let billCount = 0;
  for (const [pluggyAccountId, bills] of data.billsByAccount) {
    billCount += await repositories.creditCardBills.upsertMany(
      idOf(accountIds, pluggyAccountId),
      bills,
    );
  }
  return billCount;
}

async function saveTransactions(
  repositories: ItemRepositories,
  { accountIds, data, window, today, logger }: TransactionsSave,
): Promise<SyncStats> {
  let stats = EMPTY_STATS;
  for (const [pluggyAccountId, transactions] of data.transactionsByAccount) {
    const accountId = idOf(accountIds, pluggyAccountId);
    const counts = await repositories.transactions.upsertMany(accountId, transactions);
    const returnedPluggyIds = transactions.map((transaction) => transaction.pluggyTransactionId);
    const scope = { accountId, window, returnedPluggyIds };
    const removed = await removeVanishedPending(repositories, { scope, today, logger });
    // Depois de apagar as pendentes, para a manual que uma delas apontava valer para a postada nova.
    // Só as linhas novas: atualizar uma transação que já existia nunca gera aviso de duplicata.
    await repositories.duplicateDetector.markPossibleDuplicates(counts.insertedIds);
    stats = addStats(stats, {
      ...EMPTY_STATS,
      transactionsInserted: counts.inserted,
      transactionsUpdated: counts.updated,
      transactionsRemoved: removed,
    });
  }
  return stats;
}

interface VanishedPendingRemoval {
  readonly scope: VanishedPendingScope;
  readonly today: string;
  readonly logger: SyncLogger;
}

/** Leva a decisão do usuário das pendentes que sumiram para a postada equivalente e apaga as pendentes. */
async function removeVanishedPending(
  repositories: ItemRepositories,
  { scope, today, logger }: VanishedPendingRemoval,
): Promise<number> {
  const { transactions } = repositories;
  const vanishedPendings = await transactions.findVanishedPendingWithDecision(scope);
  const plan = await planReplacements(transactions, {
    vanishedPendings,
    accountId: scope.accountId,
    today,
  });
  await carryDecisions(transactions, { vanishedPendings, plan });
  const counts = {
    carried: plan.replacements.length,
    kept: plan.keptPendingIds.length,
    ties: plan.ties,
  };
  if (vanishedPendings.length > 0) {
    logger.info({ accountId: scope.accountId, ...counts }, 'vanished pending decisions handled');
  }
  return transactions.deleteMissingPending(scope, plan.keptPendingIds);
}

interface DecisionsCarry {
  readonly vanishedPendings: readonly VanishedPending[];
  readonly plan: PendingReplacementPlan;
}

/**
 * Antes de apagar a pendente: a categoria (se era sua), a revisão, a nota, as etiquetas e o vínculo
 * com a previsão vão para a postada.
 */
async function carryDecisions(
  transactions: ItemRepositories['transactions'],
  { vanishedPendings, plan }: DecisionsCarry,
): Promise<void> {
  const pendingById = new Map(vanishedPendings.map((pending) => [pending.id, pending]));
  for (const { pendingId, postedId } of plan.replacements) {
    const pending = pendingById.get(pendingId);
    if (pending?.userCategoryId)
      await transactions.carryUserCategory(postedId, pending.userCategoryId);
    if (pending?.reviewedAt) await transactions.carryReview(postedId, pending.reviewedAt);
    await transactions.carryNoteAndTags(pendingId, postedId);
    await transactions.moveOccurrenceLink(pendingId, postedId);
  }
}

interface ReplacementPlanning {
  readonly vanishedPendings: readonly VanishedPending[];
  readonly accountId: string;
  readonly today: string;
}

const NO_REPLACEMENTS: PendingReplacementPlan = { replacements: [], keptPendingIds: [], ties: 0 };

async function planReplacements(
  transactions: ItemRepositories['transactions'],
  { vanishedPendings, accountId, today }: ReplacementPlanning,
): Promise<PendingReplacementPlan> {
  const dates = vanishedPendings.map((pending) => pending.date).sort();
  const [earliest] = dates;
  const latest = dates.at(-1);
  if (!earliest || !latest) return NO_REPLACEMENTS;
  const postedCandidates = await transactions.findPostedInRange(accountId, {
    from: subtractDays(earliest, PENDING_MATCH_DAYS_BEFORE),
    to: addDays(latest, PENDING_MATCH_DAYS_AFTER),
  });
  return matchVanishedPending({ vanishedPendings, postedCandidates, today });
}
