import React from 'react';
import { createRoot } from 'react-dom/client';

/**
 * Minimal renderer entry. Demonstrates access to the preload bridge
 * and renders a simple status stub.
 */
const App: React.FC = () => {
  // Access exposed preload API under strict isolation
  const version = (window as any).aideon?.version ?? 'dev';
  return (
    <div style={{ fontFamily: 'system-ui', padding: 16 }}>
      <h1>Aideon Praxis</h1>
      <p>Renderer booted. Bridge version: {version}</p>
      <p>Follow AGENTS.md: adapters only, no backend specifics here.</p>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);

export {};
