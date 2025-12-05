declare module '@tauri-apps/api/core' {
  export function invoke<T = unknown>(
    command: string,
    arguments_?: Record<string, unknown>,
  ): Promise<T>
}
