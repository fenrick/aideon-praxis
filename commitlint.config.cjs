module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Allow longer PR titles/commit headers for clarity
    'header-max-length': [2, 'always', 200],
  },
};
