import type { MetaModelDocument } from '../../../dtos';

import { getMetaModelDocument } from 'praxis/praxis-api';

/**
 * Fetch the current meta-model document.
 *
 * - Delegates to the host contract (`praxis_metamodel_get`).
 */
export async function fetchMetaModel(): Promise<MetaModelDocument> {
  return getMetaModelDocument();
}
