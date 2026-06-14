import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { LicensingProvider, useLicensing } from 'platform/licensing';

describe('licensing', () => {
  it('licenses praxis by default and gates other engines', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <LicensingProvider>{children}</LicensingProvider>
    );
    const { result } = renderHook(() => useLicensing(), { wrapper });

    expect(result.current.licensed('praxis')).toBe(true);
    expect(result.current.licensed('metis')).toBe(false);
    expect(result.current.licensed('mneme')).toBe(false);
  });

  it('applies entitlement overrides over the defaults', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <LicensingProvider licensed={{ metis: true, praxis: false }}>{children}</LicensingProvider>
    );
    const { result } = renderHook(() => useLicensing(), { wrapper });

    expect(result.current.licensed('metis')).toBe(true);
    expect(result.current.licensed('praxis')).toBe(false);
  });

  it('falls back to defaults outside a provider', () => {
    const { result } = renderHook(() => useLicensing());
    expect(result.current.licensed('praxis')).toBe(true);
    expect(result.current.licensed('kairos')).toBe(false);
  });
});
