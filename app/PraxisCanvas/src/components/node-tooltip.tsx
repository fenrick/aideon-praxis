'use client';

import { NodeToolbar, type NodeToolbarProps } from '@xyflow/react';
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ComponentProps,
  type MouseEvent,
} from 'react';

import { cn } from '@/lib/utilities';

/* TOOLTIP CONTEXT ---------------------------------------------------------- */

interface TooltipContextValue {
  readonly isVisible: boolean;
  readonly showTooltip: () => void;
  readonly hideTooltip: () => void;
}

const TooltipContext = createContext<TooltipContextValue | null>(null);

/* TOOLTIP NODE ------------------------------------------------------------- */

export function NodeTooltip({ children }: ComponentProps<'div'>) {
  const [isVisible, setIsVisible] = useState(false);

  const showTooltip = useCallback(() => {
    setIsVisible(true);
  }, []);
  const hideTooltip = useCallback(() => {
    setIsVisible(false);
  }, []);

  return (
    <TooltipContext.Provider value={{ isVisible, showTooltip, hideTooltip }}>
      <div>{children}</div>
    </TooltipContext.Provider>
  );
}

/* TOOLTIP TRIGGER ---------------------------------------------------------- */

export function NodeTooltipTrigger({
  onMouseEnter,
  onMouseLeave,
  ...properties
}: ComponentProps<'div'>) {
  const tooltipContext = useContext(TooltipContext);
  if (!tooltipContext) {
    throw new Error('NodeTooltipTrigger must be used within NodeTooltip');
  }
  const { showTooltip, hideTooltip } = tooltipContext;

  const handleMouseEnter = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      onMouseEnter?.(event);
      showTooltip();
    },
    [onMouseEnter, showTooltip],
  );

  const handleMouseLeave = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      onMouseLeave?.(event);
      hideTooltip();
    },
    [hideTooltip, onMouseLeave],
  );

  return <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} {...properties} />;
}

/* TOOLTIP CONTENT ---------------------------------------------------------- */

// /**
//  * A component that displays the tooltip content based on visibility context.
//  */

export function NodeTooltipContent({
  children,
  position,
  className,
  ...properties
}: NodeToolbarProps) {
  const tooltipContext = useContext(TooltipContext);
  if (!tooltipContext) {
    throw new Error('NodeTooltipContent must be used within NodeTooltip');
  }
  const { isVisible } = tooltipContext;

  return (
    <div>
      <NodeToolbar
        isVisible={isVisible}
        className={cn('bg-primary text-primary-foreground rounded-sm p-2', className)}
        tabIndex={1}
        position={position}
        {...properties}
      >
        {children}
      </NodeToolbar>
    </div>
  );
}
