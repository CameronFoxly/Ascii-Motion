import React, { useState, useCallback, useRef } from 'react';
import { GripHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DraggableDialogBarProps {
  title: string;
  onDrag?: (deltaX: number, deltaY: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onClose?: () => void;
}

export const DraggableDialogBar: React.FC<DraggableDialogBarProps> = ({ 
  title,
  onDrag,
  onDragStart,
  onDragEnd,
  onClose
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

  const handleClose = useCallback((e: React.MouseEvent) => {
    // Prevent dragging when clicking close button
    e.stopPropagation();
    onClose?.();
  }, [onClose]);

  return (
    <div
      className={`flex items-center justify-between p-3 border-b border-border select-none ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      onMouseDown={handleMouseDown}
    >
      <h2 className="text-sm font-medium flex items-center gap-2">
        <GripHorizontal className="w-3 h-3 text-muted-foreground" />
        {title}
      </h2>
      {onClose && (
        <Button
          onClick={handleClose}
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <X className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
};
