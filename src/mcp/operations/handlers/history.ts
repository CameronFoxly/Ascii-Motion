/** Undo/redo through the app's history processor (same path as Cmd/Ctrl+Z). */
import { useAnimationStore } from '../../../stores/animationStore';
import { useCanvasStore } from '../../../stores/canvasStore';
import { useToolStore } from '../../../stores/toolStore';
import { processHistoryAction } from '../../../hooks/useKeyboardShortcuts';
import type { OperationHandler, OperationContext } from '../runtime';
import { flushCanvasToTimeline } from '../state';
import { readHistory } from './document';

function step(isRedo: boolean, ctx: OperationContext) {
  // The history stack itself is the record; never add a bridge snapshot on top.
  ctx.skipHistory();
  const tool = useToolStore.getState();
  if (!(isRedo ? tool.canRedo() : tool.canUndo())) {
    ctx.noChange();
    return { applied: false, ...readHistory() };
  }
  const action = isRedo ? tool.redo() : tool.undo();
  if (!action) {
    ctx.noChange();
    return { applied: false, ...readHistory() };
  }
  useToolStore.setState({ isProcessingHistory: true });
  try {
    processHistoryAction(action, isRedo, { setCanvasData: useCanvasStore.getState().setCanvasData }, useAnimationStore.getState());
    // canvas_edit entries restore the canvas store only; persist into the timeline.
    flushCanvasToTimeline();
  } finally {
    useToolStore.setState({ isProcessingHistory: false });
  }
  return { applied: true, actionType: action.type, description: action.description, ...readHistory() };
}

export const historyHandlers: Record<string, OperationHandler> = {
  undo: (_input, ctx) => step(false, ctx),
  redo: (_input, ctx) => step(true, ctx),
};
