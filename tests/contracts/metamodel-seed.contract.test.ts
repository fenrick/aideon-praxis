import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

// Acceptance gate for issue #343 (M1 seed-shape finalisation):
//
// 1. No type has an unresolved `extends` target (dangling-extends is a hard
//    package error per ADR-0038).
// 2. Every symbol UUID in core-v1.json is reproducible from the recorded
//    namespace + name path; a mismatch is a package error (ADR-0038).
// 3. Every relationship declares allowSelf, allowDuplicate, and multiplicity
//    explicitly; every attribute declares cardinality.

const SEED_PATH = path.resolve('docs/data/meta/core-v1.json');

interface AttributeDefinition {
  name: string;
  uuid: string;
  cardinality?: string;
  [key: string]: unknown;
}

interface TypeDefinition {
  id: string;
  uuid: string;
  extends?: string;
  attributes: AttributeDefinition[];
}

interface RelationshipDefinition {
  id: string;
  uuid: string;
  allowSelf?: boolean;
  allowDuplicate?: boolean;
  multiplicity?: { from: string; to: string };
  attributes?: AttributeDefinition[];
}

interface SeedPackage {
  symbol_uuid: {
    algorithm: string;
    namespace: string;
    name_path_version: number;
  };
}

interface Seed {
  package: SeedPackage;
  types: TypeDefinition[];
  relationships: RelationshipDefinition[];
}

/**
 * Compute a UUIDv5 (SHA-1 name-based UUID per RFC 9562) from a namespace UUID
 * string and a UTF-8 name string. SHA-1 is mandated by the UUIDv5 standard;
 * this is not a security-sensitive context.
 * @param namespace The namespace UUID string (hex-hyphenated).
 * @param name The UTF-8 name string to hash.
 */
function uuidv5(namespace: string, name: string): string {
  const nsBytes = Buffer.from(namespace.replaceAll('-', ''), 'hex');
  // codeql[js/weak-cryptographic-algorithm] -- SHA-1 is mandated by UUIDv5 (RFC 9562 §5.5); not a security context
  // eslint-disable-next-line sonarjs/hashing -- SHA-1 is mandated by UUIDv5 (RFC 9562 §5.5); not a security context
  const hash = crypto.createHash('sha1').update(nsBytes).update(name, 'utf8').digest();
  // Version 5 in the high nibble of byte 6; RFC variant in byte 8.
  hash[6] = ((hash[6] ?? 0) & 0x0f) | 0x50;
  hash[8] = ((hash[8] ?? 0) & 0x3f) | 0x80;
  const h = hash.subarray(0, 16).toString('hex');
  return [h.slice(0, 8), h.slice(8, 12), h.slice(12, 16), h.slice(16, 20), h.slice(20, 32)].join(
    '-',
  );
}

const seed = JSON.parse(readFileSync(SEED_PATH, 'utf8')) as Seed;
const ns = seed.package.symbol_uuid.namespace;
const typeIds = new Set(seed.types.map((type) => type.id));

describe('core-v1.json seed-shape contract (#343)', () => {
  it('has package.symbol_uuid with algorithm=uuidv5 and a recorded namespace', () => {
    expect(seed.package.symbol_uuid.algorithm).toBe('uuidv5');
    expect(seed.package.symbol_uuid.namespace).toMatch(
      /^[\da-f]{8}-[\da-f]{4}-5[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/,
    );
    expect(seed.package.symbol_uuid.name_path_version).toBe(1);
  });

  describe('no dangling extends (hard package error)', () => {
    it('no type has an unresolved extends target', () => {
      const dangling = seed.types.filter(
        (type) => type.extends !== undefined && !typeIds.has(type.extends),
      );
      expect(dangling.map((type) => `${type.id} extends ${type.extends ?? '?'}`)).toEqual([]);
    });
  });

  describe('symbol UUIDs are reproducible from namespace + name path', () => {
    for (const type of seed.types) {
      it(`type ${type.id} uuid matches uuidv5(ns, "type:${type.id}")`, () => {
        expect(type.uuid).toBe(uuidv5(ns, `type:${type.id}`));
      });

      for (const attribute of type.attributes) {
        const namePath = `type:${type.id}/attribute:${attribute.name}`;
        it(`${type.id}/${attribute.name} uuid matches uuidv5(ns, "${namePath}")`, () => {
          expect(attribute.uuid).toBe(uuidv5(ns, namePath));
        });
      }
    }

    for (const relationship of seed.relationships) {
      it(`relationship ${relationship.id} uuid matches uuidv5(ns, "relationship:${relationship.id}")`, () => {
        expect(relationship.uuid).toBe(uuidv5(ns, `relationship:${relationship.id}`));
      });

      for (const attribute of relationship.attributes ?? []) {
        const namePath = `relationship:${relationship.id}/attribute:${attribute.name}`;
        it(`${relationship.id}/${attribute.name} uuid matches uuidv5(ns, "${namePath}")`, () => {
          expect(attribute.uuid).toBe(uuidv5(ns, namePath));
        });
      }
    }
  });

  describe('all relationships have explicit structural rules', () => {
    for (const relationship of seed.relationships) {
      it(`${relationship.id} declares allowSelf`, () => {
        expect(typeof relationship.allowSelf).toBe('boolean');
      });
      it(`${relationship.id} declares allowDuplicate`, () => {
        expect(typeof relationship.allowDuplicate).toBe('boolean');
      });
      it(`${relationship.id} declares multiplicity.from and multiplicity.to`, () => {
        expect(relationship.multiplicity).toBeDefined();
        expect(typeof relationship.multiplicity?.from).toBe('string');
        expect(typeof relationship.multiplicity?.to).toBe('string');
      });
    }
  });

  describe('all attribute slots declare cardinality', () => {
    for (const type of seed.types) {
      for (const attribute of type.attributes) {
        it(`${type.id}.${attribute.name} declares cardinality`, () => {
          expect(attribute.cardinality).toBeDefined();
        });
      }
    }
    for (const relationship of seed.relationships) {
      for (const attribute of relationship.attributes ?? []) {
        it(`${relationship.id}.${attribute.name} declares cardinality`, () => {
          expect(attribute.cardinality).toBeDefined();
        });
      }
    }
  });
});
