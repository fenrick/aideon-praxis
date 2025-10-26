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
