import { NotFoundError } from '../../shared/errors.js';
import type {
  ConnectionRecord,
  ConnectionsRepository,
  ConnectionWithAccounts,
} from './connections.repository.js';

/** Reavalia os alertas de conexão depois de arquivar ou reativar um banco. Nunca lança. */
export interface ConnectionAlerts {
  refresh(): Promise<void>;
}

export interface ConnectionView extends ConnectionWithAccounts {
  /** O id do banco está no `PLUGGY_ITEM_IDS`. Falso = a sincronização nem olha para ele. */
  readonly isConfigured: boolean;
}

export class ConnectionsService {
  constructor(
    private readonly repository: ConnectionsRepository,
    private readonly configuredItemIds: readonly string[],
    private readonly alerts: ConnectionAlerts,
  ) {}

  // Sem paginação: o Meu Pluggy permite no máximo 5 conexões (decisão em docs/03-arquitetura.md).
  async list({ isArchived }: { isArchived: boolean }): Promise<ConnectionView[]> {
    const connections = await this.repository.findWithAccounts({ isArchived });
    return connections.map((connection) => ({
      ...connection,
      // Mudar o PLUGGY_ITEM_IDS exige reiniciar a API, então o valor sempre bate com o que o processo sincroniza.
      isConfigured: this.configuredItemIds.includes(connection.pluggyItemId),
    }));
  }

  /** Arquiva ou reativa o banco inteiro. Nada é apagado; repetir a operação não muda nada. */
  async setArchived(connectionId: string, isArchived: boolean): Promise<ConnectionRecord> {
    const connection = await this.repository.setArchived(connectionId, isArchived);
    if (!connection) throw new NotFoundError(`Conexão ${connectionId} não encontrada`);
    // O alerta do banco arquivado se resolve agora, não só na próxima sincronização.
    await this.alerts.refresh();
    return connection;
  }
}
