import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { Ajv2020, type ValidateFunction } from 'ajv/dist/2020';
import { describe, expect, it } from 'vitest';

// M0 exit gate (docs/build-contracts/M0-foundation.md): "Every op-kind valid
// fixture validates against its schema" and "every invalid fixture is rejected."
// This proves the tier-4 fixtures against the tier-2 schemas (ADR-0037 contract
// precedence). The README contract: each fixture is a full canonical operation
// record whose envelope validates against `op-envelope.schema.json` and whose
// `payload` validates against the matching `<kind>.schema.json`; the
// `op-envelope` fixtures are validated as whole records against the envelope
// schema. Unmatched files are a failure, not a warning — silent fixture drift
// is the failure mode this guards. Every schema must ship with a valid + invalid
// fixture; if an exemption is ever genuinely needed, add an explicit allowlist
// here rather than weakening the guard.

const SCHEMA_DIR = path.resolve('docs/contracts/operations');
const FIXTURE_DIR = path.resolve('docs/data/fixtures/operations');
const ENVELOPE_KIND = 'op-envelope';

/**
 * Parse a JSON file into an unknown value.
 * @param file Absolute path to the JSON file.
 */
function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, 'utf8'));
}

/** Operation kinds that have a schema, derived from `<kind>.schema.json`. */
function schemaKinds(): string[] {
  return readdirSync(SCHEMA_DIR)
    .filter((f) => f.endsWith('.schema.json'))
    .map((f) => f.replace(/\.schema\.json$/, ''))
    .toSorted((a, b) => a.localeCompare(b));
}

/**
 * Operation kinds that have a `<kind>.<suffix>.json` fixture.
 * @param suffix Fixture polarity — `valid` or `invalid`.
 */
function fixtureKinds(suffix: 'valid' | 'invalid'): string[] {
  const tail = `.${suffix}.json`;
  return readdirSync(FIXTURE_DIR)
    .filter((f) => f.endsWith(tail))
    .map((f) => f.slice(0, -tail.length));
}

// One Ajv instance with every schema registered so internal $refs resolve.
const ajv = new Ajv2020({ strict: false, allErrors: true });
const kinds = schemaKinds();
const validators = new Map<string, ValidateFunction>();
for (const kind of kinds) {
  ajv.addSchema(readJson(path.join(SCHEMA_DIR, `${kind}.schema.json`)) as object, kind);
  validators.set(kind, ajv.getSchema(kind) as ValidateFunction);
}
const validateEnvelope = validators.get(ENVELOPE_KIND);

/**
 * A full record is valid iff its envelope validates and, for typed kinds, its
 * payload validates against the matching `<kind>` schema.
 * @param kind The operation kind (schema basename).
 * @param record The full canonical operation record under test.
 */
function recordIsValid(kind: string, record: unknown): boolean {
  if (!validateEnvelope?.(record)) return false;
  if (kind === ENVELOPE_KIND) return true;
  const payload = (record as { payload?: unknown }).payload;
  return Boolean(validators.get(kind)?.(payload));
}

describe('operation fixtures ↔ schemas (M0 tier-4 oracle)', () => {
  it('has an op-envelope schema (the envelope authority)', () => {
    expect(kinds, 'op-envelope.schema.json must exist').toContain(ENVELOPE_KIND);
    expect(validateEnvelope).toBeDefined();
  });

  it('every schema has a valid + invalid fixture (no fixtureless schema)', () => {
    const haveValid = new Set(fixtureKinds('valid'));
    const haveInvalid = new Set(fixtureKinds('invalid'));
    const missing: string[] = [];
    for (const kind of kinds) {
      if (!haveValid.has(kind)) missing.push(`${kind}.valid.json`);
      if (!haveInvalid.has(kind)) missing.push(`${kind}.invalid.json`);
    }
    expect(missing, `schemas missing fixtures: ${missing.join(', ')}`).toEqual([]);
  });

  it('every fixture matches a schema (no orphan fixture)', () => {
    const known = new Set(kinds);
    const orphans = [...new Set([...fixtureKinds('valid'), ...fixtureKinds('invalid')])].filter(
      (kind) => !known.has(kind),
    );
    expect(orphans, `fixtures with no schema: ${orphans.join(', ')}`).toEqual([]);
  });

  it.each(kinds)('%s: valid fixture passes its schema', (kind) => {
    expect(recordIsValid(kind, readJson(path.join(FIXTURE_DIR, `${kind}.valid.json`)))).toBe(true);
  });

  it.each(kinds)('%s: invalid fixture is rejected', (kind) => {
    expect(recordIsValid(kind, readJson(path.join(FIXTURE_DIR, `${kind}.invalid.json`)))).toBe(
      false,
    );
  });
});
