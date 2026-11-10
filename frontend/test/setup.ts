import '@testing-library/jest-dom/vitest';

import { cleanup, configure } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

import { resetConnectivityForTests } from '../src/lib/pwa/connectivity';
import { stubViewport } from './helpers/match-media';

// O jsdom não implementa ResizeObserver, que o Radix usa para posicionar tooltips e menus.
class ResizeObserverStub {
  observe = (): void => undefined;
  unobserve = (): void => undefined;
  disconnect = (): void => undefined;
}
globalThis.ResizeObserver = ResizeObserverStub;

// O primeiro teste de um arquivo que renderiza o app inteiro carrega todas as telas sob demanda: com a
// máquina ocupada, isso passa de 1 s (o padrão do `findBy`). Só afeta quanto se espera antes de falhar.
configure({ asyncUtilTimeout: 10_000 });

beforeEach(() => {
  stubViewport();
});

afterEach(() => {
  cleanup();
  resetConnectivityForTests();
  window.localStorage.clear();
  document.documentElement.classList.remove('dark');
});
