import { describe, expect, it } from 'vitest';

import { toCsvField, toMachineCsv } from '../../../src/modules/exports/machine-csv.js';

describe('toCsvField', () => {
  it('should_write_an_empty_field_when_the_value_is_null', () => {
    // Arrange / Act
    const field = toCsvField(null);
    // Assert
    expect(field).toBe('');
  });

  it('should_write_two_quotes_when_the_text_is_empty', () => {
    // Arrange / Act
    const field = toCsvField('');
    // Assert
    expect(field).toBe('""');
  });

  it('should_write_the_instant_in_utc_iso_when_the_value_is_a_date', () => {
    // Arrange
    const instant = new Date('2026-11-24T13:00:00Z');
    // Act
    const field = toCsvField(instant);
    // Assert
    expect(field).toBe('2026-11-24T13:00:00.000Z');
  });

  it('should_write_integer_cents_without_quotes_when_the_value_is_a_number', () => {
    // Arrange / Act
    const field = toCsvField(-8990);
    // Assert
    expect(field).toBe('-8990');
  });

  it('should_quote_and_double_inner_quotes_when_the_text_has_a_line_break', () => {
    // Arrange / Act
    const field = toCsvField('linha "1"\nlinha 2');
    // Assert
    expect(field).toBe('"linha ""1""\nlinha 2"');
  });

  it('should_write_false_when_the_value_is_a_boolean', () => {
    // Arrange / Act
    const field = toCsvField(false);
    // Assert
    expect(field).toBe('false');
  });
});

describe('toMachineCsv', () => {
  it('should_write_the_header_and_end_every_line_with_crlf_when_there_are_rows', () => {
    // Arrange
    const columnNames = ['id', 'amount_cents'];
    const rows = [['a', -100]];
    // Act
    const csv = toMachineCsv(columnNames, rows);
    // Assert
    expect(csv).toBe('id,amount_cents\r\na,-100\r\n');
  });
});
