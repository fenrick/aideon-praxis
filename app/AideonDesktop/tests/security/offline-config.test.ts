import { afterEach, describe, expect, it, vi } from 'vitest';

describe('offline-first Next config', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('exports a static app with no production asset prefix', async () => {
    process.env.NODE_ENV = 'production';
    const { default: nextConfig } = await import('../../next.config.mjs');
    expect(nextConfig.output).toBe('export');
    expect(nextConfig.assetPrefix).toBeUndefined();
    expect(nextConfig.images?.unoptimized).toBe(true);
  });

  it('limits assetPrefix to loopback host in development', async () => {
    process.env.NODE_ENV = 'development';
    process.env.TAURI_DEV_HOST = '127.0.0.1';
    const { default: nextConfig } = await import('../../next.config.mjs');
    expect(nextConfig.assetPrefix).toContain('127.0.0.1:1420');
  });
});
