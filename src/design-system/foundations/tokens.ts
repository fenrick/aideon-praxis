import { iconBaseline } from './iconography';
import { motionBaseline, motionTokens } from './motion';
import { semanticStateContracts } from './semantic-states';

export const spacingTokenKeys = ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const;

export type SpacingToken = (typeof spacingTokenKeys)[number];

export const spacingScale: Record<SpacingToken, string> = {
  '2xs': '0.25rem',
  xs: '0.5rem',
  sm: '0.75rem',
  md: '1rem',
  lg: '1.25rem',
  xl: '1.5rem',
  '2xl': '2rem',
  '3xl': '3rem',
};

export const typographyTokens = {
  eyebrow: 'text-[0.6875rem]/[1.1rem] font-semibold uppercase tracking-[0.14em]',
  label: 'text-xs/relaxed font-medium',
  body: 'text-sm/relaxed',
  bodyDense: 'text-xs/relaxed',
  title: 'text-sm font-semibold tracking-tight',
  section: 'text-base font-semibold tracking-tight',
  display: 'text-xl font-semibold tracking-tight',
  editorialTitle: 'font-editorial text-2xl/[1.12] font-medium tracking-[-0.01em]',
  editorialDisplay: 'font-editorial text-3xl/[1.08] font-medium tracking-[-0.015em]',
  editorialHero: 'font-editorial text-4xl/[1.02] font-medium tracking-[-0.02em]',
} as const;

export const radiusScale = {
  sm: 'var(--radius-sm)',
  md: 'var(--radius-md)',
  lg: 'var(--radius-lg)',
  xl: 'var(--radius-xl)',
  frame: '1.25rem',
} as const;

export const elevationScale = {
  shell: 'var(--aideon-elevation-shell)',
  panel: 'var(--aideon-elevation-panel)',
  frame: 'var(--aideon-elevation-frame)',
} as const;

interface DensityContract {
  clusterGap: SpacingToken;
  contentPadding: SpacingToken;
  controlHeight: string;
  fieldGap: SpacingToken;
  label: string;
  navigationWidth: string;
  inspectorWidth: string;
  panelPadding: SpacingToken;
  sectionGap: SpacingToken;
  shellGap: SpacingToken;
  toolbarHeight: string;
}

export const densityModes = {
  compact: {
    clusterGap: 'xs',
    contentPadding: 'md',
    controlHeight: '2.5rem',
    fieldGap: '2xs',
    inspectorWidth: '20rem',
    label: 'Compact',
    navigationWidth: '16rem',
    panelPadding: 'lg',
    sectionGap: 'lg',
    shellGap: 'sm',
    toolbarHeight: '3.25rem',
  },
  comfortable: {
    clusterGap: 'sm',
    contentPadding: 'lg',
    controlHeight: '2.75rem',
    fieldGap: 'xs',
    inspectorWidth: '22rem',
    label: 'Comfortable',
    navigationWidth: '17.5rem',
    panelPadding: 'xl',
    sectionGap: 'xl',
    shellGap: 'lg',
    toolbarHeight: '3.75rem',
  },
} as const satisfies Record<string, DensityContract>;

export type DensityMode = keyof typeof densityModes;

export const focusTokens = {
  ring: '0 0 0 3px color-mix(in oklab, var(--ring) 35%, transparent)',
} as const;

export const colorRoles = {
  statusError: 'var(--aideon-status-error)',
  statusErrorSoft: 'var(--aideon-status-error-soft)',
  statusInfo: 'var(--aideon-status-info)',
  statusInfoSoft: 'var(--aideon-status-info-soft)',
  statusPartial: 'var(--aideon-status-partial)',
  statusPartialSoft: 'var(--aideon-status-partial-soft)',
  shellBackground: 'var(--aideon-shell-background)',
  shellBorderStrong: 'var(--aideon-shell-border-strong)',
  shellInspector: 'var(--aideon-shell-inspector)',
  shellNavigation: 'var(--aideon-shell-navigation)',
  shellPanel: 'var(--aideon-shell-panel)',
  shellToolbar: 'var(--aideon-shell-toolbar)',
  statusDanger: 'var(--aideon-status-error)',
  statusDangerSoft: 'var(--aideon-status-error-soft)',
  statusMuted: 'var(--aideon-status-stale)',
  statusMutedSoft: 'var(--aideon-status-stale-soft)',
  statusNeutral: 'var(--aideon-status-info)',
  statusNeutralSoft: 'var(--aideon-status-info-soft)',
  statusStale: 'var(--aideon-status-stale)',
  statusStaleSoft: 'var(--aideon-status-stale-soft)',
  workspaceSurface: 'var(--aideon-workspace-surface)',
  surfaceSubtle: 'var(--aideon-surface-subtle)',
  statusWarning: 'var(--aideon-status-warning)',
  statusWarningSoft: 'var(--aideon-status-warning-soft)',
  statusSuccess: 'var(--aideon-status-success)',
  statusSuccessSoft: 'var(--aideon-status-success-soft)',
} as const;

export const densityCssVariableNames = {
  clusterGap: '--aideon-space-cluster',
  contentPadding: '--aideon-content-padding',
  controlHeight: '--aideon-control-height',
  fieldGap: '--aideon-space-field-gap',
  inspectorWidth: '--aideon-inspector-width',
  navigationWidth: '--aideon-navigation-width',
  panelPadding: '--aideon-space-panel-padding',
  sectionGap: '--aideon-space-section',
  shellGap: '--aideon-shell-gap',
  toolbarHeight: '--aideon-toolbar-height',
} as const;

/**
 *
 * @param value
 */
export function isSpacingToken(value: string): value is SpacingToken {
  return spacingTokenKeys.includes(value as SpacingToken);
}

/**
 *
 * @param token
 */
export function getSpacingValue(token: SpacingToken) {
  return spacingScale[token];
}

/**
 *
 * @param value
 */
export function isDensityMode(value: string): value is DensityMode {
  return value in densityModes;
}

/**
 *
 * @param mode
 */
export function getDensityModeContract(mode: DensityMode) {
  return densityModes[mode];
}

/**
 *
 * @param value
 */
export function resolveDensityMode(value: string) {
  return isDensityMode(value) ? densityModes[value] : undefined;
}

/**
 *
 * @param mode
 */
export function getDensityStyleVariables(mode: DensityMode) {
  const contract = densityModes[mode];

  return {
    [densityCssVariableNames.clusterGap]: getSpacingValue(contract.clusterGap),
    [densityCssVariableNames.contentPadding]: getSpacingValue(contract.contentPadding),
    [densityCssVariableNames.controlHeight]: contract.controlHeight,
    [densityCssVariableNames.fieldGap]: getSpacingValue(contract.fieldGap),
    [densityCssVariableNames.inspectorWidth]: contract.inspectorWidth,
    [densityCssVariableNames.navigationWidth]: contract.navigationWidth,
    [densityCssVariableNames.panelPadding]: getSpacingValue(contract.panelPadding),
    [densityCssVariableNames.sectionGap]: getSpacingValue(contract.sectionGap),
    [densityCssVariableNames.shellGap]: getSpacingValue(contract.shellGap),
    [densityCssVariableNames.toolbarHeight]: contract.toolbarHeight,
  } as Record<string, string>;
}

export const designTokens = {
  colors: colorRoles,
  densityCssVariableNames,
  densityModes,
  elevation: elevationScale,
  focus: focusTokens,
  icon: iconBaseline,
  motion: motionTokens,
  motionBaseline,
  radius: radiusScale,
  semanticStates: semanticStateContracts,
  spacing: spacingScale,
  spacingTokenKeys,
  typography: typographyTokens,
} as const;
