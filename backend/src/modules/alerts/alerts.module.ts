import type { Database } from '../../db/database.js';
import { BudgetsRepository } from '../budgets/budgets.repository.js';
import { ConnectionsRepository } from '../connections/connections.repository.js';
import { AlertChargesRepository } from './alert-charges.repository.js';
import { AlertEvaluator } from './alert-evaluator.js';
import { AlertsRepository } from './alerts.repository.js';
import { AlertsService } from './alerts.service.js';
import { type AlertsLogger, BudgetAlertRefresher } from './budget-alert-refresher.js';
import { ConnectionAlertRefresher } from './connection-alert-refresher.js';

export interface AlertsModuleDependencies {
  readonly database: Database;
  readonly logger: AlertsLogger;
  readonly now: () => Date;
}

export interface AlertsModule {
  readonly alertsService: AlertsService;
  readonly evaluator: AlertEvaluator;
  readonly budgetAlertRefresher: BudgetAlertRefresher;
  readonly connectionAlertRefresher: ConnectionAlertRefresher;
}

export function createAlertsModule(deps: AlertsModuleDependencies): AlertsModule {
  const { db } = deps.database;
  const alerts = new AlertsRepository(db);
  const evaluator = new AlertEvaluator({
    alerts,
    budgets: new BudgetsRepository(db),
    connections: new ConnectionsRepository(db),
    charges: new AlertChargesRepository(db),
    now: deps.now,
  });
  return {
    alertsService: new AlertsService(alerts),
    evaluator,
    budgetAlertRefresher: new BudgetAlertRefresher(evaluator, deps.logger),
    connectionAlertRefresher: new ConnectionAlertRefresher(evaluator, deps.logger),
  };
}
