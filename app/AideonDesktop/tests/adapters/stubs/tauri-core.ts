export const invoke = async (
  _command: string,
  _arguments?: Record<string, unknown>,
): Promise<never> => {
  await Promise.resolve();
  throw new Error('tauri invoke stub not mocked');
};
