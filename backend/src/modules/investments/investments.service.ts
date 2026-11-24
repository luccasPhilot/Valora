import { todayInSaoPaulo } from '../../shared/dates.js';
import { NotFoundError, OpenFinanceReadOnlyError } from '../../shared/errors.js';
import { groupInvestments, type InvestmentOverview } from './investment-groups.js';
import type {
  InvestmentsRepository,
  ManualInvestmentFields,
  ManualInvestmentRecord,
} from './investments.repository.js';

export interface InvestmentsServiceDeps {
  readonly repository: InvestmentsRepository;
  readonly now: () => Date;
}

export class InvestmentsService {
  constructor(private readonly deps: InvestmentsServiceDeps) {}

  // Sem paginação: são poucas dezenas de posições no máximo (até 5 conexões, docs/03-arquitetura.md).
  async overview(): Promise<InvestmentOverview> {
    return groupInvestments(await this.deps.repository.findActivePositions());
  }

  createManual(fields: ManualInvestmentFields): Promise<ManualInvestmentRecord> {
    return this.deps.repository.createManual(fields, this.today());
  }

  async updateManual(
    id: string,
    changes: Partial<ManualInvestmentFields>,
  ): Promise<ManualInvestmentRecord> {
    await this.assertManual(id);
    const updated = await this.deps.repository.updateManual(id, changes, this.today());
    if (!updated) throw notFound(id);
    return updated;
  }

  async removeManual(id: string): Promise<void> {
    await this.assertManual(id);
    await this.deps.repository.deleteManual(id);
  }

  /** Foto do dia das posições manuais, repetindo o último valor informado (design, decisão 3). */
  snapshotManualPositions(): Promise<number> {
    return this.deps.repository.saveManualSnapshots(this.today());
  }

  private today(): string {
    return todayInSaoPaulo(this.deps.now());
  }

  private async assertManual(id: string): Promise<void> {
    const investment = await this.deps.repository.findById(id);
    if (!investment) throw notFound(id);
    if (investment.source !== 'manual') {
      throw new OpenFinanceReadOnlyError(
        `O investimento ${id} vem do Open Finance e não pode ser alterado`,
      );
    }
  }
}

function notFound(id: string): NotFoundError {
  return new NotFoundError(`Investimento ${id} não existe`);
}
