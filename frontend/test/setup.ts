import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

import { stubViewport } from './helpers/match-media';

// O jsdom não implementa ResizeObserver, que o Radix usa para posicionar tooltips e menus.
class ResizeObserverStub {
  observe = (): void => undefined;
  unobserve = (): void => undefined;
  disconnect = (): void => undefined;
}
globalThis.ResizeObserver = ResizeObserverStub;

beforeEach(() => {
  stubViewport();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.classList.remove('dark');
});
