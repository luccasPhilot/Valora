// O Safari do iPhone lê o arquivo depois que o clique já voltou; liberar a URL na hora quebra o download.
const REVOKE_DELAY_MS = 60_000;

/**
 * Baixa um arquivo montado no navegador. Na PWA instalada no iPhone, o Safari abre a folha de
 * compartilhar ("Salvar em Arquivos").
 */
export function downloadFile(file: Blob, fileName: string): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}
