/**
 * ASCII Motion bridge contract (protocol v3) — single source of truth.
 *
 * Pure data: no app/store imports so the generator script can emit
 * `bridge-contract.json` from Node. Every operation listed here MUST have a
 * handler in `src/mcp/operations/handlers` (enforced by tests) and every
 * input is validated at runtime with `validateSchema` before execution.
 *
 * Time model: every frame value is an absolute, 0-based integer timeline
 * frame. Content frames are addressed by `contentFrameId`, never by index.
 */

import {
  arr,
  bool,
  enumOf,
  int,
  nullable,
  num,
  obj,
  oneOf,
  record,
  ref,
  str,
  anyValue,
  type JsonSchema,
} from './schema';

export const exportFormatNames = ['png', 'jpg', 'svg', 'webm', 'mp4', 'image_sequence', 'session', 'text', 'json', 'ansi', 'html', 'react', 'ink', 'opentui', 'bubbletea'] as const;

export const BRIDGE_PROTOCOL = 'ascii-motion-bridge';
export const BRIDGE_PROTOCOL_VERSION = 3;
export const BRIDGE_CONTRACT_VERSION = '3.0.0';

export const BRIDGE_ERROR_CODES = [
  'INVALID_INPUT',
  'UNKNOWN_OPERATION',
  'NOT_FOUND',
  'CONFLICT',
  'LOCKED',
  'OUT_OF_RANGE',
  'LIMIT_REACHED',
  'AUTH_REQUIRED',
  'ENTITLEMENT_REQUIRED',
  'UI_NOT_READY',
  'UNSUPPORTED',
  'BUSY',
  'INTERNAL',
] as const;
export type BridgeErrorCode = (typeof BRIDGE_ERROR_CODES)[number];

export type OperationKind = 'read' | 'mutation' | 'view' | 'io';
export type OperationRequirement = 'auth' | 'entitlement';

export interface OperationContract {
  name: string;
  /** Logical domain used for grouping in docs/tools */
  domain: string;
  /**
   * read: never changes state. mutation: changes the document; undoable with
   * exactly one history entry; bumps revision. view: changes editor/view state
   * only (playhead, selection, onion skin, palettes UI) — not undoable.
   * io: produces artifacts or talks to external services.
   */
  kind: OperationKind;
  destructive: boolean;
  idempotent: boolean;
  requires: OperationRequirement[];
  description: string;
  input: JsonSchema;
  result: JsonSchema;
}

// ---------------------------------------------------------------------------
// Shared definitions
// ---------------------------------------------------------------------------

const HEX = '^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$';

export const BRIDGE_DEFS: Record<string, JsonSchema> = {
  Color: str({ pattern: HEX, description: 'Hex color #RRGGBB or #RRGGBBAA' }),
  BgColor: str({ pattern: `${HEX}|^transparent$`, description: 'Hex color or "transparent"' }),
  Char: str({ minLength: 1, maxLength: 2, description: 'Single visible character (one code point; surrogate pairs allowed)' }),
  Cell: obj({ char: ref('Char'), color: ref('Color'), bgColor: ref('BgColor') }, ['char']),
  CellAt: obj(
    {
      x: int(),
      y: int(),
      char: ref('Char'),
      color: ref('Color'),
      bgColor: ref('BgColor'),
      clear: bool({ description: 'Erase the cell instead of writing it' }),
    },
    ['x', 'y'],
  ),
  Point: obj({ x: num(), y: num() }, ['x', 'y']),
  IntPoint: obj({ x: int(), y: int() }, ['x', 'y']),
  Region: obj({ x: int(), y: int(), width: int({ minimum: 1 }), height: int({ minimum: 1 }) }, ['x', 'y', 'width', 'height']),
  Style: obj(
    { char: ref('Char'), color: ref('Color'), bgColor: ref('BgColor') },
    [],
    { description: 'Drawing style; omitted fields use the current tool state' },
  ),
  Target: obj(
    {
      layerId: str({ description: 'Defaults to the active layer' }),
      contentFrameId: str({ description: 'Explicit content frame; overrides frame' }),
      frame: int({ minimum: 0, description: 'Timeline frame used to resolve the content frame; defaults to the playhead' }),
      createIfMissing: bool({ description: 'Create a 1-frame content frame at `frame` when none covers it (default false → NOT_FOUND)' }),
    },
    [],
    { description: 'Explicit edit target. Edits apply in layer-local cell coordinates.' },
  ),
  Easing: oneOf(
    enumOf(['linear', 'hold', 'ease-in', 'ease-out', 'ease-in-out', 'ease-out-back', 'ease-in-back', 'bounce'], { description: 'Easing preset' }),
    obj({ type: enumOf(['linear', 'hold', 'ease-in', 'ease-out', 'ease-in-out', 'ease-out-back', 'ease-in-back', 'bounce', 'custom']), x1: num(), y1: num(), x2: num(), y2: num() }, ['type'], { description: 'Easing curve object' }),
  ),
  Value: anyValue('Keyframe/setting value: number, boolean, string or mapping object'),
  KeyframeInput: obj({ frame: int({ minimum: 0 }), value: ref('Value'), easing: ref('Easing') }, ['frame', 'value']),
  Owner: oneOf(
    obj({ layerId: str() }, ['layerId']),
    obj({ groupId: str() }, ['groupId']),
    obj({ global: { const: true } }, ['global']),
  ),
  Anchor: enumOf(['top-left', 'top-center', 'top-right', 'middle-left', 'middle-center', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right']),
  WorkArea: nullable(obj({ start: int({ minimum: 0 }), end: int({ minimum: 1 }), enabled: bool() }, ['start', 'end'])),
  Artifact: obj(
    {
      filename: str(),
      mimeType: str(),
      encoding: enumOf(['base64', 'utf8']),
      bytes: int({ minimum: 0 }),
      data: str(),
    },
    ['filename', 'mimeType', 'encoding', 'bytes', 'data'],
    { description: 'File produced in the browser without triggering a download' },
  ),
  Session: record('Native .asciimtn session (SessionDataV2) exactly as the app saves it'),
  Mutation: {
    type: 'object',
    properties: {
      ids: {
        type: 'object',
        additionalProperties: { anyOf: [str(), arr(str())] },
        description: 'Created/affected ids keyed by kind (e.g. layerId, blockId, keyframeIds). Mirrors the flat *Id/*Ids fields.',
      },
      revision: int({ minimum: 0 }),
      documentId: str(),
      noChange: bool({ description: 'True when the operation left the document unchanged (no revision bump)' }),
    },
    required: ['ids', 'revision'],
    additionalProperties: true,
    description: 'Mutation result: ids map, the new document revision, plus operation-specific fields',
  },
  Bounds: obj({ minX: int(), minY: int(), maxX: int(), maxY: int() }, ['minX', 'minY', 'maxX', 'maxY'], { description: 'Inclusive cell bounds' }),
  CellOut: obj({ x: int(), y: int(), char: str(), color: str(), bgColor: str() }, ['x', 'y', 'char', 'color', 'bgColor']),
  PropertyDef: {
    type: 'object',
    properties: {
      path: str(), displayName: str(), category: str(), valueType: str(), defaultValue: anyValue(),
      min: num(), max: num(), step: num(), unit: str(), interpolation: str(), control: str(),
      options: arr(obj({ value: anyValue(), label: str() }, ['value'])),
      animatable: bool(),
    },
    required: ['path', 'valueType'],
    additionalProperties: true,
  },
  CatalogEntry: obj(
    { type: str(), name: str(), description: str(), category: str(), mode: str(), properties: arr(ref('PropertyDef')), defaultSettings: record(), initialSettings: record() },
    ['type', 'name', 'properties', 'defaultSettings'],
  ),
  DocumentSummary: obj(
    {
      documentId: str(),
      revision: int({ minimum: 0 }),
      name: str(),
      description: str(),
      cloudProjectId: nullable(str()),
      canvas: obj({ width: int(), height: int(), backgroundColor: str() }, ['width', 'height', 'backgroundColor']),
      typography: obj({ fontId: str(), fontSize: num(), characterSpacing: num(), lineSpacing: num() }, ['fontId', 'fontSize', 'characterSpacing', 'lineSpacing']),
      timeline: obj(
        { frameRate: int(), durationFrames: int(), currentFrame: int(), workArea: ref('WorkArea'), isPlaying: bool(), looping: bool() },
        ['frameRate', 'durationFrames', 'currentFrame', 'workArea'],
      ),
      activeLayerId: nullable(str()),
      layers: arr(obj(
        {
          id: str(), name: str(), kind: enumOf(['content', 'generator']), index: int({ description: '0 = bottom' }),
          visible: bool(), locked: bool(), solo: bool(), opacity: num(), blendMode: str(), parentGroupId: nullable(str()),
          generatorType: str(),
          contentFrames: arr(obj({ id: str(), name: str(), startFrame: int(), durationFrames: int(), cellCount: int(), hidden: bool() }, ['id', 'startFrame', 'durationFrames', 'cellCount'])),
          animatedProperties: arr(str()),
          effectBlockIds: arr(str()),
        },
        ['id', 'name', 'kind', 'index', 'visible', 'locked', 'parentGroupId', 'contentFrames', 'effectBlockIds'],
      )),
      groups: arr(obj(
        { id: str(), name: str(), childLayerIds: arr(str()), visible: bool(), locked: bool(), collapsed: bool(), effectBlockIds: arr(str()) },
        ['id', 'name', 'childLayerIds', 'effectBlockIds'],
      )),
      effects: arr(obj(
        { blockId: str(), effectType: str(), owner: ref('Owner'), startFrame: int(), durationFrames: int(), enabled: bool(), animatedProperties: arr(str()) },
        ['blockId', 'effectType', 'owner', 'startFrame', 'durationFrames', 'enabled'],
      )),
      shaders: arr(obj(
        { blockId: str(), shaderType: str(), index: int(), startFrame: int(), durationFrames: int(), enabled: bool(), animatedProperties: arr(str()) },
        ['blockId', 'shaderType', 'index', 'startFrame', 'durationFrames', 'enabled'],
      )),
      selection: obj({ active: bool(), count: int(), bounds: nullable(ref('Bounds')) }, ['active', 'count', 'bounds']),
      history: obj({ canUndo: bool(), canRedo: bool() }, ['canUndo', 'canRedo']),
    },
    ['documentId', 'revision', 'name', 'canvas', 'typography', 'timeline', 'activeLayerId', 'layers', 'groups', 'effects', 'shaders', 'selection', 'history'],
  ),
  ReadCellsResult: obj(
    {
      scope: enumOf(['composite', 'layer']),
      frame: int(),
      layerId: str(),
      contentFrameId: nullable(str()),
      region: obj({ x: int(), y: int(), width: int(), height: int() }, ['x', 'y', 'width', 'height']),
      format: enumOf(['text', 'cells']),
      text: arr(str(), { description: 'One string per row of region (format "text")' }),
      cells: arr(ref('CellOut'), { description: 'Non-empty cells in absolute coordinates (format "cells")' }),
      cellCount: int({ description: 'Non-empty cells inside region' }),
    },
    ['scope', 'frame', 'region', 'format', 'cellCount'],
  ),
  SelectionResult: obj(
    {
      active: bool(),
      count: int(),
      bounds: nullable(ref('Bounds')),
      cells: arr(ref('IntPoint'), { description: 'Selected cells (omitted when truncated)' }),
      truncated: bool({ description: 'True when count exceeds the inline cell limit (2000)' }),
      moving: bool(),
      clipboard: obj({ available: bool(), cellCount: int(), bounds: nullable(ref('Bounds')) }, ['available', 'cellCount', 'bounds']),
    },
    ['active', 'count', 'bounds', 'truncated', 'moving', 'clipboard'],
  ),
  HistoryResult: obj(
    {
      position: int({ description: 'Index of the last applied entry (-1 when none)' }),
      length: int(),
      canUndo: bool(),
      canRedo: bool(),
      undoDescription: nullable(str()),
      redoDescription: nullable(str()),
      entries: arr(obj({ index: int(), type: str(), description: str(), timestamp: num(), applied: bool() }, ['index', 'type', 'description', 'timestamp', 'applied']), { description: 'Most recent entries (max 50), oldest first' }),
    },
    ['position', 'length', 'canUndo', 'canRedo', 'undoDescription', 'redoDescription', 'entries'],
  ),
  CatalogResult: oneOf(
    obj({ family: { const: 'effects' }, entries: arr(ref('CatalogEntry')) }, ['family', 'entries']),
    obj({ family: { const: 'shaders' }, entries: arr(ref('CatalogEntry')) }, ['family', 'entries']),
    obj({ family: { const: 'generators' }, entries: arr(ref('CatalogEntry')) }, ['family', 'entries']),
    obj(
      {
        family: { const: 'palettes' },
        activeColorPaletteId: nullable(str()),
        activeCharacterPaletteId: nullable(str()),
        colorPalettes: arr(obj({ id: str(), name: str(), colors: arr(str()), isPreset: bool(), isCustom: bool() }, ['id', 'name', 'colors', 'isPreset', 'isCustom'])),
        characterPalettes: arr(obj({ id: str(), name: str(), characters: arr(str()), category: str(), isPreset: bool(), isCustom: bool() }, ['id', 'name', 'characters', 'category', 'isPreset', 'isCustom'])),
      },
      ['family', 'activeColorPaletteId', 'activeCharacterPaletteId', 'colorPalettes', 'characterPalettes'],
    ),
    obj(
      {
        family: { const: 'export_formats' },
        formats: arr(obj(
          {
            format: enumOf(exportFormatNames), label: str(), mimeType: str(), extension: str(),
            category: enumOf(['image', 'video', 'text', 'code', 'session']), binary: bool(), animated: bool(), browserOnly: bool(),
            options: record('Format-specific options with defaults'),
          },
          ['format', 'label', 'mimeType', 'extension', 'category', 'binary', 'animated', 'browserOnly', 'options'],
        )),
      },
      ['family', 'formats'],
    ),
    obj(
      {
        family: { const: 'tools' },
        tools: arr(str()),
        activeTool: str(),
        current: obj({ character: str(), foregroundColor: str(), backgroundColor: str() }, ['character', 'foregroundColor', 'backgroundColor']),
        brushShapes: arr(str()),
        shapeKinds: arr(str()),
        boxStyles: arr(obj({ id: str(), name: str() }, ['id', 'name'])),
        gradientTypes: arr(str()),
        importSettings: obj(
          {
            defaults: record('Supported import settings with defaults; palette defaults reflect the active palettes'),
            enums: record('Allowed values for enumerated import settings', arr(str())),
            notes: record('Import setting semantics and limitations', str()),
          },
          ['defaults', 'enums', 'notes'],
        ),
      },
      ['family', 'tools', 'activeTool', 'current', 'brushShapes', 'shapeKinds', 'boxStyles', 'gradientTypes', 'importSettings'],
    ),
    obj(
      {
        family: { const: 'fonts' },
        canvasFonts: arr(obj({ id: str(), name: str(), category: str() }, ['id', 'name'])),
        figletFonts: arr(obj({ category: str(), fonts: arr(str()) }, ['category', 'fonts'])),
      },
      ['family', 'canvasFonts', 'figletFonts'],
    ),
  ),
  GeneratorState: obj(
    {
      layerId: str(),
      currentFrameIndex: int(),
      generator: obj(
        {
          id: str(), generatorType: str(), startFrame: int(), durationFrames: int(), enabled: bool(), settings: record(),
          propertyTracks: arr(obj(
            { id: str(), propertyPath: str(), loopKeyframes: bool(), keyframes: arr(obj({ id: str(), frame: int(), value: anyValue(), easing: anyValue() }, ['id', 'frame', 'value'])) },
            ['id', 'propertyPath', 'keyframes'],
          )),
        },
        ['id', 'generatorType', 'startFrame', 'durationFrames', 'enabled', 'settings', 'propertyTracks'],
      ),
      resolvedSettings: record('Settings after keyframe interpolation at the requested frame'),
    },
    ['layerId', 'currentFrameIndex', 'generator', 'resolvedSettings'],
  ),
};

const Mutation = ref('Mutation');
const Target = ref('Target');
const Style = ref('Style');
const Region = ref('Region');
const IntPoint = ref('IntPoint');
const Artifact = ref('Artifact');
const anyResult = record();
const empty = obj({});
const id = (description?: string) => str(description ? { minLength: 1, description } : { minLength: 1 });
const removalProps = {
  frames: arr(int({ minimum: 0 }), { description: 'Remove keyframes at these frames' }),
  keyframeIds: arr(str()),
  clearTrack: bool({ description: 'Remove the whole property track' }),
};
const keyframesProps = {
  propertyPath: str({ minLength: 1 }),
  keyframes: arr(ref('KeyframeInput'), { minItems: 1, maxItems: 500 }),
  replace: bool({ description: 'Replace all existing keyframes on the track' }),
};
const blockTimingProps = {
  startFrame: int({ minimum: 0 }),
  durationFrames: int({ minimum: 1 }),
  settings: record('Effect settings keyed by property path (see get_catalog)'),
  enabled: bool(),
};
const paletteKind = enumOf(['color', 'character']);
const exportFormats = exportFormatNames;

type OpDef = Omit<OperationContract, 'destructive' | 'idempotent' | 'requires' | 'result'> & {
  destructive?: boolean;
  idempotent?: boolean;
  requires?: OperationRequirement[];
  result?: JsonSchema;
};

/**
 * Mutations/io that only add new objects and never overwrite, remove or
 * replace existing data. MCP `destructiveHint=false` means "purely additive",
 * so every other mutation/io operation is conservatively destructive.
 */
const ADDITIVE_OPERATIONS = new Set([
  'add_layer', 'duplicate_layer', 'create_group', 'add_content_frame', 'duplicate_content_frame',
  'add_effect', 'add_shader', 'add_generator_layer', 'create_palette', 'duplicate_palette', 'import_palette',
  'copy_selection', 'export', 'export_palette', 'list_cloud_projects', 'download_cloud_project',
]);

function op(def: OpDef): OperationContract {
  const readOnly = def.kind === 'read' || def.kind === 'view';
  return {
    destructive: !readOnly && !ADDITIVE_OPERATIONS.has(def.name),
    idempotent: def.kind === 'read',
    requires: [],
    result: def.kind === 'mutation' ? Mutation : anyResult,
    ...def,
  };
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

export const BRIDGE_OPERATIONS: OperationContract[] = [
  // ── Reads ────────────────────────────────────────────────────────────────
  op({
    name: 'get_capabilities', domain: 'meta', kind: 'read',
    description: 'Contract/version info, supported operations, runtime catalogs summary, auth and entitlement state.',
    input: empty,
    result: obj({ capabilities: record() }, ['capabilities']),
  }),
  op({
    name: 'get_document', domain: 'document', kind: 'read',
    description: 'Full native project session (.asciimtn v2) including layers, groups, effects, shaders, generators, typography, palettes and tool state.',
    input: empty,
    result: obj({ document: ref('Session'), documentId: str(), revision: int() }, ['document', 'documentId', 'revision']),
  }),
  op({
    name: 'get_document_summary', domain: 'document', kind: 'read',
    description: 'Compact structure: canvas, timeline, layers/groups with content-frame ranges, effects, shaders, selection and history flags. No cell data.',
    input: empty,
    result: ref('DocumentSummary'),
  }),
  op({
    name: 'read_cells', domain: 'document', kind: 'read',
    description: 'Read cells at a timeline frame. scope "composite" = app compositor output (transforms, effects, generators; shaders excluded). scope "layer" = raw content frame data in layer-local coordinates.',
    input: obj({
      scope: enumOf(['composite', 'layer'], { default: 'composite' }),
      frame: int({ minimum: 0, description: 'Defaults to the playhead' }),
      layerId: str(),
      contentFrameId: str(),
      region: Region,
      format: enumOf(['text', 'cells'], { default: 'text' }),
      includeEffects: bool({ default: true }),
    }),
    result: ref('ReadCellsResult'),
  }),
  op({
    name: 'get_catalog', domain: 'meta', kind: 'read',
    description: 'Runtime catalogs: effect/shader/generator types with property schemas, palettes, export formats and settings, FIGlet fonts, box styles, brush shapes, autofill palettes.',
    input: obj({ family: enumOf(['effects', 'shaders', 'generators', 'palettes', 'export_formats', 'tools', 'fonts']) }, ['family']),
    result: ref('CatalogResult'),
  }),
  op({ name: 'get_selection', domain: 'selection', kind: 'read', description: 'Current selection mask (cells, bounds) and clipboard availability.', input: empty, result: ref('SelectionResult') }),
  op({ name: 'get_history', domain: 'history', kind: 'read', description: 'Undo/redo availability and recent history descriptions.', input: empty, result: ref('HistoryResult') }),

  // ── Project / canvas ─────────────────────────────────────────────────────
  op({
    name: 'new_project', domain: 'project', kind: 'mutation', destructive: true,
    description: 'Reset to a new blank project (same as File → New): one layer, cleared history, detached from cloud.',
    input: obj({
      width: int({ minimum: 4, maximum: 200 }),
      height: int({ minimum: 4, maximum: 100 }),
      name: str({ maxLength: 200 }),
      description: str({ maxLength: 2000 }),
      backgroundColor: ref('Color'),
      frameRate: int({ minimum: 1, maximum: 60 }),
      durationFrames: int({ minimum: 1 }),
    }),
  }),
  op({
    name: 'load_project', domain: 'project', kind: 'mutation', destructive: true,
    description: 'Replace the open project with a native session (v1 or v2) using the app importer.',
    input: obj({ session: ref('Session') }, ['session']),
  }),
  op({
    name: 'set_project_metadata', domain: 'project', kind: 'mutation', idempotent: true,
    description: 'Set project name and/or description.',
    input: obj({ name: str({ minLength: 1, maxLength: 200 }), description: str({ maxLength: 2000 }) }, [], { minProperties: 1 }),
  }),
  op({
    name: 'resize_canvas', domain: 'project', kind: 'mutation',
    description: 'Resize canvas across all layers/content frames, keeping content pinned to anchor (default top-left).',
    input: obj({ width: int({ minimum: 4, maximum: 200 }), height: int({ minimum: 4, maximum: 100 }), anchor: ref('Anchor') }, ['width', 'height']),
  }),
  op({
    name: 'crop_canvas', domain: 'project', kind: 'mutation', destructive: true,
    description: 'Crop the canvas to a region (or the current selection bounds) across all layers.',
    input: obj({ region: Region }),
  }),
  op({
    name: 'set_canvas_background', domain: 'project', kind: 'mutation', idempotent: true,
    description: 'Set canvas background color ("transparent" allowed).',
    input: obj({ color: ref('BgColor') }, ['color']),
  }),
  op({
    name: 'set_typography', domain: 'project', kind: 'mutation', idempotent: true,
    description: 'Set font, font size, character spacing and line spacing used for rendering/export.',
    input: obj({ fontId: str(), fontSize: num({ minimum: 4, maximum: 96 }), characterSpacing: num({ minimum: 0.5, maximum: 3 }), lineSpacing: num({ minimum: 0.5, maximum: 3 }) }, [], { minProperties: 1 }),
  }),
  op({
    name: 'set_tool_state', domain: 'project', kind: 'view', idempotent: true,
    description: 'Set current drawing character/colors and active tool (used as defaults by drawing operations).',
    input: obj({ character: ref('Char'), foregroundColor: ref('Color'), backgroundColor: ref('BgColor'), tool: str() }, [], { minProperties: 1 }),
  }),

  // ── Cells ────────────────────────────────────────────────────────────────
  op({
    name: 'set_cells', domain: 'cells', kind: 'mutation',
    description: 'Write or erase cells in one content frame.',
    input: obj({ target: Target, cells: arr(ref('CellAt'), { minItems: 1, maxItems: 20000 }) }, ['cells']),
  }),
  op({
    name: 'clear_cells', domain: 'cells', kind: 'mutation', destructive: true,
    description: 'Erase a region, the current selection, or the whole content frame.',
    input: obj({ target: Target, region: Region, useSelection: bool() }),
  }),
  op({
    name: 'fill_region', domain: 'cells', kind: 'mutation',
    description: 'Fill a rectangular region or the current selection with one cell style.',
    input: obj({ target: Target, region: Region, useSelection: bool(), cell: ref('Style') }, ['cell']),
  }),
  op({
    name: 'import_text', domain: 'cells', kind: 'mutation',
    description: 'Place multi-line plain text; spaces become blank cells unless keepSpaces.',
    input: obj({ target: Target, text: str({ maxLength: 50000 }), x: int(), y: int(), style: Style, keepSpaces: bool(), clearFirst: bool() }, ['text']),
  }),
  op({
    name: 'shift_content', domain: 'cells', kind: 'mutation',
    description: 'Shift all cells of a content frame by dx/dy, optionally wrapping around the canvas.',
    input: obj({ target: Target, dx: int(), dy: int(), wrap: bool() }, ['dx', 'dy']),
  }),
  op({
    name: 'flip_content', domain: 'cells', kind: 'mutation',
    description: 'Flip a region, the selection, or the whole canvas horizontally/vertically.',
    input: obj({ target: Target, axis: enumOf(['horizontal', 'vertical']), region: Region, useSelection: bool() }, ['axis']),
  }),
  op({
    name: 'replace_in_cells', domain: 'cells', kind: 'mutation',
    description: 'Find/replace characters and/or colors in non-empty cells of one content frame, a layer, or the whole project. match: {} matches every non-empty cell. region/useSelection restrict the edit to those cells (scope "content_frame" only); unmatched fields of each cell are preserved.',
    input: obj({
      target: Target,
      scope: enumOf(['content_frame', 'layer', 'project'], { default: 'content_frame' }),
      region: Region,
      useSelection: bool({ description: 'Restrict to the current selection mask (no coordinates need to be transferred)' }),
      match: obj({ char: ref('Char'), color: ref('Color'), bgColor: ref('BgColor') }, [], { description: '{} = all non-empty cells' }),
      replace: obj({ char: ref('Char'), color: ref('Color'), bgColor: ref('BgColor') }, [], { minProperties: 1 }),
    }, ['match', 'replace']),
  }),

  // ── Semantic drawing (reuses tool engines) ───────────────────────────────
  op({
    name: 'draw_brush_stroke', domain: 'drawing', kind: 'mutation',
    description: 'Pencil/eraser stroke through points with brush size and shape (aspect-ratio aware, respects selection mask).',
    input: obj({
      target: Target,
      points: arr(IntPoint, { minItems: 1, maxItems: 5000 }),
      size: int({ minimum: 1, maximum: 20, default: 1 }),
      shape: enumOf(['circle', 'square', 'horizontal', 'vertical'], { default: 'circle' }),
      style: Style,
      erase: bool(),
    }, ['points']),
  }),
  op({
    name: 'draw_line', domain: 'drawing', kind: 'mutation',
    description: 'Straight line between two cells (Bresenham), optional brush size.',
    input: obj({ target: Target, from: IntPoint, to: IntPoint, size: int({ minimum: 1, maximum: 20 }), shape: enumOf(['circle', 'square', 'horizontal', 'vertical']), style: Style }, ['from', 'to']),
  }),
  op({
    name: 'draw_shape', domain: 'drawing', kind: 'mutation',
    description: 'Rectangle or ellipse via the vector-shape engine (filled or outline, constant/palette/autofill/lineart fill).',
    input: obj({
      target: Target,
      shape: enumOf(['rectangle', 'ellipse']),
      region: Region,
      filled: bool({ default: true }),
      fillMode: enumOf(['constant', 'palette', 'autofill', 'lineart'], { default: 'constant' }),
      autofillPaletteId: str(),
      strokeWidth: num({ minimum: 0.1, maximum: 10 }),
      style: Style,
    }, ['shape', 'region']),
  }),
  op({
    name: 'draw_bezier', domain: 'drawing', kind: 'mutation',
    description: 'Bezier path (open stroke or closed shape) rasterized by the pen-tool engine. Coordinates are cell units (fractional allowed); handles are relative.',
    input: obj({
      target: Target,
      points: arr(obj({ x: num(), y: num(), handleIn: ref('Point'), handleOut: ref('Point') }, ['x', 'y']), { minItems: 2, maxItems: 200 }),
      closed: bool({ default: false }),
      filled: bool({ default: true }),
      fillMode: enumOf(['constant', 'palette', 'autofill', 'lineart'], { default: 'constant' }),
      autofillPaletteId: str(),
      strokeWidth: num({ minimum: 0.1, maximum: 10, default: 1 }),
      strokeTaperStart: num({ minimum: 0, maximum: 1 }),
      strokeTaperEnd: num({ minimum: 0, maximum: 1 }),
      style: Style,
    }, ['points']),
  }),
  op({
    name: 'fill_area', domain: 'drawing', kind: 'mutation',
    description: 'Paint-bucket fill from a seed cell (contiguous or global, match by char/color/bgColor).',
    input: obj({
      target: Target, x: int({ minimum: 0 }), y: int({ minimum: 0 }),
      contiguous: bool({ default: true }),
      match: obj({ char: bool(), color: bool(), bgColor: bool() }),
      style: Style,
    }, ['x', 'y']),
  }),
  op({
    name: 'gradient_fill', domain: 'drawing', kind: 'mutation',
    description: 'Gradient fill (linear/radial) of a seed fill area or region, interpolating character, text color and/or background color stops.',
    input: obj({
      target: Target,
      type: enumOf(['linear', 'radial'], { default: 'linear' }),
      start: IntPoint,
      end: IntPoint,
      seed: IntPoint,
      region: Region,
      contiguous: bool(),
      match: obj({ char: bool(), color: bool(), bgColor: bool() }),
      character: ref('GradientProperty'),
      textColor: ref('GradientProperty'),
      backgroundColor: ref('GradientProperty'),
    }, ['start', 'end']),
  }),
  op({
    name: 'draw_ascii_box', domain: 'drawing', kind: 'mutation',
    description: 'Box-drawing rectangle or connected line path with junction-aware characters.',
    input: obj({
      target: Target,
      styleId: str({ default: 'single-line', description: 'Box style id (see get_catalog tools)' }),
      region: Region,
      path: arr(IntPoint, { minItems: 2, maxItems: 2000, description: 'Polyline vertices (horizontal/vertical/diagonal segments)' }),
      style: Style,
    }),
  }),
  op({
    name: 'place_text', domain: 'drawing', kind: 'mutation',
    description: 'Type text at a position (text tool); newlines advance rows.',
    input: obj({ target: Target, x: int(), y: int(), text: str({ minLength: 1, maxLength: 10000 }), style: Style }, ['x', 'y', 'text']),
  }),
  op({
    name: 'place_figlet_text', domain: 'drawing', kind: 'mutation',
    description: 'Render FIGlet ASCII-type text with a font/layout and stamp it at a position.',
    input: obj({
      target: Target, x: int(), y: int(), text: str({ minLength: 1, maxLength: 500 }),
      font: str({ default: 'Standard' }),
      horizontalLayout: enumOf(['normal', 'narrow', 'squeezed', 'fitted', 'wide']),
      verticalLayout: enumOf(['normal', 'narrow', 'squeezed', 'fitted', 'wide']),
      transparentWhitespace: bool({ default: true }),
      style: Style,
    }, ['x', 'y', 'text']),
  }),

  // ── Layers & groups ──────────────────────────────────────────────────────
  op({ name: 'add_layer', domain: 'layers', kind: 'mutation', description: 'Add a content layer (with an empty content frame spanning the timeline).', input: obj({ name: str({ maxLength: 200 }), aboveLayerId: str(), empty: bool({ description: 'Create without a content frame' }) }) }),
  op({ name: 'remove_layer', domain: 'layers', kind: 'mutation', destructive: true, description: 'Delete a layer.', input: obj({ layerId: id() }, ['layerId']) }),
  op({ name: 'duplicate_layer', domain: 'layers', kind: 'mutation', description: 'Duplicate a layer with all content, keyframes and effects.', input: obj({ layerId: id() }, ['layerId']) }),
  op({ name: 'reorder_layer', domain: 'layers', kind: 'mutation', description: 'Move a layer to an index (0 = bottom of stack).', input: obj({ layerId: id(), toIndex: int({ minimum: 0 }) }, ['layerId', 'toIndex']) }),
  op({
    name: 'update_layer', domain: 'layers', kind: 'mutation', idempotent: true,
    description: 'Update layer name, visibility, solo, lock, opacity, keyframe sync or static transform properties.',
    input: obj({
      layerId: id(), name: str({ minLength: 1, maxLength: 200 }), visible: bool(), solo: bool(), locked: bool(),
      opacity: num({ minimum: 0, maximum: 100 }), syncKeyframesToFrames: bool(),
      staticProperties: record('Static transform values keyed by property path', num()),
    }, ['layerId'], { minProperties: 2 }),
  }),
  op({ name: 'set_active_layer', domain: 'layers', kind: 'view', idempotent: true, description: 'Select the active (editable) layer.', input: obj({ layerId: id() }, ['layerId']) }),
  op({ name: 'merge_layers', domain: 'layers', kind: 'mutation', destructive: true, description: 'Merge a layer down, or merge all visible layers.', input: obj({ mode: enumOf(['down', 'visible']), layerId: str() }, ['mode']) }),
  op({ name: 'flatten_layer', domain: 'layers', kind: 'mutation', destructive: true, description: 'Bake transforms/effects of a layer into its content frames.', input: obj({ layerId: id() }, ['layerId']) }),
  op({ name: 'create_group', domain: 'layers', kind: 'mutation', description: 'Group layers.', input: obj({ name: str({ maxLength: 200 }), layerIds: arr(str(), { minItems: 2, description: 'Two or more distinct layers not already in a group (the app has no empty groups)' }) }, ['layerIds']) }),
  op({ name: 'ungroup', domain: 'layers', kind: 'mutation', description: 'Dissolve a group, keeping its layers.', input: obj({ groupId: id() }, ['groupId']) }),
  op({
    name: 'update_group', domain: 'layers', kind: 'mutation', idempotent: true,
    description: 'Update group name, visibility, solo, lock, collapsed or static transform properties.',
    input: obj({ groupId: id(), name: str({ minLength: 1, maxLength: 200 }), visible: bool(), solo: bool(), locked: bool(), collapsed: bool(), staticProperties: record(undefined, num()) }, ['groupId'], { minProperties: 2 }),
  }),

  // ── Content frames & timeline ────────────────────────────────────────────
  op({
    name: 'add_content_frame', domain: 'timeline', kind: 'mutation',
    description: 'Add a content frame to a layer at an explicit time range (must not overlap).',
    input: obj({ layerId: id(), startFrame: int({ minimum: 0 }), durationFrames: int({ minimum: 1 }), name: str(), cells: arr(ref('CellAt'), { maxItems: 20000 }), copyFromContentFrameId: str() }, ['layerId', 'startFrame', 'durationFrames']),
  }),
  op({ name: 'remove_content_frame', domain: 'timeline', kind: 'mutation', destructive: true, description: 'Delete a content frame.', input: obj({ layerId: id(), contentFrameId: id() }, ['layerId', 'contentFrameId']) }),
  op({
    name: 'update_content_frame', domain: 'timeline', kind: 'mutation', idempotent: true,
    description: 'Retime, rename, hide or label a content frame.',
    input: obj({ layerId: id(), contentFrameId: id(), startFrame: int({ minimum: 0 }), durationFrames: int({ minimum: 1 }), name: str(), hidden: bool(), labelColor: nullable(str()) }, ['layerId', 'contentFrameId'], { minProperties: 3 }),
  }),
  op({ name: 'duplicate_content_frame', domain: 'timeline', kind: 'mutation', description: 'Duplicate a content frame immediately after itself (shifting later frames).', input: obj({ layerId: id(), contentFrameId: id() }, ['layerId', 'contentFrameId']) }),
  op({ name: 'split_content_frame', domain: 'timeline', kind: 'mutation', description: 'Split a content frame at an absolute frame.', input: obj({ layerId: id(), contentFrameId: id(), atFrame: int({ minimum: 1 }) }, ['layerId', 'contentFrameId', 'atFrame']) }),
  op({
    name: 'set_timeline', domain: 'timeline', kind: 'mutation',
    description: 'Set frame rate, duration, looping and work area.',
    input: obj({ frameRate: int({ minimum: 1, maximum: 60 }), maintainDuration: bool(), durationFrames: int({ minimum: 1 }), looping: bool(), workArea: ref('WorkArea') }, [], { minProperties: 1 }),
  }),
  op({ name: 'trim_to_work_area', domain: 'timeline', kind: 'mutation', destructive: true, description: 'Trim the timeline to the enabled work area.', input: empty }),
  op({ name: 'remove_blank_space', domain: 'timeline', kind: 'mutation', description: 'Close an empty gap on a layer at a frame (ripple earlier content forward).', input: obj({ layerId: id(), frame: int({ minimum: 0 }) }, ['layerId', 'frame']) }),
  op({ name: 'seek', domain: 'playback', kind: 'view', idempotent: true, description: 'Move the playhead to an absolute frame.', input: obj({ frame: int({ minimum: 0 }) }, ['frame']) }),
  op({ name: 'set_playback', domain: 'playback', kind: 'view', description: 'Start/stop preview playback in the browser.', input: obj({ playing: bool() }, ['playing']) }),
  op({
    name: 'set_onion_skin', domain: 'playback', kind: 'view', idempotent: true,
    description: 'Configure onion skinning.',
    input: obj({ enabled: bool(), previousFrames: int({ minimum: 0, maximum: 10 }), nextFrames: int({ minimum: 0, maximum: 10 }), allLayers: bool() }, [], { minProperties: 1 }),
  }),

  // ── Transform keyframes ──────────────────────────────────────────────────
  op({
    name: 'set_keyframes', domain: 'keyframes', kind: 'mutation',
    description: 'Upsert transform keyframes on a layer or group property track (creates the track).',
    input: obj({ layerId: str(), groupId: str(), ...keyframesProps, loop: bool() }, ['propertyPath', 'keyframes']),
  }),
  op({
    name: 'remove_keyframes', domain: 'keyframes', kind: 'mutation', destructive: true,
    description: 'Remove transform keyframes by frame or id, or clear the track.',
    input: obj({ layerId: str(), groupId: str(), propertyPath: str({ minLength: 1 }), ...removalProps }, ['propertyPath']),
  }),

  // ── Procedural effects ───────────────────────────────────────────────────
  op({
    name: 'add_effect', domain: 'effects', kind: 'mutation',
    description: 'Add a procedural effect block to a layer, group or global track.',
    input: obj({ owner: ref('Owner'), effectType: id(), ...blockTimingProps }, ['owner', 'effectType']),
  }),
  op({
    name: 'update_effect', domain: 'effects', kind: 'mutation',
    description: 'Update effect settings, enabled state, timing, owner or stack index.',
    input: obj({ blockId: id(), ...blockTimingProps, owner: ref('Owner'), index: int({ minimum: 0 }) }, ['blockId'], { minProperties: 2 }),
  }),
  op({ name: 'remove_effect', domain: 'effects', kind: 'mutation', destructive: true, description: 'Remove an effect block.', input: obj({ blockId: id() }, ['blockId']) }),
  op({ name: 'set_effect_keyframes', domain: 'effects', kind: 'mutation', description: 'Upsert keyframes on an effect property.', input: obj({ blockId: id(), ...keyframesProps }, ['blockId', 'propertyPath', 'keyframes']) }),
  op({ name: 'remove_effect_keyframes', domain: 'effects', kind: 'mutation', destructive: true, description: 'Remove effect keyframes.', input: obj({ blockId: id(), propertyPath: str({ minLength: 1 }), ...removalProps }, ['blockId', 'propertyPath']) }),
  op({ name: 'bake_effect', domain: 'effects', kind: 'mutation', destructive: true, description: 'Apply an effect destructively to layer content and remove the block.', input: obj({ blockId: id() }, ['blockId']) }),

  // ── Shaders (post effects) ───────────────────────────────────────────────
  op({ name: 'add_shader', domain: 'shaders', kind: 'mutation', description: 'Add a shader (post-processing) block.', input: obj({ shaderType: id(), ...blockTimingProps, index: int({ minimum: 0 }) }, ['shaderType']) }),
  op({ name: 'update_shader', domain: 'shaders', kind: 'mutation', description: 'Update shader settings, enabled state, timing or chain index.', input: obj({ blockId: id(), ...blockTimingProps, index: int({ minimum: 0 }) }, ['blockId'], { minProperties: 2 }) }),
  op({ name: 'remove_shader', domain: 'shaders', kind: 'mutation', destructive: true, description: 'Remove a shader block.', input: obj({ blockId: id() }, ['blockId']) }),
  op({ name: 'set_shader_keyframes', domain: 'shaders', kind: 'mutation', description: 'Upsert keyframes on a shader property.', input: obj({ blockId: id(), ...keyframesProps }, ['blockId', 'propertyPath', 'keyframes']) }),
  op({ name: 'remove_shader_keyframes', domain: 'shaders', kind: 'mutation', destructive: true, description: 'Remove shader keyframes.', input: obj({ blockId: id(), propertyPath: str({ minLength: 1 }), ...removalProps }, ['blockId', 'propertyPath']) }),

  // ── Generators (shapes identical to legacy commands) ─────────────────────
  op({ name: 'get_generator_catalog', domain: 'generators', kind: 'read', description: 'Generator types with property schemas.', input: empty }),
  op({ name: 'add_generator_layer', domain: 'generators', kind: 'mutation', description: 'Add a procedural generator layer, optionally with initial keyframe tracks (one undo entry). Returns layerId plus trackIds/keyframeIds in keyframes[] order.', input: obj({ generatorType: id(), name: str(), startFrame: int({ minimum: 0 }), durationFrames: int({ minimum: 1 }), settings: record(), keyframes: arr(obj({ ...keyframesProps, loop: bool() }, ['propertyPath', 'keyframes']), { maxItems: 50 }) }, ['generatorType']) }),
  op({ name: 'update_generator_layer', domain: 'generators', kind: 'mutation', description: 'Update generator settings/timing/name/enabled.', input: obj({ layerId: id(), settings: record(), startFrame: int({ minimum: 0 }), durationFrames: int({ minimum: 1 }), shiftKeyframes: bool(), enabled: bool(), name: str() }, ['layerId']) }),
  op({ name: 'set_generator_property', domain: 'generators', kind: 'mutation', description: 'Set one generator property (keyframes it when animated or frame given).', input: obj({ layerId: id(), propertyPath: id(), value: ref('Value'), frame: int({ minimum: 0 }), applyEffectDefaults: bool() }, ['layerId', 'propertyPath', 'value']) }),
  op({ name: 'set_generator_keyframes', domain: 'generators', kind: 'mutation', description: 'Upsert generator property keyframes.', input: obj({ layerId: id(), ...keyframesProps, loop: bool() }, ['layerId', 'propertyPath', 'keyframes']) }),
  op({ name: 'remove_generator_keyframes', domain: 'generators', kind: 'mutation', destructive: true, description: 'Remove generator keyframes.', input: obj({ layerId: id(), propertyPath: id(), ...removalProps, frame: int({ minimum: 0 }) }, ['layerId', 'propertyPath']) }),
  op({ name: 'reset_generator', domain: 'generators', kind: 'mutation', destructive: true, description: 'Reset generator settings to defaults.', input: obj({ layerId: id() }, ['layerId']) }),
  op({ name: 'randomize_generator_seed', domain: 'generators', kind: 'mutation', description: 'Randomize generator seed.', input: obj({ layerId: id(), frame: int({ minimum: 0 }) }, ['layerId']) }),
  op({ name: 'get_generator_state', domain: 'generators', kind: 'read', description: 'Generator source and evaluated settings at a frame.', input: obj({ layerId: id(), frame: int({ minimum: 0 }) }, ['layerId']), result: ref('GeneratorState') }),
  op({ name: 'render_generator_frames', domain: 'generators', kind: 'read', description: 'Render generator output for frames (browser renderer).', input: obj({ layerId: id(), frames: arr(int({ minimum: 0 }), { minItems: 1, maxItems: 120 }), includeCells: bool() }, ['layerId', 'frames']) }),
  op({ name: 'bake_generator_layer', domain: 'generators', kind: 'mutation', destructive: true, description: 'Bake generator output into content frames.', input: obj({ layerId: id() }, ['layerId']) }),

  // ── Selection & clipboard ────────────────────────────────────────────────
  op({
    name: 'set_selection', domain: 'selection', kind: 'view',
    description: 'Select a rectangle, explicit cells, a polygon (lasso) or all cells matching a color/char (magic wand).',
    input: obj({
      mode: enumOf(['rectangle', 'cells', 'polygon', 'match', 'all']),
      region: Region,
      cells: arr(IntPoint, { maxItems: 20000 }),
      polygon: arr(ref('Point'), { minItems: 3, maxItems: 2000 }),
      match: obj({ char: ref('Char'), color: ref('Color'), bgColor: ref('BgColor') }, [], { minProperties: 1 }),
      contiguousFrom: IntPoint,
      combine: enumOf(['replace', 'add', 'subtract'], { default: 'replace' }),
      target: Target,
    }, ['mode']),
  }),
  op({ name: 'clear_selection', domain: 'selection', kind: 'view', idempotent: true, description: 'Clear all selections.', input: empty }),
  op({ name: 'copy_selection', domain: 'selection', kind: 'mutation', description: 'Copy (or cut) the selected cells of a content frame to the app clipboard. Copy without cut does not create history.', input: obj({ target: Target, cut: bool() }) }),
  op({ name: 'paste_clipboard', domain: 'selection', kind: 'mutation', description: 'Paste the app clipboard at a position (defaults to the original bounds).', input: obj({ target: Target, x: int(), y: int(), transparent: bool({ default: true }) }) }),
  op({ name: 'move_selection', domain: 'selection', kind: 'mutation', description: 'Move selected cells by dx/dy (selection follows).', input: obj({ target: Target, dx: int(), dy: int() }, ['dx', 'dy']) }),

  // ── History ──────────────────────────────────────────────────────────────
  op({ name: 'undo', domain: 'history', kind: 'mutation', description: 'Undo the last app history entry (same as Cmd/Ctrl+Z).', input: empty }),
  op({ name: 'redo', domain: 'history', kind: 'mutation', description: 'Redo (same as Cmd/Ctrl+Shift+Z).', input: empty }),

  // ── Batch ────────────────────────────────────────────────────────────────
  op({
    name: 'apply_operations', domain: 'batch', kind: 'mutation',
    description: 'Apply up to 100 document mutations atomically: one revision, one undo entry, full rollback on any failure. Sub-operations must be non-nested document mutations (not undo/redo/new_project/load_project/apply_operations, reads, view, or io). Later steps see earlier steps\' results; failures report details.index/details.op.',
    input: obj({
      operations: arr(obj({ op: str({ minLength: 1 }), input: record('Input for the sub-operation (validated against its schema)') }, ['op']), { minItems: 1, maxItems: 100 }),
    }, ['operations']),
    result: {
      type: 'object',
      properties: {
        ids: obj({}, [], { description: 'Always empty for batches; see results[i].result.ids' }),
        revision: int({ minimum: 0 }),
        documentId: str(),
        results: arr(obj({ op: str(), result: { type: 'object', properties: { ids: record(undefined, { anyOf: [str(), arr(str())] }) }, required: ['ids'], additionalProperties: true } }, ['op', 'result'])),
      },
      required: ['ids', 'revision', 'results'],
      additionalProperties: true,
    },
  }),

  // ── Palettes ─────────────────────────────────────────────────────────────
  op({ name: 'set_active_palette', domain: 'palettes', kind: 'view', idempotent: true, description: 'Activate a color or character palette.', input: obj({ kind: paletteKind, paletteId: id() }, ['kind', 'paletteId']) }),
  op({
    name: 'create_palette', domain: 'palettes', kind: 'mutation',
    description: 'Create a custom color palette (colors) or character palette (characters).',
    input: obj({ kind: paletteKind, name: str({ minLength: 1, maxLength: 100 }), colors: arr(ref('Color'), { maxItems: 256 }), characters: arr(ref('Char'), { maxItems: 512 }), activate: bool() }, ['kind', 'name']),
  }),
  op({
    name: 'update_palette', domain: 'palettes', kind: 'mutation',
    description: 'Rename a custom palette or replace its colors/characters.',
    input: obj({ kind: paletteKind, paletteId: id(), name: str({ minLength: 1, maxLength: 100 }), colors: arr(ref('Color'), { maxItems: 256 }), characters: arr(ref('Char'), { maxItems: 512 }) }, ['kind', 'paletteId'], { minProperties: 3 }),
  }),
  op({ name: 'delete_palette', domain: 'palettes', kind: 'mutation', destructive: true, description: 'Delete a custom palette.', input: obj({ kind: paletteKind, paletteId: id() }, ['kind', 'paletteId']) }),
  op({ name: 'duplicate_palette', domain: 'palettes', kind: 'mutation', description: 'Duplicate any palette as a custom palette.', input: obj({ kind: paletteKind, paletteId: id(), name: str() }, ['kind', 'paletteId']) }),
  op({ name: 'import_palette', domain: 'palettes', kind: 'mutation', description: 'Import a palette from the app JSON palette format.', input: obj({ kind: paletteKind, data: str({ minLength: 2, maxLength: 1000000 }), activate: bool() }, ['kind', 'data']) }),
  op({ name: 'export_palette', domain: 'palettes', kind: 'io', description: 'Export a palette as the app JSON palette file.', input: obj({ kind: paletteKind, paletteId: id() }, ['kind', 'paletteId']), result: obj({ artifact: Artifact }, ['artifact']) }),

  // ── Media ────────────────────────────────────────────────────────────────
  op({
    name: 'import_media', domain: 'media', kind: 'mutation',
    description: 'Convert an image/video (base64) to ASCII with the app import pipeline; place as a new layer or into a target content frame.',
    input: obj({
      data: str({ minLength: 1, description: 'Base64 file bytes' }),
      mimeType: str({ minLength: 1 }),
      filename: str(),
      mode: enumOf(['new_layer', 'replace'], { default: 'new_layer' }),
      target: Target,
      width: int({ minimum: 1, maximum: 200 }),
      height: int({ minimum: 1, maximum: 100 }),
      matchFrameRate: bool(),
      video: obj({
        startTime: num({ minimum: 0, description: 'Seconds into the clip to start sampling (default 0)' }),
        duration: num({ minimum: 0.01, description: 'Seconds to sample (default: to the end)' }),
        frameRate: num({ minimum: 1, maximum: 120, description: 'Sampling rate in fps; also each frame\'s duration (default: detected source rate)' }),
        maxFrames: int({ minimum: 1, maximum: 10000 }),
      }, [], { description: 'Video sampling window (video/* only). Omit to import every source frame.' }),
      settings: record('Import settings overrides; allowed keys, enums and defaults: get_catalog tools.importSettings. Unsupported keys are rejected.'),
    }, ['data', 'mimeType']),
  }),
  op({
    name: 'set_image_trace', domain: 'media', kind: 'view',
    description: 'Load/clear/configure the image-trace reference overlay (not saved in the project).',
    input: obj({
      data: str({ description: 'Base64 image/video bytes' }), mimeType: str(), filename: str(), clear: bool(),
      enabled: bool(), opacity: num({ minimum: 0, maximum: 1 }), renderOrder: enumOf(['behind', 'inFront']),
      frameOffset: int(), position: ref('Point'), scale: num({ minimum: 0.1, maximum: 5 }), fitToCanvas: bool(),
    }, [], { minProperties: 1 }),
  }),

  // ── Export ───────────────────────────────────────────────────────────────
  op({
    name: 'export', domain: 'io', kind: 'io',
    description: 'Render an export with the app exporters and return it as an artifact (no browser download). Allowed settings and defaults per format: get_catalog export_formats (unsupported keys are rejected). Animated formats accept frameRange "all" | {start,end} (end -1 = last); the result reports the exported frameRange and any derived componentName/packageName/modelName.',
    input: obj({ format: enumOf(exportFormats), settings: record(), filename: str({ maxLength: 200 }) }, ['format']),
    result: obj({ artifact: Artifact, result: record() }, ['artifact', 'result']),
  }),

  // ── Cloud (browser session auth) ─────────────────────────────────────────
  op({ name: 'list_cloud_projects', domain: 'cloud', kind: 'io', idempotent: true, requires: ['auth'], description: 'List cloud projects (or trash).', input: obj({ deleted: bool() }) }),
  op({ name: 'save_cloud_project', domain: 'cloud', kind: 'io', requires: ['auth'], description: 'Save the open project to the cloud (update linked project, or create).', input: obj({ name: str({ maxLength: 200 }), description: str({ maxLength: 2000 }), saveAsNew: bool() }) }),
  op({ name: 'open_cloud_project', domain: 'cloud', kind: 'io', destructive: true, requires: ['auth'], description: 'Open a cloud project in the editor.', input: obj({ projectId: id() }, ['projectId']) }),
  op({ name: 'delete_cloud_project', domain: 'cloud', kind: 'io', destructive: true, requires: ['auth'], description: 'Move a cloud project to trash.', input: obj({ projectId: id() }, ['projectId']) }),
  op({ name: 'restore_cloud_project', domain: 'cloud', kind: 'io', requires: ['auth'], description: 'Restore a cloud project from trash.', input: obj({ projectId: id() }, ['projectId']) }),
  op({ name: 'permanently_delete_cloud_project', domain: 'cloud', kind: 'io', destructive: true, requires: ['auth'], description: 'Permanently delete a trashed cloud project.', input: obj({ projectId: id() }, ['projectId']) }),
  op({ name: 'update_cloud_project_metadata', domain: 'cloud', kind: 'io', requires: ['auth'], description: 'Rename or re-describe a cloud project.', input: obj({ projectId: id(), name: str({ minLength: 1, maxLength: 200 }), description: str({ maxLength: 2000 }) }, ['projectId'], { minProperties: 2 }) }),
  op({ name: 'download_cloud_project', domain: 'cloud', kind: 'io', requires: ['auth'], description: 'Download a cloud project as a .asciimtn artifact without opening it.', input: obj({ projectId: id() }, ['projectId']), result: obj({ artifact: Artifact, result: record() }, ['artifact']) }),
  op({ name: 'upload_session_to_cloud', domain: 'cloud', kind: 'io', requires: ['auth'], description: 'Upload a native session as a new cloud project.', input: obj({ session: ref('Session'), filename: str() }, ['session']) }),
  op({ name: 'publish_cloud_project', domain: 'cloud', kind: 'io', requires: ['auth'], description: 'Publish a saved cloud project to the community gallery (preview rendered in browser).', input: obj({ projectId: id(), title: str({ minLength: 1, maxLength: 100 }), description: str({ maxLength: 2000 }), tags: arr(str({ maxLength: 30 }), { maxItems: 10 }), allowRemixes: bool() }, ['projectId', 'title']) }),
  op({ name: 'remix_cloud_project', domain: 'cloud', kind: 'io', requires: ['auth'], description: 'Remix a published gallery project into your cloud projects and open it.', input: obj({ projectId: id() }, ['projectId']) }),
];

BRIDGE_DEFS.GradientProperty = obj(
  {
    enabled: bool({ default: true }),
    stops: arr(obj({ position: num({ minimum: 0, maximum: 1 }), value: str({ minLength: 1 }) }, ['position', 'value']), { minItems: 1, maxItems: 32 }),
    interpolation: enumOf(['linear', 'constant', 'bayer2x2', 'bayer4x4', 'noise'], { default: 'linear' }),
    ditherStrength: int({ minimum: 0, maximum: 100 }),
    quantizeSteps: oneOf(int({ minimum: 1, maximum: 10 }), { const: 'infinite' }),
  },
  ['stops'],
);

export const BRIDGE_OPERATION_NAMES = BRIDGE_OPERATIONS.map((o) => o.name);

const OPERATION_INDEX = new Map(BRIDGE_OPERATIONS.map((o) => [o.name, o]));

export function getOperationContract(name: string): OperationContract | undefined {
  return OPERATION_INDEX.get(name);
}

/** Wire message shapes (documented in the generated artifact). */
export const BRIDGE_MESSAGES: Record<string, JsonSchema> = {
  hello: obj({
    type: { const: 'hello' },
    protocol: { const: BRIDGE_PROTOCOL },
    protocolVersion: { const: BRIDGE_PROTOCOL_VERSION },
    contractVersion: str(),
    contractHash: str(),
    app: obj({ version: str(), build: str() }, ['version']),
    sessionId: str(),
    tabId: str(),
    document: obj({ documentId: str(), projectId: nullable(str()), name: str(), revision: int() }, ['documentId', 'revision']),
    capabilities: record(),
  }, ['type', 'protocol', 'protocolVersion', 'contractVersion', 'contractHash', 'app', 'document', 'capabilities']),
  op_request: obj({ type: { const: 'op_request' }, requestId: str({ minLength: 1 }), op: str({ minLength: 1 }), input: record(), expectedRevision: int({ minimum: 0 }) }, ['type', 'requestId', 'op']),
  op_result: oneOf(
    obj({ type: { const: 'op_result' }, requestId: str(), op: str(), ok: { const: true }, result: anyValue(), revision: int(), documentId: str() }, ['type', 'requestId', 'op', 'ok', 'result', 'revision', 'documentId']),
    obj({ type: { const: 'op_result' }, requestId: str(), op: str(), ok: { const: false }, error: obj({ code: enumOf(BRIDGE_ERROR_CODES), message: str(), details: anyValue() }, ['code', 'message']), revision: int(), documentId: str() }, ['type', 'requestId', 'op', 'ok', 'error', 'revision', 'documentId']),
  ),
  command_request: obj({
    type: { const: 'command_request' },
    requestId: str({ minLength: 1 }),
    protocolVersion: { const: BRIDGE_PROTOCOL_VERSION, description: 'Set to route `command.type` as a canonical operation even when it shares a legacy command name (load_project, undo, resize_canvas, generators…). Implied by expectedRevision.' },
    expectedRevision: int({ minimum: 0 }),
    command: { type: 'object', properties: { type: str({ minLength: 1 }) }, required: ['type'], additionalProperties: true, description: 'Operation name in `type` plus the operation input fields (canonical ops), or a legacy command' },
  }, ['type', 'requestId', 'command']),
  command_result: {
    type: 'object',
    properties: {
      type: { const: 'command_result' },
      requestId: str(),
      success: bool(),
      applied: anyValue(),
      revision: int(),
      documentId: str(),
      error: str(),
      errorCode: enumOf(BRIDGE_ERROR_CODES),
      errorDetails: anyValue(),
    },
    required: ['type', 'requestId', 'success'],
    additionalProperties: false,
  },
  state_request: obj({ type: { const: 'state_request' }, requestId: str() }, ['type']),
  state_snapshot: {
    type: 'object',
    properties: {
      type: { const: 'state_snapshot' },
      requestId: str({ description: 'Echo of state_request.requestId (absent for unsolicited snapshots)' }),
      protocolVersion: { const: BRIDGE_PROTOCOL_VERSION },
      document: ref('Session'),
      documentId: str(),
      revision: int({ minimum: 0 }),
      activeLayerId: nullable(str()),
      currentFrame: int({ minimum: 0 }),
    },
    required: ['type', 'protocolVersion', 'document', 'documentId', 'revision', 'currentFrame'],
    additionalProperties: true,
    description: 'v3 fields; legacy canvas/animation/layers fields are still included for older servers',
  },
  doc_changed: obj({ type: { const: 'doc_changed' }, documentId: str(), revision: int(), source: enumOf(['ui', 'bridge', 'history', 'load']) }, ['type', 'documentId', 'revision', 'source']),
};
