import type { IsoDateTime } from './iso';

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
  confidence: number | undefined;
  source: PlanEventSource;
  effects: PlanEventEffect[];
}
