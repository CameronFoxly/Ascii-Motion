/** Generator operations reuse the existing validated generator command handlers. */
import { executeGeneratorCommand } from '../../generatorCommands';
import type { MCPGeneratorCommand } from '../../types';
import type { OperationHandler } from '../runtime';

const NAMES = [
  'get_generator_catalog', 'add_generator_layer', 'update_generator_layer', 'set_generator_property',
  'set_generator_keyframes', 'remove_generator_keyframes', 'reset_generator', 'randomize_generator_seed',
  'get_generator_state', 'render_generator_frames', 'bake_generator_layer',
] as const;

const run = (name: string, input: Record<string, unknown>) =>
  executeGeneratorCommand({ ...input, type: name } as unknown as MCPGeneratorCommand) as Record<string, unknown>;

interface InitialTrack { propertyPath: string; keyframes: unknown[]; replace?: boolean; loop?: boolean }

/** add_generator_layer + initial tracks inside the same transaction (rolled back together). */
const addGeneratorLayer: OperationHandler = (input) => {
  const { keyframes, ...layerInput } = input as Record<string, unknown> & { keyframes?: InitialTrack[] };
  const added = run('add_generator_layer', layerInput);
  if (!keyframes?.length) return added;
  const layerId = added.layerId as string;
  let generator = added.generator;
  const tracks = keyframes.map((track) => {
    const result = run('set_generator_keyframes', { ...track, layerId });
    generator = result.generator;
    return { propertyPath: track.propertyPath, trackId: result.trackId as string, keyframeIds: result.keyframeIds as string[] };
  });
  return {
    ...added,
    generator,
    layerId,
    trackIds: tracks.map((t) => t.trackId),
    keyframeIds: tracks.flatMap((t) => t.keyframeIds),
    tracks,
  };
};

export const generatorHandlers: Record<string, OperationHandler> = {
  ...Object.fromEntries(NAMES.map((name) => [name, (input: Record<string, unknown>) => run(name, input)])),
  add_generator_layer: addGeneratorLayer,
};
