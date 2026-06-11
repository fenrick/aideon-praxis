export const motionTokens = { deliberate: '320ms', fast: '160ms', standard: '220ms' } as const;

export const motionClassNames = {
  emphasis:
    'transition-[background-color,border-color,color,box-shadow] duration-[var(--aideon-motion-fast)] ease-out motion-reduce:transition-none',
  surface:
    'transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--aideon-motion-standard)] ease-out motion-reduce:transition-none',
  transform:
    'transition-transform duration-[var(--aideon-motion-standard)] ease-out motion-reduce:transition-none',
} as const;

export const motionBaseline = {
  classNames: motionClassNames,
  reducedMotionMediaQuery: '(prefers-reduced-motion: reduce)',
  tokens: motionTokens,
} as const;
