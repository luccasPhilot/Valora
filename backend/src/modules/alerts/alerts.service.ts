import { NotFoundError } from '../../shared/errors.js';
import type { AlertPage, AlertsRepository, PageRequest } from './alerts.repository.js';

export interface AlertList extends AlertPage {
  readonly unreadCount: number;
}

export class AlertsService {
  constructor(private readonly alerts: AlertsRepository) {}

  async list(page: PageRequest): Promise<AlertList> {
    const [alertPage, unreadCount] = await Promise.all([
      this.alerts.findActivePage(page),
      this.alerts.countUnread(),
    ]);
    return { ...alertPage, unreadCount };
  }

  async markRead(alertId: string): Promise<void> {
    if (!(await this.alerts.markRead(alertId))) throw alertNotFound(alertId);
  }

  markAllRead(): Promise<void> {
    return this.alerts.markAllRead();
  }

  async dismiss(alertId: string): Promise<void> {
    if (!(await this.alerts.dismiss(alertId))) throw alertNotFound(alertId);
  }
}

function alertNotFound(alertId: string): NotFoundError {
  return new NotFoundError(`Alerta ${alertId} não existe`);
}
