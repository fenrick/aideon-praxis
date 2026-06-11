export const iconSizeKeys = ['compact', 'default', 'emphasis', 'display'] as const;

export type DesignSystemIconSize = (typeof iconSizeKeys)[number];

export const iconSizeClassNames: Record<DesignSystemIconSize, string> = {
  compact: 'size-3.5 shrink-0',
  default: 'size-4 shrink-0',
  display: 'size-6 shrink-0',
  emphasis: 'size-5 shrink-0',
};

export const iconBaseline = {
  library: 'lucide-react',
  sizeClassNames: iconSizeClassNames,
  strokeWidth: 1.75,
} as const;

export function isDesignSystemIconSize(value: string): value is DesignSystemIconSize {
  return iconSizeKeys.includes(value as DesignSystemIconSize);
}

export function resolveDesignSystemIconSize(value: string) {
  return isDesignSystemIconSize(value) ? value : undefined;
}
