import { apiGetFile } from '../api-client';

// Contrato de /exports. O backend é o dono (docs/03-arquitetura.md, "Contrato da API").

const FALLBACK_FILE_NAME = 'valora-dados.zip';

export interface DataExportFile {
  readonly file: Blob;
  readonly fileName: string;
}

/** O `.zip` com um CSV por tabela do Valora, valores em centavos (`GET /exports/all.zip`). */
export async function downloadAllData(): Promise<DataExportFile> {
  const { file, fileName } = await apiGetFile('/exports/all.zip');
  return { file, fileName: fileName ?? FALLBACK_FILE_NAME };
}
