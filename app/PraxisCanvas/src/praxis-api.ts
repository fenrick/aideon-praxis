import { invoke } from '@tauri-apps/api/core';
import { isTauri } from './platform';

export interface WorkerHealth {
  ok: boolean;
  timestamp_ms: number;
  latency_ms?: number;
  status?: string;
  notes?: string;
}

const MOCK_HEALTH: WorkerHealth = {
  ok: true,
  timestamp_ms: Date.now(),
  status: 'mock',
  notes: 'Using mock health state outside Tauri',
};

export async function getWorkerHealth(): Promise<WorkerHealth> {
  if (!isTauri()) {
    return { ...MOCK_HEALTH, timestamp_ms: Date.now() };
  }

  return invoke<WorkerHealth>('worker_health');
}
