import React, { useState } from 'react';
import { useToolStore } from '../../stores/toolStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CHARACTER_CATEGORIES } from '../../constants';
import { 
  Type, 
  Hash, 
  Grid3X3, 
  TrendingUp, 
  Navigation, 
  Triangle, 
  Sparkles,
  Minus
} from 'lucide-react';

interface CharacterPaletteProps {
  className?: string;
}

const CATEGORY_ICONS = {
  "Basic Text": Type,
  "Punctuation": Minus,
  "Math/Symbols": Hash,
  "Lines/Borders": Grid3X3,
  "Blocks/Shading": TrendingUp,
  "Arrows": Navigation,
  "Geometric": Triangle,
  "Special": Sparkles
};

export const CharacterPalette: React.FC<CharacterPaletteProps> = ({ className = '' }) => {
  const { selectedChar, setSelectedChar } = useToolStore();
  const [activeCategory, setActiveCategory] = useState("Basic Text");

  const categoryEntries = Object.entries(CHARACTER_CATEGORIES);

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Character Palette</h3>
        <Badge variant="outline" className="text-xs">
          {Object.values(CHARACTER_CATEGORIES).flat().length} chars
        </Badge>
      </div>
      
      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto p-1 gap-1">
          {categoryEntries.slice(0, 4).map(([categoryName]) => {
            const IconComponent = CATEGORY_ICONS[categoryName as keyof typeof CATEGORY_ICONS];
            return (
              <TabsTrigger 
                key={categoryName} 
                value={categoryName}
                className="flex flex-col items-center gap-1 p-2 h-auto text-xs"
              >
                <IconComponent className="w-3 h-3" />
                <span className="hidden sm:inline">{categoryName.split('/')[0]}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
        
        <TabsList className="grid w-full grid-cols-4 h-auto p-1 gap-1 mt-1">
          {categoryEntries.slice(4).map(([categoryName]) => {
            const IconComponent = CATEGORY_ICONS[categoryName as keyof typeof CATEGORY_ICONS];
            return (
              <TabsTrigger 
                key={categoryName} 
                value={categoryName}
                className="flex flex-col items-center gap-1 p-2 h-auto text-xs"
              >
                <IconComponent className="w-3 h-3" />
                <span className="hidden sm:inline">{categoryName.split('/')[0]}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {categoryEntries.map(([categoryName, characters]) => (
          <TabsContent key={categoryName} value={categoryName} className="mt-3">
            <Card className="bg-card border border-border/50">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm font-medium">{categoryName}</CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {characters.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-8 gap-1">
                  {characters.map((char) => (
                    <Button
                      key={char}
                      variant={selectedChar === char ? 'default' : 'outline'}
                      size="sm"
                      className={`w-8 h-8 p-0 font-mono text-xs transition-all duration-200 flex-shrink-0 ${
                        selectedChar === char 
                          ? 'bg-primary text-primary-foreground border-primary' 
                          : 'bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground'
                      }`}
                      onClick={() => setSelectedChar(char)}
                      title={`Character: ${char} (${char.charCodeAt(0)})`}
                    >
                      <span className="leading-none">{char}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Current selection display */}
      <Card className="bg-card border border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Selected</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div className="text-lg font-mono w-8 h-8 border rounded bg-muted flex items-center justify-center">
              {selectedChar}
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div>Char: "{selectedChar}"</div>
              <div>Code: {selectedChar.charCodeAt(0)}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
