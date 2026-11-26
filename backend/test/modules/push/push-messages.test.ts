import { describe, expect, it } from 'vitest';

import { ALERT_TYPES } from '../../../src/modules/alerts/alert-situations.js';
import {
  newAlertsPush,
  PUSH_TITLE,
  REVIEW_INBOX_PUSH,
} from '../../../src/modules/push/push-messages.js';

describe('newAlertsPush', () => {
  it.each(ALERT_TYPES)('should_have_a_specific_text_when_the_alert_type_is_%s', (type) => {
    // Arrange
    const types = [type];
    // Act
    const payload = newAlertsPush(types);
    // Assert
    expect(payload.body).not.toBe('Alerta novo no Valora');
  });

  it.each(ALERT_TYPES)('should_have_no_value_or_placeholder_when_the_alert_type_is_%s', (type) => {
    // Arrange
    const types = [type];
    // Act
    const { body } = newAlertsPush(types);
    // Assert
    expect(body).not.toMatch(/R\$|\{|\}|\$|\d{2,}[,.]\d/);
  });

  it('should_use_the_text_of_the_type_when_there_is_one_new_alert', () => {
    // Arrange
    const types = ['budget_exceeded'];
    // Act
    const payload = newAlertsPush(types);
    // Assert
    expect(payload.body).toBe('Um orçamento passou do limite');
  });

  it('should_use_a_generic_text_when_the_alert_type_is_unknown', () => {
    // Arrange
    const types = ['tipo_que_nao_existe'];
    // Act
    const payload = newAlertsPush(types);
    // Assert
    expect(payload.body).toBe('Alerta novo no Valora');
  });

  it('should_not_read_inherited_properties_when_the_type_is_a_prototype_name', () => {
    // Arrange
    const types = ['constructor'];
    // Act
    const payload = newAlertsPush(types);
    // Assert
    expect(payload.body).toBe('Alerta novo no Valora');
  });

  it('should_count_the_alerts_when_there_are_three_new_ones', () => {
    // Arrange
    const types = ['budget_warning', 'connection_error', 'duplicate_charge'];
    // Act
    const payload = newAlertsPush(types);
    // Assert
    expect(payload.body).toBe('3 alertas novos no Valora');
  });

  it('should_open_the_bell_when_the_notification_is_tapped', () => {
    // Arrange
    const types = ['budget_warning'];
    // Act
    const payload = newAlertsPush(types);
    // Assert
    expect(payload.url).toBe('/?alertas=1');
  });

  it('should_use_valora_as_title_when_building_any_push', () => {
    // Arrange
    const types = ['budget_warning', 'connection_error'];
    // Act
    const payload = newAlertsPush(types);
    // Assert
    expect(payload.title).toBe(PUSH_TITLE);
  });
});

describe('REVIEW_INBOX_PUSH', () => {
  it('should_have_a_fixed_text_and_open_the_review_inbox', () => {
    // Arrange / Act / Assert
    expect(REVIEW_INBOX_PUSH).toEqual({
      title: 'Valora',
      body: 'Há transações para revisar',
      url: '/transacoes/revisar',
    });
  });
});
