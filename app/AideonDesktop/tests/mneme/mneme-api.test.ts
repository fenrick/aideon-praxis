import { describe, expect, it } from 'vitest';

import { MNEME_IPC_COMMANDS, __test__ } from '@/workspaces/mneme/mneme-api';

describe('mneme API helper coverage', () => {
  it('formats Error instances', () => {
    const error = new Error('boom');
    expect(__test__.formatIpcError(error)).toBe('boom');
  });

  it('formats objects with message property', () => {
    const payload = { message: 'host-error' };
    expect(__test__.formatIpcError(payload)).toBe('host-error');
  });

  it('falls back to string conversion for other values', () => {
    expect(__test__.formatIpcError(42)).toBe('42');
  });

  it('keeps invoke arguments shape intact', () => {
    const payload = { foo: 'bar' };
    expect(__test__.toInvokeArguments(payload)).toBe(payload);
  });

  it('exports mneme IPC commands', () => {
    expect(MNEME_IPC_COMMANDS.listJobs).toBe('mneme_store_list_jobs');
    expect(MNEME_IPC_COMMANDS.compileEffectiveSchema).toBe('mneme_store_compile_effective_schema');
  });
});
