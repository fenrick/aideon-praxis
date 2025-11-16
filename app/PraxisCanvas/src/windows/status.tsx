import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import './status-window.css';

function StatusWindow() {
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

const statusRoot = document.getElementById('root');
if (statusRoot) {
  createRoot(statusRoot).render(<StatusWindow />);
}
