import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { digitsToCents } from '@/lib/money-digits';

import { MoneyInput } from './money-input';

function Harness({ initialDigits = '' }: { initialDigits?: string }) {
  const [digits, setDigits] = useState(initialDigits);
  return (
    <>
      <label htmlFor="amount">Valor</label>
      <MoneyInput id="amount" digits={digits} onDigitsChange={setDigits} />
      <output data-testid="cents">{digitsToCents(digits)}</output>
    </>
  );
}

describe('MoneyInput', () => {
  it('should_show_89_reais_and_90_cents_when_typing_8_9_9_0', async () => {
    // Arrange
    render(<Harness />);
    // Act
    await userEvent.type(screen.getByLabelText('Valor'), '8990');
    // Assert
    expect(screen.getByLabelText('Valor')).toHaveValue('R$ 89,90');
  });

  it('should_report_8990_cents_when_typing_8_9_9_0', async () => {
    // Arrange
    render(<Harness />);
    // Act
    await userEvent.type(screen.getByLabelText('Valor'), '8990');
    // Assert
    expect(screen.getByTestId('cents')).toHaveTextContent('8990');
  });

  it('should_show_8_reais_and_99_cents_when_a_digit_is_erased_from_89_90', async () => {
    // Arrange
    render(<Harness initialDigits="8990" />);
    // Act
    await userEvent.type(screen.getByLabelText('Valor'), '{Backspace}');
    // Assert
    expect(screen.getByLabelText('Valor')).toHaveValue('R$ 8,99');
  });

  it('should_be_empty_when_everything_is_erased', async () => {
    // Arrange
    render(<Harness initialDigits="5" />);
    // Act
    await userEvent.type(screen.getByLabelText('Valor'), '{Backspace}');
    // Assert
    expect(screen.getByLabelText('Valor')).toHaveValue('');
  });

  it('should_ignore_letters_and_a_leading_zero_when_typing', async () => {
    // Arrange
    render(<Harness />);
    // Act
    await userEvent.type(screen.getByLabelText('Valor'), '0a7');
    // Assert
    expect(screen.getByLabelText('Valor')).toHaveValue('R$ 0,07');
  });

  it('should_stop_accepting_digits_when_the_limit_of_ten_is_reached', async () => {
    // Arrange
    render(<Harness />);
    // Act
    await userEvent.type(screen.getByLabelText('Valor'), '123456789012');
    // Assert
    expect(screen.getByTestId('cents')).toHaveTextContent('1234567890');
  });

  it('should_ask_for_the_numeric_keyboard_when_rendered', () => {
    // Arrange
    // Act
    render(<Harness />);
    // Assert
    expect(screen.getByLabelText('Valor')).toHaveAttribute('inputmode', 'numeric');
  });
});
