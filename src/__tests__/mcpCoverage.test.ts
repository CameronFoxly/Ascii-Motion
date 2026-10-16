/**
 * MCP parity gate: fails when an app feature, operation, catalog entry, test
 * fixture or docs anchor is not classified in src/mcp/contract/coverage.ts.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { BRIDGE_OPERATIONS, exportFormatNames } from '../mcp/contract/operations';
import { validateSchema, type JsonSchema } from '../mcp/contract/schema';
import { EXPORT_FORMAT_COVERAGE, FEATURE_COVERAGE, TOOL_COVERAGE } from '../mcp/contract/coverage';
import { registerAllOperationHandlers } from '../mcp/operations/handlers';
import { TOOL_NAMES } from '../mcp/operations/handlers/document';
import { __resetRuntimeForTests, runOperation } from '../mcp/operations/runtime';
import { getAllEffects } from '../registry/effectRegistry';
import { getAllPostEffects } from '../registry/postEffectRegistry';
import { getAllGenerators } from '../registry/generatorRegistry';
import { registerAllEffects } from '../registry/effects';
import { registerAllPostEffects } from '../registry/postEffects';
import { registerAllGenerators } from '../registry/generators';
import { useCanvasStore } from '../stores/canvasStore';
import { useTimelineStore } from '../stores/timelineStore';
import { useToolStore } from '../stores/toolStore';

const root = resolve(__dirname, '../..');
const generatedContract: {
  $defs: Record<string, JsonSchema>;
  operations: Array<{ name: string; input: JsonSchema; result: JsonSchema }>;
} = JSON.parse(readFileSync(resolve(root, 'src/mcp/contract/bridge-contract.json'), 'utf8'));
const catalogContract = generatedContract.operations.find((op) => op.name === 'get_catalog')!;
const catalogFamilies = ['effects', 'shaders', 'generators', 'palettes', 'export_formats', 'tools', 'fonts'];

async function run(op: string, input: Record<string, unknown> = {}) {
  return runOperation(op, input);
}

async function ok(op: string, input: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const outcome = await run(op, input);
  if (!outcome.ok) throw new Error(`${op} failed: ${outcome.error?.code} ${outcome.error?.message}`);
  return outcome.result as Record<string, unknown>;
}

beforeAll(() => {
  registerAllEffects();
  registerAllPostEffects();
  registerAllGenerators();
  registerAllOperationHandlers();
});

beforeEach(() => {
  useTimelineStore.getState().createNewProject();
  useCanvasStore.setState({ width: 20, height: 10, cells: new Map(), isDirty: false });
  useToolStore.getState().clearHistory();
  __resetRuntimeForTests();
});

describe('coverage manifest', () => {
  const featureIds = new Set(FEATURE_COVERAGE.map((f) => f.id));

  it('maps every contract operation to a feature and references only real operations', () => {
    const contractOps = new Set(BRIDGE_OPERATIONS.map((o) => o.name));
    const covered = new Set(FEATURE_COVERAGE.flatMap((f) => f.operations));
    expect([...contractOps].filter((name) => !covered.has(name)), 'operations without a feature').toEqual([]);
    expect([...covered].filter((name) => !contractOps.has(name)), 'feature operations missing from contract').toEqual([]);
    expect(featureIds.size).toBe(FEATURE_COVERAGE.length);
  });

  it('classifies every canvas tool and export/import format', () => {
    expect(Object.keys(TOOL_COVERAGE).sort()).toEqual([...TOOL_NAMES].sort());
    for (const feature of Object.values(TOOL_COVERAGE)) expect(featureIds.has(feature), feature).toBe(true);
    for (const { feature } of Object.values(EXPORT_FORMAT_COVERAGE)) expect(featureIds.has(feature), feature).toBe(true);
    const mapped = new Set(Object.values(EXPORT_FORMAT_COVERAGE).flatMap((e) => e.formats));
    expect(exportFormatNames.filter((f) => !mapped.has(f)), 'contract formats without an app format').toEqual([]);
  });

  it('points at existing sources, fixtures and docs anchors, with reasons for non-supported entries', () => {
    const docsCache = new Map<string, string>();
    // The premium submodule is private and absent in CI; its paths are verified wherever it is checked out.
    const hasPremium = existsSync(resolve(root, 'packages/premium/src/index.ts'));
    for (const f of FEATURE_COVERAGE) {
      for (const path of [...f.appSources, ...f.tests]) {
        if (!hasPremium && path.startsWith('packages/premium')) continue;
        expect(existsSync(resolve(root, path)), `${f.id}: ${path}`).toBe(true);
      }
      const [docPath, anchor] = f.docs.split('#');
      expect(existsSync(resolve(root, docPath)), `${f.id}: ${docPath}`).toBe(true);
      if (!docsCache.has(docPath)) docsCache.set(docPath, readFileSync(resolve(root, docPath), 'utf8'));
      expect(docsCache.get(docPath)!.includes(`\n## ${anchor}\n`), `${f.id}: anchor #${anchor}`).toBe(true);
      if (f.status !== 'supported') expect(f.reason, `${f.id} needs a reason`).toBeTruthy();
      if (f.status !== 'excluded') expect(f.operations.length, `${f.id} needs operations`).toBeGreaterThan(0);
    }
  });

  it('keeps requires in sync with operation contracts', () => {
    for (const f of FEATURE_COVERAGE) {
      for (const name of f.operations) {
        const contract = BRIDGE_OPERATIONS.find((o) => o.name === name)!;
        for (const requirement of contract.requires) expect(f.requires ?? [], `${f.id}/${name}`).toContain(requirement);
      }
    }
  });
});

describe('runtime catalogs are fully exposed', () => {
  it('covers every generated catalog family', () => {
    expect(catalogFamilies.toSorted()).toEqual([...catalogContract.input.properties!.family.enum!].sort());
  });

  it.each(catalogFamilies)('validates the real %s catalog against the generated result schema', async (family) => {
    const result = await ok('get_catalog', { family });
    expect(result.family).toBe(family);
    expect(validateSchema(result, catalogContract.result, generatedContract.$defs, 'result')).toEqual([]);
  });

  it('requires typed import settings metadata in the tools catalog', async () => {
    const result = await ok('get_catalog', { family: 'tools' });
    expect(result.importSettings).toMatchObject({
      defaults: { characterSet: expect.any(Array), nudgeX: expect.any(Number) },
      enums: { textColorMappingMode: expect.arrayContaining(['bayer4x4']) },
      notes: { characterSet: expect.any(String) },
    });
    for (const importSettings of [undefined, {}, { defaults: {}, enums: { cropMode: 1 }, notes: {} }, { defaults: {}, enums: {}, notes: { characterSet: 1 } }]) {
      expect(validateSchema({ ...result, importSettings }, catalogContract.result, generatedContract.$defs, 'result').length).toBeGreaterThan(0);
    }
  });

  it('lists and adds every registered effect', async () => {
    const catalog = await ok('get_catalog', { family: 'effects' });
    const types = getAllEffects().map((e) => e.type);
    expect((catalog.entries as Array<{ type: string }>).map((e) => e.type).sort()).toEqual([...types].sort());
    const { layerId } = await ok('add_layer', { name: 'fx' }) as { layerId: string };
    for (const effectType of types) {
      const outcome = await run('add_effect', { owner: { layerId }, effectType });
      expect(outcome.ok, `${effectType}: ${outcome.error?.message}`).toBe(true);
    }
  });

  it('lists and adds every registered shader without billing checks', async () => {
    const catalog = await ok('get_catalog', { family: 'shaders' });
    const types = getAllPostEffects().map((e) => e.type);
    expect((catalog.entries as Array<{ type: string }>).map((e) => e.type).sort()).toEqual([...types].sort());
    expect(BRIDGE_OPERATIONS.filter((o) => o.domain === 'shaders' && o.requires.length)).toEqual([]);
    for (const shaderType of types) {
      const outcome = await run('add_shader', { shaderType });
      expect(outcome.ok, `${shaderType}: ${outcome.error?.message}`).toBe(true);
    }
  });

  it('lists and adds every registered generator', async () => {
    const catalog = await ok('get_catalog', { family: 'generators' });
    const types = getAllGenerators().map((g) => g.type);
    expect((catalog.entries as Array<{ type: string }>).map((e) => e.type).sort()).toEqual([...types].sort());
    for (const generatorType of types) {
      const outcome = await run('add_generator_layer', { generatorType, durationFrames: 4 });
      expect(outcome.ok, `${generatorType}: ${outcome.error?.message}`).toBe(true);
      await ok('remove_layer', { layerId: (outcome.result as { layerId: string }).layerId });
    }
  });

  it('advertises every registered operation in capabilities', async () => {
    const capabilities = await ok('get_capabilities');
    const advertised = JSON.stringify(capabilities);
    for (const op of BRIDGE_OPERATIONS) expect(advertised.includes(`"${op.name}"`), op.name).toBe(true);
  });
});

describe('feature smoke fixtures', () => {
  it('typography, tool state, groups and keyframes', async () => {
    await ok('set_typography', { fontSize: 18 });
    await ok('set_tool_state', { character: '#', foregroundColor: '#00ff00' });
    expect(useToolStore.getState().selectedChar).toBe('#');
    const a = await ok('add_layer', { name: 'A' }) as { layerId: string };
    const b = await ok('add_layer', { name: 'B' }) as { layerId: string };
    const group = await ok('create_group', { layerIds: [a.layerId, b.layerId] }) as { groupId: string };
    expect(typeof group.groupId).toBe('string');
    await ok('set_keyframes', {
      layerId: a.layerId, propertyPath: 'transform.position.x',
      keyframes: [{ frame: 0, value: 0 }, { frame: 5, value: 4, easing: 'linear' }],
    });
    await ok('ungroup', { groupId: group.groupId });
  });

  it('text tools and drawing primitives write cells', async () => {
    await ok('place_text', { x: 0, y: 0, text: 'Hi' });
    await ok('draw_ascii_box', { region: { x: 0, y: 2, width: 5, height: 3 } });
    await ok('draw_line', { from: { x: 0, y: 6 }, to: { x: 4, y: 6 } });
    const figlet = await run('place_figlet_text', { x: 0, y: 0, text: 'A' });
    expect(figlet.ok || figlet.error?.code === 'UI_NOT_READY', figlet.error?.message).toBe(true);
    const cells = await ok('read_cells', { scope: 'layer', format: 'cells', includeEffects: false });
    expect((cells.cells as unknown[]).length).toBeGreaterThan(5);
  });

  it('browser/auth-bound operations fail explicitly instead of reporting success', async () => {
    const cloud = await run('list_cloud_projects');
    expect(cloud.ok).toBe(false);
    expect(['AUTH_REQUIRED', 'UI_NOT_READY']).toContain(cloud.error?.code);
    const remix = await run('remix_cloud_project', { projectId: 'p1' });
    expect(remix.ok).toBe(false);
    const media = await run('import_media', { data: 'bm90IGFuIGltYWdl', mimeType: 'text/plain' });
    expect(media.ok).toBe(false);
    expect(media.error?.code).not.toBe('INTERNAL');
  });
});
