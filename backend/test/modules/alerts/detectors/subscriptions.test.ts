import { describe, expect, it } from 'vitest';

import { detectSubscriptions } from '../../../../src/modules/alerts/detectors/subscriptions.js';
import { chargeRow } from './charge-row-builder.js';

const TODAY = '2026-11-10';

function monthly(dates: readonly string[], overrides: Parameters<typeof chargeRow>[0] = {}) {
  return dates.map((date) =>
    chargeRow({
      date,
      description: 'Streaming Exemplo',
      descriptionNormalized: 'STREAMING EXEMPLO',
      amountCents: -3990,
      ...overrides,
    }),
  );
}

describe('detectSubscriptions', () => {
  it('should_detect_a_subscription_when_three_monthly_charges_are_in_sequence', () => {
    // Arrange
    const rows = monthly(['2026-08-05', '2026-09-04', '2026-10-05']);
    // Act
    const situations = detectSubscriptions(rows, TODAY);
    // Assert
    expect(situations).toHaveLength(1);
  });

  it('should_link_the_alert_to_the_most_recent_charge_and_use_a_key_by_amount_and_description', () => {
    // Arrange
    const rows = monthly(['2026-08-05', '2026-09-04', '2026-10-05']);
    // Act
    const [situation] = detectSubscriptions(rows, TODAY);
    // Assert
    expect(situation).toMatchObject({
      type: 'subscription_detected',
      dedupeKey: 'subscription_detected:-3990:STREAMING EXEMPLO',
      message: 'Assinatura detectada: Streaming Exemplo',
      transactionId: rows[2]?.id,
    });
  });

  it('should_detect_when_the_intervals_are_25_and_35_days', () => {
    // Arrange
    const rows = monthly(['2026-08-01', '2026-08-26', '2026-09-30']);
    // Act
    const situations = detectSubscriptions(rows, TODAY);
    // Assert
    expect(situations).toHaveLength(1);
  });

  it('should_not_detect_when_an_interval_is_24_days', () => {
    // Arrange
    const rows = monthly(['2026-08-01', '2026-08-25', '2026-09-29']);
    // Act
    const situations = detectSubscriptions(rows, TODAY);
    // Assert
    expect(situations).toEqual([]);
  });

  it('should_not_detect_when_an_interval_is_36_days', () => {
    // Arrange
    const rows = monthly(['2026-08-01', '2026-09-06', '2026-10-06']);
    // Act
    const situations = detectSubscriptions(rows, TODAY);
    // Assert
    expect(situations).toEqual([]);
  });

  it('should_detect_when_the_last_charge_is_45_days_old', () => {
    // Arrange
    const rows = monthly(['2026-08-01', '2026-09-01', '2026-09-26']);
    // Act
    const situations = detectSubscriptions(rows, TODAY);
    // Assert
    expect(situations).toHaveLength(1);
  });

  it('should_not_detect_when_the_last_charge_is_46_days_old', () => {
    // Arrange
    const rows = monthly(['2026-08-01', '2026-09-01', '2026-09-25']);
    // Act
    const situations = detectSubscriptions(rows, TODAY);
    // Assert
    expect(situations).toEqual([]);
  });

  it('should_not_detect_when_there_are_only_two_charges', () => {
    // Arrange
    const rows = monthly(['2026-09-04', '2026-10-05']);
    // Act
    const situations = detectSubscriptions(rows, TODAY);
    // Assert
    expect(situations).toEqual([]);
  });

  it('should_not_detect_when_the_intervals_are_irregular', () => {
    // Arrange
    const rows = monthly(['2026-08-01', '2026-08-11', '2026-10-10']);
    // Act
    const situations = detectSubscriptions(rows, TODAY);
    // Assert
    expect(situations).toEqual([]);
  });

  it('should_not_detect_when_the_amounts_are_different', () => {
    // Arrange
    const rows = [
      ...monthly(['2026-08-05'], { amountCents: -3990 }),
      ...monthly(['2026-09-04'], { amountCents: -4190 }),
      ...monthly(['2026-10-05'], { amountCents: -4390 }),
    ];
    // Act
    const situations = detectSubscriptions(rows, TODAY);
    // Assert
    expect(situations).toEqual([]);
  });

  it('should_not_detect_when_the_subscription_ended_100_days_ago', () => {
    // Arrange
    const rows = monthly(['2026-05-01', '2026-05-31', '2026-07-02']);
    // Act
    const situations = detectSubscriptions(rows, TODAY);
    // Assert
    expect(situations).toEqual([]);
  });

  it('should_not_detect_when_the_monthly_charges_are_pix_transfers', () => {
    // Arrange
    const rows = monthly(['2026-08-05', '2026-09-04', '2026-10-05'], {
      amountCents: -3000,
      pluggyCategory: 'Transfer - PIX',
    });
    // Act
    const situations = detectSubscriptions(rows, TODAY);
    // Assert
    expect(situations).toEqual([]);
  });

  it('should_not_detect_when_the_monthly_charge_is_a_385_fee', () => {
    // Arrange
    const rows = monthly(['2026-08-05', '2026-09-04', '2026-10-05'], { amountCents: -385 });
    // Act
    const situations = detectSubscriptions(rows, TODAY);
    // Assert
    expect(situations).toEqual([]);
  });

  it('should_not_detect_when_the_charges_are_manual_entries', () => {
    // Arrange
    const rows = monthly(['2026-08-05', '2026-09-04', '2026-10-05'], { source: 'manual' });
    // Act
    const situations = detectSubscriptions(rows, TODAY);
    // Assert
    expect(situations).toEqual([]);
  });

  it('should_keep_the_same_key_when_a_fourth_charge_arrives', () => {
    // Arrange
    const threeCharges = monthly(['2026-08-05', '2026-09-04', '2026-10-05']);
    const fourCharges = monthly(['2026-08-05', '2026-09-04', '2026-10-05', '2026-11-05']);
    // Act
    const keyWithThree = detectSubscriptions(threeCharges, TODAY)[0]?.dedupeKey;
    const keyWithFour = detectSubscriptions(fourCharges, TODAY)[0]?.dedupeKey;
    // Assert
    expect(keyWithFour).toBe(keyWithThree);
  });

  it('should_detect_charges_from_different_accounts_as_one_subscription', () => {
    // Arrange
    const rows = [
      ...monthly(['2026-08-05'], { accountId: 'account-a' }),
      ...monthly(['2026-09-04'], { accountId: 'account-b' }),
      ...monthly(['2026-10-05'], { accountId: 'account-a' }),
    ];
    // Act
    const situations = detectSubscriptions(rows, TODAY);
    // Assert
    expect(situations).toHaveLength(1);
  });

  it('should_return_nothing_when_there_are_no_rows', () => {
    // Arrange
    const rows: Parameters<typeof detectSubscriptions>[0] = [];
    // Act
    const situations = detectSubscriptions(rows, TODAY);
    // Assert
    expect(situations).toEqual([]);
  });
});
