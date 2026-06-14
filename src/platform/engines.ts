import { PRAXIS_ENGINE } from 'praxis/engine';

import type { EngineDefinition } from './engine';

/**
 * All engines known to the host. Presence here does not imply availability —
 * the widget catalog filters by licensing. Add an engine's definition to light
 * up its widgets when licensed.
 */
export const ENGINES: readonly EngineDefinition[] = [PRAXIS_ENGINE];
