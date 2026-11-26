import { readdir } from 'node:fs/promises';
import { join, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import { ConfigError, loadConfig } from './config.js';

// A entrada que sobe a API e esta própria verificação não entram: importar `server.js` iniciaria tudo.
const SKIPPED_ENTRY_FILES: ReadonlySet<string> = new Set(['server.js', 'boot-check.js']);
const MODULE_EXTENSION = '.js';

export type BootProblem =
  | { readonly kind: 'module'; readonly file: string; readonly reason: string }
  // A mensagem do `ConfigError` cita só nomes de variáveis, nunca valores.
  | { readonly kind: 'config'; readonly message: string };

export interface BootCheckOptions {
  /** Pasta do build compilado (`dist/`). */
  readonly distDirectory: string;
  readonly env: NodeJS.ProcessEnv;
}

async function listModules(distDirectory: string): Promise<string[]> {
  const entries = await readdir(distDirectory, { recursive: true });
  return entries
    .map((entry) => entry.split(sep).join('/'))
    .filter((entry) => entry.endsWith(MODULE_EXTENSION) && !SKIPPED_ENTRY_FILES.has(entry))
    .sort();
}

async function findModuleProblem(distDirectory: string, file: string): Promise<BootProblem | null> {
  try {
    await import(pathToFileURL(join(distDirectory, file)).href);
    return null;
  } catch (error) {
    // Mensagens de resolução de módulo do Node não carregam dado do app.
    const reason = error instanceof Error ? error.message : 'erro desconhecido';
    return { kind: 'module', file, reason };
  }
}

function findConfigProblem(env: NodeJS.ProcessEnv): BootProblem | null {
  try {
    loadConfig(env);
    return null;
  } catch (error) {
    if (error instanceof ConfigError) return { kind: 'config', message: error.message };
    throw error;
  }
}

/**
 * Confere, sem subir a API, que o build compilado carrega no Node e que o ambiente é válido.
 * Não conecta no banco, não escuta porta e não chama o Pluggy.
 */
export async function runBootCheck(options: BootCheckOptions): Promise<BootProblem[]> {
  const files = await listModules(options.distDirectory);
  const problems: BootProblem[] = [];
  for (const file of files) {
    const problem = await findModuleProblem(options.distDirectory, file);
    if (problem) problems.push(problem);
  }
  const configProblem = findConfigProblem(options.env);
  if (configProblem) problems.push(configProblem);
  return problems;
}
