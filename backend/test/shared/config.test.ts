import { describe, expect, it } from 'vitest';

import { ConfigError, loadConfig } from '../../src/shared/config.js';

const VALID_ENV = { DATABASE_URL: 'postgres://user:secret-pass@localhost:5432/valora' };

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
  it('should_apply_defaults_when_only_database_url_is_set', () => {
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
    const env = {};
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
    const env = { DATABASE_URL: 'postgres://user:secret-pass@localhost/valora', PORT: 'abc' };
    // Act
    const error = loadAndCatch(env);
    // Assert
    expect(error.message).not.toMatch(/secret-pass|abc|postgres/);
  });
});
