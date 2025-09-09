import React, { useState } from 'react';
import { useToolStore } from '../../stores/toolStore';
import { Card, CardContent } from '@/components/ui/card';
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
    <div className={`space-y-2 ${className}`}>      
      {/* Color picker tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-6">
          <TabsTrigger value="text" className="text-xs h-5 flex items-center justify-center gap-1">
            <Type className="w-3 h-3" />
            Text
          </TabsTrigger>
          <TabsTrigger value="bg" className="text-xs h-5 flex items-center justify-center gap-1">
            <Palette className="w-3 h-3" />
            BG
          </TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="mt-2">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-2">
              <div className="grid grid-cols-4 gap-1">
                {ansiColorsArray.map(({ name, color }) => (
                  <button
                    key={`text-${name}`}
                    className={`w-8 h-6 rounded border-2 transition-all hover:scale-105 ${
                      selectedColor === color 
                        ? 'border-primary ring-2 ring-primary/20' 
                        : 'border-border'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                    title={`${name}: ${color}`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bg" className="mt-2">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-2">
              <div className="grid grid-cols-4 gap-1">
                {ansiColorsArray.map(({ name, color }) => (
                  <button
                    key={`bg-${name}`}
                    className={`w-8 h-6 rounded border-2 transition-all hover:scale-105 ${
                      selectedBgColor === color 
                        ? 'border-primary ring-2 ring-primary/20' 
                        : 'border-border'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedBgColor(color)}
                    title={`${name}: ${color}`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
