import React from 'react';

/**
 * Minimal renderer App component.
 * Reads version from the preload bridge.
 */
const App: React.FC = () => {
  const version = (globalThis as any).aideon?.version ?? 'dev';
  return (
    <div style={{ fontFamily: 'system-ui', padding: 16 }}>
      <h1>Aideon Praxis</h1>
      <p>Renderer booted. Bridge version: {version}</p>
      <p>Follow AGENTS.md: adapters only, no backend specifics here.</p>
    </div>
  );
};

export default App;
