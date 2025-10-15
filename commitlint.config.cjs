module.exports = {
  extends: ['@commitlint/config-conventional'],
  // Ignore Dependabot-generated commits (they often contain long auto-generated bodies/links)
  ignores: [
    (message) => message.includes('Signed-off-by: dependabot[bot]'),
    (message) => message.startsWith('build(deps)'),
  ],
  rules: {
    // Allow longer PR titles/commit headers for clarity
    'header-max-length': [2, 'always', 200],
    // Keep body lines flexible; long release notes/links are common
    'body-max-line-length': [1, 'always', 0],
  },
};
