import { fixture, GROCERIES, PHARMACY } from '../transactions/test-support';

// Resposta de `GET /dashboard` compartilhada pelos testes do Início.

const LEISURE_ID = '88888888-8888-4888-8888-888888888888';

export const TRIP_GOAL = {
  id: '77777777-7777-4777-8777-777777777777',
  name: 'Viagem',
  icon: 'plane',
  targetCents: 1000000,
  savedCents: 400000,
  percent: 40,
  status: 'behind',
  estimatedDate: null,
  requiredMonthlyCents: 50000,
};

export function dashboard(overrides: Record<string, unknown> = {}) {
  return {
    month: '2026-11',
    totalBalanceCents: 485032,
    balanceEvolution: [
      { date: '2026-11-01', balanceCents: 400000 },
      { date: '2026-11-05', balanceCents: 485032 },
    ],
    balanceChange: { cents: 85032, percent: 21.26 },
    netWorth: {
      totalCents: 1550000,
      investmentsCents: 1200000,
      openBillsCents: 150000,
      change: { cents: 50000, percent: 3.33 },
    },
    monthIncomeCents: 500000,
    monthExpenseCents: 200000,
    incomeVsExpense: [
      { month: '2026-06', incomeCents: 0, expenseCents: 0 },
      { month: '2026-07', incomeCents: 0, expenseCents: 0 },
      { month: '2026-08', incomeCents: 0, expenseCents: 0 },
      { month: '2026-09', incomeCents: 0, expenseCents: 0 },
      { month: '2026-10', incomeCents: 350000, expenseCents: 280000 },
      { month: '2026-11', incomeCents: 500000, expenseCents: 200000 },
    ],
    spendingByCategory: [
      {
        kind: 'category',
        categoryId: GROCERIES.id,
        name: 'Mercado',
        icon: 'shopping-cart',
        amountCents: 120000,
        percent: 60,
      },
      { kind: 'other', name: 'Outros', amountCents: 80000, percent: 40 },
    ],
    budgetsNearLimit: [
      {
        categoryId: LEISURE_ID,
        categoryName: 'Lazer',
        categoryIcon: 'ticket',
        limitCents: 30000,
        spentCents: 42000,
        percent: 140,
        status: 'exceeded',
      },
    ],
    latestTransactions: [PHARMACY, fixture(7, { description: 'Padaria', amountCents: -1500 })],
    projection: {
      projectedBalanceCents: 480000,
      lowestBalanceCents: 120000,
      lowestBalanceDate: '2026-11-20',
      hasPlannedItems: true,
    },
    goals: { items: [TRIP_GOAL], activeCount: 1 },
    reviewCount: 0,
    ...overrides,
  };
}
