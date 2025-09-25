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

import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Slider } from '../ui/slider';
import { Input } from '../ui/input';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '../ui/collapsible';
import { CollapsibleHeader } from '../common/CollapsibleHeader';
import { GradientIcon } from '../icons';
import { GradientStopPicker } from './GradientStopPicker';
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
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useGradientStore } from '../../stores/gradientStore';
import { useToolStore } from '../../stores/toolStore';
import type { GradientProperty, InterpolationMethod, GradientType } from '../../types';

const parseTailwindDuration = (token: string): number | null => {
  const match = token.match(/duration-(\d+)/);
  return match ? Number(match[1]) : null;
};

export function GradientPanel() {
  const { activeTool, selectedChar, selectedColor, selectedBgColor, setActiveTool } = useToolStore();
  const { 
    isOpen, 
    setIsOpen, 
    definition,
    updateDefinition,
    updateProperty,
    addStop,
    removeStop,
    updateStop
  } = useGradientStore();

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

  // Section collapse states
  const [gradientTypeOpen, setGradientTypeOpen] = useState(true);
  const [characterOpen, setCharacterOpen] = useState(true);
  const [textColorOpen, setTextColorOpen] = useState(true);
  const [backgroundColorOpen, setBackgroundColorOpen] = useState(true);

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
    updateStop(property, stopIndex, { value });
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
  ) => (
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
        <Switch
          checked={property.enabled}
          onCheckedChange={(checked) => handlePropertyEnabledChange(propertyKey, checked)}
          className="scale-75"
        />
      </div>
      <CollapsibleContent className="collapsible-content">
        {property.enabled && (
          <div className="space-y-3 mt-2">
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
                  <SelectItem value="bayer">Bayer Dithering</SelectItem>
                  <SelectItem value="noise">Noise Dithering</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Gradient Stops */}
            <div className="space-y-2">
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
              
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {property.stops.map((stop, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 border border-border rounded bg-card">
                    {/* Position Slider */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs w-8 font-mono">
                          {Math.round(stop.position * 100)}%
                        </Label>
                        <Slider
                          value={stop.position * 100}
                          onValueChange={(value: number) => handleStopPositionChange(propertyKey, index, value)}
                          min={0}
                          max={100}
                          step={1}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    
                    {/* Value Preview */}
                    {propertyKey !== 'character' && (
                      <div
                        className="w-6 h-6 rounded border border-border flex-shrink-0"
                        style={{ backgroundColor: stop.value === 'transparent' ? 'transparent' : stop.value }}
                        title={stop.value}
                      />
                    )}
                    
                    {/* Character Preview */}
                    {propertyKey === 'character' && (
                      <div className="w-6 h-6 text-xs flex items-center justify-center border border-border rounded bg-muted font-mono">
                        {stop.value || '?'}
                      </div>
                    )}
                    
                    {/* Value Input */}
                    <div className="w-16">
                      <Input
                        value={stop.value}
                        onChange={(e) => handleStopValueChange(propertyKey, index, e.target.value)}
                        className="h-6 text-xs text-center font-mono"
                        placeholder={propertyKey === 'character' ? 'A' : '#FFF'}
                      />
                    </div>
                    
                    {/* Open Picker Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => openStopPicker(propertyKey, index)}
                      title={`Pick ${propertyKey === 'character' ? 'character' : 'color'}`}
                    >
                      <Palette className="w-3 h-3" />
                    </Button>
                    
                    {/* Remove Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => removeStop(propertyKey, index)}
                      disabled={property.stops.length <= 2}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );

  return (
    <>
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
        <div className="p-3 space-y-3" style={{ width: '296px', maxWidth: '296px' }}>
          
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

          <Separator />

          {/* Character Property */}
          {renderPropertyEditor(
            'character',
            definition.character,
            'Character Gradient',
            <Type className="w-3 h-3" />,
            characterOpen,
            setCharacterOpen
          )}

          <Separator />

          {/* Text Color Property */}
          {renderPropertyEditor(
            'textColor',
            definition.textColor,
            'Text Color Gradient',
            <Palette className="w-3 h-3" />,
            textColorOpen,
            setTextColorOpen
          )}

          <Separator />

          {/* Background Color Property */}
          {renderPropertyEditor(
            'backgroundColor',
            definition.backgroundColor,
            'Background Gradient',
            <Square className="w-3 h-3" />,
            backgroundColorOpen,
            setBackgroundColorOpen
          )}

          <Separator />

          {/* Current Tool Values Display */}
          <div className="bg-muted/30 rounded p-2 space-y-1">
            <div className="text-xs text-muted-foreground mb-1">Current Tool Values:</div>
            <div className="flex items-center justify-between text-xs">
              <span>Character:</span>
              <code className="bg-muted px-1 rounded">{selectedChar}</code>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>Text Color:</span>
              <div className="flex items-center gap-1">
                <div
                  className="w-3 h-3 rounded border"
                  style={{ backgroundColor: selectedColor }}
                />
                <code className="bg-muted px-1 rounded text-xs">{selectedColor}</code>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>Background:</span>
              <div className="flex items-center gap-1">
                <div
                  className="w-3 h-3 rounded border"
                  style={{ backgroundColor: selectedBgColor === 'transparent' ? '#000000' : selectedBgColor }}
                />
                <code className="bg-muted px-1 rounded text-xs">
                  {selectedBgColor === 'transparent' ? 'transparent' : selectedBgColor}
                </code>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Use the palette icon to copy these values to gradient stops
            </div>
          </div>

          {/* Instructions */}
          <div className="text-xs text-muted-foreground space-y-1 p-2 bg-muted/20 rounded">
            <div className="font-medium">Instructions:</div>
            <div>• Click and drag on canvas to set gradient direction</div>
            <div>• Alt+click for eyedropper tool</div>
            <div>• Enable properties you want to gradient</div>
            <div>• Adjust stops and interpolation methods</div>
          </div>

        </div>
      </ScrollArea>

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
    </>
  );
}