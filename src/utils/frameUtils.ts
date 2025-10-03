import type { Cell, Frame } from '../types';

const cloneCell = (cell: Cell): Cell => ({
  char: cell.char,
  color: cell.color,
  bgColor: cell.bgColor
});

export const cloneFrame = (frame: Frame): Frame => ({
  id: frame.id,
  name: frame.name,
  duration: frame.duration,
  thumbnail: frame.thumbnail,
  data: new Map(Array.from(frame.data.entries()).map(([key, cell]) => [key, cloneCell(cell)]))
});

export const cloneFrames = (frames: Frame[]): Frame[] => frames.map(cloneFrame);
