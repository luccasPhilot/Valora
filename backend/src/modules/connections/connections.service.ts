import type { ConnectionRecord, ConnectionsRepository } from './connections.repository.js';

export class ConnectionsService {
  constructor(private readonly repository: ConnectionsRepository) {}

  // Sem paginação: o Meu Pluggy permite no máximo 5 conexões (decisão em docs/03-arquitetura.md).
  list(): Promise<ConnectionRecord[]> {
    return this.repository.findAll();
  }
}
