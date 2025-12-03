import type { EdgeProps } from '@xyflow/react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react';

export interface TimelineEdgeData {
  label?: string;
}

export function TimelineEdge(properties: EdgeProps<TimelineEdgeData>) {
  const { sourceX, sourceY, targetX, targetY, data } = properties;
  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY });

  return (
    <>
      <BaseEdge {...properties} path={path} />
      {data?.label ? (
        <EdgeLabelRenderer>
          <div
            data-slot="timeline-edge-label"
            style={{
              position: 'absolute',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'all',
              left: labelX,
              top: labelY,
            }}
            className="rounded bg-background/80 px-1.5 py-0.5 text-xs text-foreground shadow"
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
