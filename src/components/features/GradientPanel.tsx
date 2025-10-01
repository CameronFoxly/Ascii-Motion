/**
 * GradientPanel - Full overlay panel for configuring gradient fill tool
 * 
 * Features:
 * - Full overlay panel matching MediaImportPanel design
 * - Comprehensive gradient configuration with stops management
 * - Live preview on canvas as settings change
 * - Support for character, color, and background gradients
 * - Multiple interpolation methods and gradient types
 */

import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Slider } from '../ui/slider';
import { Input } from '../ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '../ui/collapsible';
import { CollapsibleHeader } from '../common/CollapsibleHeader';
import { PanelSeparator } from '../common/PanelSeparator';
import { GradientIcon } from '../icons';
import { GradientStopPicker } from './GradientStopPicker';
import { GradientPropertyPreview } from './GradientPropertyPreview';
import { PANEL_ANIMATION } from '../../constants';
import { 
  X,
  Plus,
  Minus,
  Move3D,
  Type,
  Palette,
  Circle,
  Square,
  ChevronDown,
  Check,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useGradientStore } from '../../stores/gradientStore';
import { useToolStore } from '../../stores/toolStore';
import { useGradientFillTool } from '../../hooks/useGradientFillTool';
import type { GradientProperty, InterpolationMethod, GradientType, QuantizeStepCount } from '../../types';

const parseTailwindDuration = (token: string): number | null => {
  const match = token.match(/duration-(\d+)/);
  return match ? Number(match[1]) : null;
};

const sanitizeHexInput = (value: string): string => {
  let sanitized = value.replace(/[^#0-9A-Fa-f]/g, '').toUpperCase();

  if (!sanitized.startsWith('#')) {
    sanitized = '#' + sanitized.replace(/#/g, '');
  } else {
    sanitized = '#' + sanitized.slice(1).replace(/#/g, '');
  }

  if (sanitized.length > 7) {
    sanitized = sanitized.slice(0, 7);
  }

  return sanitized;
};

export function GradientPanel() {
  const { activeTool, setActiveTool } = useToolStore();
  const { 
    isOpen, 
    setIsOpen, 
    definition,
    updateDefinition,
    updateProperty,
    addStop,
    removeStop,
    updateStop,
    sortStops,
    startPoint,
    endPoint
  } = useGradientStore();

  // Get gradient tool actions
  const { applyGradient, cancelGradient, canApply, isApplying } = useGradientFillTool();

  const animationDurationMs = useMemo(
    () => parseTailwindDuration(PANEL_ANIMATION.DURATION) ?? 300,
    []
  );

  // Animation state to handle transitions properly
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isAnimating, setIsAnimating] = useState(isOpen);

  // Handle panel animation states
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Trigger animation on next frame to ensure DOM is ready
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    } else if (shouldRender) {
      // Only start exit animation if panel was previously rendered
      setIsAnimating(false);
      // Wait for animation to complete before removing from DOM
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, animationDurationMs);
      return () => clearTimeout(timer);
    }
  }, [isOpen, shouldRender, animationDurationMs]);

  // Section collapse states - only gradient type open by default
  const [gradientTypeOpen, setGradientTypeOpen] = useState(true);
  const [characterOpen, setCharacterOpen] = useState(false);
  const [textColorOpen, setTextColorOpen] = useState(false);
  const [backgroundColorOpen, setBackgroundColorOpen] = useState(false);

  // Picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerType, setPickerType] = useState<'character' | 'textColor' | 'backgroundColor'>('character');
  const [pickerStopIndex, setPickerStopIndex] = useState(0);
  const [pickerInitialValue, setPickerInitialValue] = useState('');

  // Auto-open panel when gradient tool becomes active
  // Auto-close when switching away from gradient tool
  useEffect(() => {
    if (activeTool === 'gradientfill') {
      if (!isOpen) {
        setIsOpen(true);
      }
    } else {
      if (isOpen) {
        setIsOpen(false);
      }
    }
  }, [activeTool, isOpen, setIsOpen]);


  const handleGradientTypeChange = (type: GradientType) => {
    updateDefinition({ type });
  };

  const handleInterpolationChange = (
    property: 'character' | 'textColor' | 'backgroundColor',
    interpolation: InterpolationMethod
  ) => {
    updateProperty(property, { interpolation });
  };

  const handleDitherStrengthChange = (
    property: 'character' | 'textColor' | 'backgroundColor',
    ditherStrength: number
  ) => {
    updateProperty(property, { ditherStrength });
  };

  const handleQuantizeStepsChange = (
    property: 'character' | 'textColor' | 'backgroundColor',
    value: number
  ) => {
    const clampedValue = Math.max(1, Math.min(11, Math.round(value)));
    const quantizeSteps = (clampedValue === 11 ? 'infinite' : clampedValue) as QuantizeStepCount;
    updateProperty(property, { quantizeSteps });
  };

  const handlePropertyEnabledChange = (
    property: 'character' | 'textColor' | 'backgroundColor',
    enabled: boolean
  ) => {
    updateProperty(property, { enabled });
  };

  const handleStopPositionChange = (
    property: 'character' | 'textColor' | 'backgroundColor',
    stopIndex: number,
    position: number
  ) => {
    updateStop(property, stopIndex, { position: position / 100 }); // Convert 0-100 to 0-1
  };

  const handleStopValueChange = (
    property: 'character' | 'textColor' | 'backgroundColor',
    stopIndex: number,
    value: string
  ) => {
    if (property === 'character') {
      updateStop(property, stopIndex, { value });
      return;
    }

    if (property === 'backgroundColor' && value.trim().toLowerCase() === 'transparent') {
      updateStop(property, stopIndex, { value: 'transparent' });
      return;
    }

    const sanitized = sanitizeHexInput(value);
    updateStop(property, stopIndex, { value: sanitized });
  };

  const handleStopPositionCommit = (
    property: 'character' | 'textColor' | 'backgroundColor'
  ) => {
    sortStops(property);
  };

  const handleStopSliderKeyUp = (
    event: KeyboardEvent<HTMLInputElement>,
    property: 'character' | 'textColor' | 'backgroundColor'
  ) => {
    const commitKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (commitKeys.includes(event.key)) {
      sortStops(property);
    }
  };

  const openStopPicker = (
    property: 'character' | 'textColor' | 'backgroundColor',
    stopIndex: number
  ) => {
    const stops = definition[property].stops;
    const currentValue = stops[stopIndex]?.value || '';
    setPickerType(property);
    setPickerStopIndex(stopIndex);
    setPickerInitialValue(currentValue);
    setPickerOpen(true);
  };

  const handlePickerValueSelect = (value: string) => {
    updateStop(pickerType, pickerStopIndex, { value });
    setPickerOpen(false);
  };

  const renderPropertyEditor = (
    propertyKey: 'character' | 'textColor' | 'backgroundColor',
    property: GradientProperty,
    title: string,
    icon: React.ReactNode,
    isOpen: boolean,
    setIsOpen: (open: boolean) => void
  ) => {
    const quantizeSetting = property.quantizeSteps ?? 'infinite';

    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center gap-2 mb-1">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="flex-1 h-auto text-xs justify-between py-1 px-1 my-1">
            <div className="flex items-center gap-2">
              {icon}
              <span>{title}</span>
            </div>
            <ChevronDown 
              className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
            />
          </Button>
        </CollapsibleTrigger>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Switch
                checked={property.enabled}
                onCheckedChange={(checked) => handlePropertyEnabledChange(propertyKey, checked)}
                className="scale-75"
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {property.enabled ? `Disable ${title.toLowerCase()}` : `Enable ${title.toLowerCase()}`}
          </TooltipContent>
        </Tooltip>
      </div>
      <CollapsibleContent className="collapsible-content space-y-3 mt-2">
        <div className="w-full">
          {!property.enabled && (
            <div className="p-3 border border-border/50 rounded-lg bg-muted/20">
              <p className="text-xs text-muted-foreground text-center">
                {propertyKey === 'character' && 'Character gradient is disabled. Enable to gradient characters across the fill area.'}
                {propertyKey === 'textColor' && 'Text color gradient is disabled. Enable to gradient text colors across the fill area.'}
                {propertyKey === 'backgroundColor' && 'Background gradient is disabled. Enable to gradient background colors across the fill area.'}
              </p>
            </div>
          )}
          
          {property.enabled && (
            <div className="flex flex-col gap-3">
            {/* Interpolation Method */}
            <div className="space-y-1">
              <Label className="text-xs">Interpolation</Label>
              <Select 
                value={property.interpolation} 
                onValueChange={(value) => handleInterpolationChange(propertyKey, value as InterpolationMethod)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear">Linear</SelectItem>
                  <SelectItem value="constant">Constant (Steps)</SelectItem>
                  <SelectItem value="bayer2x2">Bayer Dithering 2x2</SelectItem>
                  <SelectItem value="bayer4x4">Bayer Dithering 4x4</SelectItem>
                  <SelectItem value="noise">Noise Dithering</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quantize Steps - only for linear interpolation */}
            {property.interpolation === 'linear' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Quantize Steps</Label>
                  <span className="text-xs text-muted-foreground">
                    {quantizeSetting === 'infinite' ? '∞' : quantizeSetting}
                  </span>
                </div>
                <Slider
                  value={quantizeSetting === 'infinite' ? 11 : quantizeSetting}
                  onValueChange={(value: number) => handleQuantizeStepsChange(propertyKey, value)}
                  min={1}
                  max={11}
                  step={1}
                  className="h-6"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Stepped</span>
                  <span>Smooth</span>
                </div>
              </div>
            )}
            {/* Dithering Strength - only show for dithering methods */}
            {(property.interpolation === 'bayer2x2' || property.interpolation === 'bayer4x4' || property.interpolation === 'noise') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Dithering Strength</Label>
                  <span className="text-xs text-muted-foreground">{property.ditherStrength}%</span>
                </div>
                <Slider
                  value={property.ditherStrength}
                  onValueChange={(value: number) => handleDitherStrengthChange(propertyKey, value)}
                  min={0}
                  max={100}
                  step={1}
                  className="h-6"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Step-like</span>
                  <span>Full dither</span>
                </div>
              </div>
            )}

            <GradientPropertyPreview propertyKey={propertyKey} property={property} />

            {/* Gradient Stops */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Gradient Stops</Label>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => addStop(propertyKey)}
                    disabled={property.stops.length >= 8}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                {property.stops.map((stop, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 border border-border rounded bg-card">
                    {/* Position Slider */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs w-8 font-mono">
                          {Math.round(stop.position * 100)}%
                        </Label>
                        <Slider
                          value={Math.round(stop.position * 100)}
                          onValueChange={(value: number) => handleStopPositionChange(propertyKey, index, value)}
                          min={0}
                          max={100}
                          step={1}
                          className="flex-1"
                          onMouseUp={() => handleStopPositionCommit(propertyKey)}
                          onTouchEnd={() => handleStopPositionCommit(propertyKey)}
                          onKeyUp={(event) => handleStopSliderKeyUp(event, propertyKey)}
                        />
                      </div>
                    </div>
                    
                    {/* Value Preview */}
                    {propertyKey !== 'character' && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="w-8 h-8 rounded border-2 border-border flex-shrink-0 transition-all focus:outline-none focus:ring-2 focus:ring-white/90 focus:ring-offset-2 focus:ring-offset-background hover:shadow-[0_0_0_2px_rgba(255,255,255,0.85)]"
                            onClick={() => openStopPicker(propertyKey, index)}
                            style={{
                              backgroundColor: stop.value === 'transparent' ? 'transparent' : stop.value,
                              backgroundImage: stop.value === 'transparent'
                                ? 'linear-gradient(45deg, rgba(255,255,255,0.35) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.35) 75%), linear-gradient(45deg, rgba(255,255,255,0.35) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.35) 75%)'
                                : undefined,
                              backgroundPosition: stop.value === 'transparent' ? '0 0, 8px 8px' : undefined,
                              backgroundSize: stop.value === 'transparent' ? '16px 16px' : undefined
                            }}
                            aria-label="Edit color"
                          />
                        </TooltipTrigger>
                        <TooltipContent>Edit color</TooltipContent>
                      </Tooltip>
                    )}
                    
                    {/* Character Preview */}
                    {propertyKey === 'character' && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="w-8 h-8 text-xs flex items-center justify-center border-2 border-border rounded bg-muted font-mono transition-all focus:outline-none focus:ring-2 focus:ring-white/90 focus:ring-offset-2 focus:ring-offset-background hover:shadow-[0_0_0_2px_rgba(255,255,255,0.85)]"
                            onClick={() => openStopPicker(propertyKey, index)}
                            aria-label="Edit character"
                          >
                            {stop.value || '?'}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Edit character</TooltipContent>
                      </Tooltip>
                    )}
                    
                    {/* Value Input */}
                    <div className="w-24">
                      <Input
                        value={stop.value}
                        onChange={(e) => handleStopValueChange(propertyKey, index, e.target.value)}
                        className={cn(
                          "h-7 text-xs text-center font-mono",
                          propertyKey !== 'character' && 'uppercase'
                        )}
                        placeholder={propertyKey === 'character' ? 'A' : '#FFF'}
                        inputMode={propertyKey === 'character' ? 'text' : 'text'}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                      />
                    </div>
                    
                    {/* Remove Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => removeStop(propertyKey, index)}
                      disabled={property.stops.length <= 1}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          )}
        </div>
      </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <TooltipProvider>
      {/* Render panel only when it should be visible or animating */}
      {shouldRender && (
        <div className={cn(
          "fixed inset-y-0 right-0 w-80 bg-background border-l border-border shadow-lg z-50 flex flex-col overflow-hidden",
          PANEL_ANIMATION.TRANSITION,
          isAnimating ? "translate-x-0" : "translate-x-full"
        )}>
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border">
            <h2 className="text-sm font-medium flex items-center gap-2">
              <GradientIcon className="w-3 h-3" />
              Gradient Fill
            </h2>
            <Button
              onClick={() => {
                setIsOpen(false);
                setActiveTool('pencil');
              }}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>

          {/* Scrollable Content Area */}
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-3 overflow-x-hidden">
          
          {/* Gradient Type Section */}
          <Collapsible open={gradientTypeOpen} onOpenChange={setGradientTypeOpen}>
            <CollapsibleHeader isOpen={gradientTypeOpen}>
              <div className="flex items-center gap-2">
                <Move3D className="w-3 h-3" />
                Gradient Type
              </div>
            </CollapsibleHeader>
            <CollapsibleContent className="collapsible-content">
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button
                  variant={definition.type === 'linear' ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 justify-start"
                  onClick={() => handleGradientTypeChange('linear')}
                >
                  <Square className="w-3 h-3 mr-1" />
                  Linear
                </Button>
                <Button
                  variant={definition.type === 'radial' ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 justify-start"
                  onClick={() => handleGradientTypeChange('radial')}
                >
                  <Circle className="w-3 h-3 mr-1" />
                  Radial
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <PanelSeparator marginX="3" />

          {/* Character Property */}
          {renderPropertyEditor(
            'character',
            definition.character,
            'Character Gradient',
            <Type className="w-3 h-3" />,
            characterOpen,
            setCharacterOpen
          )}

          <PanelSeparator marginX="3" />

          {/* Text Color Property */}
          {renderPropertyEditor(
            'textColor',
            definition.textColor,
            'Text Color Gradient',
            <Palette className="w-3 h-3" />,
            textColorOpen,
            setTextColorOpen
          )}

          <PanelSeparator marginX="3" />

          {/* Background Color Property */}
          {renderPropertyEditor(
            'backgroundColor',
            definition.backgroundColor,
            'Background Gradient',
            <Square className="w-3 h-3" />,
            backgroundColorOpen,
            setBackgroundColorOpen
          )}

          <PanelSeparator marginX="3" />

            </div>
          </ScrollArea>

          {/* Footer with Apply/Cancel Buttons */}
          <div className="p-3 border-t border-border space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={cancelGradient}
                disabled={!isApplying}
                className="h-8 text-xs"
              >
                <X className="w-3 h-3 mr-2" />
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={applyGradient}
                disabled={!canApply}
                className="h-8 text-xs"
              >
                <Check className="w-3 h-3 mr-2" />
                Apply Gradient
              </Button>
            </div>
            <div className="text-xs text-muted-foreground text-center">
              {!isApplying && 'Click and drag on canvas to create gradient'}
              {isApplying && !startPoint && 'Click and drag on canvas to create gradient'}
              {isApplying && startPoint && !endPoint && 'Click to add gradient end point'}
              {isApplying && startPoint && endPoint && 'Press Enter to apply or Escape to cancel'}
            </div>
          </div>

          {/* Gradient Stop Picker Dialog */}
          <GradientStopPicker
            isOpen={pickerOpen}
            onOpenChange={setPickerOpen}
            onValueSelect={handlePickerValueSelect}
            initialValue={pickerInitialValue}
            type={pickerType}
          />
        </div>
      )}
    </TooltipProvider>
  );
}