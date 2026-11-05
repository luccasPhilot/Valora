import type {
  CategorizationRepository,
  TransactionToCategorize,
} from './categorization.repository.js';
import {
  type CategorizableTransaction,
  type CategoryDecision,
  compileRules,
  decideCategory,
} from './category-decision.js';
import type { CategoryRulesRepository } from './category-rules.repository.js';
import type { PluggyCategoryMappingsRepository } from './pluggy-category-mappings.repository.js';

const BATCH_SIZE = 1000;

export interface CategorizationStats {
  readonly examined: number;
  readonly changed: number;
}

export interface CategorizerRepositories {
  readonly rules: CategoryRulesRepository;
  readonly mappings: PluggyCategoryMappingsRepository;
  readonly transactions: CategorizationRepository;
}

interface Scope {
  readonly connectionId?: string;
}

function hasChanged(transaction: CategorizableTransaction, decision: CategoryDecision): boolean {
  return (
    transaction.categoryId !== decision.categoryId || transaction.categorySource !== decision.source
  );
}

function groupByDecision(
  changes: readonly { readonly id: string; readonly decision: CategoryDecision }[],
) {
  const groups = new Map<string, { decision: CategoryDecision; transactionIds: string[] }>();
  for (const { id, decision } of changes) {
    const key = `${decision.source}:${decision.categoryId ?? ''}`;
    const group = groups.get(key) ?? { decision, transactionIds: [] };
    group.transactionIds.push(id);
    groups.set(key, group);
  }
  return [...groups.values()];
}

/**
 * Aplica a ordem de decisão (usuário → regra → Pluggy → sem categoria) às transações que ainda não
 * têm categoria escolhida por você. Carrega regras e mapeamentos uma vez e trabalha em lotes. Recebe
 * os repositórios prontos, então roda tanto fora de uma transação quanto dentro da de uma sincronização.
 */
export class Categorizer {
  constructor(private readonly repositories: CategorizerRepositories) {}

  /** Chamado ao final da sincronização de cada banco, na mesma transação que gravou os dados. */
  categorizeConnection(connectionId: string): Promise<CategorizationStats> {
    return this.categorize({ connectionId });
  }

  /** Reaplica a todo o histórico: depois de mudar regras ou mapeamentos, e na primeira subida. */
  recategorizeAll(): Promise<CategorizationStats> {
    return this.categorize({});
  }

  private async categorize(scope: Scope): Promise<CategorizationStats> {
    const { rules, mappings } = this.repositories;
    const compiledRules = compileRules(await rules.findAll());
    const pluggyMappings = new Map(
      (await mappings.findAll()).map((mapping) => [mapping.pluggyCategory, mapping.categoryId]),
    );
    let examined = 0;
    let changed = 0;
    let afterId: string | null = null;
    for (;;) {
      const batch = await this.repositories.transactions.findAutomaticBatch({
        connectionId: scope.connectionId,
        afterId,
        limit: BATCH_SIZE,
      });
      const lastTransaction = batch.at(-1);
      if (!lastTransaction) break;
      changed += await this.applyBatch(batch, compiledRules, pluggyMappings);
      examined += batch.length;
      afterId = lastTransaction.id;
    }
    return { examined, changed };
  }

  private async applyBatch(
    batch: readonly TransactionToCategorize[],
    compiledRules: ReturnType<typeof compileRules>,
    pluggyMappings: ReadonlyMap<string, string>,
  ): Promise<number> {
    const changes = batch
      .map((transaction) => ({
        transaction,
        decision: decideCategory(transaction, compiledRules, pluggyMappings),
      }))
      .filter(({ transaction, decision }) => hasChanged(transaction, decision))
      .map(({ transaction, decision }) => ({ id: transaction.id, decision }));
    for (const { decision, transactionIds } of groupByDecision(changes)) {
      await this.repositories.transactions.assign({
        transactionIds,
        categoryId: decision.categoryId,
        source: decision.source,
      });
    }
    return changes.length;
  }
}
