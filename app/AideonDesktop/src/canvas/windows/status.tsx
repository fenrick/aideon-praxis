import { mountWindow } from './bootstrap';

import './status-window.css';

/**
 * Status window showing bridge readiness.
 * @returns Status window component.
 */
export function StatusWindow() {
  const version = (globalThis as { aideon?: { version?: string } }).aideon?.version ?? 'unknown';

  return (
    <div className="status">
      <div className="status-row">
        <span className="indicator" aria-hidden="true" />
        <strong>Status:</strong>
        <span>Ready</span>
      </div>
      <div className="bridge">
        Bridge:
        {version}
      </div>
    </div>
  );
}

/**
 * Determine runtime mode from Vite import meta.
 * @returns Runtime mode string.
 */
function getRuntimeMode(): string {
  const meta: unknown = import.meta;
  if (
    meta &&
    typeof meta === 'object' &&
    'env' in meta &&
    (meta as { env?: { MODE?: unknown } }).env &&
    typeof (meta as { env?: { MODE?: unknown } }).env?.MODE === 'string'
  ) {
    return (meta as { env?: { MODE?: unknown } }).env?.MODE as string;
  }
  return 'development';
}

const runtimeMode = getRuntimeMode();
if (runtimeMode !== 'test') {
  mountWindow(<StatusWindow />);
}
