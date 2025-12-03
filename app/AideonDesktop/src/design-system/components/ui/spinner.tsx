import { Loader2Icon } from 'lucide-react';

import { cn } from 'design-system/lib/utils';

function Spinner({ className, ...properties }: React.ComponentProps<'svg'>) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn('size-4 animate-spin', className)}
      {...properties}
    />
  );
}

export { Spinner };
