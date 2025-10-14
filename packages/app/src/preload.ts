import { contextBridge } from 'electron';
import { version } from './version';

/**
 * Preload script executed in an isolated context.
 * Exposes a minimal, typed bridge to the renderer.
 * Do not add backend-specific logic here; route calls via adapters/host APIs.
 */

// Minimal, typed-safe preload bridge. Extend via adapters/host APIs only.
contextBridge.exposeInMainWorld('aideon', { version });
