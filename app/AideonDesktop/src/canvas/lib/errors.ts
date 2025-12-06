/**
 * Convert an unknown thrown value into a user-friendly error message.
 * @param {unknown} error Value captured from a thrown error or rejection.
 * @returns {string} Best-effort message derived from the value.
 */
export function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
