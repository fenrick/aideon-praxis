import { useEffect, useState } from 'react';
import { mountWindow } from './bootstrap';

import './status-window.css';

/**
 *
 */
export function StatusWindow() {
  const initialVersion = (globalThis as { aideon?: { version?: string } }).aideon?.version ?? 'unknown';
  const [version] = useState(initialVersion);

  useEffect(() => {
    console.info('status: window loaded');
  }, []);

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
