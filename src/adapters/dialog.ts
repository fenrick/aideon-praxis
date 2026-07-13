import { isTauriRuntime } from '@/lib/runtime';

/**
 * Open the OS-native folder picker to choose a workspace root, via
 * `tauri-plugin-dialog` ([CLAUDE.md]: use the bundled plugins, never roll your
 * own file handling). Returns the chosen absolute path, or `undefined` if the
 * user cancels — or when running outside the Tauri runtime (Storybook, tests,
 * the browser preview), where no native dialog exists.
 *
 * The plugin module is imported dynamically so a non-Tauri bundle never pulls a
 * runtime that expects `window.__TAURI__`.
 *
 * This module is a plain adapter (no React context, so no `useTranslations`
 * hook is available here). `title` defaults to the English copy but callers
 * that can resolve a translation — e.g. via
 * `useTranslations('adapters.dialog')` and `t('chooseWorkspaceFolder')` —
 * should pass the localized string in explicitly.
 * @param title - Native dialog title. Defaults to the English fallback.
 */
export async function pickWorkspaceFolder(
  title = 'Choose a workspace folder',
): Promise<string | undefined> {
  if (!isTauriRuntime()) {
    return undefined;
  }
  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({
    directory: true,
    multiple: false,
    title,
  });
  return typeof selected === 'string' ? selected : undefined;
}
