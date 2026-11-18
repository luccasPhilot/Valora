import { describe, expect, it, vi } from 'vitest';

import type {
  InvestmentsRepository,
  ManualInvestmentRecord,
} from '../../../src/modules/investments/investments.repository.js';
import { InvestmentsService } from '../../../src/modules/investments/investments.service.js';
import { NotFoundError, OpenFinanceReadOnlyError } from '../../../src/shared/errors.js';

// 22h em São Paulo, 14 de novembro de 2026: já é dia 15 em UTC, e o app conta o dia de São Paulo.
const LATE_EVENING = new Date('2026-11-15T01:00:00Z');
const SAO_PAULO_DAY = '2026-11-14';
const INVESTMENT_ID = '11111111-1111-4111-8111-111111111111';

const STORED: ManualInvestmentRecord = {
  id: INVESTMENT_ID,
  name: 'Fundo INCO',
  institutionName: 'INCO',
  type: 'MUTUAL_FUND',
  balanceCents: 2_500_000,
  balanceUpdatedOn: SAO_PAULO_DAY,
};

function buildService(overrides: Partial<Record<keyof InvestmentsRepository, unknown>> = {}) {
  const repository = {
    findById: vi.fn().mockResolvedValue({ id: INVESTMENT_ID, source: 'manual' }),
    createManual: vi.fn().mockResolvedValue(STORED),
    updateManual: vi.fn().mockResolvedValue(STORED),
    deleteManual: vi.fn().mockResolvedValue(undefined),
    saveManualSnapshots: vi.fn().mockResolvedValue(1),
    ...overrides,
  };
  const service = new InvestmentsService({
    repository: repository as unknown as InvestmentsRepository,
    now: () => LATE_EVENING,
  });
  return { service, repository };
}

describe('InvestmentsService — posições manuais', () => {
  it('should_use_the_sao_paulo_day_when_the_position_is_created_late_in_the_evening', async () => {
    // Arrange
    const { service, repository } = buildService();
    const fields = {
      name: 'Fundo INCO',
      institutionName: 'INCO',
      type: 'MUTUAL_FUND',
      balanceCents: 1,
    };
    // Act
    await service.createManual(fields);
    // Assert
    expect(repository.createManual).toHaveBeenCalledWith(fields, SAO_PAULO_DAY);
  });

  it('should_pass_only_the_sent_fields_to_the_repository_when_the_update_is_partial', async () => {
    // Arrange
    const { service, repository } = buildService();
    // Act
    await service.updateManual(INVESTMENT_ID, { name: 'INCO Renda' });
    // Assert
    expect(repository.updateManual).toHaveBeenCalledWith(
      INVESTMENT_ID,
      { name: 'INCO Renda' },
      SAO_PAULO_DAY,
    );
  });

  it('should_throw_open_finance_read_only_when_the_update_targets_a_pluggy_investment', async () => {
    // Arrange
    const { service, repository } = buildService({
      findById: vi.fn().mockResolvedValue({ id: INVESTMENT_ID, source: 'open_finance' }),
    });
    // Act
    const update = service.updateManual(INVESTMENT_ID, { balanceCents: 1 });
    // Assert
    await expect(update).rejects.toBeInstanceOf(OpenFinanceReadOnlyError);
    expect(repository.updateManual).not.toHaveBeenCalled();
  });

  it('should_throw_not_found_with_the_id_when_the_investment_does_not_exist', async () => {
    // Arrange
    const { service } = buildService({ findById: vi.fn().mockResolvedValue(null) });
    // Act
    const removal = service.removeManual(INVESTMENT_ID);
    // Assert
    await expect(removal).rejects.toThrow(
      new NotFoundError(`Investimento ${INVESTMENT_ID} não existe`),
    );
  });

  it('should_throw_not_found_when_the_position_disappears_before_the_update', async () => {
    // Arrange
    const { service } = buildService({ updateManual: vi.fn().mockResolvedValue(null) });
    // Act
    const update = service.updateManual(INVESTMENT_ID, { balanceCents: 1 });
    // Assert
    await expect(update).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should_not_delete_anything_when_the_investment_comes_from_pluggy', async () => {
    // Arrange
    const { service, repository } = buildService({
      findById: vi.fn().mockResolvedValue({ id: INVESTMENT_ID, source: 'open_finance' }),
    });
    // Act
    await service.removeManual(INVESTMENT_ID).catch(() => undefined);
    // Assert
    expect(repository.deleteManual).not.toHaveBeenCalled();
  });

  it('should_snapshot_with_the_sao_paulo_day_when_the_sync_asks_for_the_manual_snapshots', async () => {
    // Arrange
    const { service, repository } = buildService();
    // Act
    await service.snapshotManualPositions();
    // Assert
    expect(repository.saveManualSnapshots).toHaveBeenCalledWith(SAO_PAULO_DAY);
  });
});
