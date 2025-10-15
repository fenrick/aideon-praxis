declare global {
  interface Window {
    aideon: { version: string };
  }
  // In browsers, globalThis === window; provide typing for unicorn/prefer-global-this usage
  // so globalThis.aideon is recognized.
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  var aideon: { version: string };
}
