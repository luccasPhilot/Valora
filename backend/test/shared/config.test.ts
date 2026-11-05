import { describe, expect, it } from 'vitest';

import { ConfigError, loadConfig } from '../../src/shared/config.js';

const VALID_ENV = {
  DATABASE_URL: 'postgres://user:secret-pass@localhost:5432/valora',
  PLUGGY_CLIENT_ID: 'client-id-value',
  PLUGGY_CLIENT_SECRET: 'client-secret-value',
  PLUGGY_ITEM_IDS: 'item-a,item-b',
};

function loadAndCatch(env: NodeJS.ProcessEnv): ConfigError {
  try {
    loadConfig(env);
  } catch (error) {
    if (error instanceof ConfigError) return error;
    throw error;
  }
  throw new Error('loadConfig deveria ter falhado');
}

describe('loadConfig', () => {
  it('should_apply_defaults_when_only_required_variables_are_set', () => {
    // Arrange
    const env = { ...VALID_ENV };
    // Act
    const config = loadConfig(env);
    // Assert
    expect(config).toEqual({
      databaseUrl: VALID_ENV.DATABASE_URL,
      host: '127.0.0.1',
      port: 3000,
      logLevel: 'info',
      pluggyClientId: 'client-id-value',
      pluggyClientSecret: 'client-secret-value',
      pluggyItemIds: ['item-a', 'item-b'],
      syncCron: '0 7 * * *',
    });
  });

  it('should_read_port_as_number_when_port_is_a_numeric_string', () => {
    // Arrange
    const env = { ...VALID_ENV, PORT: '4100' };
    // Act
    const config = loadConfig(env);
    // Assert
    expect(config.port).toBe(4100);
  });

  it('should_name_database_url_when_it_is_missing', () => {
    // Arrange
    const { DATABASE_URL: _databaseUrl, ...env } = VALID_ENV;
    // Act
    const error = loadAndCatch(env);
    // Assert
    expect(error.message).toContain('DATABASE_URL');
  });

  it('should_name_port_when_port_is_not_a_number', () => {
    // Arrange
    const env = { ...VALID_ENV, PORT: 'abc' };
    // Act
    const error = loadAndCatch(env);
    // Assert
    expect(error.message).toContain('PORT');
  });

  it('should_name_port_when_port_is_out_of_range', () => {
    // Arrange
    const env = { ...VALID_ENV, PORT: '70000' };
    // Act
    const error = loadAndCatch(env);
    // Assert
    expect(error.message).toContain('PORT');
  });

  it('should_name_log_level_when_it_is_not_a_known_level', () => {
    // Arrange
    const env = { ...VALID_ENV, LOG_LEVEL: 'verbose' };
    // Act
    const error = loadAndCatch(env);
    // Assert
    expect(error.message).toContain('LOG_LEVEL');
  });

  it('should_not_print_any_value_when_the_config_is_invalid', () => {
    // Arrange
    const env = { ...VALID_ENV, PORT: 'abc' };
    // Act
    const error = loadAndCatch(env);
    // Assert
    expect(error.message).not.toMatch(/secret-pass|abc|postgres|client-id-value|item-a/);
  });

  it('should_name_pluggy_client_secret_when_it_is_missing', () => {
    // Arrange
    const { PLUGGY_CLIENT_SECRET: _secret, ...env } = VALID_ENV;
    // Act
    const error = loadAndCatch(env);
    // Assert
    expect(error.message).toContain('PLUGGY_CLIENT_SECRET');
  });

  it('should_name_pluggy_client_id_when_it_is_blank', () => {
    // Arrange
    const env = { ...VALID_ENV, PLUGGY_CLIENT_ID: '   ' };
    // Act
    const error = loadAndCatch(env);
    // Assert
    expect(error.message).toContain('PLUGGY_CLIENT_ID');
  });

  it('should_not_print_the_secret_when_another_variable_is_invalid', () => {
    // Arrange
    const env = { ...VALID_ENV, PLUGGY_ITEM_IDS: '' };
    // Act
    const error = loadAndCatch(env);
    // Assert
    expect(error.message).not.toContain('client-secret-value');
  });

  it('should_trim_and_drop_empty_ids_when_item_ids_have_extra_commas_and_spaces', () => {
    // Arrange
    const env = { ...VALID_ENV, PLUGGY_ITEM_IDS: ' item-a , ,item-b,' };
    // Act
    const config = loadConfig(env);
    // Assert
    expect(config.pluggyItemIds).toEqual(['item-a', 'item-b']);
  });

  it('should_name_item_ids_when_the_list_is_empty', () => {
    // Arrange
    const env = { ...VALID_ENV, PLUGGY_ITEM_IDS: ' , ' };
    // Act
    const error = loadAndCatch(env);
    // Assert
    expect(error.message).toContain('PLUGGY_ITEM_IDS');
  });

  it('should_name_item_ids_when_an_id_is_repeated', () => {
    // Arrange
    const env = { ...VALID_ENV, PLUGGY_ITEM_IDS: 'item-a,item-a' };
    // Act
    const error = loadAndCatch(env);
    // Assert
    expect(error.message).toContain('PLUGGY_ITEM_IDS');
  });

  it('should_keep_the_given_schedule_when_sync_cron_is_valid', () => {
    // Arrange
    const env = { ...VALID_ENV, SYNC_CRON: '30 6 * * *' };
    // Act
    const config = loadConfig(env);
    // Assert
    expect(config.syncCron).toBe('30 6 * * *');
  });

  it('should_name_sync_cron_when_the_pattern_is_invalid', () => {
    // Arrange
    const env = { ...VALID_ENV, SYNC_CRON: 'todo dia às 7' };
    // Act
    const error = loadAndCatch(env);
    // Assert
    expect(error.message).toContain('SYNC_CRON');
  });
});
