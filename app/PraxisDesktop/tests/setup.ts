// Ensure unhandled promise rejections fail the test run deterministically.
process.on('unhandledRejection', (reason) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  // Throwing here lets Vitest surface the error and fail
  throw error;
});

// Also escalate uncaught exceptions explicitly to avoid silent exits in some environments.
process.on('uncaughtException', (error) => {
  throw error;
});

let hasLocalStorage = false;

try {
  hasLocalStorage =
    typeof globalThis.localStorage !== 'undefined' &&
    typeof globalThis.localStorage.clear === 'function';
} catch {
  // Some DOM shims expose localStorage accessors that throw unless additional
  // CLI flags are provided. Treat those as "not available" so we can install
  // the in-memory polyfill below without failing the test bootstrap.
  hasLocalStorage = false;
}

if (!hasLocalStorage) {
  const store = new Map<string, string>();
  const storage = {
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  } as Storage;
  Object.defineProperty(storage, 'length', {
    get() {
      return store.size;
    },
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });
}
