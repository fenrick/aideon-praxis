import React, { useEffect, useState } from 'react';

const App: React.FC = () => {
  const version = (typeof aideon !== 'undefined' ? aideon.version : 'dev');
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
        if (typeof aideon !== 'undefined' && aideon.stateAt) {
          const result = await aideon.stateAt({ asOf: '2025-01-01' });
          if (!cancelled) setStateAt(result);
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
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
      <p>Follow AGENTS.md: adapters only, no backend specifics here.</p>
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
