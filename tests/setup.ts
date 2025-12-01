import '@testing-library/jest-dom/vitest';

if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverFallback implements ResizeObserver {
    private readonly callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }

    observe(target: Element) {
      this.callback(
        [
          {
            target,
            contentRect: {
              width: 1000,
              height: 800,
              x: 0,
              y: 0,
              top: 0,
              left: 0,
              right: 1000,
              bottom: 800,
              toJSON() {
                return {};
              },
            },
          } as ResizeObserverEntry,
        ],
        this,
      );
    }

    unobserve() {}

    disconnect() {}

    takeRecords(): ResizeObserverEntry[] {
      return [];
    }
  }

  (globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
    ResizeObserverFallback;
}

if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  const mediaQueryMock: MediaQueryList = {
    matches: false,
    media: '',
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    },
  };

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({ ...mediaQueryMock, media: query }),
  });
}
