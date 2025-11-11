/**
 * Shared TypeScript contracts for the adapter boundary.
 *
 * These types model the "time-first digital twin" primitives referenced in
 * AGENTS.md so the renderer can reason about temporal snapshots without
 * leaking backend-specific details. All adapters should depend on these
 * interfaces to guarantee interoperability between local and remote hosts.
 */

/** Internal brand used to distinguish ISO timestamps from arbitrary strings. */
declare const isoDateTimeBrand: unique symbol;

/**
 * ISO-8601 timestamp string (UTC). The brand prevents accidental assignment
 * from plain strings while remaining assignable after explicit validation.
 */
export type IsoDateTime = string & { readonly [isoDateTimeBrand]: true };

/**
 * Validates and normalises a string into an ISO-8601 timestamp (UTC).
 * Throws when the provided value cannot be parsed by `Date`.
 */
export function ensureIsoDateTime(value: string): IsoDateTime {
  try {
    const isoValue = new Date(value).toISOString();
    return isoValue as IsoDateTime;
  } catch (error) {
    throw new TypeError(`Value "${value}" is not a valid ISO-8601 timestamp.`, {
      cause: error,
    });
  }
}

/**
 * Identifies a temporal scenario (what-if branch). `undefined` means the
 * canonical production scenario.
 */
export type ScenarioKey = string | undefined;

/**
 * Confidence value for scenario projections. `undefined` denotes an
 * authoritative snapshot; numbers are percentages (0–100).
 */
export type ConfidencePercent = number | undefined;

/**
 * Summary metrics exposed to the UI for a time-sliced graph snapshot.
 * Additional fields can be added when the domain model matures.
 */
export interface GraphSnapshotMetrics {
  /** Total nodes that exist at the requested as-of timestamp. */
  nodeCount: number;
  /** Total edges that exist at the requested as-of timestamp. */
  edgeCount: number;
}

/** Parameters accepted by the `stateAt` call. */
export interface TemporalStateParameters {
  /** Commit identifier or branch handle; commit ids are preferred. */
  asOf: string;
  scenario?: ScenarioKey;
  confidence?: ConfidencePercent;
}

/**
 * Result of the `stateAt` call. Downstream consumers must treat this as
 * immutable to preserve snapshot semantics.
 */
export interface TemporalStateSnapshot {
  asOf: string;
  scenario?: ScenarioKey;
  confidence?: ConfidencePercent;
  metrics: GraphSnapshotMetrics;
}

export interface TemporalDiffParameters {
  from: string;
  to: string;
  scope?: Record<string, unknown>;
}

/** Simple diff stats for visual roll-ups. */
export interface TemporalDiffMetrics {
  nodeAdds: number;
  nodeMods: number;
  nodeDels: number;
  edgeAdds: number;
  edgeMods: number;
  edgeDels: number;
}

/** Result of the `diff` call. */
export interface TemporalDiffSnapshot {
  from: string;
  to: string;
  metrics: TemporalDiffMetrics;
}

export interface TemporalTopologyDeltaParameters {
  from: string;
  to: string;
}

export interface TemporalTopologyDeltaMetrics {
  nodeAdds: number;
  nodeDels: number;
  edgeAdds: number;
  edgeDels: number;
}

export interface TemporalTopologyDeltaSnapshot {
  from: string;
  to: string;
  metrics: TemporalTopologyDeltaMetrics;
}

/**
 * Minimal Plan Event schema as documented in AGENTS.md. Storage backends
 * can enrich the payload while preserving the core shape.
 */
export interface PlanEventEffect {
  op: 'create' | 'update' | 'delete' | 'link' | 'unlink';
  targetRef: string;
  payload: Record<string, unknown>;
}

export interface PlanEventSource {
  workPackage?: string;
  priority?: string;
}

export interface PlanEvent {
  id: string;
  name: string;
  effectiveAt: IsoDateTime;
  confidence: ConfidencePercent;
  source: PlanEventSource;
  effects: PlanEventEffect[];
}

export type MetaAttributeKind =
  | 'string'
  | 'text'
  | 'number'
  | 'datetime'
  | 'enum'
  | 'boolean'
  | 'blob';

export interface MetaModelAttribute {
  name: string;
  type: MetaAttributeKind;
  required?: boolean;
  enum?: string[];
}

export interface MetaModelType {
  id: string;
  label?: string;
  category?: string;
  extends?: string;
  attributes?: MetaModelAttribute[];
  effectTypes?: string[];
}

export interface MetaModelMultiplicity {
  from?: string;
  to?: string;
}

export interface MetaModelRelationship {
  id: string;
  label?: string;
  from: string[];
  to: string[];
  directed?: boolean;
  multiplicity?: MetaModelMultiplicity;
  attributes?: MetaModelAttribute[];
}

export interface MetaRelationshipRule {
  allowSelf?: boolean;
  allowDuplicate?: boolean;
}

export interface MetaValidationRules {
  attributes?: {
    string?: { maxLength?: number };
    text?: { maxLength?: number };
    enum?: { caseSensitive?: boolean };
  };
  relationships?: Record<string, MetaRelationshipRule>;
}

export interface MetaModelDocument {
  version: string;
  description?: string;
  types: MetaModelType[];
  relationships: MetaModelRelationship[];
  validation?: MetaValidationRules;
}

/**
 * Analytics job definitions exposed by the WorkerClient. These mirror the job
 * menu captured under “Contracts snapshot” in AGENTS.md.
 */
export interface WorkerJobMap {
  'Analytics.ShortestPath': {
    input: { from: string; to: string; maxHops: number };
    output: {
      path: string[];
      hopCount: number;
    };
  };
  'Analytics.Centrality': {
    input: { algorithm: 'degree' | 'betweenness'; scope?: Record<string, unknown> };
    output: {
      scores: { nodeRef: string; score: number }[];
    };
  };
  'Analytics.Impact': {
    input: { seedRefs: string[]; filters?: Record<string, unknown> };
    output: { impactedRefs: string[] };
  };
  'Temporal.StateAt': {
    input: TemporalStateParameters;
    output: TemporalStateSnapshot;
  };
  'Temporal.Diff': {
    input: TemporalDiffParameters;
    output: TemporalDiffSnapshot;
  };
  'Temporal.TopologyDelta': {
    input: TemporalTopologyDeltaParameters;
    output: TemporalTopologyDeltaSnapshot;
  };
  'Finance.TCO': {
    input: {
      scope: Record<string, unknown>;
      asOf: IsoDateTime;
      scenario?: ScenarioKey;
      policies?: string[];
    };
    output: { amount: number; currency: string };
  };
}

/** Discriminated union describing any known worker job. */
export type WorkerJobRequest = {
  [K in keyof WorkerJobMap]: { type: K; payload: WorkerJobMap[K]['input'] };
}[keyof WorkerJobMap];

/** Maps a job request to the corresponding output payload. */
export type WorkerJobResult<TJob extends WorkerJobRequest> = WorkerJobMap[TJob['type']]['output'];
