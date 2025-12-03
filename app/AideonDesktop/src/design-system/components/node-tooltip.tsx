'use client';

import { NodeToolbar, type NodeToolbarProps } from '@xyflow/react';
import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  type ComponentProps,
} from 'react';

import { cn } from 'design-system/lib/utils';

/* TOOLTIP CONTEXT ---------------------------------------------------------- */

interface TooltipContextType {
  isVisible: boolean;
  showTooltip: () => void;
  hideTooltip: () => void;
}

const TooltipContext = createContext<TooltipContextType | null>(null);

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

export function NodeTooltipTrigger(properties: ComponentProps<'div'>) {
  const tooltipContext = useContext(TooltipContext);
  if (!tooltipContext) {
    throw new Error('NodeTooltipTrigger must be used within NodeTooltip');
  }
  const { showTooltip, hideTooltip } = tooltipContext;

  const onMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      properties.onMouseEnter?.(e);
      showTooltip();
    },
    [properties, showTooltip],
  );

  const onMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      properties.onMouseLeave?.(e);
      hideTooltip();
    },
    [properties, hideTooltip],
  );

  return <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} {...properties} />;
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
