import React, { useState } from 'react';
import { useToolStore } from '../../stores/toolStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold">Characters</h3>
        <Badge variant="outline" className="text-xs h-4">
          {Object.values(CHARACTER_CATEGORIES).flat().length}
        </Badge>
      </div>
      
      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto p-0.5 gap-0.5">
          {categoryEntries.slice(0, 4).map(([categoryName]) => {
            const IconComponent = CATEGORY_ICONS[categoryName as keyof typeof CATEGORY_ICONS];
            return (
              <TabsTrigger 
                key={categoryName} 
                value={categoryName}
                className="flex items-center justify-center p-1 h-6 text-xs"
                title={categoryName}
              >
                <IconComponent className="w-3 h-3" />
              </TabsTrigger>
            );
          })}
        </TabsList>
        
        <TabsList className="grid w-full grid-cols-4 h-auto p-0.5 gap-0.5 mt-1">
          {categoryEntries.slice(4).map(([categoryName]) => {
            const IconComponent = CATEGORY_ICONS[categoryName as keyof typeof CATEGORY_ICONS];
            return (
              <TabsTrigger 
                key={categoryName} 
                value={categoryName}
                className="flex items-center justify-center p-1 h-6 text-xs"
                title={categoryName}
              >
                <IconComponent className="w-3 h-3" />
              </TabsTrigger>
            );
          })}
        </TabsList>

        {categoryEntries.map(([categoryName, characters]) => (
          <TabsContent key={categoryName} value={categoryName} className="mt-2">
            <Card className="bg-card border border-border/50">
              <CardContent className="p-2">
                <div className="grid grid-cols-8 gap-0.5">
                  {characters.map((char) => (
                    <Button
                      key={char}
                      variant={selectedChar === char ? 'default' : 'outline'}
                      size="sm"
                      className="w-6 h-6 p-0 font-mono text-xs"
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
    </div>
  );
};
