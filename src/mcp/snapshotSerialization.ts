/**
 * Layer serialization shared by state snapshots and acknowledged command results.
 */

import type { Layer } from '../types/timeline';
import { serializeGeneratorSource } from '../utils/generators/generatorSerialization';

type SnapshotCell = { char: string; color: string; bgColor: string };

export function serializeSnapshotLayer(l: Layer): Record<string, unknown> {
  return {
    id: l.id,
    name: l.name,
    visible: l.visible,
    solo: l.solo,
    locked: l.locked,
    opacity: l.opacity,
    parentGroupId: l.parentGroupId,
    syncKeyframesToFrames: l.syncKeyframesToFrames,
    ...(l.kind === 'generator' && l.generator
      ? { kind: l.kind, generator: serializeGeneratorSource(l.generator) }
      : {}),
    contentFrames: l.contentFrames.map(cf => {
      const cfData: Record<string, SnapshotCell> = {};
      cf.data.forEach((cell, key) => {
        cfData[key] = { char: cell.char, color: cell.color, bgColor: cell.bgColor };
      });
      return {
        id: cf.id,
        name: cf.name,
        startFrame: cf.startFrame,
        durationFrames: cf.durationFrames,
        data: cfData,
        hidden: cf.hidden,
      };
    }),
    propertyTracks: l.propertyTracks.map(pt => ({
      id: pt.id,
      propertyPath: pt.propertyPath,
      loopKeyframes: pt.loopKeyframes,
      keyframes: pt.keyframes.map(kf => ({
        id: kf.id,
        frame: kf.frame,
        value: kf.value,
        easing: kf.easing,
      })),
    })),
    staticProperties: l.staticProperties,
  };
}
