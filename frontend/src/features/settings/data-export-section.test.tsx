import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DataExportSection } from './data-export-section';

const EXPORT_PATH = '/api/v1/exports/all.zip';
const ZIP_FILE_NAME = 'valora-dados-2026-11-24.zip';

let downloadedFiles: Blob[];
let downloadedNames: string[];

function zipResponse(): Response {
  return new Response(new Blob(['PK'], { type: 'application/zip' }), {
    headers: {
      'content-type': 'application/zip',
      'content-disposition': `attachment; filename="${ZIP_FILE_NAME}"`,
    },
  });
}

function stubExport(respond: () => Promise<Response>) {
  const fetchMock = vi.fn((input: RequestInfo | URL) =>
    new URL(String(input), 'http://localhost').pathname === EXPORT_PATH
      ? respond()
      : Promise.reject(new Error(`Teste: rota sem resposta ${String(input)}`)),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderSection() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <DataExportSection />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  downloadedFiles = [];
  downloadedNames = [];
  // O jsdom não cria URL de Blob nem baixa arquivos: guardamos o que seria baixado.
  URL.createObjectURL = vi.fn((file: Blob) => {
    downloadedFiles.push(file);
    return 'blob:valora-test';
  });
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloadedNames.push(this.download);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function clickDownload() {
  await userEvent.click(screen.getByRole('button', { name: 'Baixar meus dados' }));
}

describe('Baixar meus dados', () => {
  it('should_download_the_zip_with_the_name_from_the_api_when_pressed', async () => {
    // Arrange
    stubExport(() => Promise.resolve(zipResponse()));
    renderSection();
    // Act
    await clickDownload();
    // Assert
    expect(await screen.findByText(`${ZIP_FILE_NAME} baixado.`)).toBeInTheDocument();
    expect(downloadedNames).toEqual([ZIP_FILE_NAME]);
  });

  it('should_show_preparing_and_disable_the_button_while_the_api_answers', async () => {
    // Arrange
    stubExport(() => new Promise<Response>(() => undefined));
    renderSection();
    // Act
    await clickDownload();
    // Assert
    expect(await screen.findByRole('button', { name: 'Preparando…' })).toBeDisabled();
  });

  it('should_show_the_error_and_download_nothing_when_the_api_fails', async () => {
    // Arrange
    stubExport(() =>
      Promise.resolve(
        Response.json(
          { error: { code: 'INTERNAL_ERROR', message: 'Erro inesperado', details: [] } },
          { status: 500 },
        ),
      ),
    );
    renderSection();
    // Act
    await clickDownload();
    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não deu para baixar os dados. Tente de novo.',
    );
    expect(downloadedFiles).toHaveLength(0);
  });
});
