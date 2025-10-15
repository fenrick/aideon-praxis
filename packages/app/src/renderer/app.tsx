import React, { useEffect, useState } from 'react';

const App: React.FC = () => {
  const api = (globalThis as unknown as Window).aideon;
  const version = api.version;
  const [stateAt, setStateAt] = useState<null | {
    asOf: string;
    scenario: string | null;
    confidence: number | null;
    nodes: number;
    edges: number;
  }>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const result = await api.stateAt({ asOf: '2025-01-01' });
        if (!cancelled) setStateAt(result);
      } catch (error_) {
        if (!cancelled) setError(String(error_));
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ fontFamily: 'system-ui', padding: 16 }}>
      <h1>Aideon Praxis</h1>
      <p>Renderer booted. Bridge version: {version}</p>
      {import.meta.env.DEV && (
        <p style={{ opacity: 0.75 }}>
          Follow AGENTS.md: adapters only, no backend specifics here.
        </p>
      )}
      <hr />
      <h2>Worker Connectivity</h2>
      {error && <p style={{ color: 'crimson' }}>Error: {error}</p>}
      {stateAt ? (
        <pre style={{ background: '#f6f8fa', padding: 12, borderRadius: 6 }}>
          {JSON.stringify(stateAt, null, 2)}
        </pre>
      ) : (
        <p>Querying worker…</p>
      )}
    </div>
  );
};

export default App;
