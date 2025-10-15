import { contextBridge, ipcRenderer } from 'electron';
import { version } from './version';

/**
 * Preload script executed in an isolated context.
 * Exposes a minimal, typed bridge to the renderer.
 * Do not add backend-specific logic here; route calls via adapters/host APIs.
 */

// Minimal, typed-safe preload bridge. Extend via adapters/host APIs only.
interface StateAtArguments {
  asOf: string;
  scenario?: string;
  confidence?: number;
}
interface StateAtResult {
  asOf: string;
  scenario: string | null;
  confidence: number | null;
  nodes: number;
  edges: number;
}

contextBridge.exposeInMainWorld('aideon', {
  version,
  stateAt: async (arguments_: StateAtArguments): Promise<StateAtResult> => {
    return (await ipcRenderer.invoke('worker:state_at', arguments_)) as StateAtResult;
  },
});
