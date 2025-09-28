import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Slider } from '../ui/slider';
import { FileImage, Download, Settings, Loader2 } from 'lucide-react';
import { useExportStore } from '../../stores/exportStore';
import { useExportDataCollector } from '../../utils/exportDataCollector';
import { ExportRenderer } from '../../utils/exportRenderer';
import { calculateExportPixelDimensions, formatPixelDimensions, estimateImageFileSize } from '../../utils/exportPixelCalculator';

const FORMAT_OPTIONS: Array<{ value: 'png' | 'jpg'; label: string; description: string }> = [
	{
		value: 'png',
		label: 'PNG (.png)',
		description: 'Lossless quality with larger files',
	},
	{
		value: 'jpg',
		label: 'JPEG (.jpg)',
		description: 'Smaller files with adjustable quality',
	},
];

/**
 * Image Export Dialog
 * Supports PNG and JPEG exports with adjustable quality settings
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

	const exportData = useExportDataCollector();

	const [filename, setFilename] = useState('ascii-motion-frame');

	const isOpen = showExportModal && activeFormat === 'png';
	const fileExtension = imageSettings.format === 'png' ? 'png' : 'jpg';

	const exportDimensions = exportData
		? calculateExportPixelDimensions({
				gridWidth: exportData.canvasDimensions.width,
				gridHeight: exportData.canvasDimensions.height,
				sizeMultiplier: imageSettings.sizeMultiplier,
				fontSize: exportData.typography.fontSize,
				characterSpacing: exportData.typography.characterSpacing,
				lineSpacing: exportData.typography.lineSpacing,
		  })
		: null;

	const estimatedSize = exportDimensions
		? estimateImageFileSize(exportDimensions, {
				format: imageSettings.format,
				quality: imageSettings.quality,
		  })
		: null;

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

			await renderer.exportImage(exportData, imageSettings, filename);
			handleClose();
		} catch (error) {
			console.error('Image export failed:', error);
			alert(`Image export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
		if (value === 'png' || value === 'jpg') {
			setImageSettings({ format: value, quality: value === 'jpg' ? imageSettings.quality : 100 });
		}
	};

	const handleQualityChange = (value: number) => {
		const clamped = Math.min(Math.max(Math.round(value), 10), 100);
		setImageSettings({ quality: clamped });
	};

	return (
		<Dialog open={isOpen} onOpenChange={setShowExportModal}>
			<DialogContent className="max-w-md p-0 overflow-hidden">
				<DialogHeader className="px-6 pt-6 pb-4 border-b bg-background">
					<DialogTitle className="flex items-center gap-2">
						<FileImage className="w-5 h-5" />
						Export Image
					</DialogTitle>
				</DialogHeader>

				<div className="flex flex-col max-h-[80vh]">
					{/* Sticky File Name Input */}
					<div className="sticky top-0 z-10 bg-background px-6 py-4 border-b space-y-2">
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
								.{fileExtension}
							</Badge>
						</div>
					</div>

					{/* Scrollable Settings */}
					<div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
						<Card>
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
										<SelectTrigger>
											<SelectValue />
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
								</div>

								{/* Size Multiplier */}
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
										<div className="mt-2 p-2 bg-muted/30 rounded text-xs space-y-1">
											<div className="flex justify-between">
												<span className="text-muted-foreground">Output size:</span>
												<span className="font-mono">{formatPixelDimensions(exportDimensions)}</span>
											</div>
											{estimatedSize && (
												<div className="flex justify-between">
													<span className="text-muted-foreground">Est. file size:</span>
													<span className="font-mono">{estimatedSize}</span>
												</div>
											)}
										</div>
									)}
								</div>

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

								{/* Include Grid */}
								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label htmlFor="include-grid">Include Grid</Label>
										<p className="text-xs text-muted-foreground">
											Show grid lines in exported image
										</p>
									</div>
									<Switch
										id="include-grid"
										checked={imageSettings.includeGrid}
										onCheckedChange={handleGridToggle}
										disabled={isExporting}
									/>
								</div>
							</CardContent>
						</Card>

						<div className="text-center p-3 bg-muted/50 rounded-lg space-y-1">
							<p className="text-sm text-muted-foreground">Current frame will be exported as</p>
							<p className="text-sm font-medium">
								{filename}.{fileExtension} ({imageSettings.sizeMultiplier}x scale)
							</p>
							{estimatedSize && (
								<p className="text-xs text-muted-foreground">Estimated size: {estimatedSize}</p>
							)}
						</div>
					</div>

					{/* Sticky Action Buttons */}
					<div className="sticky bottom-0 z-10 bg-background px-6 py-4 border-t flex justify-end gap-2">
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
									Export Image
								</>
							)}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export { ImageExportDialog as PngExportDialog };