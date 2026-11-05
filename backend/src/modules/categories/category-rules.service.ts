import { NotFoundError } from '../../shared/errors.js';
import { normalizeDescription } from '../../shared/text.js';
import type { CategoriesRepository } from './categories.repository.js';
import type { CategorizationRepository } from './categorization.repository.js';
import type { Categorizer } from './categorizer.js';
import { assertCategoryIsSelectable } from './category-availability.js';
import type {
  CategoryRuleFields,
  CategoryRuleRecord,
  CategoryRulesRepository,
} from './category-rules.repository.js';

export interface CategoryRulesServiceDependencies {
  readonly rules: CategoryRulesRepository;
  readonly categories: CategoriesRepository;
  readonly transactions: CategorizationRepository;
  readonly categorizer: Categorizer;
}

export class CategoryRulesService {
  constructor(private readonly deps: CategoryRulesServiceDependencies) {}

  // Sem paginação: um usuário tem algumas dezenas ou poucas centenas de regras (docs/03-arquitetura.md).
  list(): Promise<CategoryRuleRecord[]> {
    return this.deps.rules.findAll();
  }

  async create(fields: CategoryRuleFields): Promise<CategoryRuleRecord> {
    await assertCategoryIsSelectable(this.deps.categories, fields.categoryId);
    const rule = await this.deps.rules.insert(fields);
    await this.deps.categorizer.recategorizeAll();
    return rule;
  }

  async update(ruleId: string, fields: CategoryRuleFields): Promise<CategoryRuleRecord> {
    await assertCategoryIsSelectable(this.deps.categories, fields.categoryId);
    const rule = await this.deps.rules.update(ruleId, fields);
    if (!rule) throw new NotFoundError(`Regra ${ruleId} não existe`);
    await this.deps.categorizer.recategorizeAll();
    return rule;
  }

  async delete(ruleId: string): Promise<void> {
    const wasDeleted = await this.deps.rules.delete(ruleId);
    if (!wasDeleted) throw new NotFoundError(`Regra ${ruleId} não existe`);
    await this.deps.categorizer.recategorizeAll();
  }

  /**
   * Aprende com a correção: cria a regra `equals` com a descrição normalizada da transação, ligada a
   * ela, e aplica ao histórico. Se a regra já existe, só troca a categoria dela. Quem chama (a tela
   * de transações) é quem marca a própria transação como escolha sua.
   */
  async learnFromCorrection(
    transactionId: string,
    categoryId: string,
  ): Promise<CategoryRuleRecord> {
    await assertCategoryIsSelectable(this.deps.categories, categoryId);
    const pattern = await this.deps.transactions.findDescriptionNormalized(transactionId);
    if (pattern === null) throw new NotFoundError(`Transação ${transactionId} não existe`);
    const existing = await this.findEqualsRule(pattern);
    const rule = existing
      ? await this.changeCategory(existing, categoryId)
      : await this.deps.rules.insert({
          pattern,
          matchType: 'equals',
          categoryId,
          priority: 0,
          learnedFromTransactionId: transactionId,
        });
    await this.deps.categorizer.recategorizeAll();
    return rule;
  }

  private async findEqualsRule(normalizedPattern: string): Promise<CategoryRuleRecord | undefined> {
    const equalsRules = await this.deps.rules.findByMatchType('equals');
    return equalsRules.find((rule) => normalizeDescription(rule.pattern) === normalizedPattern);
  }

  private async changeCategory(
    rule: CategoryRuleRecord,
    categoryId: string,
  ): Promise<CategoryRuleRecord> {
    await this.deps.rules.updateCategory(rule.id, categoryId);
    return { ...rule, categoryId };
  }
}
