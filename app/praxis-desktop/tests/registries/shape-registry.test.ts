import { beforeEach, describe, expect, it } from 'vitest';
import {
  __clearShapesForTest,
  getShape,
  listShapes,
  registerShape,
} from '../../src/lib/registries/shape-registry';

describe('shape registry', () => {
  beforeEach(() => __clearShapesForTest());

  it('registers and retrieves shape definitions', () => {
    const Dummy = {} as unknown; // component placeholder
    registerShape({ id: 'node.rect', component: Dummy, defaultProps: { r: 6 } });
    const def = getShape('node.rect');
    expect(def?.id).toBe('node.rect');
    expect(listShapes().length).toBe(1);
  });

  it('throws on invalid definition', () => {
    expect(() => registerShape({ id: '', component: {} as unknown })).toThrow();
  });
});
