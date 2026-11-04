interface ViewportOptions {
  readonly prefersDark?: boolean;
  readonly viewportWidth?: number;
}

const DEFAULT_VIEWPORT_WIDTH = 1440;
const MAX_WIDTH_PATTERN = /\(max-width:\s*(\d+)px\)/;

function matchesQuery(query: string, { prefersDark, viewportWidth }: Required<ViewportOptions>) {
  if (query.includes('prefers-color-scheme: dark')) return prefersDark;
  const maxWidth = MAX_WIDTH_PATTERN.exec(query)?.[1];
  return maxWidth !== undefined && viewportWidth <= Number(maxWidth);
}

// O jsdom não implementa matchMedia; esta versão responde às duas consultas que o app usa.
export function stubViewport({
  prefersDark = false,
  viewportWidth = DEFAULT_VIEWPORT_WIDTH,
}: ViewportOptions = {}): void {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: matchesQuery(query, { prefersDark, viewportWidth }),
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  });
}
