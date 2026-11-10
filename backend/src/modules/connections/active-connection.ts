import { isNull, or } from 'drizzle-orm';

import { accounts, connections } from '../../db/schema.js';

/**
 * Única definição de "banco ativo": não foi arquivado. Contas, faturas, alertas, conexões e a
 * sincronização usam estes critérios, para um banco arquivado sair de todos os lugares de uma vez.
 */
export const connectionIsActive = isNull(connections.archivedAt);

/**
 * Para consultas de contas com `leftJoin(connections)`: a conta é de um banco ativo. A conta
 * "Dinheiro" não tem conexão e é sempre ativa.
 */
export const accountIsOfActiveConnection = or(
  isNull(accounts.connectionId),
  isNull(connections.archivedAt),
);
