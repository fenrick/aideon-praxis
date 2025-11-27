/**
 * Prettier configuration for the React-only workspace.
 * Explicitly list plugins to avoid Prettier auto-loading legacy Svelte plugins.
 */
export default {
  plugins: ['prettier-plugin-organize-imports'],
  pluginSearchDirs: false,
};
