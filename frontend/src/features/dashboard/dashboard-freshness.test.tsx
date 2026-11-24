import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { AppProviders } from '@/app/providers';
import { createQueryClient } from '@/app/query-client';
import { getDashboard } from '@/lib/api/dashboard';
import { queryKeys } from '@/lib/query-keys';

import { Component as CategoriesPage } from '../categories/categories-page';
import { Component as GoalsPage } from '../goals/goals-page';
import { Component as PlanningPage } from '../planning/planning-page';
import { GROCERIES, stubApi, TRANSPORT } from '../transactions/test-support';
import { dashboard, TRIP_GOAL } from './test-support';

// Gravar em outra tela e voltar ao Início mostra o número novo na hora, sem esperar o cache de 1 min.
// Só a tela da gravação é desenhada (o Início, com os gráficos, é caro demais para três fluxos). O
// Início entra no cache antes da gravação e é lido de novo depois, pela mesma regra de cache que a
// tela usa ao abrir: sem a invalidação, a leitura devolveria o número velho.

const RULE = {
  id: '55555555-5555-4555-8555-555555555555',
  pattern: 'UBER',
  matchType: 'contains',
  categoryId: TRANSPORT.id,
  priority: 0,
  learnedFromTransactionId: null,
  createdAt: '2026-11-04T12:00:00.000Z',
};

const RECATEGORIZED_SPENDING = [
  {
    kind: 'category',
    categoryId: TRANSPORT.id,
    name: 'Transporte',
    icon: 'car',
    amountCents: 150000,
    percent: 75,
  },
  { kind: 'other', name: 'Outros', amountCents: 50000, percent: 25 },
];

function goal(targetCents: number) {
  return {
    id: TRIP_GOAL.id,
    name: 'Viagem',
    icon: 'plane',
    targetCents,
    savedCents: 400000,
    manualSavedCents: 400000,
    isLinked: false,
    links: [],
    targetDate: null,
    progressPercent: 40,
    status: 'no_pace',
    remainingCents: targetCents - 400000,
    monthlyRateCents: 0,
    requiredMonthlyCents: null,
    estimatedDate: null,
    isEstimateTooFar: false,
    recentContributions: [],
  };
}

function plannedEntry() {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    description: 'Feira',
    amountCents: -30000,
    categoryId: GROCERIES.id,
    categoryName: 'Mercado',
    categoryIcon: 'shopping-cart',
    dayOfMonth: 20,
    recurrence: 'monthly',
    startMonth: '2026-11',
    endMonth: null,
    isActive: true,
  };
}

const PROJECTION = {
  date: '2026-11-05',
  startBalanceCents: 480000,
  plannedIncomeCents: 0,
  plannedExpenseCents: 0,
  billsDueCents: 0,
  projectedBalanceCents: 480000,
  lowestBalanceCents: 480000,
  lowestBalanceDate: '2026-11-05',
  daily: [{ date: '2026-11-05', balanceCents: 480000 }],
  events: [],
  warnings: [],
};

const EMPTY_MONTH = {
  month: '2026-11',
  items: [],
  totals: {
    pending: { incomeCents: 0, expenseCents: 0 },
    realized: { incomeCents: 0, expenseCents: 0 },
    skipped: { incomeCents: 0, expenseCents: 0 },
  },
  pausedEntries: [],
};

/** Desenha só a tela da gravação, com o Início já no cache, como se tivesse sido visto antes. */
async function renderScreenWithHomeCached(screenElement: ReactElement, path: string) {
  const queryClient = createQueryClient({ retry: false });
  await queryClient.fetchQuery({ queryKey: queryKeys.dashboard, queryFn: getDashboard });
  render(
    <AppProviders queryClient={queryClient}>
      <MemoryRouter initialEntries={[path]}>{screenElement}</MemoryRouter>
    </AppProviders>,
  );
  // O que o Início mostraria ao abrir agora: o cache, se ainda vale, ou uma leitura nova.
  return () => queryClient.fetchQuery({ queryKey: queryKeys.dashboard, queryFn: getDashboard });
}

async function pasteInto(field: HTMLElement, text: string): Promise<void> {
  await userEvent.click(field);
  await userEvent.paste(text);
}

async function waitForPanelToClose(submitLabel: string): Promise<void> {
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: submitLabel })).not.toBeInTheDocument(),
  );
}

describe('Início depois de gravar em outra tela', () => {
  it('should_show_recategorized_spending_on_home_when_rule_is_saved', async () => {
    // Arrange
    let isRuleSaved = false;
    stubApi({
      'GET /api/v1/dashboard': () =>
        Response.json(
          isRuleSaved ? dashboard({ spendingByCategory: RECATEGORIZED_SPENDING }) : dashboard(),
        ),
      'GET /api/v1/category-rules': () => Response.json({ items: isRuleSaved ? [RULE] : [] }),
      'GET /api/v1/pluggy-category-mappings': () => Response.json({ items: [] }),
      'POST /api/v1/category-rules': () => {
        isRuleSaved = true;
        return Response.json(RULE, { status: 201 });
      },
    });
    const readHome = await renderScreenWithHomeCached(<CategoriesPage />, '/categorias-e-regras');
    await userEvent.click(await screen.findByRole('tab', { name: 'Regras' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Nova regra' }));
    await pasteInto(await screen.findByLabelText('Texto da descrição'), 'UBER');
    await userEvent.selectOptions(screen.getByLabelText('Categoria'), TRANSPORT.id);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitForPanelToClose('Salvar');
    // Act
    const home = await readHome();
    // Assert
    expect(home.spendingByCategory[0]?.name).toBe('Transporte');
  });

  it('should_show_new_goal_target_on_home_when_goal_is_edited', async () => {
    // Arrange
    let targetCents = TRIP_GOAL.targetCents;
    stubApi({
      'GET /api/v1/dashboard': () =>
        Response.json(
          dashboard({ goals: { items: [{ ...TRIP_GOAL, targetCents }], activeCount: 1 } }),
        ),
      'GET /api/v1/goals': () => Response.json({ items: [goal(targetCents)] }),
      [`PUT /api/v1/goals/${TRIP_GOAL.id}`]: () => {
        targetCents = 2000000;
        return Response.json(goal(targetCents));
      },
    });
    const readHome = await renderScreenWithHomeCached(<GoalsPage />, '/metas');
    await userEvent.click(await screen.findByRole('button', { name: /Viagem/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Editar meta' }));
    const targetField = await screen.findByLabelText('Valor desejado');
    await userEvent.clear(targetField);
    await userEvent.type(targetField, '2000000');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar meta' }));
    await waitForPanelToClose('Salvar meta');
    // Act
    const home = await readHome();
    // Assert
    expect(home.goals.items[0]?.targetCents).toBe(2000000);
  });

  it('should_refresh_projection_when_planned_entry_is_created', async () => {
    // Arrange
    let isEntryCreated = false;
    const projectedBalanceCents = () => (isEntryCreated ? 450000 : 480000);
    stubApi({
      'GET /api/v1/dashboard': () =>
        Response.json(
          dashboard({
            projection: {
              projectedBalanceCents: projectedBalanceCents(),
              lowestBalanceCents: 120000,
              lowestBalanceDate: '2026-11-20',
              hasPlannedItems: true,
            },
          }),
        ),
      'GET /api/v1/planned-entries': () => Response.json(EMPTY_MONTH),
      'GET /api/v1/projection': () =>
        Response.json({ ...PROJECTION, projectedBalanceCents: projectedBalanceCents() }),
      'POST /api/v1/planned-entries': () => {
        isEntryCreated = true;
        return Response.json(plannedEntry(), { status: 201 });
      },
    });
    const readHome = await renderScreenWithHomeCached(
      <PlanningPage />,
      '/planejamento?month=2026-11',
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Adicionar previsão' }));
    await userEvent.type(await screen.findByLabelText('Valor'), '30000');
    await pasteInto(screen.getByLabelText('Descrição'), 'Feira');
    await userEvent.selectOptions(screen.getByLabelText('Categoria'), GROCERIES.id);
    await pasteInto(screen.getByLabelText('Dia do mês'), '20');
    await userEvent.click(screen.getByRole('button', { name: 'Criar previsão' }));
    await waitForPanelToClose('Criar previsão');
    // Act
    const home = await readHome();
    // Assert
    expect(home.projection?.projectedBalanceCents).toBe(450000);
  });
});
