import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Select } from './select';

const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';
const MANY_OPTIONS_COUNT = 10;

function stubPointer(isFine: boolean): void {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: isFine && query === FINE_POINTER_QUERY,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  });
}

interface FruitSelectProps {
  readonly options: readonly string[];
  readonly onChange: (value: string) => void;
}

function FruitSelect({ options, onChange }: FruitSelectProps) {
  const [value, setValue] = useState(options[0] ?? '');
  return (
    <Select
      aria-label="Fruta"
      value={value}
      onChange={(event) => {
        setValue(event.target.value);
        onChange(event.target.value);
      }}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </Select>
  );
}

const FEW_OPTIONS = ['Maçã', 'Pera', 'Uva'] as const;
const MANY_OPTIONS = Array.from({ length: MANY_OPTIONS_COUNT }, (_, index) => `Fruta ${index + 1}`);

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe('Select with a mouse', () => {
  beforeEach(() => stubPointer(true));

  it('should_open_the_themed_list_when_the_field_is_clicked', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<FruitSelect options={FEW_OPTIONS} onChange={vi.fn()} />);
    // Act
    await user.click(screen.getByRole('combobox', { name: 'Fruta' }));
    // Assert
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
  });

  it('should_call_onChange_with_the_picked_value_when_an_option_is_clicked', async () => {
    // Arrange
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FruitSelect options={FEW_OPTIONS} onChange={onChange} />);
    await user.click(screen.getByRole('combobox', { name: 'Fruta' }));
    // Act
    await user.click(
      within(await screen.findByRole('listbox')).getByRole('option', { name: 'Pera' }),
    );
    // Assert
    expect(onChange).toHaveBeenCalledWith('Pera');
  });

  it('should_pick_the_active_option_when_arrow_down_and_enter_are_pressed', async () => {
    // Arrange
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FruitSelect options={FEW_OPTIONS} onChange={onChange} />);
    await user.click(screen.getByRole('combobox', { name: 'Fruta' }));
    await screen.findByRole('listbox');
    // Act
    await user.keyboard('{ArrowDown}{Enter}');
    // Assert
    expect(onChange).toHaveBeenCalledWith('Pera');
  });

  it('should_close_the_list_when_escape_is_pressed', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<FruitSelect options={FEW_OPTIONS} onChange={vi.fn()} />);
    await user.click(screen.getByRole('combobox', { name: 'Fruta' }));
    await screen.findByRole('listbox');
    // Act
    await user.keyboard('{Escape}');
    // Assert
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('should_not_show_search_when_there_are_few_options', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<FruitSelect options={FEW_OPTIONS} onChange={vi.fn()} />);
    // Act
    await user.click(screen.getByRole('combobox', { name: 'Fruta' }));
    await screen.findByRole('listbox');
    // Assert
    expect(screen.queryByPlaceholderText('Buscar')).not.toBeInTheDocument();
  });

  it('should_filter_options_ignoring_accents_when_searching', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<FruitSelect options={[...MANY_OPTIONS, 'Maçã']} onChange={vi.fn()} />);
    await user.click(screen.getByRole('combobox', { name: 'Fruta' }));
    // Act
    await user.type(await screen.findByPlaceholderText('Buscar'), 'maca');
    // Assert
    const listedOptions = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(listedOptions.map((option) => option.textContent)).toEqual(['Maçã']);
  });

  it('should_explain_when_the_search_finds_nothing', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<FruitSelect options={MANY_OPTIONS} onChange={vi.fn()} />);
    await user.click(screen.getByRole('combobox', { name: 'Fruta' }));
    // Act
    await user.type(await screen.findByPlaceholderText('Buscar'), 'zzz');
    // Assert
    expect(screen.getByText('Nada encontrado para “zzz”.')).toBeInTheDocument();
  });
});

describe('Select with touch', () => {
  beforeEach(() => stubPointer(false));

  it('should_keep_the_native_picker_when_the_pointer_is_coarse', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<FruitSelect options={FEW_OPTIONS} onChange={vi.fn()} />);
    // Act
    await user.click(screen.getByRole('combobox', { name: 'Fruta' }));
    // Assert
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
