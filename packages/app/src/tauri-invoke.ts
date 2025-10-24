// Re-export Tauri's `invoke` as a narrow import for the renderer.
//
// Keeping a single import surface makes it easy to replace or stub in tests,
// and avoids accidental broad imports of Tauri APIs in components.
export { invoke as tauriInvoke } from '@tauri-apps/api/core';
