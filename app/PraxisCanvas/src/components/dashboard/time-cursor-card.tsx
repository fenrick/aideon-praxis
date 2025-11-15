import { useTemporalPanel } from '@/time/use-temporal-panel';

import { TimeControlPanel } from '@/components/blocks/time-control-panel';

export function TimeCursorCard() {
  const [state, actions] = useTemporalPanel();
  return <TimeControlPanel state={state} actions={actions} />;
}
