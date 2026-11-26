import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { runBootCheck } from '../../src/shared/boot-check.js';

const VALID_ENV = {
  DATABASE_URL: 'postgres://user:secret-pass@localhost:5432/valora',
  PLUGGY_CLIENT_ID: 'client-id-value',
  PLUGGY_CLIENT_SECRET: 'client-secret-value',
  PLUGGY_ITEM_IDS: 'item-a',
};

const LOADABLE_MODULE = 'export const loaded = true;\n';
const THROWING_MODULE = "throw new Error('boom');\n";

let distDirectory: string;

async function writeModule(relativePath: string, content: string): Promise<void> {
  const target = join(distDirectory, relativePath);
  await mkdir(join(target, '..'), { recursive: true });
  await writeFile(target, content, 'utf-8');
}

beforeEach(async () => {
  distDirectory = await mkdtemp(join(tmpdir(), 'valora-boot-check-'));
});

afterEach(async () => {
  await rm(distDirectory, { recursive: true, force: true });
});

describe('runBootCheck', () => {
  it('should_return_no_problems_when_everything_loads', async () => {
    // Arrange
    await writeModule('app.js', LOADABLE_MODULE);
    await writeModule('modules/push/sender.js', LOADABLE_MODULE);
    // Act
    const problems = await runBootCheck({ distDirectory, env: VALID_ENV });
    // Assert
    expect(problems).toEqual([]);
  });

  it('should_report_module_when_import_throws', async () => {
    // Arrange
    await writeModule('app.js', LOADABLE_MODULE);
    await writeModule('modules/push/sender.js', THROWING_MODULE);
    // Act
    const problems = await runBootCheck({ distDirectory, env: VALID_ENV });
    // Assert
    expect(problems).toEqual([{ kind: 'module', file: 'modules/push/sender.js', reason: 'boom' }]);
  });

  it('should_report_every_module_that_fails_when_several_throw', async () => {
    // Arrange
    await writeModule('a.js', THROWING_MODULE);
    await writeModule('b.js', THROWING_MODULE);
    // Act
    const problems = await runBootCheck({ distDirectory, env: VALID_ENV });
    // Assert
    expect(problems.map((problem) => problem.kind === 'module' && problem.file)).toEqual([
      'a.js',
      'b.js',
    ]);
  });

  it('should_report_config_variables_when_env_is_invalid', async () => {
    // Arrange
    await writeModule('app.js', LOADABLE_MODULE);
    const { PLUGGY_CLIENT_ID: _omitted, ...envWithoutClientId } = VALID_ENV;
    // Act
    const problems = await runBootCheck({ distDirectory, env: envWithoutClientId });
    // Assert
    expect(problems).toEqual([
      expect.objectContaining({
        kind: 'config',
        message: expect.stringContaining('PLUGGY_CLIENT_ID'),
      }),
    ]);
  });

  it('should_not_include_variable_values_when_config_is_invalid', async () => {
    // Arrange
    await writeModule('app.js', LOADABLE_MODULE);
    const { PLUGGY_CLIENT_ID: _omitted, ...envWithoutClientId } = VALID_ENV;
    // Act
    const problems = await runBootCheck({ distDirectory, env: envWithoutClientId });
    // Assert
    expect(JSON.stringify(problems)).not.toContain('secret-pass');
  });

  it('should_skip_server_entry_when_scanning', async () => {
    // Arrange
    await writeModule('server.js', THROWING_MODULE);
    await writeModule('boot-check.js', THROWING_MODULE);
    await writeModule('app.js', LOADABLE_MODULE);
    // Act
    const problems = await runBootCheck({ distDirectory, env: VALID_ENV });
    // Assert
    expect(problems).toEqual([]);
  });

  it('should_ignore_files_that_are_not_javascript_when_scanning', async () => {
    // Arrange
    await writeModule('app.js', LOADABLE_MODULE);
    await writeModule('app.js.map', 'not javascript {{{');
    // Act
    const problems = await runBootCheck({ distDirectory, env: VALID_ENV });
    // Assert
    expect(problems).toEqual([]);
  });
});
