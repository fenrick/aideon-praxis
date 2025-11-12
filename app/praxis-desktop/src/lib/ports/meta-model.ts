import type { MetaModelDocument } from '@aideon/praxis-adapters/contracts';
import { invoke } from '@tauri-apps/api/core';

export interface MetaModelPort {
  fetch(): Promise<MetaModelDocument>;
}

export const metaModelPort: MetaModelPort = {
  async fetch(): Promise<MetaModelDocument> {
    return invoke<MetaModelDocument>('temporal_metamodel_get');
  },
};
