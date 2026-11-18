import { sql } from 'drizzle-orm';

import { connections, investments } from '../../db/schema.js';

/**
 * Nome da instituição de um investimento: o do banco conectado (Open Finance) ou, na posição
 * manual, o que o usuário informou. Para consultas com `leftJoin(connections)`.
 */
export const investmentInstitutionName = sql<string>`coalesce(${connections.institutionName}, ${investments.institutionName})`;
