// Mensagens do navegador quando o arquivo de uma tela (import dinâmico) não carrega: Chrome, Safari,
// Firefox e o pré-carregamento de CSS do Vite. A causa costuma ser uma versão nova publicada com a aba
// aberta, ou o cache do service worker apagado.
const CHUNK_LOAD_MESSAGES = [
  'failed to fetch dynamically imported module',
  'importing a module script failed',
  'error loading dynamically imported module',
  'unable to preload css',
];

const RELOAD_MARK_KEY = 'valora.chunk-reload-at';
// Se a tela falhar de novo logo depois da recarga automática, o problema não é versão velha: mostra o erro.
const RELOAD_WINDOW_MS = 30_000;

export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return CHUNK_LOAD_MESSAGES.some((chunkMessage) => message.includes(chunkMessage));
}

/** Recarrega uma vez só: não se já recarregou há pouco, nem quando não dá para marcar a recarga. */
export function shouldReloadForChunkError(error: unknown, now: number): boolean {
  if (!isChunkLoadError(error)) return false;
  try {
    const lastReloadAt = Number(window.sessionStorage.getItem(RELOAD_MARK_KEY));
    return now - lastReloadAt > RELOAD_WINDOW_MS;
  } catch {
    // Sem armazenamento a marca não sobrevive à recarga, e o app entraria em laço: mostra o erro.
    return false;
  }
}

export function markChunkReload(now: number): void {
  try {
    window.sessionStorage.setItem(RELOAD_MARK_KEY, String(now));
  } catch {
    // Inalcançável na prática: `shouldReloadForChunkError` já devolve falso sem armazenamento.
  }
}
