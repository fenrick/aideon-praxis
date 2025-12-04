import { mountWindow } from './bootstrap';

import './about-window.css';

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

if (import.meta.env.MODE !== 'test') {
  mountWindow(<AboutWindow />);
}
