import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { SegmentedControl } from './segmented-control';

type OptionValue = 'first' | 'second' | 'third';

const OPTIONS: readonly { readonly value: OptionValue; readonly label: string }[] = [
  { value: 'first', label: 'Primeira' },
  { value: 'second', label: 'Segunda' },
  { value: 'third', label: 'Terceira' },
];

function Harness() {
  const [value, setValue] = useState<OptionValue>('first');
  return <SegmentedControl label="Escolha" options={OPTIONS} value={value} onChange={setValue} />;
}

describe('SegmentedControl', () => {
  it('should_have_a_single_tab_stop_on_the_selected_option', () => {
    // Arrange
    // Act
    render(<Harness />);
    // Assert
    expect(screen.getByRole('radio', { name: 'Primeira' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: 'Segunda' })).toHaveAttribute('tabindex', '-1');
  });

  it('should_select_and_focus_the_next_option_when_the_user_presses_arrow_right', async () => {
    // Arrange
    render(<Harness />);
    screen.getByRole('radio', { name: 'Primeira' }).focus();
    // Act
    await userEvent.keyboard('{ArrowRight}');
    // Assert
    expect(screen.getByRole('radio', { name: 'Segunda' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Segunda' })).toHaveFocus();
  });

  it('should_wrap_to_the_last_option_when_the_user_presses_arrow_left_on_the_first', async () => {
    // Arrange
    render(<Harness />);
    screen.getByRole('radio', { name: 'Primeira' }).focus();
    // Act
    await userEvent.keyboard('{ArrowLeft}');
    // Assert
    expect(screen.getByRole('radio', { name: 'Terceira' })).toBeChecked();
  });

  it('should_keep_the_group_name_for_screen_readers_when_the_label_is_hidden', () => {
    // Arrange
    // Act
    render(
      <SegmentedControl
        label="Período"
        isLabelVisible={false}
        options={OPTIONS}
        value="first"
        onChange={() => undefined}
      />,
    );
    // Assert
    expect(screen.getByRole('radiogroup', { name: 'Período' })).toBeInTheDocument();
  });
});
