import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { stubViewport } from '../../../test/helpers/match-media';
import { TagsTab } from './tags-tab';

const TRIP = { id: '66666666-6666-4666-8666-666666666666', name: 'Viagem', transactionCount: 8 };
const RENOVATION = {
  id: '77777777-7777-4777-8777-777777777777',
  name: 'Reforma',
  transactionCount: 1,
};

type Handler = (init: RequestInit) => Response;

/** Responde pelo método e caminho; qualquer chamada sem rota falha o teste. */
function stubApi(routes: Record<string, Handler>) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init: RequestInit = {}) => {
    const key = `${init.method ?? 'GET'} ${String(input)}`;
    const handler = routes[key];
    if (!handler) return Promise.reject(new Error(`Teste: rota sem resposta ${key}`));
    return Promise.resolve(handler(init));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderTab() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <TagsTab />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  stubViewport({ viewportWidth: 1440 });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('aba Etiquetas', () => {
  it('should_list_the_tags_with_their_transaction_count_when_they_load', async () => {
    // Arrange
    stubApi({ 'GET /api/v1/tags': () => Response.json({ items: [RENOVATION, TRIP] }) });
    // Act
    renderTab();
    // Assert
    expect(await screen.findByText('8 transações')).toBeInTheDocument();
    expect(screen.getByText('1 transação')).toBeInTheDocument();
  });

  it('should_show_the_empty_state_when_there_are_no_tags', async () => {
    // Arrange
    stubApi({ 'GET /api/v1/tags': () => Response.json({ items: [] }) });
    // Act
    renderTab();
    // Assert
    expect(await screen.findByText('Nenhuma etiqueta')).toBeInTheDocument();
  });

  it('should_show_the_error_state_when_the_tags_fail_to_load', async () => {
    // Arrange
    stubApi({
      'GET /api/v1/tags': () =>
        Response.json(
          { error: { code: 'INTERNAL_ERROR', message: 'x', details: [] } },
          { status: 500 },
        ),
    });
    // Act
    renderTab();
    // Assert
    expect(await screen.findByRole('button', { name: /Tentar de novo/ })).toBeInTheDocument();
  });

  it('should_rename_the_tag_when_the_new_name_is_saved', async () => {
    // Arrange
    const renamed: unknown[] = [];
    stubApi({
      'GET /api/v1/tags': () => Response.json({ items: [TRIP] }),
      [`PATCH /api/v1/tags/${TRIP.id}`]: (init) => {
        renamed.push(JSON.parse(String(init.body)));
        return Response.json({ ...TRIP, name: 'Viagem Chile' });
      },
    });
    renderTab();
    await userEvent.click(await screen.findByRole('button', { name: 'Renomear etiqueta Viagem' }));
    const dialog = await screen.findByRole('dialog', { name: 'Renomear etiqueta' });
    // Act
    await userEvent.clear(within(dialog).getByLabelText('Nome'));
    await userEvent.type(within(dialog).getByLabelText('Nome'), 'Viagem Chile');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    // Assert
    await vi.waitFor(() => expect(renamed).toEqual([{ name: 'Viagem Chile' }]));
  });

  it('should_explain_the_name_is_taken_when_the_api_answers_409', async () => {
    // Arrange
    stubApi({
      'GET /api/v1/tags': () => Response.json({ items: [TRIP, RENOVATION] }),
      [`PATCH /api/v1/tags/${TRIP.id}`]: () =>
        Response.json(
          { error: { code: 'TAG_ALREADY_EXISTS', message: 'x', details: [] } },
          { status: 409 },
        ),
    });
    renderTab();
    await userEvent.click(await screen.findByRole('button', { name: 'Renomear etiqueta Viagem' }));
    const dialog = await screen.findByRole('dialog', { name: 'Renomear etiqueta' });
    // Act
    await userEvent.clear(within(dialog).getByLabelText('Nome'));
    await userEvent.type(within(dialog).getByLabelText('Nome'), 'reforma');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    // Assert
    expect(
      await within(dialog).findByText('Já existe uma etiqueta com este nome.'),
    ).toBeInTheDocument();
  });

  it('should_say_how_many_transactions_lose_the_tag_when_confirming_the_delete', async () => {
    // Arrange
    const fetchMock = stubApi({
      'GET /api/v1/tags': () => Response.json({ items: [TRIP] }),
      [`DELETE /api/v1/tags/${TRIP.id}`]: () => new Response(null, { status: 204 }),
    });
    renderTab();
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir etiqueta Viagem' }));
    const dialog = await screen.findByRole('dialog', { name: 'Excluir a etiqueta Viagem?' });
    // Assert
    expect(within(dialog).getByText(/8 transações perdem esta etiqueta/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Excluir' }));
    await vi.waitFor(() =>
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(true),
    );
  });
});
