import { z } from 'zod';

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;
const MIN_PORT = 1;
const MAX_PORT = 65535;

const configSchema = z.object({
  DATABASE_URL: z.url(),
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(MIN_PORT).max(MAX_PORT).default(3000),
  LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
});

export interface Config {
  readonly databaseUrl: string;
  readonly host: string;
  readonly port: number;
  readonly logLevel: (typeof LOG_LEVELS)[number];
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
  };
}
