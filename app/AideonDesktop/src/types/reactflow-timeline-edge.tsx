export type TimelineEdgeData = { label?: string } & Record<string, unknown>;

export const TimelineEdge = (properties: Record<string, unknown>) => (
  <g data-testid="timeline-edge" {...properties} />
);
