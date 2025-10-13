import React, { useState } from 'react';
import { useToolStore } from '../../stores/toolStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { CollapsibleHeader } from '../common/CollapsibleHeader';
import { CHARACTER_CATEGORIES } from '../../constants';
import { 
  Type, 
  Hash, 
  Grid3X3, 
  Square, 
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
  "Blocks/Shading": Square,
  "Arrows": Navigation,
  "Geometric": Triangle,
  "Special": Sparkles
};

export const CharacterPalette: React.FC<CharacterPaletteProps> = ({ className = '' }) => {
  const { selectedChar, setSelectedChar } = useToolStore();
  const [activeCategory, setActiveCategory] = useState("Basic Text");
  const [showCharacters, setShowCharacters] = useState(true);

  const categoryEntries = Object.entries(CHARACTER_CATEGORIES);

  return (
    <div className={`space-y-2 ${className}`}>
      <Collapsible open={showCharacters} onOpenChange={setShowCharacters}>
        <CollapsibleHeader isOpen={showCharacters}>
          Characters
        </CollapsibleHeader>
        <CollapsibleContent className="collapsible-content">
      
      <TooltipProvider>
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-auto p-0.5 gap-0.5">
            {categoryEntries.slice(0, 4).map(([categoryName]) => {
              const IconComponent = CATEGORY_ICONS[categoryName as keyof typeof CATEGORY_ICONS];
              return (
                <Tooltip key={categoryName}>
                  <TooltipTrigger asChild>
                    <TabsTrigger 
                      value={categoryName}
                      className="flex items-center justify-center p-0.5 h-5 text-xs"
                    >
                      <IconComponent className="w-2.5 h-2.5" />
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{categoryName}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TabsList>
          
          <TabsList className="grid w-full grid-cols-4 h-auto p-0.5 gap-0.5 mt-0.5">
            {categoryEntries.slice(4).map(([categoryName]) => {
              const IconComponent = CATEGORY_ICONS[categoryName as keyof typeof CATEGORY_ICONS];
              return (
                <Tooltip key={categoryName}>
                  <TooltipTrigger asChild>
                    <TabsTrigger 
                      value={categoryName}
                      className="flex items-center justify-center p-0.5 h-5 text-xs"
                    >
                      <IconComponent className="w-2.5 h-2.5" />
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{categoryName}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TabsList>

        {categoryEntries.map(([categoryName, characters]) => (
          <TabsContent key={categoryName} value={categoryName} className="mt-2">
            <Card className="bg-card border border-border/50">
              <CardContent className="p-2">
                <div 
                  className="grid grid-cols-6 gap-0.5 w-full overflow-y-auto"
                  style={{ maxHeight: '120px' }} // Approximately 5 rows: 5 * (button height + gap)
                >
                  {characters.map((char) => (
                    <Tooltip key={char}>
                      <TooltipTrigger asChild>
                        <Button
                          variant={selectedChar === char ? 'default' : 'outline'}
                          size="sm"
                          className="w-full aspect-square p-0 font-mono text-xs flex items-center justify-center min-w-0 flex-shrink-0 h-6"
                          onClick={() => setSelectedChar(char)}
                        >
                          <span className="leading-none text-xs">{char}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Character: {char} ({char.charCodeAt(0)})</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
        </Tabs>
      </TooltipProvider>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
