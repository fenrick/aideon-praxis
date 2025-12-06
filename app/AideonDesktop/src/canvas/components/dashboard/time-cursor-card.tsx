import { useTemporalPanel } from 'canvas/time/use-temporal-panel';

import { TimeControlPanel } from 'canvas/components/blocks/time-control-panel';

/**
 *
 */
export function TimeCursorCard() {
  const [state, actions] = useTemporalPanel();
  return <TimeControlPanel state={state} actions={actions} />;
}
