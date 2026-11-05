import { subtractDays, todayInSaoPaulo } from '../../shared/dates.js';
import type {
  ConnectionRecord,
  ConnectionsRepository,
} from '../connections/connections.repository.js';
import type { ItemConnectionState } from './item-status.js';
import type { PluggyAccountList, PluggyClient, PluggyItemOverview } from './pluggy-client.js';
import type { SyncedInvestment, SyncedTransaction, TransactionWindow } from './sync.types.js';
import type { ItemRepositories, SyncUnitOfWork } from './sync.unit-of-work.js';
import type { SyncLock, SyncLockHandle } from './sync-lock.repository.js';
import { addStats, EMPTY_STATS, type ItemOutcome, summarizeRun } from './sync-outcome.js';
import type {
  SyncRunOutcome,
  SyncRunRecord,
  SyncRunsRepository,
  SyncStats,
  SyncTrigger,
} from './sync-runs.repository.js';

const FIRST_SYNC_DAYS = 365;
const FOLLOW_UP_SYNC_DAYS = 30;
const PLACEHOLDER_INSTITUTION_NAME = 'Banco não identificado';
const UNEXPECTED_FAILURE_MESSAGE = 'Erro inesperado na sincronização. Tente de novo mais tarde.';
const INTERRUPTED_RUN_MESSAGE = 'A sincronização foi interrompida porque a API reiniciou.';

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
  readonly logger: SyncLogger;
  readonly now: () => Date;
}

export type StartSyncResult =
  | {
      readonly status: 'started';
      readonly run: SyncRunRecord;
      /** Termina quando a execução acaba. Nunca rejeita: falhas viram `failed` em `sync_runs`. */
      readonly finished: Promise<void>;
    }
  | { readonly status: 'already_running' };

interface ItemData {
  readonly accountList: PluggyAccountList;
  readonly transactionsByAccount: ReadonlyMap<string, readonly SyncedTransaction[]>;
  readonly investments: readonly SyncedInvestment[];
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

const FAILED_ITEM: ItemOutcome = { status: 'failed' };

export class SyncService {
  constructor(private readonly deps: SyncServiceDependencies) {}

  /** Começa uma sincronização em segundo plano, ou avisa que já existe uma em andamento. */
  async start(trigger: SyncTrigger): Promise<StartSyncResult> {
    const lock = await this.deps.lock.tryAcquire();
    if (!lock) return { status: 'already_running' };
    try {
      const run = await this.deps.syncRuns.create(trigger);
      return { status: 'started', run, finished: this.execute(run.id, lock) };
    } catch (error) {
      await lock.release();
      throw error;
    }
  }

  /** Disparo do agendamento: se já houver uma sincronização rodando, só registra que pulou. */
  async runScheduled(): Promise<void> {
    const started = await this.start('schedule');
    if (started.status === 'already_running') {
      this.deps.logger.info({}, 'scheduled sync skipped: another sync is running');
      return;
    }
    await started.finished;
  }

  findLatestRun(): Promise<SyncRunRecord | null> {
    return this.deps.syncRuns.findLatest();
  }

  /** Ao iniciar a API: fecha as execuções que ficaram `running` porque o processo parou no meio. */
  failInterruptedRuns(): Promise<number> {
    return this.deps.syncRuns.failInterrupted(INTERRUPTED_RUN_MESSAGE);
  }

  private async execute(runId: string, lock: SyncLockHandle): Promise<void> {
    try {
      const outcome = await this.syncAllItems();
      await this.deps.syncRuns.finish(runId, outcome);
      this.deps.logger.info({ runId, status: outcome.status, ...outcome.stats }, 'sync finished');
    } catch (error) {
      this.deps.logger.error({ runId, errorType: errorTypeOf(error) }, 'sync failed unexpectedly');
      await this.finishAsUnexpectedFailure(runId);
    } finally {
      await lock.release().catch((error: unknown) => {
        this.deps.logger.error({ errorType: errorTypeOf(error) }, 'sync lock release failed');
      });
    }
  }

  private async finishAsUnexpectedFailure(runId: string): Promise<void> {
    const outcome: SyncRunOutcome = {
      status: 'failed',
      stats: EMPTY_STATS,
      errorMessage: UNEXPECTED_FAILURE_MESSAGE,
    };
    await this.deps.syncRuns.finish(runId, outcome).catch((error: unknown) => {
      this.deps.logger.error({ runId, errorType: errorTypeOf(error) }, 'sync run not closed');
    });
  }

  private async syncAllItems(): Promise<SyncRunOutcome> {
    const itemOutcomes: ItemOutcome[] = [];
    // Um banco de cada vez: o Meu Pluggy tem no máximo 5, e assim cada um usa uma conexão só.
    for (const itemId of this.deps.itemIds) {
      itemOutcomes.push(await this.syncItem(itemId));
    }
    return summarizeRun(itemOutcomes);
  }

  private async syncItem(itemId: string): Promise<ItemOutcome> {
    const connection = await this.deps.connections.ensure(itemId, PLACEHOLDER_INSTITUTION_NAME);
    const overview = await this.attempt(connection, 'fetch_item', () =>
      this.deps.pluggy.getItem(itemId),
    );
    if (!overview) return FAILED_ITEM;
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
      this.deps.logger.warn(
        { connectionId: connection.id, stage, errorType: errorTypeOf(error) },
        'bank sync failed',
      );
      await this.deps.connections.updateStatus(connection.id, {
        status: 'error',
        statusDetail: STAGE_FAILURE_MESSAGES[stage],
      });
      return null;
    }
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

  /** 365 dias na primeira sincronização do banco; 30 nas seguintes. */
  private windowFor(connection: ConnectionRecord): TransactionWindow {
    const today = todayInSaoPaulo(this.deps.now());
    const days = connection.lastSyncedAt === null ? FIRST_SYNC_DAYS : FOLLOW_UP_SYNC_DAYS;
    return { from: subtractDays(today, days), to: today };
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
    return { accountList, transactionsByAccount, investments };
  }

  // Ordem: contas e fotos → transações → categorias → investimentos e fotos → conexão sincronizada.
  private saveItemData({ connection, overview, data, window }: ItemSave): Promise<SyncStats> {
    const today = todayInSaoPaulo(this.deps.now());
    return this.deps.unitOfWork.run(async (repositories) => {
      const { accounts } = data.accountList;
      const accountIds = await saveAccounts(repositories, {
        connectionId: connection.id,
        data,
        today,
      });
      const transactionStats = await saveTransactions(repositories, { accountIds, data, window });
      await repositories.categorizer.categorizeConnection(connection.id);
      const investmentCount = await repositories.investments.upsertWithSnapshots(
        connection.id,
        data.investments,
        today,
      );
      await repositories.connections.markSynced(connection.id, {
        institutionName: data.accountList.institutionName ?? overview.connectorName,
        institutionLogoUrl: overview.institutionLogoUrl,
        syncedAt: this.deps.now(),
      });
      const counts = { ...EMPTY_STATS, accounts: accounts.length, investments: investmentCount };
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

async function saveTransactions(
  repositories: ItemRepositories,
  { accountIds, data, window }: TransactionsSave,
): Promise<SyncStats> {
  let stats = EMPTY_STATS;
  for (const [pluggyAccountId, transactions] of data.transactionsByAccount) {
    const accountId = idOf(accountIds, pluggyAccountId);
    const counts = await repositories.transactions.upsertMany(accountId, transactions);
    const returnedIds = transactions.map((transaction) => transaction.pluggyTransactionId);
    const removed = await repositories.transactions.deleteMissingPending(
      accountId,
      window,
      returnedIds,
    );
    stats = addStats(stats, {
      ...EMPTY_STATS,
      transactionsInserted: counts.inserted,
      transactionsUpdated: counts.updated,
      transactionsRemoved: removed,
    });
  }
  return stats;
}
