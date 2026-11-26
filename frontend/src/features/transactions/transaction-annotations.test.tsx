import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { stubViewport } from '../../../test/helpers/match-media';
import {
  CARD_BILL,
  DEFAULT_PAGE,
  pageResponse,
  PHARMACY,
  renderPage,
  SALARY_ENTRY,
  stubApi,
  YESTERDAY_PURCHASE,
} from './test-support';

const PHARMACY_URL = 'PATCH /api/v1/transactions/00000000-0000-4000-8000-000000000001';
const TRIP = {
  id: '66666666-6666-4666-8666-666666666666',
  name: 'Viagem Chile',
  transactionCount: 2,
};
const REFUND = {
  id: '77777777-7777-4777-8777-777777777777',
  name: 'Reembolsável',
  transactionCount: 1,
};

beforeEach(() => {
  stubViewport({ viewportWidth: 1440 });
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-04T15:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function openPharmacyDetail() {
  await userEvent.click(await screen.findByText('FARMÁCIA SÃO JOÃO'));
  return screen.findByRole('dialog', { name: 'Detalhes da transação' });
}

describe('linha da lista com nota e etiquetas', () => {
  it('should_show_the_note_mark_and_at_most_two_tags_when_the_transaction_has_them', async () => {
    // Arrange
    const annotated = {
      ...PHARMACY,
      note: 'Pedir reembolso',
      tags: [
        { id: TRIP.id, name: TRIP.name },
        { id: REFUND.id, name: REFUND.name },
        { id: '88888888-8888-4888-8888-888888888888', name: 'Dedutível' },
      ],
    };
    stubApi({
      'GET /api/v1/transactions': () =>
        pageResponse([annotated, SALARY_ENTRY, CARD_BILL, YESTERDAY_PURCHASE]),
    });
    // Act
    renderPage();
    // Assert
    const row = (await screen.findByText('FARMÁCIA SÃO JOÃO')).closest('button');
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText('Tem nota')).toBeInTheDocument();
    expect(within(row as HTMLElement).getByText('Viagem Chile')).toBeInTheDocument();
    expect(within(row as HTMLElement).queryByText('Dedutível')).not.toBeInTheDocument();
    expect(within(row as HTMLElement).getByText('+1')).toBeInTheDocument();
  });
});

describe('nota no detalhe', () => {
  it('should_save_the_note_when_leaving_the_field_and_show_saved', async () => {
    // Arrange
    const patched: unknown[] = [];
    stubApi({
      [PHARMACY_URL]: (_url, init) => {
        patched.push(JSON.parse(String(init.body)));
        return Response.json({ ...PHARMACY, note: 'Remédio da Ana', ruleSuggestion: null });
      },
    });
    renderPage();
    const dialog = await openPharmacyDetail();
    // Act
    await userEvent.type(within(dialog).getByLabelText('Nota'), 'Remédio da Ana');
    await userEvent.tab();
    // Assert
    expect(await within(dialog).findByText('Salvo')).toBeInTheDocument();
    expect(patched).toEqual([{ note: 'Remédio da Ana' }]);
  });

  it('should_not_call_the_api_when_the_note_did_not_change', async () => {
    // Arrange
    const patched: unknown[] = [];
    stubApi({
      [PHARMACY_URL]: (_url, init) => {
        patched.push(JSON.parse(String(init.body)));
        return Response.json({ ...PHARMACY, ruleSuggestion: null });
      },
    });
    renderPage();
    const dialog = await openPharmacyDetail();
    // Act
    await userEvent.click(within(dialog).getByLabelText('Nota'));
    await userEvent.tab();
    // Assert
    expect(patched).toEqual([]);
  });

  it('should_show_an_error_message_when_saving_the_note_fails', async () => {
    // Arrange
    stubApi({
      [PHARMACY_URL]: () =>
        Response.json(
          { error: { code: 'INTERNAL_ERROR', message: 'erro', details: [] } },
          { status: 500 },
        ),
    });
    renderPage();
    const dialog = await openPharmacyDetail();
    // Act
    await userEvent.type(within(dialog).getByLabelText('Nota'), 'texto');
    await userEvent.tab();
    // Assert
    expect(await within(dialog).findByText(/Não foi possível salvar/)).toBeInTheDocument();
  });
});

describe('etiquetas no detalhe', () => {
  it('should_send_the_whole_tag_list_when_removing_a_chip', async () => {
    // Arrange
    const patched: unknown[] = [];
    const tagged = {
      ...PHARMACY,
      tags: [
        { id: TRIP.id, name: TRIP.name },
        { id: REFUND.id, name: REFUND.name },
      ],
    };
    stubApi({
      'GET /api/v1/transactions': () =>
        pageResponse([tagged, SALARY_ENTRY, CARD_BILL, YESTERDAY_PURCHASE]),
      'GET /api/v1/tags': () => Response.json({ items: [TRIP, REFUND] }),
      [PHARMACY_URL]: (_url, init) => {
        patched.push(JSON.parse(String(init.body)));
        return Response.json({ ...PHARMACY, ruleSuggestion: null });
      },
    });
    renderPage();
    const dialog = await openPharmacyDetail();
    // Act
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Remover etiqueta Viagem Chile' }),
    );
    // Assert
    expect(patched).toEqual([{ tagIds: [REFUND.id] }]);
  });

  it('should_add_an_existing_tag_when_picking_it_in_the_search', async () => {
    // Arrange
    const patched: unknown[] = [];
    stubApi({
      'GET /api/v1/tags': () => Response.json({ items: [TRIP, REFUND] }),
      [PHARMACY_URL]: (_url, init) => {
        patched.push(JSON.parse(String(init.body)));
        return Response.json({ ...PHARMACY, ruleSuggestion: null });
      },
    });
    renderPage();
    const dialog = await openPharmacyDetail();
    // Act
    await userEvent.click(within(dialog).getByRole('button', { name: 'Adicionar etiqueta' }));
    await userEvent.type(await screen.findByLabelText('Buscar etiqueta'), 'viagem');
    await userEvent.click(await screen.findByRole('button', { name: 'Viagem Chile' }));
    // Assert
    expect(patched).toEqual([{ tagIds: [TRIP.id] }]);
  });

  it('should_offer_create_and_then_tag_the_transaction_when_the_name_does_not_exist', async () => {
    // Arrange
    const created: unknown[] = [];
    const patched: unknown[] = [];
    const NEW_TAG = {
      id: '99999999-9999-4999-8999-999999999999',
      name: 'viagem',
      transactionCount: 0,
    };
    stubApi({
      'GET /api/v1/tags': () => Response.json({ items: [TRIP] }),
      'POST /api/v1/tags': (_url, init) => {
        created.push(JSON.parse(String(init.body)));
        return Response.json(NEW_TAG, { status: 201 });
      },
      [PHARMACY_URL]: (_url, init) => {
        patched.push(JSON.parse(String(init.body)));
        return Response.json({ ...PHARMACY, ruleSuggestion: null });
      },
    });
    renderPage();
    const dialog = await openPharmacyDetail();
    // Act
    await userEvent.click(within(dialog).getByRole('button', { name: 'Adicionar etiqueta' }));
    await userEvent.type(await screen.findByLabelText('Buscar etiqueta'), 'viagem');
    await userEvent.click(await screen.findByRole('button', { name: 'Criar “viagem”' }));
    // Assert
    expect({ created, patched }).toEqual({
      created: [{ name: 'viagem' }],
      patched: [{ tagIds: [NEW_TAG.id] }],
    });
  });

  it('should_not_offer_create_when_the_name_only_differs_by_case_and_accents', async () => {
    // Arrange
    stubApi({ 'GET /api/v1/tags': () => Response.json({ items: [TRIP] }) });
    renderPage();
    const dialog = await openPharmacyDetail();
    // Act
    await userEvent.click(within(dialog).getByRole('button', { name: 'Adicionar etiqueta' }));
    await userEvent.type(await screen.findByLabelText('Buscar etiqueta'), 'VIAGEM CHILE');
    // Assert
    expect(screen.queryByRole('button', { name: /Criar/ })).not.toBeInTheDocument();
  });

  it('should_disable_adding_when_the_transaction_already_has_ten_tags', async () => {
    // Arrange
    const tags = Array.from({ length: 10 }, (_, index) => ({
      id: `00000000-0000-4000-8000-0000000001${String(index).padStart(2, '0')}`,
      name: `Etiqueta ${index}`,
    }));
    stubApi({
      'GET /api/v1/transactions': () =>
        pageResponse([{ ...PHARMACY, tags }, ...DEFAULT_PAGE.slice(1)]),
    });
    renderPage();
    // Act
    const dialog = await openPharmacyDetail();
    // Assert
    expect(within(dialog).getByRole('button', { name: 'Adicionar etiqueta' })).toBeDisabled();
  });
});

describe('filtro por etiqueta em Transações', () => {
  it('should_send_the_tag_id_and_show_the_chip_when_the_tag_is_in_the_url', async () => {
    // Arrange
    const fetchMock = stubApi({ 'GET /api/v1/tags': () => Response.json({ items: [TRIP] }) });
    // Act
    renderPage(`/transacoes?tag=${TRIP.id}`);
    // Assert
    expect(await screen.findByText('Etiqueta: Viagem Chile')).toBeInTheDocument();
    const urls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(urls.some((url) => url.includes(`tagId=${TRIP.id}`))).toBe(true);
  });
});
