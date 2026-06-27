import { describe, expect, it } from 'vitest';

import { validateAgentBrief } from '../../.github/scripts/validate-agent-brief.mjs';

// ---------------------------------------------------------------------------
// Shared helpers — build a minimal complete form-issue body with overrides
// ---------------------------------------------------------------------------

interface SectionOverrides {
  outcome?: string;
  sources?: string;
  scope?: string;
  acceptance?: string;
  nonGoals?: string;
  designQuestions?: string;
  ack?: string;
}

function makeFormIssue(overrides: SectionOverrides = {}): string {
  const {
    outcome = 'outcome' in overrides
      ? overrides.outcome
      : '### Outcome\n\nThe gate validates issues.',
    sources = '### Authoritative sources (in precedence order)\n\n- docs/build-contracts/agent-issue-template.md',
    scope = '### Scope — files / crates / modules that may change\n\n- .github/workflows/agent-brief-gate.yml',
    acceptance = '### Acceptance scenarios mapped to named tests\n\nGiven a complete brief, the gate posts a ✓ comment.',
    nonGoals = '### Non-goals\n\nDo not gate other labels.',
    designQuestions = '### Design questions resolved\n\nNo unresolved design questions after checking the template.',
    ack = '### Agent-readiness acknowledgement\n\n- [x] Any unresolved design question makes this issue `ready-for-human`, not `ready-for-agent` — and an agent that encounters one mid-task must stop and return it for human review with the question named.',
  } = overrides;

  return [outcome, sources, scope, acceptance, nonGoals, designQuestions, ack]
    .filter(Boolean)
    .join('\n\n');
}

function makeManualBrief(overrides: SectionOverrides = {}): string {
  const {
    outcome = '## Outcome\n\nThe gate validates issues.',
    sources = '## Authoritative sources\n\n- docs/build-contracts/agent-issue-template.md',
    scope = '## Scope\n\n- .github/workflows/agent-brief-gate.yml',
    acceptance = '## Acceptance criteria\n\nGiven a complete brief, the gate posts a ✓ comment.',
    nonGoals = '## Non-goals\n\nDo not gate other labels.',
    designQuestions = '## Design questions resolved\n\nNo unresolved design questions.',
  } = overrides;

  return [outcome, sources, scope, acceptance, nonGoals, designQuestions]
    .filter(Boolean)
    .join('\n\n');
}

// ---------------------------------------------------------------------------
// Passing cases
// ---------------------------------------------------------------------------

describe('validateAgentBrief — passing', () => {
  it('accepts a complete form-created issue (### headings + checked ack)', () => {
    const { valid, missing } = validateAgentBrief(makeFormIssue());
    expect(missing).toEqual([]);
    expect(valid).toBe(true);
  });

  it('accepts a complete manual brief (## headings, no checkbox)', () => {
    const { valid, missing } = validateAgentBrief(makeManualBrief());
    expect(missing).toEqual([]);
    expect(valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Failure modes — one missing section each
// ---------------------------------------------------------------------------

describe('validateAgentBrief — failure modes', () => {
  it('fails when Outcome section is absent', () => {
    const body = makeFormIssue({ outcome: '' });
    const { valid, missing } = validateAgentBrief(body);
    expect(valid).toBe(false);
    expect(missing).toContain('Outcome');
  });

  it('fails when Authoritative sources section is absent', () => {
    const body = makeFormIssue({ sources: '' });
    const { valid, missing } = validateAgentBrief(body);
    expect(valid).toBe(false);
    expect(missing).toContain('Authoritative sources');
  });

  it('fails when Scope section is absent', () => {
    const body = makeFormIssue({ scope: '' });
    const { valid, missing } = validateAgentBrief(body);
    expect(valid).toBe(false);
    expect(missing).toContain('Scope');
  });

  it('fails when Acceptance scenarios section is absent', () => {
    const body = makeFormIssue({ acceptance: '' });
    const { valid, missing } = validateAgentBrief(body);
    expect(valid).toBe(false);
    expect(missing).toContain('Acceptance scenarios');
  });

  it('fails when Non-goals section is absent', () => {
    const body = makeFormIssue({ nonGoals: '' });
    const { valid, missing } = validateAgentBrief(body);
    expect(valid).toBe(false);
    expect(missing).toContain('Non-goals');
  });

  it('fails when Design questions section is absent', () => {
    const body = makeFormIssue({ designQuestions: '' });
    const { valid, missing } = validateAgentBrief(body);
    expect(valid).toBe(false);
    expect(missing).toContain('Design questions resolved');
  });

  it('fails when Design questions section is present but has no content', () => {
    const body = makeFormIssue({ designQuestions: '### Design questions resolved' });
    const { valid, missing } = validateAgentBrief(body);
    expect(valid).toBe(false);
    expect(missing.some((m) => m.includes('Design questions'))).toBe(true);
  });

  it('fails when acknowledgement checkbox is unchecked on a form issue', () => {
    const body = makeFormIssue({
      ack: '### Agent-readiness acknowledgement\n\n- [ ] Any unresolved design question makes this issue `ready-for-human`',
    });
    const { valid, missing } = validateAgentBrief(body);
    expect(valid).toBe(false);
    expect(missing.some((m) => m.includes('acknowledgement'))).toBe(true);
  });

  it('fails with a clear message when body is empty', () => {
    const { valid, missing } = validateAgentBrief('');
    expect(valid).toBe(false);
    expect(missing.length).toBeGreaterThan(0);
  });

  it('reports all missing sections, not just the first', () => {
    // Only Non-goals and Design questions present
    const body = '## Non-goals\n\nDo not X.\n\n## Design questions resolved\n\nNone open.';
    const { missing } = validateAgentBrief(body);
    expect(missing).toContain('Outcome');
    expect(missing).toContain('Authoritative sources');
    expect(missing).toContain('Acceptance scenarios');
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('validateAgentBrief — edge cases', () => {
  it('does not require the acknowledgement checkbox for manual briefs (## headings)', () => {
    const { missing } = validateAgentBrief(makeManualBrief());
    expect(missing.some((m) => m.includes('acknowledgement'))).toBe(false);
  });

  it('accepts "Acceptance criteria" as an alias for "Acceptance scenarios"', () => {
    const body = makeManualBrief({
      acceptance: '## Acceptance criteria\n\nGiven X when Y then Z.',
    });
    const { missing } = validateAgentBrief(body);
    expect(missing).not.toContain('Acceptance scenarios');
  });

  it('does not false-positive on "Non-goals" mentioned in prose text', () => {
    // The word Non-goals appears inside prose but no Non-goals HEADING exists
    const body = makeFormIssue({
      nonGoals: '',
      acceptance:
        '### Acceptance scenarios mapped to named tests\n\nWhen "Non-goals" is missing, the gate fails.',
    });
    const { missing } = validateAgentBrief(body);
    expect(missing).toContain('Non-goals');
  });
});
