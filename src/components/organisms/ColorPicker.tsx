import React, { useState } from 'react';
import { useToolStore } from '../../stores/toolStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ANSI_COLORS } from '../../constants/colors';
import { Palette, Type } from 'lucide-react';

interface ColorPickerProps {
  className?: string;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ className = '' }) => {
  const { selectedColor, selectedBgColor, setSelectedColor, setSelectedBgColor } = useToolStore();
  const [activeTab, setActiveTab] = useState("text");

  // Convert ANSI_COLORS object to array for easier mapping
  const ansiColorsArray = Object.entries(ANSI_COLORS).map(([name, color]) => ({ name, color }));

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Colors</h3>
        <Badge variant="outline" className="text-xs">ANSI</Badge>
      </div>
      
      {/* Current colors display */}
      <Card className="bg-card border border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Current Selection</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-3">
            <div className="flex-1">
              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Type className="w-3 h-3" />
                Text
              </div>
              <div 
                className="w-full h-8 border rounded cursor-pointer transition-transform hover:scale-105"
                style={{ backgroundColor: selectedColor }}
                title={`Text color: ${selectedColor}`}
                onClick={() => setActiveTab("text")}
              />
            </div>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Palette className="w-3 h-3" />
                Background
              </div>
              <div 
                className="w-full h-8 border rounded cursor-pointer transition-transform hover:scale-105"
                style={{ backgroundColor: selectedBgColor }}
                title={`Background color: ${selectedBgColor}`}
                onClick={() => setActiveTab("background")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Color selection tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-auto p-1">
          <TabsTrigger value="text" className="flex items-center gap-2 py-2">
            <Type className="w-3 h-3" />
            Text
          </TabsTrigger>
          <TabsTrigger value="background" className="flex items-center gap-2 py-2">
            <Palette className="w-3 h-3" />
            Background
          </TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="mt-3">
          <Card className="bg-card border border-border/50">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium">Text Colors</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {ansiColorsArray.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-4 gap-2">
                {ansiColorsArray.map(({ name, color }) => (
                  <Button
                    key={`ansi-text-${name}`}
                    variant={selectedColor === color ? 'default' : 'outline'}
                    size="sm"
                    className={`w-14 h-14 p-1 transition-all duration-200 flex-shrink-0 ${
                      selectedColor === color 
                        ? 'bg-primary text-primary-foreground border-primary ring-2 ring-primary ring-offset-2' 
                        : 'bg-background text-foreground border-border hover:bg-accent'
                    }`}
                    onClick={() => setSelectedColor(color)}
                    title={`${name}: ${color}`}
                  >
                    <div 
                      className="w-full h-full rounded border-2 border-background"
                      style={{ backgroundColor: color }}
                    />
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="background" className="mt-3">
          <Card className="bg-card border border-border/50">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium">Background Colors</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {ansiColorsArray.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-4 gap-2">
                {ansiColorsArray.map(({ name, color }) => (
                  <Button
                    key={`ansi-bg-${name}`}
                    variant={selectedBgColor === color ? 'default' : 'outline'}
                    size="sm"
                    className={`w-14 h-14 p-1 transition-all duration-200 flex-shrink-0 ${
                      selectedBgColor === color 
                        ? 'bg-primary text-primary-foreground border-primary ring-2 ring-primary ring-offset-2' 
                        : 'bg-background text-foreground border-border hover:bg-accent'
                    }`}
                    onClick={() => setSelectedBgColor(color)}
                    title={`Background ${name}: ${color}`}
                  >
                    <div 
                      className="w-full h-full rounded border-2 border-background"
                      style={{ backgroundColor: color }}
                    />
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
