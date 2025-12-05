import { mountWindow } from './bootstrap';

import './about-window.css';

/**
 *
 */
export function AboutWindow() {
  return (
    <main className="about-shell">
      <div className="about-panel">
        <img className="mark" src="/app-icon.png" alt="Aideon Praxis" />
        <div className="col">
          <h1 className="title">Aideon&nbsp;Praxis</h1>
          <div className="meta">Twin-orbit decision tooling · © Aideon</div>
        </div>
      </div>
    </main>
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
  mountWindow(<AboutWindow />);
}
