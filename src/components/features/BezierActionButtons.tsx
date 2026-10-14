/**
 * Bezier Action Buttons
 * 
 * Floating action buttons for accepting or canceling bezier shapes.
 * Displayed in the bottom-left corner of the canvas when the bezier tool is active.
 */

import React from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useBezierStore } from '../../stores/bezierStore';
import { useToolStore } from '../../stores/toolStore';

interface BezierActionButtonsProps {
  onAccept: () => void;
  onCancel: () => void;
}

interface CanvasCommitCancelButtonsProps extends BezierActionButtonsProps {
  acceptLabel?: string;
  cancelLabel?: string;
  acceptShortcut?: string;
}

export const BezierActionButtons: React.FC<BezierActionButtonsProps> = ({
  onAccept,
  onCancel,
}) => {
  const { activeTool } = useToolStore();
  const { anchorPoints } = useBezierStore();

  // Only show when bezier/rectangle/ellipse tool is active and there are anchor points
  if ((activeTool !== 'beziershape' && activeTool !== 'rectangle' && activeTool !== 'ellipse') || anchorPoints.length === 0) {
    return null;
  }

  return <CanvasCommitCancelButtons onAccept={onAccept} onCancel={onCancel} />;
};

export const CanvasCommitCancelButtons: React.FC<CanvasCommitCancelButtonsProps> = ({
  onAccept, onCancel, acceptLabel = 'Accept', cancelLabel = 'Cancel', acceptShortcut = 'Enter',
}) => {
  return (
    <div
      className="absolute bottom-4 left-4 z-30 flex gap-2 pointer-events-auto opacity-50 hover:opacity-100 transition-opacity"
      onMouseDown={(event) => event.preventDefault()}
    >
      <TooltipProvider delayDuration={300}>
        {/* Accept Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="default"
              className="h-10 w-10 rounded-full bg-green-600 hover:bg-green-700 text-white shadow-lg"
              aria-label={acceptLabel}
              onClick={onAccept}
            >
              <Check className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{acceptLabel} ({acceptShortcut})</p>
          </TooltipContent>
        </Tooltip>

        {/* Cancel Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="default"
              className="h-10 w-10 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg"
              aria-label={cancelLabel}
              onClick={onCancel}
            >
              <X className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{cancelLabel} (Esc)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
