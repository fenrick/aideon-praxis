import { info } from '@tauri-apps/plugin-log';
import './tauri-shim';

function render(): void {
  const root = document.querySelector('#root');
  if (!root) return;
  interface A {
    aideon?: { version?: string };
  }
  const w = globalThis as unknown as A;
  const version: string = w.aideon?.version ?? 'unknown';
  root.innerHTML = `
    <div style="padding:12px; font: 13px/1.4 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', Arial, sans-serif;">
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#2ecc71"></span>
        <strong>Status:</strong> Ready
      </div>
      <div style="opacity:.8;margin-top:6px;">Bridge: ${version}</div>
    </div>
  `;
}

render();

try {
  await info('status: window loaded');
} catch (error_: unknown) {
  if (import.meta.env.DEV) {
    console.warn('status: failed to log load message', error_);
  }
}
