import { describe, expect, it } from 'vitest';

import { investmentsCollectionOf, mapItemStatus } from '../../../src/modules/sync/item-status.js';

const NOW = new Date('2026-11-04T12:00:00Z');
const HEALTHY_ITEM = { status: 'UPDATED', errorCode: null, consentExpiresAt: null };

describe('mapItemStatus', () => {
  it('should_return_ok_when_item_is_updated', () => {
    // Arrange
    const item = HEALTHY_ITEM;
    // Act
    const state = mapItemStatus(item, NOW);
    // Assert
    expect(state).toEqual({ status: 'ok', detail: null, canReadData: true });
  });

  it('should_return_syncing_and_still_read_data_when_item_is_updating', () => {
    // Arrange
    const item = { ...HEALTHY_ITEM, status: 'UPDATING' };
    // Act
    const state = mapItemStatus(item, NOW);
    // Assert
    expect(state).toMatchObject({ status: 'syncing', canReadData: true });
  });

  it('should_return_error_when_item_has_login_error', () => {
    // Arrange
    const item = { ...HEALTHY_ITEM, status: 'LOGIN_ERROR', errorCode: 'INVALID_CREDENTIALS' };
    // Act
    const state = mapItemStatus(item, NOW);
    // Assert
    expect(state).toEqual({
      status: 'error',
      detail: 'O acesso a este banco precisa ser refeito no Meu Pluggy.',
      canReadData: false,
    });
  });

  it('should_return_error_when_item_waits_for_user_action', () => {
    // Arrange
    const item = { ...HEALTHY_ITEM, status: 'WAITING_USER_ACTION' };
    // Act
    const state = mapItemStatus(item, NOW);
    // Assert
    expect(state).toMatchObject({ status: 'error', canReadData: false });
  });

  it('should_return_error_when_last_update_is_outdated', () => {
    // Arrange
    const item = { ...HEALTHY_ITEM, status: 'OUTDATED' };
    // Act
    const state = mapItemStatus(item, NOW);
    // Assert
    expect(state).toMatchObject({ status: 'error', canReadData: false });
  });

  it('should_return_consent_expired_when_consent_date_has_passed', () => {
    // Arrange
    const item = { ...HEALTHY_ITEM, consentExpiresAt: new Date('2026-11-03T12:00:00Z') };
    // Act
    const state = mapItemStatus(item, NOW);
    // Assert
    expect(state).toEqual({
      status: 'consent_expired',
      detail: 'O consentimento deste banco venceu ou foi revogado. Renove a conexão no Meu Pluggy.',
      canReadData: false,
    });
  });

  it('should_return_ok_when_consent_expires_in_the_future', () => {
    // Arrange
    const item = { ...HEALTHY_ITEM, consentExpiresAt: new Date('2027-11-03T12:00:00Z') };
    // Act
    const state = mapItemStatus(item, NOW);
    // Assert
    expect(state.status).toBe('ok');
  });

  it('should_return_consent_expired_when_authorization_was_not_granted', () => {
    // Arrange
    const item = {
      ...HEALTHY_ITEM,
      status: 'LOGIN_ERROR',
      errorCode: 'USER_AUTHORIZATION_NOT_GRANTED',
    };
    // Act
    const state = mapItemStatus(item, NOW);
    // Assert
    expect(state.status).toBe('consent_expired');
  });

  it('should_return_error_when_status_is_unknown', () => {
    // Arrange
    const item = { ...HEALTHY_ITEM, status: 'SOMETHING_NEW' };
    // Act
    const state = mapItemStatus(item, NOW);
    // Assert
    expect(state).toMatchObject({ status: 'error', canReadData: false });
  });
});

describe('investmentsCollectionOf', () => {
  const COMPLETE_ITEM = { status: 'UPDATED', executionStatus: 'SUCCESS', statusDetail: null };

  it('should_be_complete_when_item_is_updated_with_success', () => {
    // Arrange
    const item = COMPLETE_ITEM;
    // Act
    const collection = investmentsCollectionOf(item);
    // Assert
    expect(collection).toBe('complete');
  });

  it('should_be_complete_when_partial_success_collected_investments', () => {
    // Arrange
    const item = {
      ...COMPLETE_ITEM,
      executionStatus: 'PARTIAL_SUCCESS',
      statusDetail: { investments: { isUpdated: true } },
    };
    // Act
    const collection = investmentsCollectionOf(item);
    // Assert
    expect(collection).toBe('complete');
  });

  it('should_be_incomplete_when_partial_success_did_not_collect_investments', () => {
    // Arrange
    const item = {
      ...COMPLETE_ITEM,
      executionStatus: 'PARTIAL_SUCCESS',
      statusDetail: { investments: { isUpdated: false } },
    };
    // Act
    const collection = investmentsCollectionOf(item);
    // Assert
    expect(collection).toBe('incomplete');
  });

  it('should_be_incomplete_when_partial_success_has_no_status_detail', () => {
    // Arrange
    const item = { ...COMPLETE_ITEM, executionStatus: 'PARTIAL_SUCCESS', statusDetail: null };
    // Act
    const collection = investmentsCollectionOf(item);
    // Assert
    expect(collection).toBe('incomplete');
  });

  it('should_be_incomplete_when_partial_success_has_no_investments_detail', () => {
    // Arrange
    const item = {
      ...COMPLETE_ITEM,
      executionStatus: 'PARTIAL_SUCCESS',
      statusDetail: { investments: null },
    };
    // Act
    const collection = investmentsCollectionOf(item);
    // Assert
    expect(collection).toBe('incomplete');
  });

  it('should_be_incomplete_when_item_is_updating_investments', () => {
    // Arrange
    const item = {
      ...COMPLETE_ITEM,
      status: 'UPDATING',
      executionStatus: 'INVESTMENTS_IN_PROGRESS',
    };
    // Act
    const collection = investmentsCollectionOf(item);
    // Assert
    expect(collection).toBe('incomplete');
  });

  it('should_be_incomplete_when_execution_status_is_missing', () => {
    // Arrange
    const item = { ...COMPLETE_ITEM, executionStatus: null };
    // Act
    const collection = investmentsCollectionOf(item);
    // Assert
    expect(collection).toBe('incomplete');
  });

  it('should_be_incomplete_when_execution_status_is_unknown', () => {
    // Arrange
    const item = { ...COMPLETE_ITEM, executionStatus: 'SOMETHING_NEW' };
    // Act
    const collection = investmentsCollectionOf(item);
    // Assert
    expect(collection).toBe('incomplete');
  });
});
