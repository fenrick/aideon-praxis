import type { IsoDateTime } from './iso';

export type ScenarioKey = string | undefined;
export type ConfidencePercent = number | undefined;

export interface GraphSnapshotMetrics {
  nodeCount: number;
  edgeCount: number;
}

export interface TemporalStateParameters {
  asOf: string;
  scenario?: ScenarioKey;
  confidence?: ConfidencePercent;
}

export interface TemporalStateSnapshot {
  asOf: string;
  scenario?: ScenarioKey;
  confidence?: ConfidencePercent;
  nodes: number;
  edges: number;
}

export interface TemporalDiffParameters {
  from: string;
  to: string;
  scope?: string;
}

export interface TemporalDiffMetrics {
  nodeAdds: number;
  nodeMods: number;
  nodeDels: number;
  edgeAdds: number;
  edgeMods: number;
  edgeDels: number;
}

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

export interface TemporalResultMeta {
  effectiveAt: IsoDateTime;
  confidence?: ConfidencePercent;
}
