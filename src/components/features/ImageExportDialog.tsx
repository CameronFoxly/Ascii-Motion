import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Slider } from '../ui/slider';
import { FileImage, Download, Settings, Loader2, CheckCircle2, AlertTriangle, Film } from 'lucide-react';
import { useExportStore } from '../../stores/exportStore';
import { useExportDataCollector } from '../../utils/exportDataCollector';
import { useProjectMetadataStore } from '../../stores/projectMetadataStore';
import { useCanvasContext } from '../../contexts/CanvasContext';
import { useTimelineStore } from '../../stores/timelineStore';
import { ExportRenderer } from '../../utils/exportRenderer';
import type { SvgExportSettings } from '../../types/export';
import { 
	calculateExportPixelDimensions, 
	formatPixelDimensions, 
	estimateImageFileSize,
	estimateSvgFileSize
} from '../../utils/exportPixelCalculator';
import { getFontById } from '../../constants/fonts';
import { detectAvailableFont, getFontFallbackMessage } from '../../utils/fontDetection';

const FORMAT_OPTIONS: Array<{ value: 'png' | 'jpg' | 'svg'; label: string; description: string }> = [
	{
		value: 'png',
		label: 'PNG (.png)',
		description: 'Lossless raster with transparency',
	},
	{
		value: 'jpg',
		label: 'JPEG (.jpg)',
		description: 'Compressed raster, smaller files',
	},
	{
		value: 'svg',
		label: 'SVG (.svg)',
		description: 'Scalable vector graphics',
	},
];

/**
 * Image Export Dialog
 * Supports PNG, JPEG, and SVG exports with format-specific settings
 */
export const ImageExportDialog: React.FC = () => {
	const activeFormat = useExportStore((state) => state.activeFormat);
	const showExportModal = useExportStore((state) => state.showExportModal);
	const setShowExportModal = useExportStore((state) => state.setShowExportModal);
	const imageSettings = useExportStore((state) => state.imageSettings);
	const setImageSettings = useExportStore((state) => state.setImageSettings);
	const setProgress = useExportStore((state) => state.setProgress);
	const setIsExporting = useExportStore((state) => state.setIsExporting);
	const isExporting = useExportStore((state) => state.isExporting);

	const isOpen = showExportModal && activeFormat === 'png';
	const exportData = useExportDataCollector(isOpen);
	const projectName = useProjectMetadataStore((state) => state.projectName);
	const { selectedFontId, actualFont: canvasActualFont, isFontDetecting: canvasIsFontDetecting } = useCanvasContext();
	const postEffectTracks = useTimelineStore((s) => s.postEffectTracks);
	const timelineConfig = useTimelineStore((s) => s.config);

	const [filename, setFilename] = useState(projectName || 'ascii-motion-frame');
	const [sequenceMode, setSequenceMode] = useState(false);
	const [entireTimeline, setEntireTimeline] = useState(true);
	const [rangeStart, setRangeStart] = useState(1);
	const [rangeEnd, setRangeEnd] = useState(1);
	const [svgFontStatus, setSvgFontStatus] = useState<{
		isDetecting: boolean;
		actualFont: string | null;
		isFallback: boolean;
	}>({
		isDetecting: false,
		actualFont: null,
		isFallback: false
	});

	// Sync filename with project name when dialog opens
	useEffect(() => {
		if (isOpen && projectName) {
			setFilename(projectName);
		}
	}, [isOpen, projectName]);

	// Initialize range end to total frame count when dialog opens or timeline changes
	useEffect(() => {
		if (isOpen && exportData) {
			const totalFrames = exportData.frames.length;
			setRangeEnd(totalFrames);
			if (rangeStart > totalFrames) {
				setRangeStart(1);
			}
		}
	}, [isOpen, exportData?.frames.length]);

	// Detect font for SVG export (use canvas context font detection if available, otherwise detect)
	useEffect(() => {
		// Only run font detection for SVG format
		if (imageSettings.format !== 'svg') {
			setSvgFontStatus({
				isDetecting: false,
				actualFont: null,
				isFallback: false
			});
			return;
		}

		// Use the canvas context's font detection if available
		if (canvasActualFont && !canvasIsFontDetecting) {
			const selectedFont = getFontById(selectedFontId);
			const requestedFontName = selectedFont.name;
			const isFallback = canvasActualFont !== requestedFontName && selectedFontId !== 'auto';
			
			setSvgFontStatus({
				isDetecting: false,
				actualFont: canvasActualFont,
				isFallback
			});
		} else if (canvasIsFontDetecting) {
			setSvgFontStatus({
				isDetecting: true,
				actualFont: null,
				isFallback: false
			});
		} else {
			// Fallback: run detection ourselves
			const selectedFont = getFontById(selectedFontId);
			setSvgFontStatus(prev => ({ ...prev, isDetecting: true }));
			
			detectAvailableFont(selectedFont.cssStack).then(actualFont => {
				const isFallback = actualFont !== selectedFont.name && selectedFontId !== 'auto';
				setSvgFontStatus({
					isDetecting: false,
					actualFont,
					isFallback
				});
			});
		}
	}, [isOpen, imageSettings.format, selectedFontId, canvasActualFont, canvasIsFontDetecting]);
	
	const fileExtension = 
		imageSettings.format === 'png' ? 'png' : 
		imageSettings.format === 'jpg' ? 'jpg' : 'svg';

	const exportDimensions = exportData && imageSettings.format !== 'svg'
		? calculateExportPixelDimensions({
				gridWidth: exportData.canvasDimensions.width,
				gridHeight: exportData.canvasDimensions.height,
				sizeMultiplier: imageSettings.sizeMultiplier,
				fontSize: exportData.typography.fontSize,
				characterSpacing: exportData.typography.characterSpacing,
				lineSpacing: exportData.typography.lineSpacing,
		  })
		: null;

	// Calculate estimated file size based on format
	const estimatedSize = (() => {
		if (!exportData) return null;
		
		if (imageSettings.format === 'svg') {
			// Count characters in current frame
			const currentFrame = exportData.frames[exportData.currentFrameIndex]?.data || exportData.canvasData;
			const characterCount = Array.from(currentFrame.values()).filter(cell => cell.char).length;
			
			return estimateSvgFileSize(
				exportData.canvasDimensions.width,
				exportData.canvasDimensions.height,
				characterCount,
				{
					includeGrid: imageSettings.svgSettings?.includeGrid || false,
					textAsOutlines: imageSettings.svgSettings?.textAsOutlines || false,
					prettify: imageSettings.svgSettings?.prettify !== false,
				}
			);
		} else if (exportDimensions) {
			return estimateImageFileSize(exportDimensions, {
				format: imageSettings.format as 'png' | 'jpg',
				quality: imageSettings.quality,
			});
		}
		return null;
	})();

	const handleClose = () => {
		setShowExportModal(false);
	};

	const handleExport = async () => {
		if (!exportData) {
			console.error('No export data available');
			alert('No export data available. Please make sure you have some content to export.');
			return;
		}

		try {
			setIsExporting(true);
			const renderer = new ExportRenderer((progress) => {
				setProgress(progress);
			});

			if (sequenceMode) {
				const totalFrames = exportData.frames.length;
				const sequenceSettings = {
					...imageSettings,
					sequenceMode: true as const,
					sequenceRange: entireTimeline
						? 'all' as const
						: { start: rangeStart - 1, end: Math.min(rangeEnd - 1, totalFrames - 1) },
				};
				await renderer.exportImageSequence(exportData, sequenceSettings, filename);
			} else if (imageSettings.format === 'svg') {
				await renderer.exportSvg(exportData, imageSettings, filename);
			} else {
				await renderer.exportImage(exportData, imageSettings, filename);
			}
			
			handleClose();
		} catch (error) {
			console.error('Export failed:', error);
			alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		} finally {
			setIsExporting(false);
			setProgress(null);
		}
	};

	const handleSizeChange = (multiplier: string) => {
		const parsed = Math.min(Math.max(parseInt(multiplier, 10), 1), 4) as 1 | 2 | 3 | 4;
		setImageSettings({ sizeMultiplier: parsed });
	};

	const handleGridToggle = (includeGrid: boolean) => {
		setImageSettings({ includeGrid });
	};

	const handleFormatChange = (value: string) => {
		if (value === 'png' || value === 'jpg' || value === 'svg') {
			setImageSettings({ 
				format: value as 'png' | 'jpg' | 'svg',
				quality: value === 'jpg' ? imageSettings.quality : 100 
			});
		}
	};

	const handleQualityChange = (value: number) => {
		const clamped = Math.min(Math.max(Math.round(value), 10), 100);
		setImageSettings({ quality: clamped });
	};

	const handleSvgSettingChange = (key: keyof SvgExportSettings, value: boolean | string) => {
		setImageSettings({
			svgSettings: {
				...imageSettings.svgSettings!,
				[key]: value
			}
		});
	};

	return (
		<Dialog open={isOpen} onOpenChange={setShowExportModal}>
			<DialogContent className="max-w-xl p-0 overflow-hidden border-border/50" aria-describedby={undefined}>
				<DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 bg-background">
					<DialogTitle className="flex items-center gap-2">
						<FileImage className="w-5 h-5" />
						Export Image
					</DialogTitle>
				</DialogHeader>

				<div className="flex flex-col max-h-[80vh]">
					{/* Sticky Format Selection */}
					<div className="sticky top-0 z-10 bg-background px-6 py-4 border-b border-border/50 space-y-2">
						<Label htmlFor="filename">File Name</Label>
						<div className="flex">
							<Input
								id="filename"
								value={filename}
								onChange={(e) => setFilename(e.target.value)}
								placeholder="Enter filename"
								className="flex-1"
								disabled={isExporting}
							/>
							<Badge variant="outline" className="ml-2 self-center">
								{sequenceMode ? '.zip' : `.${fileExtension}`}
							</Badge>
						</div>

						{/* Export Mode Toggle */}
						<div className="flex items-center gap-3 pt-2">
							<Button
								variant={!sequenceMode ? 'default' : 'outline'}
								size="sm"
								onClick={() => setSequenceMode(false)}
								disabled={isExporting}
								className="flex-1"
							>
								<FileImage className="w-3.5 h-3.5 mr-1.5" />
								Current Frame
							</Button>
							<Button
								variant={sequenceMode ? 'default' : 'outline'}
								size="sm"
								onClick={() => setSequenceMode(true)}
								disabled={isExporting}
								className="flex-1"
							>
								<Film className="w-3.5 h-3.5 mr-1.5" />
								Image Sequence
							</Button>
						</div>
					</div>

					{/* Scrollable Settings */}
					<div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
						{/* Frame Range Settings (sequence mode only) */}
						{sequenceMode && (
							<Card className="border-border/50">
								<CardContent className="pt-4 space-y-4">
									<div className="flex items-center gap-2 mb-1">
										<Film className="w-4 h-4" />
										<span className="text-sm font-medium">Frame Range</span>
									</div>

									<div className="flex items-center justify-between">
										<div className="space-y-0.5">
											<Label htmlFor="entire-timeline">Entire Timeline</Label>
											<p className="text-xs text-muted-foreground">
												Export all {exportData?.frames.length || 0} frames
											</p>
										</div>
										<Switch
											id="entire-timeline"
											checked={entireTimeline}
											onCheckedChange={setEntireTimeline}
											disabled={isExporting}
										/>
									</div>

									{!entireTimeline && (
										<div className="grid grid-cols-2 gap-3">
											<div className="space-y-1">
												<Label htmlFor="range-start">Start Frame</Label>
												<Input
													id="range-start"
													type="number"
													min={1}
													max={rangeEnd}
													value={rangeStart}
													onChange={(e) => setRangeStart(Math.max(1, Math.min(parseInt(e.target.value) || 1, rangeEnd)))}
													disabled={isExporting}
												/>
											</div>
											<div className="space-y-1">
												<Label htmlFor="range-end">End Frame</Label>
												<Input
													id="range-end"
													type="number"
													min={rangeStart}
													max={exportData?.frames.length || 1}
													value={rangeEnd}
													onChange={(e) => setRangeEnd(Math.max(rangeStart, Math.min(parseInt(e.target.value) || 1, exportData?.frames.length || 1)))}
													disabled={isExporting}
												/>
											</div>
											<p className="col-span-2 text-xs text-muted-foreground">
												{rangeEnd - rangeStart + 1} frame{rangeEnd - rangeStart + 1 !== 1 ? 's' : ''} will be exported
											</p>
										</div>
									)}
								</CardContent>
							</Card>
						)}

						<Card className="border-border/50">
							<CardContent className="pt-4 space-y-4">
								<div className="flex items-center gap-2 mb-1">
									<Settings className="w-4 h-4" />
									<span className="text-sm font-medium">Export Settings</span>
								</div>

							{/* Format Selection */}
							<div className="space-y-2">
								<Label htmlFor="image-format">Format</Label>
								<Select
									value={imageSettings.format}
									onValueChange={handleFormatChange}
									disabled={isExporting}
								>
									<SelectTrigger id="image-format">
										<SelectValue>
											{FORMAT_OPTIONS.find(opt => opt.value === imageSettings.format)?.label}
										</SelectValue>
									</SelectTrigger>
									<SelectContent>
										{FORMAT_OPTIONS.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												<div className="flex flex-col">
													<span>{option.label}</span>
													<span className="text-xs text-muted-foreground">
														{option.description}
													</span>
												</div>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>								{/* Size Multiplier - Hidden for SVG */}
								{imageSettings.format !== 'svg' && (
									<div className="space-y-2">
										<Label htmlFor="size-multiplier">Size Multiplier</Label>
										<Select
											value={imageSettings.sizeMultiplier.toString()}
											onValueChange={handleSizeChange}
											disabled={isExporting}
										>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="1">1x (Original)</SelectItem>
												<SelectItem value="2">2x (Double)</SelectItem>
												<SelectItem value="3">3x (Triple)</SelectItem>
												<SelectItem value="4">4x (Quadruple)</SelectItem>
											</SelectContent>
										</Select>
										<p className="text-xs text-muted-foreground">
											Higher multipliers create larger, more detailed images
										</p>
										{exportDimensions && (
											<div className="mt-2 p-3 bg-muted/30 rounded-lg text-xs space-y-2">
												<div className="space-y-1">
													<p className="text-xs font-medium text-muted-foreground">Output size:</p>
													<span className="font-mono">{formatPixelDimensions(exportDimensions)}</span>
												</div>
												{estimatedSize && (
													<div className="space-y-1">
														<p className="text-xs font-medium text-muted-foreground">Est. file size:</p>
														<span className="font-mono">{estimatedSize}</span>
													</div>
												)}
											</div>
										)}
									</div>
								)}

								{/* JPEG Quality */}
								{imageSettings.format === 'jpg' && (
									<div className="space-y-2">
										<Label htmlFor="image-quality">JPEG Quality</Label>
										<Slider
											id="image-quality"
											min={10}
											max={100}
											step={1}
											value={imageSettings.quality}
											onValueChange={handleQualityChange}
											disabled={isExporting}
										/>
										<div className="flex justify-between text-xs text-muted-foreground">
											<span>Smaller file</span>
											<span>{imageSettings.quality}%</span>
											<span>Higher quality</span>
										</div>
									</div>
								)}

								{/* SVG-Specific Settings */}
								{imageSettings.format === 'svg' && (
									<>
										{/* Include Background */}
										<div className="flex items-center justify-between">
											<div className="space-y-0.5">
												<Label htmlFor="svg-background">Include Background</Label>
												<p className="text-xs text-muted-foreground">
													Export background color
												</p>
											</div>
											<Switch
												id="svg-background"
												checked={imageSettings.svgSettings?.includeBackground !== false}
												onCheckedChange={(checked) => handleSvgSettingChange('includeBackground', checked)}
												disabled={isExporting}
											/>
										</div>

										{/* Prettify Output */}
										<div className="flex items-center justify-between">
											<div className="space-y-0.5">
												<Label htmlFor="svg-prettify">Prettify Output</Label>
												<p className="text-xs text-muted-foreground">
													Human-readable formatting
												</p>
											</div>
											<Switch
												id="svg-prettify"
												checked={imageSettings.svgSettings?.prettify !== false}
												onCheckedChange={(checked) => handleSvgSettingChange('prettify', checked)}
												disabled={isExporting}
											/>
										</div>

										{/* Estimated File Size & Font Status for SVG */}
										<div className="p-3 bg-muted/30 rounded-lg text-xs space-y-2">
											{estimatedSize && (
												<div className="space-y-1">
													<p className="text-xs font-medium text-muted-foreground">Est. file size:</p>
													<span className="font-mono">{estimatedSize}</span>
												</div>
											)}
											{/* Font Status */}
											<div className="space-y-1">
												<p className="text-xs font-medium text-muted-foreground">Font Used in Export:</p>
												<div className="flex items-start gap-2 min-h-[16px]">
													{svgFontStatus.isDetecting ? (
														<>
															<Loader2 className="w-3 h-3 mt-0.5 flex-shrink-0 animate-spin text-muted-foreground" />
															<span className="text-muted-foreground leading-tight">Detecting font...</span>
														</>
													) : svgFontStatus.actualFont ? (
														<>
															{(() => {
																const selectedFont = getFontById(selectedFontId);
																const requestedFontName = selectedFont.name;
																const message = selectedFontId === 'auto'
																	? `Using ${svgFontStatus.actualFont}`
																	: getFontFallbackMessage(requestedFontName, svgFontStatus.actualFont);

																return svgFontStatus.isFallback ? (
																	<>
																		<AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0 text-yellow-500" />
																		<div className="flex-1 min-w-0">
																			<span className="text-yellow-600 dark:text-yellow-500 leading-tight break-words">
																				{message}
																			</span>
																		</div>
																	</>
																) : (
																	<>
																		<CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0 text-green-500" />
																		<span className="text-muted-foreground leading-tight">{message}</span>
																	</>
																);
															})()}
														</>
													) : (
														<span className="text-muted-foreground leading-tight">
															{getFontById(selectedFontId).description}
														</span>
													)}
												</div>
											</div>
										</div>
									</>
								)}

								{/* Include Grid - Updated label for SVG */}
								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label htmlFor="include-grid">Include Grid</Label>
										<p className="text-xs text-muted-foreground">
											{imageSettings.format === 'svg' 
												? 'Show grid lines in exported SVG' 
												: 'Show grid lines in exported image'}
										</p>
									</div>
									<Switch
										id="include-grid"
										checked={imageSettings.format === 'svg' 
											? (imageSettings.svgSettings?.includeGrid || false)
											: imageSettings.includeGrid}
										onCheckedChange={(checked) => {
											if (imageSettings.format === 'svg') {
												handleSvgSettingChange('includeGrid', checked);
											} else {
												handleGridToggle(checked);
											}
										}}
										disabled={isExporting}
									/>
								</div>

								{postEffectTracks.length > 0 && imageSettings.format !== 'svg' && (
									<div className="flex items-center justify-between">
										<div className="space-y-0.5">
											<Label htmlFor="include-post-effects">Include Shaders</Label>
											<p className="text-xs text-muted-foreground">
												Apply WebGL shader effects to the export
											</p>
										</div>
										<Switch
											id="include-post-effects"
											checked={imageSettings.includePostEffects !== false}
											onCheckedChange={(checked) => setImageSettings({ includePostEffects: checked })}
											disabled={isExporting}
										/>
									</div>
								)}
							</CardContent>
						</Card>

						<div className="text-center p-3 bg-muted/50 rounded-lg space-y-1">
							{sequenceMode ? (
								<>
									<p className="text-sm text-muted-foreground">Image sequence will be exported as</p>
									<p className="text-sm font-medium">
										{filename}_sequence.zip
									</p>
									<p className="text-xs text-muted-foreground">
										{(() => {
											const totalFrames = exportData?.frames.length || 0;
											const frameCount = entireTimeline ? totalFrames : (rangeEnd - rangeStart + 1);
											const padLen = Math.max(String(frameCount).length, 1);
											const example = `${filename}_${'1'.padStart(padLen, '0')}.${fileExtension}`;
											return `${frameCount} file${frameCount !== 1 ? 's' : ''}: ${example} → ${filename}_${String(frameCount).padStart(padLen, '0')}.${fileExtension}`;
										})()}
									</p>
								</>
							) : (
								<>
									<p className="text-sm text-muted-foreground">Current frame will be exported as</p>
									<p className="text-sm font-medium">
										{filename}.{fileExtension}
										{imageSettings.format !== 'svg' && ` (${imageSettings.sizeMultiplier}x scale)`}
										{imageSettings.format === 'svg' && ' (vector)'}
									</p>
									{estimatedSize && (
										<p className="text-xs text-muted-foreground">Estimated size: {estimatedSize}</p>
									)}
								</>
							)}
						</div>
					</div>

					{/* Sticky Actions */}
					<div className="sticky bottom-0 z-10 bg-background px-6 py-4 border-t border-border/50 flex justify-end gap-2">
						<Button variant="outline" onClick={handleClose} disabled={isExporting}>
							Cancel
						</Button>
						<Button onClick={handleExport} disabled={isExporting || !filename.trim()}>
							{isExporting ? (
								<>
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
									Exporting...
								</>
							) : (
								<>
									<Download className="w-4 h-4 mr-2" />
									{sequenceMode ? 'Export Sequence (.zip)' : 'Export Image'}
								</>
							)}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};
