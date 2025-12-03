import { Handle, type HandleProps } from '@xyflow/react';
import type { ComponentProps } from 'react';

import { cn } from 'design-system/lib/utils';

export type BaseHandleProps = HandleProps;

export function BaseHandle({ className, children, ...properties }: ComponentProps<typeof Handle>) {
  return (
    <Handle
      {...properties}
      className={cn(
        'dark:border-secondary dark:bg-secondary h-[11px] w-[11px] rounded-full border border-slate-300 bg-slate-100 transition',
        className,
      )}
    >
      {children}
    </Handle>
  );
}
