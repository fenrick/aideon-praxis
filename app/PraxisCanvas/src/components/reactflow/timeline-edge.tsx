import { memo } from 'react';

import { EdgeLabelRenderer, type Edge, type EdgeProps } from '@xyflow/react';

import {
  AnimatedSvgEdge as AnimatedSvgEdgeComponent,
  type AnimatedSvgEdge as AnimatedSvgEdgeType,
} from '@/components/animated-svg-edge';

type AnimatedEdgeOptions = NonNullable<AnimatedSvgEdgeType['data']>;

export interface TimelineEdgeData extends Record<string, unknown>, Partial<AnimatedEdgeOptions> {
  readonly label?: string;
}

type TimelineEdge = Edge<TimelineEdgeData>;

export const TimelineEdge = memo(function TimelineEdge({
  data,
  sourceX,
  sourceY,
  targetX,
  targetY,
  ...edgeProperties
}: EdgeProps<TimelineEdge>) {
  const animation: AnimatedEdgeOptions = {
    duration: data?.duration ?? 2.5,
    direction: data?.direction ?? 'forward',
    path: data?.path ?? 'smoothstep',
    repeat: data?.repeat ?? 'indefinite',
    shape: data?.shape ?? 'circle',
  };

  const labelTransform = `translate(${String((sourceX + targetX) / 2)}px, ${String((sourceY + targetY) / 2)}px) translate(-50%, -50%)`;

  const animatedProperties = {
    sourceX,
    sourceY,
    targetX,
    targetY,
    ...edgeProperties,
  };

  return (
    <>
      <AnimatedSvgEdgeComponent
        {...(animatedProperties as EdgeProps<AnimatedSvgEdgeType>)}
        data={animation}
      />
      {data?.label ? (
        <EdgeLabelRenderer>
          <div
            className="pointer-events-none absolute rounded-full border border-border/60 bg-background px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground shadow"
            style={{ transform: labelTransform }}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
});
