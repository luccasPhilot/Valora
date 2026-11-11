import { describe, expect, it } from 'vitest';

import {
  buildMonthChange,
  buildNetWorthSeries,
  groupSnapshotRows,
  type NetWorthItem,
  pickReferenceDay,
  type SnapshotRow,
  valueOnDay,
} from '../../../src/modules/net-worth/net-worth-calculations.js';

const TODAY = '2026-11-15';

function item(
  overrides: Partial<NetWorthItem> & { readonly snapshots: NetWorthItem['snapshots'] },
): NetWorthItem {
  return { type: 'checking', isHidden: false, archivedOn: null, ...overrides };
}

function snapshots(...entries: readonly (readonly [string, number])[]): NetWorthItem['snapshots'] {
  return entries.map(([date, cents]) => ({ date, cents }));
}

describe('valueOnDay', () => {
  it('should_sum_accounts_and_investments_and_subtract_the_bills_when_all_have_a_snapshot', () => {
    // Arrange
    const items = [
      item({ snapshots: snapshots(['2026-11-10', 500000]) }),
      item({ type: 'investment', snapshots: snapshots(['2026-11-10', 1200000]) }),
      item({ type: 'credit_card', snapshots: snapshots(['2026-11-10', 150000]) }),
    ];
    // Act
    const value = valueOnDay(items, '2026-11-10');
    // Assert
    expect(value).toEqual({
      accountsCents: 500000,
      investmentsCents: 1200000,
      openBillsCents: 150000,
      netWorthCents: 1550000,
    });
  });

  it('should_use_the_latest_snapshot_before_the_day_when_the_item_has_none_on_that_day', () => {
    // Arrange
    const items = [item({ snapshots: snapshots(['2026-11-08', 1000], ['2026-11-10', 3000]) })];
    // Act
    const value = valueOnDay(items, '2026-11-09');
    // Assert
    expect(value.netWorthCents).toBe(1000);
  });

  it('should_not_use_a_snapshot_from_the_future_when_the_day_has_none', () => {
    // Arrange
    const items = [item({ snapshots: snapshots(['2026-11-10', 3000]) })];
    // Act
    const value = valueOnDay(items, '2026-11-09');
    // Assert
    expect(value.netWorthCents).toBe(0);
  });

  it('should_keep_the_snapshot_when_it_is_exactly_seven_days_old', () => {
    // Arrange
    const items = [item({ type: 'investment', snapshots: snapshots(['2026-11-03', 2000]) })];
    // Act
    const value = valueOnDay(items, '2026-11-10');
    // Assert
    expect(value.investmentsCents).toBe(2000);
  });

  it('should_drop_the_item_when_its_latest_snapshot_is_eight_days_old', () => {
    // Arrange
    const items = [item({ type: 'investment', snapshots: snapshots(['2026-11-02', 2000]) })];
    // Act
    const value = valueOnDay(items, '2026-11-10');
    // Assert
    expect(value.investmentsCents).toBe(0);
  });

  it('should_ignore_hidden_accounts', () => {
    // Arrange
    const items = [item({ isHidden: true, snapshots: snapshots(['2026-11-10', 999900]) })];
    // Act
    const value = valueOnDay(items, '2026-11-10');
    // Assert
    expect(value.netWorthCents).toBe(0);
  });

  it('should_ignore_the_cash_account', () => {
    // Arrange
    const items = [item({ type: 'cash', snapshots: snapshots(['2026-11-10', 5000]) })];
    // Act
    const value = valueOnDay(items, '2026-11-10');
    // Assert
    expect(value.netWorthCents).toBe(0);
  });

  it('should_count_an_archived_bank_on_the_day_before_it_was_archived', () => {
    // Arrange
    const items = [item({ archivedOn: '2026-11-10', snapshots: snapshots(['2026-11-09', 1000]) })];
    // Act
    const value = valueOnDay(items, '2026-11-09');
    // Assert
    expect(value.netWorthCents).toBe(1000);
  });

  it('should_not_count_an_archived_bank_on_the_day_it_was_archived', () => {
    // Arrange
    const items = [item({ archivedOn: '2026-11-10', snapshots: snapshots(['2026-11-09', 1000]) })];
    // Act
    const value = valueOnDay(items, '2026-11-10');
    // Assert
    expect(value.netWorthCents).toBe(0);
  });

  it('should_not_count_an_archived_bank_when_only_active_banks_are_requested', () => {
    // Arrange
    const items = [item({ archivedOn: '2026-11-10', snapshots: snapshots(['2026-11-05', 1000]) })];
    // Act
    const value = valueOnDay(items, '2026-11-06', 'active_only');
    // Assert
    expect(value.netWorthCents).toBe(0);
  });

  it('should_return_a_negative_net_worth_when_the_bills_exceed_accounts_and_investments', () => {
    // Arrange
    const items = [
      item({ snapshots: snapshots(['2026-11-10', 10000]) }),
      item({ type: 'credit_card', snapshots: snapshots(['2026-11-10', 80000]) }),
    ];
    // Act
    const value = valueOnDay(items, '2026-11-10');
    // Assert
    expect(value.netWorthCents).toBe(-70000);
  });

  it('should_return_zeros_when_there_are_no_items', () => {
    // Arrange
    // Act
    const value = valueOnDay([], '2026-11-10');
    // Assert
    expect(value).toEqual({
      accountsCents: 0,
      investmentsCents: 0,
      openBillsCents: 0,
      netWorthCents: 0,
    });
  });
});

describe('pickReferenceDay', () => {
  it('should_return_the_last_day_of_the_month_with_a_snapshot', () => {
    // Arrange
    const items = [item({ snapshots: snapshots(['2026-10-20', 1], ['2026-10-29', 2]) })];
    // Act
    const day = pickReferenceDay(items, '2026-10-01', TODAY);
    // Assert
    expect(day).toBe('2026-10-29');
  });

  it('should_return_null_when_the_month_has_no_snapshot', () => {
    // Arrange
    const items = [item({ snapshots: snapshots(['2026-10-29', 2]) })];
    // Act
    const day = pickReferenceDay(items, '2026-09-01', TODAY);
    // Assert
    expect(day).toBeNull();
  });

  it('should_stop_at_today_when_the_month_is_the_current_one', () => {
    // Arrange
    const items = [
      item({ snapshots: snapshots(['2026-11-10', 1], [TODAY, 2], ['2026-11-20', 3]) }),
    ];
    // Act
    const day = pickReferenceDay(items, '2026-11-01', TODAY);
    // Assert
    expect(day).toBe(TODAY);
  });

  it('should_ignore_snapshots_of_hidden_accounts', () => {
    // Arrange
    const items = [
      item({ snapshots: snapshots(['2026-10-10', 1]) }),
      item({ isHidden: true, snapshots: snapshots(['2026-10-25', 2]) }),
    ];
    // Act
    const day = pickReferenceDay(items, '2026-10-01', TODAY);
    // Assert
    expect(day).toBe('2026-10-10');
  });

  it('should_ignore_snapshots_of_an_archived_bank_taken_after_the_archiving_day', () => {
    // Arrange
    const items = [
      item({
        archivedOn: '2026-10-15',
        snapshots: snapshots(['2026-10-14', 1], ['2026-10-20', 2]),
      }),
    ];
    // Act
    const day = pickReferenceDay(items, '2026-10-01', TODAY);
    // Assert
    expect(day).toBe('2026-10-14');
  });
});

describe('buildNetWorthSeries', () => {
  const range = { from: '2026-09-01', to: '2026-11-01' };

  it('should_return_one_point_per_month_with_snapshots_from_the_oldest_to_the_newest', () => {
    // Arrange
    const items = [
      item({ snapshots: snapshots(['2026-09-30', 100], ['2026-10-31', 200], [TODAY, 300]) }),
    ];
    // Act
    const series = buildNetWorthSeries(items, range, TODAY);
    // Assert
    expect(series.map(({ month, date, netWorthCents }) => [month, date, netWorthCents])).toEqual([
      ['2026-09', '2026-09-30', 100],
      ['2026-10', '2026-10-31', 200],
      ['2026-11', TODAY, 300],
    ]);
  });

  it('should_skip_the_month_when_it_has_no_snapshot', () => {
    // Arrange
    const items = [item({ snapshots: snapshots(['2026-09-30', 100], [TODAY, 300]) })];
    // Act
    const series = buildNetWorthSeries(items, range, TODAY);
    // Assert
    expect(series.map(({ month }) => month)).toEqual(['2026-09', '2026-11']);
  });

  it('should_return_an_empty_series_when_there_are_no_snapshots', () => {
    // Arrange
    // Act
    const series = buildNetWorthSeries([], range, TODAY);
    // Assert
    expect(series).toEqual([]);
  });

  it('should_fill_in_a_missing_snapshot_of_one_item_with_its_previous_one', () => {
    // Arrange
    const items = [
      item({ snapshots: snapshots(['2026-10-30', 1000], ['2026-10-31', 1000]) }),
      item({ type: 'investment', snapshots: snapshots(['2026-10-30', 5000]) }),
    ];
    // Act
    const series = buildNetWorthSeries(items, { from: '2026-10-01', to: '2026-10-01' }, TODAY);
    // Assert
    expect(series[0]?.netWorthCents).toBe(6000);
  });

  it('should_return_the_parts_of_each_point', () => {
    // Arrange
    const items = [
      item({ snapshots: snapshots([TODAY, 500000]) }),
      item({ type: 'investment', snapshots: snapshots([TODAY, 1200000]) }),
      item({ type: 'credit_card', snapshots: snapshots([TODAY, 150000]) }),
    ];
    // Act
    const series = buildNetWorthSeries(items, { from: '2026-11-01', to: '2026-11-01' }, TODAY);
    // Assert
    expect(series).toEqual([
      {
        month: '2026-11',
        date: TODAY,
        accountsCents: 500000,
        investmentsCents: 1200000,
        openBillsCents: 150000,
        netWorthCents: 1550000,
      },
    ]);
  });

  it('should_step_down_in_the_month_the_bank_was_archived', () => {
    // Arrange
    const items = [
      item({ snapshots: snapshots(['2026-09-30', 1000], ['2026-10-31', 1000]) }),
      item({
        archivedOn: '2026-10-10',
        snapshots: snapshots(['2026-09-30', 3000], ['2026-10-09', 3000]),
      }),
    ];
    // Act
    const series = buildNetWorthSeries(items, { from: '2026-09-01', to: '2026-10-01' }, TODAY);
    // Assert
    expect(series.map(({ netWorthCents }) => netWorthCents)).toEqual([4000, 1000]);
  });
});

describe('buildMonthChange', () => {
  it('should_return_the_difference_since_the_first_snapshot_of_the_month', () => {
    // Arrange
    const items = [item({ snapshots: snapshots(['2026-11-01', 1000000]) })];
    // Act
    const change = buildMonthChange(items, 1050000, TODAY);
    // Assert
    expect(change).toEqual({ cents: 50000, percent: 5 });
  });

  it('should_return_null_when_the_only_snapshot_of_the_month_is_from_today', () => {
    // Arrange
    const items = [item({ snapshots: snapshots([TODAY, 1000000]) })];
    // Act
    const change = buildMonthChange(items, 1000000, TODAY);
    // Assert
    expect(change).toBeNull();
  });

  it('should_return_null_when_there_are_no_snapshots_in_the_month', () => {
    // Arrange
    const items = [item({ snapshots: snapshots(['2026-10-10', 1000000]) })];
    // Act
    const change = buildMonthChange(items, 1000000, TODAY);
    // Assert
    expect(change).toBeNull();
  });

  it('should_return_null_percent_when_the_starting_net_worth_is_zero', () => {
    // Arrange
    const items = [item({ snapshots: snapshots(['2026-11-01', 0]) })];
    // Act
    const change = buildMonthChange(items, 20000, TODAY);
    // Assert
    expect(change).toEqual({ cents: 20000, percent: null });
  });

  it('should_round_the_percent_to_two_decimals', () => {
    // Arrange
    const items = [item({ snapshots: snapshots(['2026-11-01', 300000]) })];
    // Act
    const change = buildMonthChange(items, 400000, TODAY);
    // Assert
    expect(change?.percent).toBe(33.33);
  });

  it('should_not_show_a_drop_when_a_bank_was_archived_during_the_month', () => {
    // Arrange
    const items = [
      item({ snapshots: snapshots(['2026-11-01', 5000], [TODAY, 5000]) }),
      item({ archivedOn: '2026-11-10', snapshots: snapshots(['2026-11-01', 1000]) }),
    ];
    // Act
    const change = buildMonthChange(items, 5000, TODAY);
    // Assert
    expect(change).toEqual({ cents: 0, percent: 0 });
  });

  it('should_use_the_tolerance_when_an_item_has_no_snapshot_on_the_first_day', () => {
    // Arrange
    const items = [
      item({ snapshots: snapshots(['2026-11-02', 1000]) }),
      item({ type: 'investment', snapshots: snapshots(['2026-10-30', 9000]) }),
    ];
    // Act
    const change = buildMonthChange(items, 11000, TODAY);
    // Assert
    expect(change?.cents).toBe(1000);
  });
});

describe('groupSnapshotRows', () => {
  it('should_group_the_rows_of_each_item_keeping_the_order', () => {
    // Arrange
    const rows: SnapshotRow[] = [
      {
        itemId: 'a',
        type: 'checking',
        isHidden: false,
        archivedOn: null,
        date: '2026-11-01',
        cents: 1,
      },
      {
        itemId: 'a',
        type: 'checking',
        isHidden: false,
        archivedOn: null,
        date: '2026-11-02',
        cents: 2,
      },
      {
        itemId: 'b',
        type: 'investment',
        isHidden: false,
        archivedOn: '2026-11-05',
        date: '2026-11-01',
        cents: 3,
      },
    ];
    // Act
    const items = groupSnapshotRows(rows);
    // Assert
    expect(items).toEqual([
      {
        type: 'checking',
        isHidden: false,
        archivedOn: null,
        snapshots: [
          { date: '2026-11-01', cents: 1 },
          { date: '2026-11-02', cents: 2 },
        ],
      },
      {
        type: 'investment',
        isHidden: false,
        archivedOn: '2026-11-05',
        snapshots: [{ date: '2026-11-01', cents: 3 }],
      },
    ]);
  });
});
