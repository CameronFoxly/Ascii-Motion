import type { ImportSettings } from '../stores/importStore';
import type { Cell } from '../types';

export const IMPORT_CHARACTER_ASPECT_RATIO = 0.6;

export interface ImportRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImportPoint {
  x: number;
  y: number;
}

export type ImportResizeCorner =
  | 'top-left'
  | 'top-right'
  | 'bottom-right'
  | 'bottom-left';

interface ImportGeometry {
  canvasWidth: number;
  canvasHeight: number;
  imageWidth: number;
  imageHeight: number;
  cropMode: ImportSettings['cropMode'];
}

interface ImportPlacement extends ImportGeometry {
  nudgeX: number;
  nudgeY: number;
}

export function getImportAlignmentOrigin({
  canvasWidth,
  canvasHeight,
  imageWidth,
  imageHeight,
  cropMode,
}: ImportGeometry): ImportPoint {
  switch (cropMode) {
    case 'top-left':
      return { x: 0, y: 0 };
    case 'top':
      return { x: Math.floor((canvasWidth - imageWidth) / 2), y: 0 };
    case 'top-right':
      return { x: canvasWidth - imageWidth, y: 0 };
    case 'left':
      return { x: 0, y: Math.floor((canvasHeight - imageHeight) / 2) };
    case 'center':
      return {
        x: Math.floor((canvasWidth - imageWidth) / 2),
        y: Math.floor((canvasHeight - imageHeight) / 2),
      };
    case 'right':
      return {
        x: canvasWidth - imageWidth,
        y: Math.floor((canvasHeight - imageHeight) / 2),
      };
    case 'bottom-left':
      return { x: 0, y: canvasHeight - imageHeight };
    case 'bottom':
      return {
        x: Math.floor((canvasWidth - imageWidth) / 2),
        y: canvasHeight - imageHeight,
      };
    case 'bottom-right':
      return {
        x: canvasWidth - imageWidth,
        y: canvasHeight - imageHeight,
      };
  }
}

export function clampImportOrigin(
  origin: ImportPoint,
  {
    canvasWidth,
    canvasHeight,
    imageWidth,
    imageHeight,
  }: Omit<ImportGeometry, 'cropMode'>,
): ImportPoint {
  if (imageWidth > canvasWidth || imageHeight > canvasHeight) {
    return origin;
  }

  const minX = Math.floor(imageWidth * -0.5);
  const maxX = canvasWidth - Math.floor(imageWidth * 0.5);
  const minY = Math.floor(imageHeight * -0.5);
  const maxY = canvasHeight - Math.floor(imageHeight * 0.5);

  return {
    x: Math.max(minX, Math.min(origin.x, maxX)),
    y: Math.max(minY, Math.min(origin.y, maxY)),
  };
}

export function getImportOrigin({
  nudgeX,
  nudgeY,
  ...geometry
}: ImportPlacement): ImportPoint {
  const aligned = getImportAlignmentOrigin(geometry);
  return clampImportOrigin(
    {
      x: aligned.x + nudgeX,
      y: aligned.y + nudgeY,
    },
    geometry,
  );
}

export function getImportRect({
  imageWidth,
  imageHeight,
  ...placement
}: ImportPlacement): ImportRect {
  const origin = getImportOrigin({ imageWidth, imageHeight, ...placement });
  return {
    ...origin,
    width: imageWidth,
    height: imageHeight,
  };
}

export function getImportRectCorners(rect: ImportRect): ImportPoint[] {
  return [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
  ];
}

export function getImportNudgeForOrigin({
  desiredOrigin,
  ...geometry
}: ImportGeometry & { desiredOrigin: ImportPoint }): Pick<ImportSettings, 'nudgeX' | 'nudgeY'> {
  const aligned = getImportAlignmentOrigin(geometry);
  const clamped = clampImportOrigin(
    {
      x: Math.round(desiredOrigin.x),
      y: Math.round(desiredOrigin.y),
    },
    geometry,
  );

  return {
    nudgeX: clamped.x - aligned.x,
    nudgeY: clamped.y - aligned.y,
  };
}

export function positionImportCells(
  cells: Map<string, Cell>,
  placement: ImportPlacement,
): Map<string, Cell> {
  const origin = getImportOrigin(placement);
  const positionedCells = new Map<string, Cell>();

  cells.forEach((cell, originalKey) => {
    const [originalX, originalY] = originalKey.split(',').map(Number);
    const x = originalX + origin.x;
    const y = originalY + origin.y;

    if (
      x >= 0 &&
      x < placement.canvasWidth &&
      y >= 0 &&
      y < placement.canvasHeight
    ) {
      positionedCells.set(`${x},${y}`, { ...cell });
    }
  });

  return positionedCells;
}

export function getImportHeightForWidth(
  width: number,
  sourceAspectRatio: number,
): number {
  const characterAspectRatio = sourceAspectRatio / IMPORT_CHARACTER_ASPECT_RATIO;
  return Math.max(1, Math.ceil(width / characterAspectRatio));
}

export function getImportWidthForHeight(
  height: number,
  sourceAspectRatio: number,
): number {
  const characterAspectRatio = sourceAspectRatio / IMPORT_CHARACTER_ASPECT_RATIO;
  return Math.max(1, Math.ceil(height * characterAspectRatio));
}

export function shouldLockImportAspectRatio(
  maintainAspectRatio: boolean,
  shiftKey: boolean,
): boolean {
  return maintainAspectRatio !== shiftKey;
}

export function resizeImportRect(
  startRect: ImportRect,
  corner: ImportResizeCorner,
  pointer: ImportPoint,
  characterAspectRatio?: number,
): ImportRect {
  const isLeft = corner === 'top-left' || corner === 'bottom-left';
  const isTop = corner === 'top-left' || corner === 'top-right';
  const fixedX = isLeft ? startRect.x + startRect.width : startRect.x;
  const fixedY = isTop ? startRect.y + startRect.height : startRect.y;
  const widthDirection = isLeft ? -1 : 1;
  const heightDirection = isTop ? -1 : 1;
  const rawWidth = Math.max(1, widthDirection * (pointer.x - fixedX));
  const rawHeight = Math.max(1, heightDirection * (pointer.y - fixedY));

  let width = Math.max(1, Math.round(rawWidth));
  let height = Math.max(1, Math.round(rawHeight));

  if (characterAspectRatio && characterAspectRatio > 0) {
    const widthDriven = {
      width,
      height: Math.max(1, Math.round(width / characterAspectRatio)),
    };
    const heightDriven = {
      width: Math.max(1, Math.round(height * characterAspectRatio)),
      height,
    };
    const widthDrivenError =
      (widthDriven.width - rawWidth) ** 2 +
      (widthDriven.height - rawHeight) ** 2;
    const heightDrivenError =
      (heightDriven.width - rawWidth) ** 2 +
      (heightDriven.height - rawHeight) ** 2;
    const constrained =
      widthDrivenError <= heightDrivenError ? widthDriven : heightDriven;
    width = constrained.width;
    height = constrained.height;
  }

  return {
    x: isLeft ? fixedX - width : fixedX,
    y: isTop ? fixedY - height : fixedY,
    width,
    height,
  };
}
