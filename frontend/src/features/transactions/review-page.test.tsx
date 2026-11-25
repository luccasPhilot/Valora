import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { stubViewport } from '../../../test/helpers/match-media';
import {
  fixture,
  GROCERIES,
  type Handler,
  LOADED_AT,
  pageResponse,
  PHARMACY,
  renderReviewPage,
  stubApi,
  TRANSPORT,
} from './test-support';

// Da mais antiga para a mais nova, como a API manda a caixa.
const UBER = fixture(11, { date: '2026-11-02', description: 'UBER *TRIP', amountCents: -2350 });
const DUPLICATE = fixture(12, {
  date: '2026-11-03',
  description: 'PADARIA DO BAIRRO',
  possibleDuplicateOfId: '00000000-0000-4000-8000-000000000099',
});
const INBOX = [UBER, DUPLICATE, PHARMACY];

const UBER_SUGGESTION = {
  pattern: 'UBER *TRIP',
  categoryId: TRANSPORT.id,
  categoryName: 'Transporte',
  categoryIcon: 'car',
  correctionCount: 2,
};

/** A caixa no servidor de mentira: o que for revisado sai dela, como no de verdade. */
function inboxRoutes(initial: readonly Record<string, unknown>[] = INBOX) {
  let inbox = [...initial];
  const routes: Record<string, Handler> = {
    'GET /api/v1/transactions': (url) => {
      if (url.searchParams.get('reviewed') !== 'false') throw new Error('Teste: lista sem a caixa');
      return pageResponse(inbox);
    },
    'GET /api/v1/transactions/review-count': () => Response.json({ count: inbox.length }),
    'POST /api/v1/transactions/review': (_url, init) => {
      const { transactionIds } = JSON.parse(String(init.body)) as { transactionIds: string[] };
      inbox = inbox.filter((transaction) => !transactionIds.includes(String(transaction.id)));
      return Response.json({ reviewedCount: transactionIds.length });
    },
  };
  return routes;
}

function bodiesSentTo(fetchMock: ReturnType<typeof stubApi>, method: string, path: string) {
  return fetchMock.mock.calls
    .filter(([input, init]) => {
      const url = new URL(String(input), 'http://localhost');
      return init?.method === method && url.pathname === path;
    })
    .map(([, init]) => JSON.parse(String(init?.body)));
}

function rowOf(description: string): HTMLElement {
  const row = screen.getByText(description).closest('li');
  if (!row) throw new Error(`Teste: ${description} não está numa linha`);
  return row;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-04T15:00:00Z'));
  stubViewport({ viewportWidth: 390 });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('caixa Para revisar', () => {
  it('should_list_the_oldest_transaction_first', async () => {
    // Arrange
    stubApi(inboxRoutes());
    // Act
    renderReviewPage();
    // Assert
    await screen.findByText('UBER *TRIP');
    const descriptions = screen
      .getAllByText(/^(UBER \*TRIP|PADARIA DO BAIRRO|FARMÁCIA SÃO JOÃO)$/)
      .map((element) => element.textContent);
    expect(descriptions).toEqual(['UBER *TRIP', 'PADARIA DO BAIRRO', 'FARMÁCIA SÃO JOÃO']);
  });

  it('should_show_how_many_are_waiting_for_review', async () => {
    // Arrange
    stubApi(inboxRoutes());
    // Act
    renderReviewPage();
    // Assert
    expect(await screen.findByText('3 para revisar')).toBeVisible();
  });

  it('should_tag_uncategorized_and_possible_duplicate_transactions', async () => {
    // Arrange
    stubApi(inboxRoutes());
    // Act
    renderReviewPage();
    // Assert
    await screen.findByText('UBER *TRIP');
    expect({
      uncategorized: within(rowOf('UBER *TRIP')).queryByText('Sem categoria') !== null,
      duplicate: within(rowOf('PADARIA DO BAIRRO')).queryByText('Possível duplicata') !== null,
      check: within(rowOf('PADARIA DO BAIRRO')).queryByRole('button', { name: /Conferir/ }),
      categorized: within(rowOf('FARMÁCIA SÃO JOÃO')).queryByText('Sem categoria'),
    }).toEqual({
      uncategorized: true,
      duplicate: true,
      check: expect.any(HTMLElement),
      categorized: null,
    });
  });

  it('should_mark_the_transaction_as_reviewed_and_drop_it_when_ok_is_pressed', async () => {
    // Arrange
    const fetchMock = stubApi(inboxRoutes());
    renderReviewPage();
    // Act
    await userEvent.click(
      await screen.findByRole('button', { name: 'Ok, marcar UBER *TRIP como revisada' }),
    );
    // Assert
    await waitFor(() => expect(screen.queryByText('UBER *TRIP')).toBeNull());
    expect(bodiesSentTo(fetchMock, 'POST', '/api/v1/transactions/review')).toEqual([
      { transactionIds: [UBER.id] },
    ]);
  });

  it('should_send_the_loaded_at_of_the_list_when_everything_is_marked_as_reviewed', async () => {
    // Arrange
    const fetchMock = stubApi({
      ...inboxRoutes(),
      'POST /api/v1/transactions/review-all': () => Response.json({ reviewedCount: 3 }),
    });
    renderReviewPage();
    await userEvent.click(await screen.findByRole('button', { name: /Marcar tudo como revisado/ }));
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Marcar tudo' }));
    // Assert
    expect(bodiesSentTo(fetchMock, 'POST', '/api/v1/transactions/review-all')).toEqual([
      { until: LOADED_AT },
    ]);
  });

  it('should_show_all_reviewed_when_the_inbox_is_empty', async () => {
    // Arrange
    stubApi(inboxRoutes([]));
    // Act
    renderReviewPage();
    // Assert
    expect(await screen.findByRole('heading', { name: 'Tudo revisado' })).toBeVisible();
  });

  it('should_show_the_skeleton_while_the_inbox_loads', () => {
    // Arrange
    stubApi(inboxRoutes());
    // Act
    renderReviewPage();
    // Assert
    expect(document.querySelector('[data-slot="skeleton"]')).not.toBeNull();
  });

  it('should_offer_to_retry_when_the_inbox_fails', async () => {
    // Arrange
    stubApi({
      ...inboxRoutes(),
      'GET /api/v1/transactions': () =>
        Response.json(
          { error: { code: 'INTERNAL_ERROR', message: 'x', details: [] } },
          { status: 500 },
        ),
    });
    // Act
    renderReviewPage();
    // Assert
    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeVisible();
  });
});

describe('trocar categoria na caixa', () => {
  async function pickTransportFor(description: string) {
    await userEvent.click(
      await screen.findByRole('button', { name: `Trocar categoria de ${description}` }),
    );
    const panel = await screen.findByRole('dialog', { name: 'Trocar categoria' });
    await userEvent.click(within(panel).getByRole('button', { name: /Transporte/ }));
  }

  it('should_offer_to_create_the_rule_when_the_change_brings_a_suggestion', async () => {
    // Arrange
    stubApi({
      ...inboxRoutes(),
      [`PATCH /api/v1/transactions/${UBER.id}`]: () =>
        Response.json({
          ...UBER,
          category: { id: TRANSPORT.id, name: 'Transporte', icon: 'car', kind: 'expense' },
          categorySource: 'user',
          ruleSuggestion: UBER_SUGGESTION,
        }),
    });
    renderReviewPage();
    // Act
    await pickTransportFor('UBER *TRIP');
    // Assert
    expect(await screen.findByText('Criar regra para “UBER *TRIP” → Transporte?')).toBeVisible();
  });

  it('should_create_the_equals_rule_when_create_rule_is_pressed', async () => {
    // Arrange
    const fetchMock = stubApi({
      ...inboxRoutes(),
      [`PATCH /api/v1/transactions/${UBER.id}`]: () =>
        Response.json({ ...UBER, ruleSuggestion: UBER_SUGGESTION }),
      'POST /api/v1/category-rules': () =>
        Response.json(
          {
            id: '88888888-8888-4888-8888-888888888888',
            pattern: 'UBER *TRIP',
            matchType: 'equals',
            categoryId: TRANSPORT.id,
            priority: 0,
            learnedFromTransactionId: null,
            createdAt: '2026-11-04T15:00:00.000Z',
          },
          { status: 201 },
        ),
    });
    renderReviewPage();
    await pickTransportFor('UBER *TRIP');
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Criar regra' }));
    // Assert
    expect(bodiesSentTo(fetchMock, 'POST', '/api/v1/category-rules')).toEqual([
      { pattern: 'UBER *TRIP', matchType: 'equals', categoryId: TRANSPORT.id, priority: 0 },
    ]);
  });

  it('should_dismiss_the_pair_when_not_now_is_pressed', async () => {
    // Arrange
    const fetchMock = stubApi({
      ...inboxRoutes(),
      [`PATCH /api/v1/transactions/${UBER.id}`]: () =>
        Response.json({ ...UBER, ruleSuggestion: UBER_SUGGESTION }),
      'POST /api/v1/category-rules/suggestions/dismiss': () => new Response(null, { status: 204 }),
    });
    renderReviewPage();
    await pickTransportFor('UBER *TRIP');
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Agora não' }));
    // Assert
    expect({
      sent: bodiesSentTo(fetchMock, 'POST', '/api/v1/category-rules/suggestions/dismiss'),
      isPromptGone: screen.queryByText(/Criar regra para/) === null,
    }).toEqual({ sent: [{ pattern: 'UBER *TRIP', categoryId: TRANSPORT.id }], isPromptGone: true });
  });
});

describe('modo Selecionar na caixa', () => {
  it('should_mark_the_selected_transactions_as_reviewed', async () => {
    // Arrange
    const fetchMock = stubApi(inboxRoutes());
    renderReviewPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Selecionar' }));
    // Act
    await userEvent.click(screen.getByRole('checkbox', { name: /UBER \*TRIP/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: /FARMÁCIA SÃO JOÃO/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Marcar como revisadas' }));
    // Assert
    expect(bodiesSentTo(fetchMock, 'POST', '/api/v1/transactions/review')).toEqual([
      { transactionIds: [UBER.id, PHARMACY.id] },
    ]);
  });

  it('should_show_how_many_are_selected_in_the_bar', async () => {
    // Arrange
    stubApi(inboxRoutes());
    renderReviewPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Selecionar' }));
    // Act
    await userEvent.click(screen.getByRole('checkbox', { name: /UBER \*TRIP/ }));
    // Assert
    const bar = screen.getByRole('region', { name: 'Ações da seleção' });
    expect(within(bar).getByText('1 selecionada')).toBeVisible();
  });

  it('should_leave_the_selection_mode_when_cancel_is_pressed', async () => {
    // Arrange
    stubApi(inboxRoutes());
    renderReviewPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Selecionar' }));
    // Act
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    // Assert
    expect(screen.queryByRole('checkbox', { name: /UBER \*TRIP/ })).toBeNull();
  });
});

describe('linha da caixa', () => {
  it('should_keep_the_category_of_a_categorized_transaction_visible', async () => {
    // Arrange
    stubApi(inboxRoutes());
    // Act
    renderReviewPage();
    // Assert
    await screen.findByText('FARMÁCIA SÃO JOÃO');
    expect(within(rowOf('FARMÁCIA SÃO JOÃO')).getByText(new RegExp(GROCERIES.name))).toBeVisible();
  });
});
