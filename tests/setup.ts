import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach } from 'vitest';

// The config runs with `globals: false`, so Testing Library never registers its
// automatic `afterEach(cleanup)`. Without it, React trees stay mounted past the
// end of each test and React 19's concurrent scheduler keeps pending work that
// flushes *after* jsdom teardown — surfacing as unhandled
// `ReferenceError: window is not defined` from `performWorkUntilDeadline`
// (intermittent locally, reliably fatal on CI). Unmounting after every test
// cancels that scheduled work at the source; the window stub below stays as a
// belt-and-braces safety net for any stragglers.
afterEach(() => {
  cleanup();
});

// Vitest occasionally runs pending React scheduler callbacks after the jsdom
// environment has been torn down (seen on macOS runners), which leaves
// `window` undefined and trips ReactDOM's access to `window.event`. Keep a
// minimal stub so late callbacks don't throw even if jsdom has already cleaned
// itself up.
const ensureWindowStub = () => {
  if (typeof globalThis.window !== 'undefined') {
    return;
  }
  (globalThis as unknown as { window: typeof globalThis & { event?: unknown } }).window =
    globalThis as typeof globalThis & { event?: unknown };
  if (typeof (globalThis as { document?: Document }).document === 'undefined') {
    // Document is rarely touched in these late callbacks, but provide a stub for safety.
    (globalThis as unknown as { document: Partial<Document> }).document = {};
  }
};

ensureWindowStub();
afterEach(() => {
  ensureWindowStub();
});
afterAll(() => {
  ensureWindowStub();
});

// React 19's scheduler can run callbacks after Vitest/jsdom teardown. Vitest
// deletes `window` during teardown; re-stub it ASAP without interfering with
// teardown (do not make it non-configurable).
const windowStubPumpKey = '__aideon_window_stub_pump__';
if (!(globalThis as unknown as Record<string, unknown>)[windowStubPumpKey]) {
  (globalThis as unknown as Record<string, unknown>)[windowStubPumpKey] = true;
  let stopped = false;
  const pump = () => {
    if (stopped) {
      return;
    }
    ensureWindowStub();
    const handle = setImmediate(pump);
    (handle as unknown as { unref?: () => void }).unref?.();
  };
  const handle = setImmediate(pump);
  (handle as unknown as { unref?: () => void }).unref?.();
  afterAll(() => {
    stopped = true;
  });
}

if (typeof EventTarget !== 'undefined') {
  const dispatchPatchKey = '__aideon_dispatch_event_patch__';
  if (!(globalThis as unknown as Record<string, unknown>)[dispatchPatchKey]) {
    (globalThis as unknown as Record<string, unknown>)[dispatchPatchKey] = true;
    const originalDispatchEvent = EventTarget.prototype.dispatchEvent;
    const patchedDispatchEvent = function (this: EventTarget, event?: Event) {
      if (!(event instanceof Event)) {
        return true;
      }
      return originalDispatchEvent.call(this, event);
    };
    Object.defineProperty(EventTarget.prototype, 'dispatchEvent', {
      configurable: true,
      writable: true,
      value: patchedDispatchEvent,
    });
    afterAll(() => {
      if (EventTarget.prototype.dispatchEvent === patchedDispatchEvent) {
        Object.defineProperty(EventTarget.prototype, 'dispatchEvent', {
          configurable: true,
          writable: true,
          value: originalDispatchEvent,
        });
      }
    });
  }
}

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

if (typeof Element !== 'undefined' && typeof Element.prototype.scrollIntoView !== 'function') {
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    writable: true,
    value() {},
  });
}
