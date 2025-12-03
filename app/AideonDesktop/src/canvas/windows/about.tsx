import { createRoot } from 'react-dom/client';

import './about-window.css';

function AboutWindow() {
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

const aboutRoot = document.querySelector('#root');
if (aboutRoot) {
  createRoot(aboutRoot).render(<AboutWindow />);
}
