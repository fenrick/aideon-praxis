'use client';

import { NextIntlClientProvider } from 'next-intl';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';

import en from 'locales/en.json';

export const LOCALES = ['en', 'es', 'fr', 'de', 'ja'] as const;
export type AppLocale = (typeof LOCALES)[number];
export type Messages = typeof en;

const DEFAULT_LOCALE: AppLocale = 'en';
const STORAGE_KEY = 'aideon.locale';

// Static export has no request-time server, so locale switching is a client
// preference (like ColorThemeProvider), not URL-based next-intl routing.
//
// Written as an explicit switch (not a Record<AppLocale, loader> keyed by a
// variable) so the locale never selects which import runs via a dynamic
// property lookup — each branch is a statically-known call.
/**
 * Load the message catalog for a locale.
 * @param locale - Locale to load messages for.
 */
function loadMessages(locale: AppLocale): Promise<Messages> {
  switch (locale) {
    case 'en': {
      return Promise.resolve(en);
    }
    case 'es': {
      return import('locales/es.json').then((module) => module.default);
    }
    case 'fr': {
      return import('locales/fr.json').then((module) => module.default);
    }
    case 'de': {
      return import('locales/de.json').then((module) => module.default);
    }
    case 'ja': {
      return import('locales/ja.json').then((module) => module.default);
    }
  }
}

/**
 * Read the persisted locale from local storage.
 */
function resolveStoredLocale(): AppLocale {
  try {
    const stored = globalThis.window.localStorage.getItem(STORAGE_KEY);
    if (stored && LOCALES.includes(stored as AppLocale)) {
      return stored as AppLocale;
    }
  } catch {
    return DEFAULT_LOCALE;
  }
  return DEFAULT_LOCALE;
}

/**
 * Persist the selected locale for later sessions.
 * @param locale - Locale identifier to persist.
 */
function persistLocale(locale: AppLocale) {
  try {
    globalThis.window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Ignore persistence failures (e.g., private mode)
  }
}

interface LocaleContextValue {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  locales: readonly AppLocale[];
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

/**
 * Provide the active locale and translated messages to the app.
 * @param root0 - Provider props.
 * @param root0.children - Children to render.
 */
export function AppLocaleProvider({ children }: { readonly children: ReactNode }) {
  const [locale, setLocaleState] = useReducer(
    (_state: AppLocale, next: AppLocale) => next,
    DEFAULT_LOCALE,
  );
  const [messages, setMessages] = useReducer((_state: Messages, next: Messages) => next, en);

  useEffect(() => {
    setLocaleState(resolveStoredLocale());
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      const loaded = await loadMessages(locale);
      if (controller.signal.aborted) {
        return;
      }
      setMessages(loaded);
      persistLocale(locale);
    })();

    return () => {
      controller.abort();
    };
  }, [locale]);

  const setLocale = useCallback((next: AppLocale) => {
    setLocaleState(LOCALES.includes(next) ? next : DEFAULT_LOCALE);
  }, []);

  const contextValue = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, locales: LOCALES }),
    [locale, setLocale],
  );

  return (
    <LocaleContext.Provider value={contextValue}>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}

/**
 * Access locale state and controls.
 */
export function useAppLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useAppLocale must be used within AppLocaleProvider');
  }
  return context;
}
