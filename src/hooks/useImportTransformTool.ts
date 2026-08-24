import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { useImportStore } from '../stores/importStore';
import { usePreviewStore } from '../stores/previewStore';
import {
  getImportNudgeForOrigin,
  getImportRect,
  getImportRectCorners,
  IMPORT_CHARACTER_ASPECT_RATIO,
  positionImportCells,
  resizeImportRect,
  shouldLockImportAspectRatio,
  type ImportPoint,
  type ImportRect,
  type ImportResizeCorner,
} from '../utils/importTransformUtils';
import type { ImportSettings } from '../stores/importStore';

export type ImportTransformCursorZone =
  | 'none'
  | 'move'
  | ImportResizeCorner;

interface ImportTransformDragState {
  mode: 'move' | 'resize';
  corner?: ImportResizeCorner;
  startPointer: ImportPoint;
  startRect: ImportRect;
  startSettings: Pick<
    ImportSettings,
    'cropMode' | 'maintainAspectRatio' | 'nudgeX' | 'nudgeY'
  >;
  sourceAspectRatio: number | null;
}

const HANDLE_HIT_RADIUS_PX = 10;
const CORNERS: ImportResizeCorner[] = [
  'top-left',
  'top-right',
  'bottom-right',
  'bottom-left',
];

function isInsideRect(point: ImportPoint, rect: ImportRect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function useImportTransformTool(
  effectiveCellWidth: number,
  effectiveCellHeight: number,
) {
  const [dragState, setDragState] =
    useState<ImportTransformDragState | null>(null);
  const [cursorZone, setCursorZone] =
    useState<ImportTransformCursorZone>('none');

  const isImportModalOpen = useImportStore((state) => state.isImportModalOpen);
  const selectedFile = useImportStore((state) => state.selectedFile);
  const sourceAspectRatio = useImportStore(
    (state) => state.sourceAspectRatio,
  );
  const isPreviewMode = useImportStore((state) => state.isPreviewMode);
  const settings = useImportStore((state) => state.settings);
  const livePreviewEnabled = useImportStore(
    (state) => state.uiState.livePreviewEnabled,
  );
  const isPreviewActive = usePreviewStore((state) => state.isPreviewActive);
  const canvasWidth = useCanvasStore((state) => state.width);
  const canvasHeight = useCanvasStore((state) => state.height);

  const isActive =
    isImportModalOpen &&
    selectedFile !== null &&
    livePreviewEnabled &&
    isPreviewMode &&
    isPreviewActive;

  const boundingRect = useMemo(
    () =>
      getImportRect({
        canvasWidth,
        canvasHeight,
        imageWidth: settings.characterWidth,
        imageHeight: settings.characterHeight,
        cropMode: settings.cropMode,
        nudgeX: settings.nudgeX,
        nudgeY: settings.nudgeY,
      }),
    [
      canvasWidth,
      canvasHeight,
      settings.characterWidth,
      settings.characterHeight,
      settings.cropMode,
      settings.nudgeX,
      settings.nudgeY,
    ],
  );

  const corners = useMemo(
    () => getImportRectCorners(boundingRect),
    [boundingRect],
  );

  useEffect(() => {
    if (!isActive) {
      setDragState(null);
      setCursorZone('none');
    }
  }, [isActive]);

  const hitTest = useCallback(
    (point: ImportPoint): ImportTransformCursorZone => {
      for (let index = 0; index < corners.length; index++) {
        const corner = corners[index];
        const pixelDistance = Math.hypot(
          (point.x - corner.x) * effectiveCellWidth,
          (point.y - corner.y) * effectiveCellHeight,
        );
        if (pixelDistance <= HANDLE_HIT_RADIUS_PX) {
          return CORNERS[index];
        }
      }

      return isInsideRect(point, boundingRect) ? 'move' : 'none';
    },
    [boundingRect, corners, effectiveCellHeight, effectiveCellWidth],
  );

  const updateSettingsIfChanged = useCallback(
    (nextSettings: Partial<ImportSettings>) => {
      const importStore = useImportStore.getState();
      const hasChanges = Object.entries(nextSettings).some(
        ([key, value]) =>
          importStore.settings[key as keyof ImportSettings] !== value,
      );
      if (hasChanges) {
        importStore.updateSettings(nextSettings);
      }
      return hasChanges;
    },
    [],
  );

  const handlePointerDown = useCallback(
    (point: ImportPoint): boolean => {
      if (!isActive) return false;

      const hit = hitTest(point);
      if (hit === 'none') return false;

      setCursorZone(hit);
      setDragState({
        mode: hit === 'move' ? 'move' : 'resize',
        corner: hit === 'move' ? undefined : hit,
        startPointer: point,
        startRect: boundingRect,
        startSettings: {
          cropMode: settings.cropMode,
          maintainAspectRatio: settings.maintainAspectRatio,
          nudgeX: settings.nudgeX,
          nudgeY: settings.nudgeY,
        },
        sourceAspectRatio,
      });
      return true;
    },
    [
      boundingRect,
      hitTest,
      isActive,
      settings.cropMode,
      settings.maintainAspectRatio,
      settings.nudgeX,
      settings.nudgeY,
      sourceAspectRatio,
    ],
  );

  const handlePointerMove = useCallback(
    (point: ImportPoint, shiftKey: boolean) => {
      if (!isActive) return;

      if (!dragState) {
        setCursorZone(hitTest(point));
        return;
      }

      if (dragState.mode === 'move') {
        const desiredOrigin = {
          x:
            dragState.startRect.x +
            Math.round(point.x - dragState.startPointer.x),
          y:
            dragState.startRect.y +
            Math.round(point.y - dragState.startPointer.y),
        };
        const nudge = getImportNudgeForOrigin({
          desiredOrigin,
          canvasWidth,
          canvasHeight,
          imageWidth: dragState.startRect.width,
          imageHeight: dragState.startRect.height,
          cropMode: dragState.startSettings.cropMode,
        });
        if (updateSettingsIfChanged(nudge)) {
          const convertedPreview =
            useImportStore.getState().convertedPreview;
          if (
            convertedPreview &&
            convertedPreview.width === dragState.startRect.width &&
            convertedPreview.height === dragState.startRect.height
          ) {
            usePreviewStore.getState().setPreviewData(
              positionImportCells(convertedPreview.cells, {
                canvasWidth,
                canvasHeight,
                imageWidth: convertedPreview.width,
                imageHeight: convertedPreview.height,
                cropMode: dragState.startSettings.cropMode,
                ...nudge,
              }),
            );
          }
        }
        return;
      }

      if (!dragState.corner) return;

      const lockAspectRatio = shouldLockImportAspectRatio(
        dragState.startSettings.maintainAspectRatio,
        shiftKey,
      );
      const characterAspectRatio = lockAspectRatio
        ? dragState.sourceAspectRatio &&
          Number.isFinite(dragState.sourceAspectRatio) &&
          dragState.sourceAspectRatio > 0
          ? dragState.sourceAspectRatio / IMPORT_CHARACTER_ASPECT_RATIO
          : dragState.startRect.width / dragState.startRect.height
        : undefined;
      const resizedRect = resizeImportRect(
        dragState.startRect,
        dragState.corner,
        point,
        characterAspectRatio,
      );
      const nudge = getImportNudgeForOrigin({
        desiredOrigin: { x: resizedRect.x, y: resizedRect.y },
        canvasWidth,
        canvasHeight,
        imageWidth: resizedRect.width,
        imageHeight: resizedRect.height,
        cropMode: dragState.startSettings.cropMode,
      });

      updateSettingsIfChanged({
        characterWidth: resizedRect.width,
        characterHeight: resizedRect.height,
        ...nudge,
      });
    },
    [
      canvasHeight,
      canvasWidth,
      dragState,
      hitTest,
      isActive,
      updateSettingsIfChanged,
    ],
  );

  const handlePointerUp = useCallback(() => {
    setDragState(null);
  }, []);

  return {
    isActive,
    boundingRect,
    corners,
    dragState,
    cursorZone,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
