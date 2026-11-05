import { Cron } from 'croner';
import { z } from 'zod';

import { APP_TIMEZONE } from './timezone.js';

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;
const MIN_PORT = 1;
const MAX_PORT = 65535;
const DEFAULT_SYNC_CRON = '0 7 * * *';

function isValidCronPattern(pattern: string): boolean {
  try {
    // `paused` só valida o padrão; nada é agendado.
    new Cron(pattern, { paused: true, timezone: APP_TIMEZONE }).stop();
    return true;
  } catch {
    return false;
  }
}

// "id1, id2,id3" → ['id1', 'id2', 'id3']. Vazios somem; repetidos são recusados.
const itemIdsSchema = z
  .string()
  .transform((list) =>
    list
      .split(',')
      .map((itemId) => itemId.trim())
      .filter((itemId) => itemId.length > 0),
  )
  .pipe(
    z
      .array(z.string())
      .min(1)
      .refine((itemIds) => new Set(itemIds).size === itemIds.length),
  );

const configSchema = z.object({
  DATABASE_URL: z.url(),
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(MIN_PORT).max(MAX_PORT).default(3000),
  LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
  PLUGGY_CLIENT_ID: z.string().trim().min(1),
  PLUGGY_CLIENT_SECRET: z.string().trim().min(1),
  PLUGGY_ITEM_IDS: itemIdsSchema,
  SYNC_CRON: z.string().trim().default(DEFAULT_SYNC_CRON).refine(isValidCronPattern),
});

export interface Config {
  readonly databaseUrl: string;
  readonly host: string;
  readonly port: number;
  readonly logLevel: (typeof LOG_LEVELS)[number];
  readonly pluggyClientId: string;
  readonly pluggyClientSecret: string;
  readonly pluggyItemIds: readonly string[];
  readonly syncCron: string;
}

export class ConfigError extends Error {
  constructor(invalidVariables: readonly string[]) {
    super(`Configuração inválida. Confira as variáveis: ${invalidVariables.join(', ')}.`);
    this.name = 'ConfigError';
  }
}

// A mensagem cita só o nome das variáveis: o valor pode ser uma credencial.
export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const parsed = configSchema.safeParse(env);
  if (!parsed.success) {
    const invalidVariables = new Set(parsed.error.issues.map((issue) => String(issue.path[0])));
    throw new ConfigError([...invalidVariables]);
  }
  return {
    databaseUrl: parsed.data.DATABASE_URL,
    host: parsed.data.HOST,
    port: parsed.data.PORT,
    logLevel: parsed.data.LOG_LEVEL,
    pluggyClientId: parsed.data.PLUGGY_CLIENT_ID,
    pluggyClientSecret: parsed.data.PLUGGY_CLIENT_SECRET,
    pluggyItemIds: parsed.data.PLUGGY_ITEM_IDS,
    syncCron: parsed.data.SYNC_CRON,
  };
}
