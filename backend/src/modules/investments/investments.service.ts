import { groupInvestments, type InvestmentOverview } from './investment-groups.js';
import type { InvestmentsRepository } from './investments.repository.js';

export class InvestmentsService {
  constructor(private readonly repository: InvestmentsRepository) {}

  // Sem paginação: são poucas dezenas de posições no máximo (até 5 conexões, docs/03-arquitetura.md).
  async overview(): Promise<InvestmentOverview> {
    return groupInvestments(await this.repository.findActivePositions());
  }
}
