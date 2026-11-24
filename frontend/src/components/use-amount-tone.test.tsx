import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { HideValuesProvider } from './hide-values-provider';
import { useAmountTone } from './use-amount-tone';

const HIDE_VALUES_STORAGE_KEY = 'valora.hide-values';

function wrapper({ children }: { children: ReactNode }) {
  return <HideValuesProvider>{children}</HideValuesProvider>;
}

function hideValues() {
  localStorage.setItem(HIDE_VALUES_STORAGE_KEY, 'true');
}

describe('useAmountTone', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should_return_positive_when_flow_is_income', () => {
    // Arrange / Act
    const { result } = renderHook(() => useAmountTone(850000, 'flow'), { wrapper });
    // Assert
    expect(result.current).toBe('text-positive');
  });

  it('should_return_normal_color_when_flow_is_expense', () => {
    // Arrange / Act
    const { result } = renderHook(() => useAmountTone(-8990, 'flow'), { wrapper });
    // Assert
    expect(result.current).toBe('');
  });

  it('should_return_destructive_when_balance_is_negative', () => {
    // Arrange / Act
    const { result } = renderHook(() => useAmountTone(-1, 'balance'), { wrapper });
    // Assert
    expect(result.current).toBe('text-destructive');
  });

  it('should_return_normal_color_when_balance_is_positive', () => {
    // Arrange / Act
    const { result } = renderHook(() => useAmountTone(120000, 'balance'), { wrapper });
    // Assert
    expect(result.current).toBe('');
  });

  it('should_return_positive_when_result_is_a_surplus', () => {
    // Arrange / Act
    const { result } = renderHook(() => useAmountTone(500, 'result'), { wrapper });
    // Assert
    expect(result.current).toBe('text-positive');
  });

  it('should_return_destructive_when_result_is_a_deficit', () => {
    // Arrange / Act
    const { result } = renderHook(() => useAmountTone(-500, 'result'), { wrapper });
    // Assert
    expect(result.current).toBe('text-destructive');
  });

  it('should_return_normal_color_when_amount_is_zero', () => {
    // Arrange / Act
    const { result } = renderHook(() => useAmountTone(0, 'result'), { wrapper });
    // Assert
    expect(result.current).toBe('');
  });

  it('should_return_normal_color_when_values_are_hidden_and_flow_is_income', () => {
    // Arrange
    hideValues();
    // Act
    const { result } = renderHook(() => useAmountTone(850000, 'flow'), { wrapper });
    // Assert
    expect(result.current).toBe('');
  });

  it('should_return_normal_color_when_values_are_hidden_and_balance_is_negative', () => {
    // Arrange
    hideValues();
    // Act
    const { result } = renderHook(() => useAmountTone(-1, 'balance'), { wrapper });
    // Assert
    expect(result.current).toBe('');
  });

  it('should_return_normal_color_when_values_are_hidden_and_result_is_a_deficit', () => {
    // Arrange
    hideValues();
    // Act
    const { result } = renderHook(() => useAmountTone(-500, 'result'), { wrapper });
    // Assert
    expect(result.current).toBe('');
  });
});
