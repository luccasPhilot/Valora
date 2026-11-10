import { describe, expect, it } from 'vitest';

import {
  groupInvestments,
  type InvestmentPosition,
} from '../../../src/modules/investments/investment-groups.js';

function position(overrides: Partial<InvestmentPosition> = {}): InvestmentPosition {
  return {
    id: crypto.randomUUID(),
    name: 'CDB Banco',
    type: 'FIXED_INCOME',
    subtype: 'CDB',
    balanceCents: 100000,
    institutionName: 'Banco de teste',
    ...overrides,
  };
}

const CDB = position({ name: 'CDB', balanceCents: 100000 });
const TREASURY = position({ name: 'Tesouro', subtype: 'TREASURY', balanceCents: 50000 });
const FUND = position({
  name: 'Fundo',
  type: 'MUTUAL_FUND',
  subtype: 'STOCK_FUND',
  balanceCents: 50000,
});

describe('groupInvestments', () => {
  it('should_sum_totals_and_percentages_by_type_when_positions_have_different_types', () => {
    // Arrange
    const positions = [CDB, TREASURY, FUND];
    // Act
    const overview = groupInvestments(positions);
    // Assert
    expect({
      totalCents: overview.totals.totalCents,
      groups: overview.groups.map(({ type, totalCents, percent }) => ({
        type,
        totalCents,
        percent,
      })),
    }).toEqual({
      totalCents: 200000,
      groups: [
        { type: 'FIXED_INCOME', totalCents: 150000, percent: 75 },
        { type: 'MUTUAL_FUND', totalCents: 50000, percent: 25 },
      ],
    });
  });

  it('should_count_zero_balance_positions_as_closed_when_they_exist', () => {
    // Arrange
    const closed = position({ name: 'CDB vencido', balanceCents: 0 });
    // Act
    const { totals, groups } = groupInvestments([CDB, closed]);
    // Assert
    expect({ totals, listed: groups.flatMap(({ items }) => items).length }).toEqual({
      totals: { totalCents: 100000, positionsCount: 1, closedCount: 1 },
      listed: 1,
    });
  });

  it('should_order_groups_by_total_and_items_by_balance_when_sizes_differ', () => {
    // Arrange
    const small = position({ name: 'Menor', balanceCents: 10000 });
    const big = position({ name: 'Maior', balanceCents: 90000 });
    // Act
    const { groups } = groupInvestments([small, FUND, big]);
    // Assert
    expect(groups.map(({ type, items }) => [type, items.map(({ name }) => name)])).toEqual([
      ['FIXED_INCOME', ['Maior', 'Menor']],
      ['MUTUAL_FUND', ['Fundo']],
    ]);
  });

  it('should_order_items_by_name_when_balances_are_equal', () => {
    // Arrange
    const first = position({ name: 'Ágil', balanceCents: 5000 });
    const second = position({ name: 'Zebra', balanceCents: 5000 });
    // Act
    const { groups } = groupInvestments([second, first]);
    // Assert
    expect(groups[0]?.items.map(({ name }) => name)).toEqual(['Ágil', 'Zebra']);
  });

  it('should_round_item_percent_to_one_decimal_when_share_is_not_exact', () => {
    // Arrange
    const third = position({ balanceCents: 100 });
    const rest = position({ name: 'Resto', balanceCents: 200 });
    // Act
    const { groups } = groupInvestments([third, rest]);
    // Assert
    expect(groups[0]?.items.map(({ percent }) => percent)).toEqual([66.7, 33.3]);
  });

  it('should_return_zero_totals_and_no_groups_when_there_are_no_positions', () => {
    // Arrange
    const positions: InvestmentPosition[] = [];
    // Act
    const overview = groupInvestments(positions);
    // Assert
    expect(overview).toEqual({
      totals: { totalCents: 0, positionsCount: 0, closedCount: 0 },
      groups: [],
    });
  });

  it('should_not_divide_by_zero_when_open_positions_cancel_each_other', () => {
    // Arrange
    const gain = position({ balanceCents: 5000 });
    const loss = position({ name: 'Saldo negativo', balanceCents: -5000 });
    // Act
    const { groups } = groupInvestments([gain, loss]);
    // Assert
    expect(groups[0]?.percent).toBe(0);
  });

  it('should_keep_unknown_types_as_their_own_group_when_pluggy_sends_a_new_type', () => {
    // Arrange
    const unknown = position({ type: 'NEW_TYPE', balanceCents: 1000 });
    // Act
    const { groups } = groupInvestments([unknown]);
    // Assert
    expect(groups.map(({ type }) => type)).toEqual(['NEW_TYPE']);
  });
});
