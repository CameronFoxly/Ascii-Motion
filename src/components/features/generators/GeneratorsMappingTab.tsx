/**
 * GeneratorsMappingTab - Mapping settings for generator output
 * 
 * Wraps the mapping sections from MediaImportPanel to work with generatorsStore.
 * Provides character, text color, and background color mapping controls.
 */

import { CharacterMappingSection } from '../CharacterMappingSection';
import { TextColorMappingSection } from '../TextColorMappingSection';
import { BackgroundColorMappingSection } from '../BackgroundColorMappingSection';
import { PanelSeparator } from '../../common/PanelSeparator';
import { Slider } from '../../ui/slider';
import { useGeneratorsStore } from '../../../stores/generatorsStore';
import { useImportStore } from '../../../stores/importStore';
import { useCharacterPaletteStore } from '../../../stores/characterPaletteStore';
import { useEffect } from 'react';

/**
 * The mapping sections (CharacterMappingSection, TextColorMappingSection, BackgroundColorMappingSection)
 * are designed to work with the importStore. To reuse them for generators without duplication,
 * we temporarily sync the generatorsStore.mappingSettings to importStore.settings while this
 * tab is active, then sync back any changes when unmounting.
 * 
 * This approach:
 * 1. Avoids duplicating 2000+ lines of mapping UI code
 * 2. Ensures palette managers and all controls work correctly
 * 3. Maintains consistency between import and generator mapping UX
 * 4. Keeps the implementation timeline achievable for Phase 3
 * 
 * Future refactor (post-Phase 6): Extract shared mapping logic into composable hooks
 * that can be used by both import and generators without store coupling.
 */
export function GeneratorsMappingTab() {
  const { mappingSettings, updateMappingSettings, markPreviewDirty } = useGeneratorsStore();
  const { updateSettings: updateImportSettings } = useImportStore();
  const activePalette = useCharacterPaletteStore((state) => state.activePalette);
  const convertedFrames = useGeneratorsStore((state) => state.convertedFrames);
  const currentPreviewFrame = useGeneratorsStore((state) => state.uiState.currentPreviewFrame);
  const setPreviewFrame = useGeneratorsStore((state) => state.setPreviewFrame);
  const isGenerating = useGeneratorsStore((state) => state.isGenerating);

  // On mount, sync FROM generatorsStore TO importStore
  // This allows the mapping sections (which use useImportSettings) to work with generator settings
  useEffect(() => {
    updateImportSettings({
      enableCharacterMapping: mappingSettings.enableCharacterMapping,
      characterSet: mappingSettings.characterSet,
      characterMappingMode: mappingSettings.characterMappingMode,
      customCharacterMapping: mappingSettings.customCharacterMapping,
      
      enableTextColorMapping: mappingSettings.enableTextColorMapping,
      textColorPaletteId: mappingSettings.textColorPaletteId,
      textColorMappingMode: mappingSettings.textColorMappingMode,
      
      enableBackgroundColorMapping: mappingSettings.enableBackgroundColorMapping,
      backgroundColorPaletteId: mappingSettings.backgroundColorPaletteId,
      backgroundColorMappingMode: mappingSettings.backgroundColorMappingMode,
    });
    
    // On unmount, sync back FROM importStore TO generatorsStore
    return () => {
      const importSettings = useImportStore.getState().settings;
      updateMappingSettings({
        enableCharacterMapping: importSettings.enableCharacterMapping,
        characterSet: importSettings.characterSet,
        characterMappingMode: importSettings.characterMappingMode,
        customCharacterMapping: importSettings.customCharacterMapping,
        
        enableTextColorMapping: importSettings.enableTextColorMapping,
        textColorPaletteId: importSettings.textColorPaletteId,
        textColorMappingMode: importSettings.textColorMappingMode,
        
        enableBackgroundColorMapping: importSettings.enableBackgroundColorMapping,
        backgroundColorPaletteId: importSettings.backgroundColorPaletteId,
        backgroundColorMappingMode: importSettings.backgroundColorMappingMode,
      });
      markPreviewDirty();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount/unmount - intentionally ignoring dependencies

  // Sync active character palette's characters to mapping settings
  useEffect(() => {
    if (activePalette && activePalette.characters.length > 0) {
      const newCharacterSet = activePalette.characters;
      
      // Update both stores so they stay in sync
      updateImportSettings({ characterSet: newCharacterSet });
      updateMappingSettings({ characterSet: newCharacterSet });
    }
  }, [activePalette, updateImportSettings, updateMappingSettings]);

  // Handle settings changes from the mapping sections
  const handleSettingsChange = () => {
    // Sync FROM importStore back to generatorsStore
    const importSettings = useImportStore.getState().settings;
    
    updateMappingSettings({
      enableCharacterMapping: importSettings.enableCharacterMapping,
      characterSet: importSettings.characterSet,
      characterMappingMode: importSettings.characterMappingMode,
      customCharacterMapping: importSettings.customCharacterMapping,
      
      enableTextColorMapping: importSettings.enableTextColorMapping,
      textColorPaletteId: importSettings.textColorPaletteId,
      textColorMappingMode: importSettings.textColorMappingMode,
      
      enableBackgroundColorMapping: importSettings.enableBackgroundColorMapping,
      backgroundColorPaletteId: importSettings.backgroundColorPaletteId,
      backgroundColorMappingMode: importSettings.backgroundColorMappingMode,
    });
    
    // Mark preview as dirty to trigger regeneration
    markPreviewDirty();
  };

  return (
    <div className="space-y-3">
      {/* Frame Scrubber - allows previewing different frames while adjusting mapping */}
      {convertedFrames.length > 0 && (
        <div className="space-y-2 pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">Preview Frame</span>
            <span className="text-xs text-muted-foreground">
              {currentPreviewFrame + 1} / {convertedFrames.length}
            </span>
          </div>
          <Slider
            value={currentPreviewFrame}
            onValueChange={(value) => setPreviewFrame(value)}
            min={0}
            max={Math.max(0, convertedFrames.length - 1)}
            step={1}
            disabled={isGenerating || convertedFrames.length === 0}
            className="flex-1"
          />
        </div>
      )}
      
      {/* Character Mapping */}
      <CharacterMappingSection onSettingsChange={handleSettingsChange} />
      
      <PanelSeparator />
      
      {/* Text Color Mapping */}
      <TextColorMappingSection onSettingsChange={handleSettingsChange} />
      
      <PanelSeparator />
      
      {/* Background Color Mapping */}
      <BackgroundColorMappingSection onSettingsChange={handleSettingsChange} />
    </div>
  );
}
