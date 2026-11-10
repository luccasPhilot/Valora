import { describe, expect, it } from 'vitest';

import { detectDuplicateCharges } from '../../../../src/modules/alerts/detectors/duplicate-charges.js';
import { chargeRow } from './charge-row-builder.js';

const TODAY = '2026-11-10';

function alertedTransactionIds(rows: Parameters<typeof detectDuplicateCharges>[0]): string[] {
  return detectDuplicateCharges(rows, TODAY).map((situation) => situation.transactionId ?? '');
}

describe('detectDuplicateCharges', () => {
  it('should_alert_the_most_recent_charge_when_two_equal_charges_happen_on_the_same_day', () => {
    // Arrange
    const first = chargeRow({ date: '2026-11-09', id: 'a-1' });
    const second = chargeRow({ date: '2026-11-09', id: 'a-2' });
    // Act
    const alerted = alertedTransactionIds([first, second]);
    // Assert
    expect(alerted).toEqual(['a-2']);
  });

  it('should_alert_when_the_charges_are_three_days_apart', () => {
    // Arrange
    const rows = [chargeRow({ date: '2026-11-07' }), chargeRow({ date: '2026-11-10' })];
    // Act
    const alerted = alertedTransactionIds(rows);
    // Assert
    expect(alerted).toHaveLength(1);
  });

  it('should_not_alert_when_the_charges_are_four_days_apart', () => {
    // Arrange
    const rows = [chargeRow({ date: '2026-11-06' }), chargeRow({ date: '2026-11-10' })];
    // Act
    const alerted = alertedTransactionIds(rows);
    // Assert
    expect(alerted).toEqual([]);
  });

  it('should_alert_when_the_amount_is_exactly_five_reais', () => {
    // Arrange
    const rows = [chargeRow({ amountCents: -500 }), chargeRow({ amountCents: -500 })];
    // Act
    const alerted = alertedTransactionIds(rows);
    // Assert
    expect(alerted).toHaveLength(1);
  });

  it('should_not_alert_when_the_amount_is_four_reais_and_ninety_nine_cents', () => {
    // Arrange
    const rows = [chargeRow({ amountCents: -499 }), chargeRow({ amountCents: -499 })];
    // Act
    const alerted = alertedTransactionIds(rows);
    // Assert
    expect(alerted).toEqual([]);
  });

  it('should_not_alert_when_the_amounts_differ_by_one_cent', () => {
    // Arrange
    const rows = [chargeRow({ amountCents: -8990 }), chargeRow({ amountCents: -8991 })];
    // Act
    const alerted = alertedTransactionIds(rows);
    // Assert
    expect(alerted).toEqual([]);
  });

  it('should_not_alert_when_the_charges_are_in_different_accounts', () => {
    // Arrange
    const rows = [chargeRow({ accountId: 'account-a' }), chargeRow({ accountId: 'account-b' })];
    // Act
    const alerted = alertedTransactionIds(rows);
    // Assert
    expect(alerted).toEqual([]);
  });

  it('should_not_alert_when_one_of_the_charges_is_pending', () => {
    // Arrange
    const rows = [chargeRow(), chargeRow({ status: 'pending' })];
    // Act
    const alerted = alertedTransactionIds(rows);
    // Assert
    expect(alerted).toEqual([]);
  });

  it('should_not_alert_when_the_charges_are_installments', () => {
    // Arrange
    const rows = [chargeRow({ installmentTotal: 6 }), chargeRow({ installmentTotal: 6 })];
    // Act
    const alerted = alertedTransactionIds(rows);
    // Assert
    expect(alerted).toEqual([]);
  });

  it('should_alert_when_the_charges_are_single_installment_purchases', () => {
    // Arrange
    const rows = [chargeRow({ installmentTotal: 1 }), chargeRow({ installmentTotal: 1 })];
    // Act
    const alerted = alertedTransactionIds(rows);
    // Assert
    expect(alerted).toHaveLength(1);
  });

  it('should_not_alert_when_one_of_the_charges_is_manual', () => {
    // Arrange
    const rows = [chargeRow(), chargeRow({ source: 'manual' })];
    // Act
    const alerted = alertedTransactionIds(rows);
    // Assert
    expect(alerted).toEqual([]);
  });

  it('should_not_alert_when_the_charges_are_pix_transfers', () => {
    // Arrange
    const rows = [
      chargeRow({ pluggyCategory: 'Transfer - PIX' }),
      chargeRow({ pluggyCategory: 'Transfer - PIX' }),
    ];
    // Act
    const alerted = alertedTransactionIds(rows);
    // Assert
    expect(alerted).toEqual([]);
  });

  it('should_not_alert_when_the_category_is_a_transfer', () => {
    // Arrange
    const rows = [chargeRow({ categoryKind: 'transfer' }), chargeRow({ categoryKind: 'transfer' })];
    // Act
    const alerted = alertedTransactionIds(rows);
    // Assert
    expect(alerted).toEqual([]);
  });

  it('should_not_alert_when_the_charge_is_income', () => {
    // Arrange
    const rows = [chargeRow({ amountCents: 8990 }), chargeRow({ amountCents: 8990 })];
    // Act
    const alerted = alertedTransactionIds(rows);
    // Assert
    expect(alerted).toEqual([]);
  });

  it('should_alert_when_the_most_recent_charge_is_seven_days_old', () => {
    // Arrange
    const rows = [chargeRow({ date: '2026-11-03' }), chargeRow({ date: '2026-11-03' })];
    // Act
    const alerted = alertedTransactionIds(rows);
    // Assert
    expect(alerted).toHaveLength(1);
  });

  it('should_not_alert_when_the_most_recent_charge_is_eight_days_old', () => {
    // Arrange
    const rows = [chargeRow({ date: '2026-11-02' }), chargeRow({ date: '2026-11-02' })];
    // Act
    const alerted = alertedTransactionIds(rows);
    // Assert
    expect(alerted).toEqual([]);
  });

  it('should_alert_the_second_and_third_charges_when_three_equal_charges_happen', () => {
    // Arrange
    const rows = [
      chargeRow({ id: 'c-1', date: '2026-11-08' }),
      chargeRow({ id: 'c-2', date: '2026-11-09' }),
      chargeRow({ id: 'c-3', date: '2026-11-10' }),
    ];
    // Act
    const alerted = alertedTransactionIds(rows);
    // Assert
    expect(alerted).toEqual(['c-2', 'c-3']);
  });

  it('should_build_a_message_without_amounts_and_a_key_by_transaction', () => {
    // Arrange
    const rows = [chargeRow({ id: 'k-1' }), chargeRow({ id: 'k-2' })];
    // Act
    const [situation] = detectDuplicateCharges(rows, TODAY);
    // Assert
    expect(situation).toMatchObject({
      type: 'duplicate_charge',
      dedupeKey: 'duplicate_charge:k-2',
      message: 'Possível cobrança duplicada: Loja Exemplo',
      transactionId: 'k-2',
    });
  });

  it('should_limit_the_description_in_the_message_to_sixty_characters', () => {
    // Arrange
    const description = 'A'.repeat(90);
    const rows = [chargeRow({ description }), chargeRow({ description })];
    // Act
    const [situation] = detectDuplicateCharges(rows, TODAY);
    // Assert
    expect(situation?.message).toBe(`Possível cobrança duplicada: ${'A'.repeat(59)}…`);
  });

  it('should_return_nothing_when_there_are_no_rows', () => {
    // Arrange
    const rows: Parameters<typeof detectDuplicateCharges>[0] = [];
    // Act
    const alerted = alertedTransactionIds(rows);
    // Assert
    expect(alerted).toEqual([]);
  });
});
