import { useCanvasContext } from '@/contexts/CanvasContext';

export const useZoomControls = () => {
  const { zoom, setZoom, panOffset, setPanOffset } = useCanvasContext();

  const zoomIn = () => {
    const newZoom = Math.min(4.0, zoom + 0.2);
    setZoom(Math.round(newZoom * 100) / 100);
  };

  const zoomOut = () => {
    const newZoom = Math.max(0.2, zoom - 0.2);
    setZoom(Math.round(newZoom * 100) / 100);
  };

  const resetZoom = () => {
    setZoom(1.0);
  };

  const resetView = () => {
    setZoom(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  return { zoom, zoomIn, zoomOut, resetZoom, resetView, panOffset };
};
