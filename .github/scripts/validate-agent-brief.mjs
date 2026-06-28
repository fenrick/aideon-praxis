/**
 * Validates that an issue body satisfies the agent-task contract.
 *
 * Supports both form-generated issues (agent_task.yml) and hand-written briefs.
 * Each section is checked by the exact form heading first, then loose fallbacks.
 *
 * Ref: docs/build-contracts/agent-issue-template.md
 */

export const REQUIRED_SECTIONS = /** @type {const} */ ([
  {
    id: 'outcome',
    label: 'Outcome',
    patterns: [/^#{1,3}\s+Outcome\s*$/m],
  },
  {
    id: 'sources',
    label: 'Authoritative sources',
    patterns: [/^#{1,3}\s+Authoritative sources/im],
  },
  {
    id: 'scope',
    label: 'Scope',
    patterns: [/^#{1,3}\s+Scope\b/im],
  },
  {
    id: 'acceptance',
    label: 'Acceptance scenarios',
    patterns: [/^#{1,3}\s+Acceptance (scenarios|criteria)/im],
  },
  {
    id: 'non-goals',
    label: 'Non-goals',
    patterns: [/^#{1,3}\s+Non-goals/im],
  },
  {
    id: 'design-questions',
    label: 'Design questions resolved',
    patterns: [/^#{1,3}\s+Design questions/im, /design.questions?\s+resolved/im],
  },
]);

/**
 * @param {string} body
 * @returns {boolean} true if the body looks like it came from the agent_task.yml form
 */
function isFormIssue(body) {
  // Form-generated issues (agent_task.yml) always use level-3 headings (###).
  // Manual briefs use ## or other formats and do not require the checkbox.
  return /^#{3}\s+Outcome\s*$/m.test(body) || /^#{3}\s+Authoritative sources/im.test(body);
}

/**
 * @param {string} body
 * @param {RegExp} sectionHeadingPattern
 * @returns {boolean} true if the section heading exists AND is followed by non-empty content
 */
function isSectionNonEmpty(body, sectionHeadingPattern) {
  // Extend the pattern to consume the rest of the heading line so that afterHeading
  // starts at the newline after the heading (not mid-heading).
  const fullLinePattern = new RegExp(
    sectionHeadingPattern.source + '[^\\n]*',
    sectionHeadingPattern.flags,
  );
  const match = fullLinePattern.exec(body);
  if (!match) return false;
  const afterHeading = body.slice(match.index + match[0].length);
  const contentBefore = afterHeading.match(/^([\s\S]*?)(?=\n#{1,3}\s|$)/);
  return Boolean(contentBefore && contentBefore[1].trim().length > 0);
}

/**
 * @param {string} body
 * @returns {{ valid: boolean; missing: string[] }}
 */
export function validateAgentBrief(body) {
  if (!body || body.trim().length === 0) {
    return {
      valid: false,
      missing: ['Issue body is empty — all required sections are missing'],
    };
  }

  const missing = [];

  for (const section of REQUIRED_SECTIONS) {
    const found = section.patterns.some((p) => p.test(body));
    if (!found) {
      missing.push(section.label);
    }
  }

  // Design-questions section must have actual content, not just the heading.
  const designHeading = /^#{1,3}\s+Design questions/im;
  if (designHeading.test(body) && !isSectionNonEmpty(body, designHeading)) {
    if (!missing.includes('Design questions resolved')) {
      missing.push(
        'Design questions resolved (section exists but has no content — "unspecified" is not valid)',
      );
    }
  }

  // For form-created issues: the agent-readiness acknowledgement checkbox must be checked.
  if (isFormIssue(body)) {
    const ackChecked = /- \[x\] Any unresolved design question/i.test(body);
    if (!ackChecked) {
      missing.push(
        'Agent-readiness acknowledgement (checkbox must be checked: `- [x] Any unresolved design question...`)',
      );
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}
