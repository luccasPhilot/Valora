import { CopyX, Repeat } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import {
  actionFor,
  appearanceOf,
  describeAlertAge,
  describeBellLabel,
  formatUnreadBadge,
} from './alert-presentation';

const NOW = new Date('2026-11-09T15:00:00Z');

describe('formatUnreadBadge', () => {
  it('should_return_null_when_there_are_no_unread_alerts', () => {
    // Arrange
    const unreadCount = 0;
    // Act
    const badge = formatUnreadBadge(unreadCount);
    // Assert
    expect(badge).toBeNull();
  });

  it('should_return_the_number_when_there_are_nine_unread_alerts', () => {
    // Arrange
    const unreadCount = 9;
    // Act
    const badge = formatUnreadBadge(unreadCount);
    // Assert
    expect(badge).toBe('9');
  });

  it('should_return_9_plus_when_there_are_ten_unread_alerts', () => {
    // Arrange
    const unreadCount = 10;
    // Act
    const badge = formatUnreadBadge(unreadCount);
    // Assert
    expect(badge).toBe('9+');
  });
});

describe('describeBellLabel', () => {
  it('should_say_only_alertas_when_there_are_no_unread_alerts', () => {
    // Arrange
    const unreadCount = 0;
    // Act
    const label = describeBellLabel(unreadCount);
    // Assert
    expect(label).toBe('Alertas');
  });

  it('should_use_the_singular_when_there_is_one_unread_alert', () => {
    // Arrange
    const unreadCount = 1;
    // Act
    const label = describeBellLabel(unreadCount);
    // Assert
    expect(label).toBe('Alertas, 1 não lido');
  });

  it('should_use_the_real_count_when_there_are_more_than_nine_unread_alerts', () => {
    // Arrange
    const unreadCount = 12;
    // Act
    const label = describeBellLabel(unreadCount);
    // Assert
    expect(label).toBe('Alertas, 12 não lidos');
  });
});

describe('describeAlertAge', () => {
  it('should_say_agora_when_the_alert_is_less_than_a_minute_old', () => {
    // Arrange
    const createdAt = '2026-11-09T14:59:40Z';
    // Act
    const age = describeAlertAge(createdAt, NOW);
    // Assert
    expect(age).toBe('agora');
  });

  it('should_say_minutes_when_the_alert_is_less_than_an_hour_old', () => {
    // Arrange
    const createdAt = '2026-11-09T14:55:00Z';
    // Act
    const age = describeAlertAge(createdAt, NOW);
    // Assert
    expect(age).toBe('há 5 min');
  });

  it('should_say_hours_when_the_alert_is_a_few_hours_old', () => {
    // Arrange
    const createdAt = '2026-11-09T12:00:00Z';
    // Act
    const age = describeAlertAge(createdAt, NOW);
    // Assert
    expect(age).toBe('há 3 h');
  });

  it('should_say_ontem_with_the_time_when_the_alert_is_from_yesterday', () => {
    // Arrange
    const createdAt = '2026-11-08T10:01:00Z';
    // Act
    const age = describeAlertAge(createdAt, NOW);
    // Assert
    expect(age).toBe('ontem, 07:01');
  });
});

describe('appearanceOf', () => {
  it('should_return_a_specific_label_when_the_type_is_known', () => {
    // Arrange
    const type = 'budget_exceeded';
    // Act
    const { label, tone } = appearanceOf(type);
    // Assert
    expect({ label, tone }).toEqual({ label: 'Orçamento estourado', tone: 'critical' });
  });

  it('should_return_the_generic_appearance_when_the_type_is_unknown', () => {
    // Arrange
    const type = 'some_future_type';
    // Act
    const { label, tone } = appearanceOf(type);
    // Assert
    expect({ label, tone }).toEqual({ label: 'Alerta', tone: 'neutral' });
  });

  it('should_return_the_duplicate_charge_label_when_the_type_is_duplicate_charge', () => {
    // Arrange
    const type = 'duplicate_charge';
    // Act
    const { icon, label, tone } = appearanceOf(type);
    // Assert
    expect({ icon, label, tone }).toEqual({
      icon: CopyX,
      label: 'Cobrança duplicada',
      tone: 'warning',
    });
  });

  it('should_return_the_repeat_icon_when_the_type_is_subscription_detected', () => {
    // Arrange
    const type = 'subscription_detected';
    // Act
    const { icon, label, tone } = appearanceOf(type);
    // Assert
    expect({ icon, label, tone }).toEqual({ icon: Repeat, label: 'Assinatura', tone: 'neutral' });
  });
});

describe('actionFor', () => {
  it('should_point_to_the_budget_month_when_the_target_is_a_budget', () => {
    // Arrange
    const target = {
      screen: 'budgets',
      month: '2026-11',
      categoryId: '11111111-1111-4111-8111-111111111111',
    } as const;
    // Act
    const action = actionFor(target);
    // Assert
    expect(action).toEqual({ label: 'Ver orçamento', to: '/orcamentos?month=2026-11' });
  });

  it('should_point_to_accounts_when_the_target_is_the_accounts_screen', () => {
    // Arrange
    const target = { screen: 'accounts' } as const;
    // Act
    const action = actionFor(target);
    // Assert
    expect(action).toEqual({ label: 'Ver contas', to: '/contas' });
  });

  it('should_open_transactions_on_the_day_searching_by_description_when_the_target_is_transactions', () => {
    // Arrange
    const target = {
      screen: 'transactions',
      from: '2026-11-09',
      to: '2026-11-09',
      search: 'LOJA EXEMPLO',
    } as const;
    // Act
    const action = actionFor(target);
    // Assert
    expect(action).toEqual({
      label: 'Ver transações',
      to: '/transacoes?period=custom&from=2026-11-09&to=2026-11-09&search=LOJA+EXEMPLO',
    });
  });

  it('should_return_null_when_the_alert_has_no_target', () => {
    // Arrange
    const target = null;
    // Act
    const action = actionFor(target);
    // Assert
    expect(action).toBeNull();
  });
});
