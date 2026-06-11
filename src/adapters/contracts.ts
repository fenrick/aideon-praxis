/**
 * Shared TypeScript contracts for the adapter boundary.
 *
 * These types model the "time-first digital twin" primitives referenced in
 * AGENTS.md so the renderer can reason about temporal snapshots without
 * leaking backend-specific details. All adapters should depend on these
 * interfaces to guarantee interoperability between local and remote hosts.
 */

export { ensureIsoDateTime } from '../dtos';
export type {
  ConfidencePercent,
  GraphSnapshotMetrics,
  IsoDateTime,
  MetaAttributeKind,
  MetaModelAttribute,
  MetaModelDocument,
  MetaModelMultiplicity,
  MetaModelRelationship,
  MetaModelType,
  MetaRelationshipRule,
  MetaValidationRules,
  PlanEvent,
  PlanEventEffect,
  PlanEventSource,
  ScenarioKey,
  TemporalDiffMetrics,
  TemporalDiffParameters,
  TemporalDiffSnapshot,
  TemporalResultMeta,
  TemporalStateParameters,
  TemporalStateSnapshot,
  TemporalTopologyDeltaMetrics,
  TemporalTopologyDeltaParameters,
  TemporalTopologyDeltaSnapshot,
  WorkerHealth,
} from '../dtos';

import type {
  IsoDateTime,
  ScenarioKey,
  TemporalDiffParameters,
  TemporalDiffSnapshot,
  TemporalStateParameters,
  TemporalStateSnapshot,
  TemporalTopologyDeltaParameters,
  TemporalTopologyDeltaSnapshot,
} from '../dtos';

/**
 * Analytics job definitions exposed by the WorkerClient. These mirror the job
 * menu captured under “Contracts snapshot” in AGENTS.md.
 */
export interface WorkerJobMap {
  analytics_shortest_path: {
    input: { from: string; to: string; maxHops: number };
    output: {
      path: string[];
      hopCount: number;
    };
  };
  analytics_centrality: {
    input: { algorithm: 'degree' | 'betweenness'; scope?: Record<string, unknown> };
    output: {
      scores: { nodeRef: string; score: number }[];
    };
  };
  analytics_impact: {
    input: { seedRefs: string[]; filters?: Record<string, unknown> };
    output: { impactedRefs: string[] };
  };
  temporal_state_at: {
    input: TemporalStateParameters;
    output: TemporalStateSnapshot;
  };
  temporal_diff: {
    input: TemporalDiffParameters;
    output: TemporalDiffSnapshot;
  };
  temporal_topology_delta: {
    input: TemporalTopologyDeltaParameters;
    output: TemporalTopologyDeltaSnapshot;
  };
  finance_tco: {
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
