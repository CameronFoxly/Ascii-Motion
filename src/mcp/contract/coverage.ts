/**
 * App-owned MCP feature coverage manifest (source of truth).
 *
 * Every user-facing authoring/animation/import/export/project feature is either
 * mapped to bridge operations or explicitly excluded with a reason. The typed
 * `Record<Tool, …>` / `Record<ExportFormatId, …>` maps make adding a tool or an
 * export format without an MCP classification a compile error, and
 * `src/__tests__/mcpCoverage.test.ts` fails when an operation, test fixture or
 * docs anchor is unmapped. `npm run mcp:contract` emits
 * `src/mcp/coverage-manifest.json` for ascii-motion-mcp and the docs site.
 */
import type { Tool } from '../../types';
import type { ExportFormatId } from '../../types/export';
import type { exportFormatNames } from './operations';

export type CoverageStatus = 'supported' | 'partial' | 'excluded';

export interface FeatureCoverage {
  id: string;
  title: string;
  status: CoverageStatus;
  /** Bridge operations implementing the feature (contract names). */
  operations: string[];
  /** Representative app modules the operations reuse. */
  appSources: string[];
  /** MCP must route through the browser; it must not emulate this headlessly. */
  browserRequired: boolean;
  requires?: Array<'auth' | 'entitlement'>;
  /** Behavioral fixtures covering the operations. */
  tests: string[];
  /** Repository-relative docs anchor. */
  docs: string;
  /** Required for partial/excluded entries. */
  reason?: string;
}

const OPS_DOC = 'docs/MCP_BRIDGE_OPERATIONS.md';
const OPS_TEST = 'src/__tests__/mcpOperations.test.ts';
const CLIENT_TEST = 'src/__tests__/mcpClient.test.ts';
const COVERAGE_TEST = 'src/__tests__/mcpCoverage.test.ts';
const GENERATOR_TEST = 'src/__tests__/mcpGeneratorCommands.test.ts';

export const FEATURE_COVERAGE: FeatureCoverage[] = [
  {
    id: 'document-read', title: 'Native document, summaries, composite/layer cell reads, catalogs and capabilities', status: 'supported',
    operations: ['get_capabilities', 'get_catalog', 'get_document', 'get_document_summary', 'read_cells'],
    appSources: ['src/utils/sessionDocument.ts', 'src/utils/exportDataCollector.ts', 'src/utils/exportRenderer.ts'],
    browserRequired: false, tests: [OPS_TEST, CLIENT_TEST], docs: `${OPS_DOC}#document`,
  },
  {
    id: 'project-lifecycle', title: 'New/load project and project metadata', status: 'supported',
    operations: ['new_project', 'load_project', 'set_project_metadata'],
    appSources: ['src/stores/timelineStore.ts', 'src/utils/sessionImporter.ts', 'src/stores/projectMetadataStore.ts'],
    browserRequired: false, tests: [CLIENT_TEST], docs: `${OPS_DOC}#project`,
  },
  {
    id: 'canvas', title: 'Canvas size, crop and background', status: 'supported',
    operations: ['resize_canvas', 'crop_canvas', 'set_canvas_background'],
    appSources: ['src/hooks/useCanvasResize.ts', 'src/hooks/useCropToSelection.ts', 'src/utils/canvasGeometryOps.ts'],
    browserRequired: false, tests: [CLIENT_TEST], docs: `${OPS_DOC}#project`,
  },
  {
    id: 'typography', title: 'Canvas font, size and spacing', status: 'supported',
    operations: ['set_typography'], appSources: ['src/stores/canvasTypographySnapshot.ts'],
    browserRequired: false, tests: [COVERAGE_TEST], docs: `${OPS_DOC}#project`,
  },
  {
    id: 'tool-state', title: 'Active tool, colors, character and tool options', status: 'supported',
    operations: ['set_tool_state'], appSources: ['src/stores/toolStore.ts'],
    browserRequired: false, tests: [COVERAGE_TEST], docs: `${OPS_DOC}#project`,
  },
  {
    id: 'cell-editing', title: 'Explicit-target cell writes, clears, fills, text import, shift/flip and find/replace', status: 'supported',
    operations: ['set_cells', 'clear_cells', 'fill_region', 'import_text', 'shift_content', 'flip_content', 'replace_in_cells'],
    appSources: ['src/utils/flipUtils.ts', 'src/mcp/operations/handlers/cells.ts'],
    browserRequired: false, tests: [OPS_TEST], docs: `${OPS_DOC}#cells`,
  },
  {
    id: 'drawing-tools', title: 'Brush, line, rectangle/ellipse, Bezier shape, paint bucket and gradient fill', status: 'supported',
    operations: ['draw_brush_stroke', 'draw_line', 'draw_shape', 'draw_bezier', 'fill_area', 'gradient_fill'],
    appSources: ['src/hooks/useDrawingTool.ts', 'src/utils/bezierFillUtils.ts', 'src/utils/gradientEngine.ts', 'src/hooks/useGradientFillTool.ts'],
    browserRequired: true, tests: [COVERAGE_TEST], docs: `${OPS_DOC}#drawing`,
    reason: 'Bezier/shape rasterization uses the mounted canvas text metrics (UI_NOT_READY without a 2D canvas).',
  },
  {
    id: 'text-tools', title: 'Text tool, FIGlet ASCII type and ASCII box drawing', status: 'supported',
    operations: ['place_text', 'place_figlet_text', 'draw_ascii_box'],
    appSources: ['src/constants/figletFonts.ts', 'src/constants/boxDrawingStyles.ts', 'src/utils/boxDrawingEngine.ts'],
    browserRequired: false, tests: [COVERAGE_TEST], docs: `${OPS_DOC}#drawing`,
  },
  {
    id: 'selection-clipboard', title: 'Rectangle/lasso/magic-wand selection, clipboard, move/transform', status: 'supported',
    operations: ['get_selection', 'set_selection', 'clear_selection', 'copy_selection', 'paste_clipboard', 'move_selection'],
    appSources: ['src/stores/selectionStore.ts', 'src/stores/toolStore.ts'],
    browserRequired: false, tests: [OPS_TEST], docs: `${OPS_DOC}#selection`,
  },
  {
    id: 'history', title: 'Undo/redo and history inspection', status: 'supported',
    operations: ['get_history', 'undo', 'redo'], appSources: ['src/stores/toolStore.ts'],
    browserRequired: false, tests: [OPS_TEST], docs: `${OPS_DOC}#history`,
  },
  {
    id: 'layers', title: 'Layers: create, remove, duplicate, reorder, properties/transforms, merge and flatten', status: 'supported',
    operations: ['add_layer', 'remove_layer', 'duplicate_layer', 'reorder_layer', 'update_layer', 'set_active_layer', 'merge_layers', 'flatten_layer'],
    appSources: ['src/stores/timelineStore.ts'], browserRequired: false, tests: [OPS_TEST], docs: `${OPS_DOC}#layers`,
  },
  {
    id: 'layer-groups', title: 'Layer groups', status: 'supported',
    operations: ['create_group', 'ungroup', 'update_group'], appSources: ['src/stores/timelineStore.ts'],
    browserRequired: false, tests: [COVERAGE_TEST], docs: `${OPS_DOC}#layers`,
  },
  {
    id: 'timeline', title: 'Content frames, timeline duration/frame rate/work area and cleanup', status: 'supported',
    operations: ['add_content_frame', 'remove_content_frame', 'update_content_frame', 'duplicate_content_frame', 'split_content_frame', 'set_timeline', 'trim_to_work_area', 'remove_blank_space'],
    appSources: ['src/stores/timelineStore.ts'], browserRequired: false, tests: [CLIENT_TEST], docs: `${OPS_DOC}#timeline`,
  },
  {
    id: 'playback', title: 'Playhead, playback and onion skin', status: 'supported',
    operations: ['seek', 'set_playback', 'set_onion_skin'], appSources: ['src/mcp/frameNavigation.ts', 'src/stores/animationStore.ts'],
    browserRequired: false, tests: ['src/__tests__/mcpFrameNavigation.test.ts'], docs: `${OPS_DOC}#playback`,
  },
  {
    id: 'keyframes', title: 'Layer property keyframes with easing', status: 'supported',
    operations: ['set_keyframes', 'remove_keyframes'], appSources: ['src/stores/timelineStore.ts'],
    browserRequired: false, tests: [COVERAGE_TEST], docs: `${OPS_DOC}#keyframes`,
  },
  {
    id: 'effects', title: 'Layer/group/global procedural effects, keyframes and bake', status: 'supported',
    operations: ['add_effect', 'update_effect', 'remove_effect', 'set_effect_keyframes', 'remove_effect_keyframes', 'bake_effect'],
    appSources: ['src/registry/effectRegistry.ts'], browserRequired: false, tests: [COVERAGE_TEST], docs: `${OPS_DOC}#effects`,
  },
  {
    id: 'shaders', title: 'Post-effect shaders and their keyframes (independent of billing)', status: 'supported',
    operations: ['add_shader', 'update_shader', 'remove_shader', 'set_shader_keyframes', 'remove_shader_keyframes'],
    appSources: ['src/registry/postEffectRegistry.ts'], browserRequired: false, tests: [COVERAGE_TEST], docs: `${OPS_DOC}#shaders`,
  },
  {
    id: 'generators', title: 'Procedural generator layers, properties, keyframes, render and bake', status: 'supported',
    operations: ['get_generator_catalog', 'add_generator_layer', 'update_generator_layer', 'set_generator_property', 'set_generator_keyframes', 'remove_generator_keyframes', 'reset_generator', 'randomize_generator_seed', 'get_generator_state', 'render_generator_frames', 'bake_generator_layer'],
    appSources: ['src/registry/generatorRegistry.ts', 'src/mcp/generatorCommands.ts'],
    browserRequired: false, tests: [OPS_TEST, GENERATOR_TEST], docs: `${OPS_DOC}#generators`,
  },
  {
    id: 'batch', title: 'Atomic multi-operation edits with one undo entry', status: 'supported',
    operations: ['apply_operations'], appSources: ['src/mcp/operations/runtime.ts'],
    browserRequired: false, tests: [OPS_TEST], docs: `${OPS_DOC}#batch`,
  },
  {
    id: 'palettes', title: 'Color and character palettes: activate, CRUD, import/export', status: 'supported',
    operations: ['set_active_palette', 'create_palette', 'update_palette', 'delete_palette', 'duplicate_palette', 'import_palette', 'export_palette'],
    appSources: ['src/stores/paletteStore.ts', 'src/stores/characterPaletteStore.ts'],
    browserRequired: false, tests: [OPS_TEST], docs: `${OPS_DOC}#palettes`,
  },
  {
    id: 'media-import', title: 'Image/video to ASCII import pipeline', status: 'supported',
    operations: ['import_media'], appSources: ['src/utils/mediaImportPipeline.ts', 'src/utils/mediaProcessor.ts'],
    browserRequired: true, tests: [COVERAGE_TEST], docs: `${OPS_DOC}#media`,
  },
  {
    id: 'image-trace', title: 'Image/video trace reference overlay', status: 'supported',
    operations: ['set_image_trace'], appSources: ['src/utils/imageTraceProcessor.ts', 'src/stores/imageTraceStore.ts'],
    browserRequired: true, tests: [COVERAGE_TEST], docs: `${OPS_DOC}#media`,
  },
  {
    id: 'export', title: 'All app export formats rendered by the app exporters (no download side effect)', status: 'supported',
    operations: ['export'], appSources: ['src/utils/exportRenderer.ts', 'src/utils/exportDataCollector.ts'],
    browserRequired: true, tests: [OPS_TEST, CLIENT_TEST], docs: `${OPS_DOC}#io`,
    reason: 'Text/code/session formats also render in jsdom; image/video formats need a browser canvas/encoder.',
  },
  {
    id: 'cloud-projects', title: 'Cloud project list/save/open/delete/restore/metadata/download/upload', status: 'supported',
    operations: ['list_cloud_projects', 'save_cloud_project', 'open_cloud_project', 'delete_cloud_project', 'restore_cloud_project', 'permanently_delete_cloud_project', 'update_cloud_project_metadata', 'download_cloud_project', 'upload_session_to_cloud'],
    appSources: ['src/components/features/CloudBridgeHost.tsx', 'src/mcp/operations/cloudBridge.ts'],
    browserRequired: true, requires: ['auth'], tests: [COVERAGE_TEST], docs: `${OPS_DOC}#cloud`,
  },
  {
    id: 'cloud-community', title: 'Publish to gallery and remix', status: 'partial',
    operations: ['publish_cloud_project', 'remix_cloud_project'],
    appSources: ['src/components/features/CloudBridgeHost.tsx'],
    browserRequired: true, requires: ['auth'], tests: [COVERAGE_TEST], docs: `${OPS_DOC}#cloud`,
    reason: 'Publishing needs the premium package; remix returns UNSUPPORTED until the premium package exports a remix hook.',
  },
  {
    id: 'account-billing-admin', title: 'Sign-in, account settings, subscriptions/billing and admin tools', status: 'excluded',
    operations: [], appSources: ['packages/premium'], browserRequired: true, tests: [COVERAGE_TEST], docs: `${OPS_DOC}#exclusions`,
    reason: 'Out of scope by decision: credentials, payment and admin actions stay with the signed-in user in the app UI.',
  },
];

/** Every canvas tool must map to a feature (compile-time gate on `Tool`). */
export const TOOL_COVERAGE: Record<Tool, string> = {
  pencil: 'cell-editing',
  eraser: 'cell-editing',
  paintbucket: 'drawing-tools',
  select: 'selection-clipboard',
  lasso: 'selection-clipboard',
  magicwand: 'selection-clipboard',
  rectangle: 'drawing-tools',
  ellipse: 'drawing-tools',
  eyedropper: 'document-read',
  line: 'drawing-tools',
  text: 'text-tools',
  asciitype: 'text-tools',
  asciibox: 'text-tools',
  brush: 'drawing-tools',
  beziershape: 'drawing-tools',
  gradientfill: 'drawing-tools',
  fliphorizontal: 'cell-editing',
  flipvertical: 'cell-editing',
  layertransform: 'layers',
};

type ContractExportFormat = (typeof exportFormatNames)[number];

/** Every app export/import menu format must map to contract formats (compile-time gate on `ExportFormatId`). */
export const EXPORT_FORMAT_COVERAGE: Record<ExportFormatId, { feature: string; formats: ContractExportFormat[] }> = {
  png: { feature: 'export', formats: ['png', 'jpg', 'image_sequence'] },
  svg: { feature: 'export', formats: ['svg'] },
  mp4: { feature: 'export', formats: ['mp4', 'webm'] },
  session: { feature: 'export', formats: ['session'] },
  media: { feature: 'media-import', formats: [] },
  text: { feature: 'export', formats: ['text'] },
  json: { feature: 'export', formats: ['json'] },
  html: { feature: 'export', formats: ['html'] },
  react: { feature: 'export', formats: ['react'] },
  ink: { feature: 'export', formats: ['ink'] },
  opentui: { feature: 'export', formats: ['opentui'] },
  bubbletea: { feature: 'export', formats: ['bubbletea'] },
  ansi: { feature: 'export', formats: ['ansi'] },
};

export function buildCoverageManifest(contract: { contractVersion: string; contractHash: string }) {
  return {
    $comment: 'Generated by scripts/generate-mcp-contract.ts from src/mcp/contract/coverage.ts — do not edit.',
    contractVersion: contract.contractVersion,
    contractHash: contract.contractHash,
    features: FEATURE_COVERAGE,
    tools: TOOL_COVERAGE,
    exportFormats: EXPORT_FORMAT_COVERAGE,
    catalogs: {
      effects: 'All registered effect types are exposed through get_catalog{family:"effects"} and add_effect; enforced by mcpCoverage.test.ts.',
      shaders: 'All registered post-effect shaders are exposed through get_catalog{family:"shaders"} and add_shader; enforced by mcpCoverage.test.ts.',
      generators: 'All registered generators are exposed through get_catalog{family:"generators"} and add_generator_layer; enforced by mcpCoverage.test.ts.',
    },
  };
}
