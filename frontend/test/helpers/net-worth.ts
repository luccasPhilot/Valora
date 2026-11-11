/** Resposta de `/net-worth` para os testes: o patrimônio de hoje e um ponto por mês. */
export function netWorthBody(overrides: Record<string, unknown> = {}) {
  return {
    current: {
      date: '2026-11-15',
      accountsCents: 500000,
      investmentsCents: 1200000,
      openBillsCents: 150000,
      netWorthCents: 1550000,
    },
    points: [
      point('2026-09', '2026-09-30', 1300000),
      point('2026-10', '2026-10-31', 1450000),
      point('2026-11', '2026-11-15', 1550000),
    ],
    monthChange: { cents: 100000, percent: 6.9 },
    firstSnapshotDate: '2026-09-04',
    ...overrides,
  };
}

export function point(month: string, date: string, netWorthCents: number) {
  return {
    month,
    date,
    accountsCents: netWorthCents,
    investmentsCents: 0,
    openBillsCents: 0,
    netWorthCents,
  };
}

export function netWorthRoute(overrides: Record<string, unknown> = {}) {
  return { 'GET /api/v1/net-worth': () => Response.json(netWorthBody(overrides)) };
}
