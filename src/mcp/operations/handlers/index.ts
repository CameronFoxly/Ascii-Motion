/** Registers every bridge operation handler with the runtime (idempotent). */
import { registerOperationHandlers } from '../runtime';
import { cellHandlers } from './cells';
import { cloudHandlers } from './cloud';
import { documentHandlers } from './document';
import { drawingHandlers } from './drawing';
import { effectHandlers } from './effects';
import { generatorHandlers } from './generators';
import { historyHandlers } from './history';
import { ioHandlers } from './io';
import { keyframeHandlers } from './keyframes';
import { layerHandlers } from './layers';
import { mediaHandlers } from './media';
import { paletteHandlers } from './palettes';
import { projectHandlers } from './project';
import { selectionHandlers } from './selection';
import { timelineHandlers } from './timeline';

export const ALL_HANDLER_FAMILIES = {
  cells: cellHandlers,
  cloud: cloudHandlers,
  document: documentHandlers,
  drawing: drawingHandlers,
  effects: effectHandlers,
  generators: generatorHandlers,
  history: historyHandlers,
  io: ioHandlers,
  keyframes: keyframeHandlers,
  layers: layerHandlers,
  media: mediaHandlers,
  palettes: paletteHandlers,
  project: projectHandlers,
  selection: selectionHandlers,
  timeline: timelineHandlers,
};

let registered = false;

export function registerAllOperationHandlers(): void {
  if (registered) return;
  registered = true;
  for (const family of Object.values(ALL_HANDLER_FAMILIES)) registerOperationHandlers(family);
}
