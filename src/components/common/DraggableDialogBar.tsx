import React, { useState, useCallback, useRef } from 'react';
import { GripHorizontal } from 'lucide-react';

interface DraggableDialogBarProps {
  title: string;
  onDrag?: (deltaX: number, deltaY: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export const DraggableDialogBar: React.FC<DraggableDialogBarProps> = ({ 
  title,
  onDrag,
  onDragStart,
  onDragEnd
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPosRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Prevent text selection during drag
    e.preventDefault();
    
    setIsDragging(true);
    
    // Store the starting mouse position
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    
    // Call onDragStart to get the current offset before we start dragging
    onDragStart?.();

    const handleMouseMove = (moveEvent: MouseEvent) => {
      // Calculate delta from drag start position
      const deltaX = moveEvent.clientX - dragStartPosRef.current.x;
      const deltaY = moveEvent.clientY - dragStartPosRef.current.y;
      
      if (onDrag) {
        onDrag(deltaX, deltaY);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onDragEnd?.();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [onDrag, onDragStart, onDragEnd]);

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/30 cursor-move select-none ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      onMouseDown={handleMouseDown}
    >
      <GripHorizontal className="w-4 h-4 text-muted-foreground" />
      <h3 className="text-lg font-semibold flex-1">{title}</h3>
    </div>
  );
};
