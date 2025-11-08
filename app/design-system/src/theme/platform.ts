// Platform/UI theme manager
// - win: load Fluent 2 Web Components
// - mac: load Puppertino CSS (locally vendored)
// - neutral: load Tailwind (neutral.css) and shadcn-like utilities
// - auto: detect from UA and delegate
// We avoid loading Tailwind/Puppertino unless explicitly selected.

export type UiTheme = 'auto' | 'win' | 'mac' | 'neutral' | 'linux';

let current: UiTheme = 'auto';
let resolvedCurrent: UiTheme = 'neutral';
let fluentReady = false;
type InjectKey = 'puppertino' | 'neutral';
const injectedLinks = {
  puppertino: null as HTMLLinkElement | null,
  neutral: null as HTMLLinkElement | null,
};

function detectPlatform(): UiTheme {
  const ua = navigator.userAgent;
  if (/Macintosh|Mac OS X/.test(ua)) return 'mac';
  if (ua.includes('Windows')) return 'win';
  if (ua.includes('Linux')) return 'linux';
  return 'neutral';
}

function setRootPlatformClass(theme: UiTheme) {
  const root = document.documentElement;
  root.classList.remove('platform-mac', 'platform-win', 'platform-linux');
  if (theme === 'mac') root.classList.add('platform-mac');
  if (theme === 'win') root.classList.add('platform-win');
  if (theme === 'linux') root.classList.add('platform-linux');
}

interface FluentModule {
  provideFluentDesignSystem: () => { register: (...arguments_: unknown[]) => unknown };
  fluentButton: () => unknown;
  fluentTextField: () => unknown;
  fluentSelect: () => unknown;
}

async function ensureFluentRegistered() {
  if (fluentReady) return;
  try {
    const module_ = (await import('@fluentui/web-components')) as unknown as FluentModule;
    module_
      .provideFluentDesignSystem()
      .register(module_.fluentButton(), module_.fluentTextField(), module_.fluentSelect());
    fluentReady = true;
  } catch (error) {
    // Best-effort; keep app running without throwing

    console.warn('fluent: failed to register components', error);
  }
}

function getLink(id: InjectKey): HTMLLinkElement | null {
  return id === 'puppertino' ? injectedLinks.puppertino : injectedLinks.neutral;
}
function setLink(id: InjectKey, element: HTMLLinkElement | null): void {
  if (id === 'puppertino') injectedLinks.puppertino = element;
  else injectedLinks.neutral = element;
}

function injectStylesheet(id: InjectKey, href: string) {
  // Remove if already injected with a different href
  const previous = getLink(id);
  if (previous?.href.endsWith(href)) return; // already correct
  if (previous) {
    previous.remove();
    setLink(id, null);
  }
  const link = document.createElement('link');
  link.id = `aideon-${id}-css`;
  link.rel = 'stylesheet';
  link.href = href;
  document.head.append(link);
  setLink(id, link);
}

function removeStylesheet(id: InjectKey) {
  const element = getLink(id);
  if (element) {
    element.remove();
    setLink(id, null);
  }
}

export async function setUiTheme(theme: UiTheme) {
  const resolved = theme === 'auto' ? detectPlatform() : theme;
  current = theme;
  resolvedCurrent = resolved;
  localStorage.setItem('aideon.platform', theme);
  setRootPlatformClass(resolved);

  // Ensure mutually exclusive CSS payloads
  switch (resolved) {
    case 'mac': {
      removeStylesheet('neutral');
      // Puppertino vendored CSS bundle (imports its parts)
      injectStylesheet('puppertino', '/vendor/puppertino/newfull.css');

      break;
    }
    case 'win': {
      removeStylesheet('neutral');
      removeStylesheet('puppertino');
      await ensureFluentRegistered();

      break;
    }
    case 'neutral':
    case 'linux': {
      removeStylesheet('puppertino');
      // Tailwind bundle compiled from src/lib/styles/neutral.css
      const module_ = (await import('../styles/neutral.css?url')) as { default: string };
      const href: string = module_.default;
      injectStylesheet('neutral', href);

      break;
    }
    default: {
      // other: keep base tokens only
      removeStylesheet('neutral');
      removeStylesheet('puppertino');
    }
  }

  // Notify listeners (DOM-level event for loose coupling)
  try {
    globalThis.dispatchEvent(new CustomEvent('aideon:ui-theme', { detail: resolved }));
  } catch {
    // ignore in non-DOM contexts
  }
}

export function getUiTheme(): UiTheme {
  return current;
}

export async function initUiTheme() {
  const saved = (localStorage.getItem('aideon.platform') as UiTheme | null) ?? 'auto';
  await setUiTheme(saved);
}

export function getResolvedUiTheme(): UiTheme {
  return resolvedCurrent;
}

export function onUiThemeChange(onChange: (t: UiTheme) => void): () => void {
  type ThemeEvent = CustomEvent<UiTheme>;
  const handler = (event: Event) => {
    const ce = event as ThemeEvent;
    onChange(ce.detail);
  };
  globalThis.addEventListener('aideon:ui-theme', handler as EventListener);
  return () => {
    globalThis.removeEventListener('aideon:ui-theme', handler as EventListener);
  };
}
