import { useCallback, useEffect, type RefObject } from 'react';

import type { useCommandStack } from 'praxis/hooks/use-command-stack';
import { track } from 'praxis/lib/analytics';

import type { useTemporalPanel } from './time/use-temporal-panel';

interface WorkspaceShortcutsInput {
  readonly commandStack: ReturnType<typeof useCommandStack>;
  readonly temporalState: ReturnType<typeof useTemporalPanel>[0];
  readonly temporalActions: ReturnType<typeof useTemporalPanel>[1];
  readonly branchSelectReference: RefObject<HTMLButtonElement | undefined>;
  readonly onToggleDebug: () => void;
}

/**
 * Wire global keyboard shortcuts for the Praxis workspace: undo/redo, commit
 * navigation with the arrow keys, the debug overlay toggle, and focusing the
 * branch selector. The listener is bound for the lifetime of the workspace.
 * @param input - Command stack, temporal state/actions, branch ref, debug toggle.
 * @param input.commandStack - Undo/redo command stack.
 * @param input.temporalState - Current temporal panel state.
 * @param input.temporalActions - Temporal panel actions.
 * @param input.branchSelectReference - Ref to the branch selector button.
 * @param input.onToggleDebug - Toggles the debug overlay.
 */
export function usePlatformShortcuts({
  commandStack,
  temporalState,
  temporalActions,
  branchSelectReference,
  onToggleDebug,
}: WorkspaceShortcutsInput) {
  const handleUndoRedo = useCallback(
    (event: KeyboardEvent): boolean => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
        event.preventDefault();
        commandStack.undo();
        return true;
      }
      if (
        ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'z') ||
        event.key.toLowerCase() === 'y'
      ) {
        event.preventDefault();
        commandStack.redo();
        return true;
      }
      return false;
    },
    [commandStack],
  );

  const handleArrowNavigation = useCallback(
    (event: KeyboardEvent): boolean => {
      const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };
      const offset = offsets[event.key];
      if (offset === undefined) {
        return false;
      }
      const index = temporalState.commits.findIndex(
        (commit) => commit.id === temporalState.commitId,
      );
      const target = index === -1 ? undefined : temporalState.commits[index + offset];
      if (target) {
        temporalActions.selectCommit(target.id);
        track('time.cursor', { branch: temporalState.branch, commitId: target.id });
      }
      return true;
    },
    [temporalActions, temporalState.branch, temporalState.commitId, temporalState.commits],
  );

  const sliderFocusShortcut = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === ' ' && event.shiftKey) {
        branchSelectReference.current?.focus();
      }
    },
    [branchSelectReference],
  );

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (handleUndoRedo(event)) {
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        onToggleDebug();
      }
      if (handleArrowNavigation(event)) {
        return;
      }
      sliderFocusShortcut(event);
    };
    globalThis.addEventListener('keydown', handleKeydown);
    return () => {
      globalThis.removeEventListener('keydown', handleKeydown);
    };
  }, [handleArrowNavigation, handleUndoRedo, onToggleDebug, sliderFocusShortcut]);
}
