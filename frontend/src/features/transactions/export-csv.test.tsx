import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_PAGE,
  fixture,
  type Handler,
  LOADED_AT,
  pageResponse,
  renderPage,
  stubApi,
  TRANSPORT,
} from './test-support';

const EXPORT_PAGE_SIZE = '100';
const OCTOBER_TRANSPORT_PATH = `/transacoes?period=custom&from=2026-10-01&to=2026-10-31&category=${TRANSPORT.id}`;
const TRANSPORT_CATEGORY = { id: TRANSPORT.id, name: 'Transporte', icon: 'car', kind: 'expense' };

function transportRides(firstId: number, count: number) {
  return Array.from({ length: count }, (_, offset) =>
    fixture(firstId + offset, {
      date: '2026-10-15',
      description: `UBER ${firstId + offset}`,
      category: TRANSPORT_CATEGORY,
      categorySource: 'rule',
    }),
  );
}

function exportPage(items: unknown[], page: number, total: number): Response {
  return Response.json({
    items,
    pagination: { page, limit: Number(EXPORT_PAGE_SIZE), total },
    loadedAt: LOADED_AT,
  });
}

/** A lista da tela (50 por página) responde a página padrão; a exportação (100) usa `onExport`. */
function transactionsRoute(onExport: Handler): Handler {
  return (url, init) =>
    url.searchParams.get('limit') === EXPORT_PAGE_SIZE
      ? onExport(url, init)
      : pageResponse(DEFAULT_PAGE);
}

function exportRequests(fetchMock: ReturnType<typeof stubApi>): URLSearchParams[] {
  return fetchMock.mock.calls
    .map(([input]) => new URL(String(input), 'http://localhost'))
    .filter((url) => url.searchParams.get('limit') === EXPORT_PAGE_SIZE)
    .map((url) => url.searchParams);
}

let downloadedFiles: Blob[];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-04T15:00:00Z'));
  downloadedFiles = [];
  // O jsdom não cria URL de Blob nem baixa arquivos: guardamos o que seria baixado.
  URL.createObjectURL = vi.fn((file: Blob) => {
    downloadedFiles.push(file);
    return 'blob:valora-test';
  });
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function clickExport() {
  await userEvent.click(await screen.findByRole('button', { name: 'Exportar CSV' }));
}

describe('Exportar CSV', () => {
  it('should_export_all_filtered_transactions_from_two_pages_when_the_filter_has_130', async () => {
    // Arrange
    stubApi({
      'GET /api/v1/transactions': transactionsRoute((url) =>
        url.searchParams.get('page') === '1'
          ? exportPage(transportRides(1, 100), 1, 130)
          : exportPage(transportRides(101, 30), 2, 130),
      ),
    });
    renderPage(OCTOBER_TRANSPORT_PATH);
    // Act
    await clickExport();
    // Assert: cabeçalho, 130 linhas e a quebra final.
    await waitFor(() => expect(downloadedFiles).toHaveLength(1));
    const lines = (await downloadedFiles[0]?.text())?.split('\r\n') ?? [];
    expect(lines).toHaveLength(132);
  });

  it('should_send_the_screen_filter_to_every_export_page_when_exporting', async () => {
    // Arrange
    const fetchMock = stubApi({
      'GET /api/v1/transactions': transactionsRoute((url) =>
        url.searchParams.get('page') === '1'
          ? exportPage(transportRides(1, 100), 1, 130)
          : exportPage(transportRides(101, 30), 2, 130),
      ),
    });
    renderPage(OCTOBER_TRANSPORT_PATH);
    // Act
    await clickExport();
    // Assert
    await waitFor(() => expect(downloadedFiles).toHaveLength(1));
    expect(
      exportRequests(fetchMock).map((params) => [
        params.get('page'),
        params.get('categoryId'),
        params.get('from'),
        params.get('to'),
      ]),
    ).toEqual([
      ['1', TRANSPORT.id, '2026-10-01', '2026-10-31'],
      ['2', TRANSPORT.id, '2026-10-01', '2026-10-31'],
    ]);
  });

  it('should_announce_the_download_when_the_file_is_ready', async () => {
    // Arrange
    stubApi({
      'GET /api/v1/transactions': transactionsRoute(() => exportPage(transportRides(1, 2), 1, 2)),
    });
    renderPage(OCTOBER_TRANSPORT_PATH);
    // Act
    await clickExport();
    // Assert
    expect(await screen.findByText('CSV com 2 transações baixado.')).toBeInTheDocument();
  });

  it('should_download_nothing_when_canceled_while_preparing', async () => {
    // Arrange
    let releaseSecondPage: (response: Response) => void = () => undefined;
    stubApi({
      'GET /api/v1/transactions': transactionsRoute((url) =>
        url.searchParams.get('page') === '1'
          ? exportPage(transportRides(1, 100), 1, 130)
          : new Promise<Response>((resolve) => {
              releaseSecondPage = resolve;
            }),
      ),
    });
    renderPage(OCTOBER_TRANSPORT_PATH);
    await clickExport();
    await screen.findByText('Preparando 100 de 130…');
    // Act
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    releaseSecondPage(exportPage(transportRides(101, 30), 2, 130));
    // Assert
    await waitFor(() => expect(screen.queryByText('Exportando CSV')).not.toBeInTheDocument());
    expect(downloadedFiles).toHaveLength(0);
  });

  it('should_ask_to_narrow_the_period_and_download_nothing_when_the_filter_has_12000', async () => {
    // Arrange
    stubApi({
      'GET /api/v1/transactions': transactionsRoute(() =>
        exportPage(transportRides(1, 100), 1, 12_000),
      ),
    });
    renderPage(OCTOBER_TRANSPORT_PATH);
    // Act
    await clickExport();
    // Assert
    expect(await screen.findByText(/O filtro tem 12\.000 transações/)).toBeInTheDocument();
    expect(downloadedFiles).toHaveLength(0);
  });

  it('should_show_the_error_and_download_nothing_when_the_api_fails_in_the_middle', async () => {
    // Arrange
    stubApi({
      'GET /api/v1/transactions': transactionsRoute((url) =>
        url.searchParams.get('page') === '1'
          ? exportPage(transportRides(1, 100), 1, 130)
          : Response.json(
              { error: { code: 'INTERNAL_ERROR', message: 'Erro inesperado', details: [] } },
              { status: 500 },
            ),
      ),
    });
    renderPage(OCTOBER_TRANSPORT_PATH);
    // Act
    await clickExport();
    // Assert
    expect(
      await screen.findByText('Não deu para exportar o CSV. Tente de novo.'),
    ).toBeInTheDocument();
    expect(downloadedFiles).toHaveLength(0);
  });

  it('should_warn_that_the_file_has_the_values_when_values_are_hidden', async () => {
    // Arrange
    window.localStorage.setItem('valora.hide-values', 'true');
    stubApi();
    renderPage();
    // Act
    await clickExport();
    // Assert
    expect(
      await screen.findByText('O arquivo terá os valores, mesmo com eles ocultos na tela.'),
    ).toBeInTheDocument();
  });

  it('should_not_download_before_confirming_when_values_are_hidden', async () => {
    // Arrange
    window.localStorage.setItem('valora.hide-values', 'true');
    const fetchMock = stubApi();
    renderPage();
    // Act
    await clickExport();
    // Assert
    expect(exportRequests(fetchMock)).toHaveLength(0);
  });
});
