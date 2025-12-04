import { useEffect, useState } from 'react';
import { mountWindow } from './bootstrap';

import './status-window.css';

export function StatusWindow() {
  const [version, setVersion] = useState('unknown');

  useEffect(() => {
    const globalAideon = (globalThis as { aideon?: { version?: string } }).aideon;
    setVersion(globalAideon?.version ?? 'unknown');
    console.info('status: window loaded');
  }, []);

  return (
    <div className="status">
      <div className="status-row">
        <span className="indicator" aria-hidden="true" />
        <strong>Status:</strong>
        <span>Ready</span>
      </div>
      <div className="bridge">Bridge: {version}</div>
    </div>
  );
}

if (import.meta.env.MODE !== 'test') {
  mountWindow(<StatusWindow />);
}
