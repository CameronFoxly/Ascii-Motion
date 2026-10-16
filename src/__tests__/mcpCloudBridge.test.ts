/**
 * Cloud bridge controller with fixture hooks (no premium package or network).
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { classifyCloudError, setCloudBridgeController } from '../mcp/operations/cloudBridge';
import { createCloudBridgeController, type CloudControllerDeps, type CloudHookValues } from '../mcp/operations/cloudController';
import { __resetRuntimeForTests, runOperation } from '../mcp/operations/runtime';
import { registerAllOperationHandlers } from '../mcp/operations/handlers';
import { registerAllEffects } from '../registry/effects';
import { registerAllPostEffects } from '../registry/postEffects';
import { registerAllGenerators } from '../registry/generators';
import { useTimelineStore } from '../stores/timelineStore';
import { useProjectMetadataStore } from '../stores/projectMetadataStore';
import { BridgeError } from '../mcp/operations/errors';

const session = { canvas: { width: 4, height: 2 }, animation: { frames: [{ id: 'f', name: 'F', duration: 100, data: {} }] } };
const project = (id: string, name = 'P') => ({ id, name, description: null });

function fixture(overrides: { hooks?: Partial<CloudHookValues>; cloud?: Partial<CloudHookValues['cloud']>; gallery?: Partial<CloudHookValues['gallery']>; meta?: Partial<ReturnType<CloudControllerDeps['metadata']['get']>> } = {}) {
  const state = { cloudError: null as string | null, galleryError: null as string | null };
  const meta = { projectName: 'My Art', projectDescription: '', currentProjectId: null as string | null, ...overrides.meta };
  const cloud: CloudHookValues['cloud'] = {
    get error() { return state.cloudError; },
    listProjects: vi.fn(async () => [project('a')]),
    listDeletedProjects: vi.fn(async () => []),
    loadFromCloud: vi.fn(async (id: string) => ({ ...project(id, `Loaded ${id}`), sessionData: session })),
    deleteProject: vi.fn(async () => true),
    restoreProject: vi.fn(async () => true),
    permanentlyDeleteProject: vi.fn(async () => true),
    renameProject: vi.fn(async () => true),
    updateDescription: vi.fn(async () => true),
    uploadSessionFile: vi.fn(async () => project('up')),
    getUserProfile: vi.fn(async () => ({ subscriptionTier: { maxProjects: 3 } })),
    ...overrides.cloud,
  };
  const gallery: CloudHookValues['gallery'] = {
    get error() { return state.galleryError; },
    getProjectById: vi.fn(async () => ({ allow_remixes: true })),
    publishProject: vi.fn(async () => 'pub-1'),
    ...overrides.gallery,
  };
  const hooks: CloudHookValues = {
    user: { id: 'u1' },
    cloud,
    gallery,
    saveToCloud: vi.fn(async (name: string) => project('saved', name)),
    remix: vi.fn(async () => ({ success: true as const, projectId: 'remix-1' })),
    ...overrides.hooks,
  };
  const deps: CloudControllerDeps = {
    premiumAvailable: true,
    hooks: () => hooks,
    afterCommit: async () => {},
    validation: {
      sanitizeString: (v) => v.trim().replace(/[<>]/g, ''),
      validateProjectName: (n) => (n ? { valid: true } : { valid: false, error: 'Project name is required' }),
      validateProjectDescription: (d) => (d.length <= 20 ? { valid: true } : { valid: false, error: 'Description must be 20 characters or less' }),
    },
    metadata: {
      get: () => meta,
      setProjectName: (n) => { meta.projectName = n; },
      setProjectDescription: (d) => { meta.projectDescription = d; },
    },
    preview: {
      generatePreview: vi.fn(async () => ({ blob: new Blob(['x']) })),
      uploadPreviewImage: vi.fn(async () => ({ url: 'https://example.test/p.png' })),
    },
  };
  return { controller: createCloudBridgeController(deps), hooks, cloud, gallery, state, meta, deps };
}

async function codeOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(BridgeError);
    return { code: (error as BridgeError).code, details: (error as BridgeError).details, message: (error as Error).message };
  }
  throw new Error('expected rejection');
}

describe('classifyCloudError', () => {
  it.each([
    ['You must be logged in to save projects', 'AUTH_REQUIRED'],
    ['JWT expired', 'AUTH_REQUIRED'],
    ['new row violates row-level security policy for table "projects"', 'ENTITLEMENT_REQUIRED'],
    ['Upgrade to Pro to create more projects', 'ENTITLEMENT_REQUIRED'],
    ['Rate limit exceeded', 'LIMIT_REACHED'],
    ['Payload too large', 'LIMIT_REACHED'],
    ['JSON object requested, multiple (or no) rows returned', 'NOT_FOUND'],
    ['Project name cannot be empty', 'INVALID_INPUT'],
    ['Request timed out', 'BUSY'],
    ['Something odd happened', 'INTERNAL'],
  ])('%s → %s', (message, code) => {
    expect(classifyCloudError(message)).toBe(code);
  });
});

describe('cloud save', () => {
  it('saves with sanitized name and updates metadata', async () => {
    const f = fixture({ meta: { currentProjectId: 'existing' } });
    const result = await f.controller.save({ name: '  <Cool> art ', description: 'hi' });
    expect(result).toMatchObject({ id: 'saved', name: 'Cool art' });
    expect(f.hooks.saveToCloud).toHaveBeenCalledWith('Cool art', 'hi', false);
    expect(f.meta.projectName).toBe('Cool art');
    expect(f.cloud.getUserProfile).not.toHaveBeenCalled();
  });

  it('propagates the real save failure with a classified code', async () => {
    for (const [message, code] of [
      ['You must be logged in to save projects', 'AUTH_REQUIRED'],
      ['new row violates row-level security policy', 'ENTITLEMENT_REQUIRED'],
      ['Request timed out', 'BUSY'],
      ['Cloud save failed', 'INTERNAL'],
    ] as const) {
      const f = fixture({ meta: { currentProjectId: 'existing' }, hooks: { saveToCloud: async () => { throw new Error(message); } } });
      const err = await codeOf(f.controller.save({}));
      expect(err).toMatchObject({ code, message });
      expect(f.meta.projectName).toBe('My Art');
    }
  });

  it('rejects invalid names and descriptions before calling the cloud', async () => {
    const f = fixture();
    expect(await codeOf(f.controller.save({ name: '  ' }))).toMatchObject({ code: 'INVALID_INPUT', details: { field: 'name' } });
    expect(await codeOf(f.controller.save({ description: 'x'.repeat(30) }))).toMatchObject({ code: 'INVALID_INPUT', details: { field: 'description' } });
    expect(f.hooks.saveToCloud).not.toHaveBeenCalled();
  });

  it('enforces the plan project limit for new projects only', async () => {
    const full = { listProjects: vi.fn(async () => [project('a'), project('b'), project('c')]) };
    const blockedNew = fixture({ cloud: full });
    expect(await codeOf(blockedNew.controller.save({}))).toMatchObject({
      code: 'ENTITLEMENT_REQUIRED',
      details: { reason: 'project_limit', maxProjects: 3, projectCount: 3 },
    });
    const blockedCopy = fixture({ cloud: full, meta: { currentProjectId: 'a' } });
    expect((await codeOf(blockedCopy.controller.save({ saveAsNew: true }))).code).toBe('ENTITLEMENT_REQUIRED');
    expect(blockedNew.hooks.saveToCloud).not.toHaveBeenCalled();

    const update = fixture({ cloud: full, meta: { currentProjectId: 'a' } });
    await expect(update.controller.save({})).resolves.toMatchObject({ id: 'saved' });

    const unlimited = fixture({ cloud: { ...full, getUserProfile: async () => ({ subscriptionTier: { maxProjects: -1 } }) } });
    await expect(unlimited.controller.save({})).resolves.toMatchObject({ id: 'saved' });
  });
});

describe('other cloud operations', () => {
  it('upload applies the project limit and reports hook failures', async () => {
    const limited = fixture({ cloud: { listProjects: async () => [project('a'), project('b'), project('c')] } });
    expect((await codeOf(limited.controller.upload({}, 'x.asciimtn'))).code).toBe('ENTITLEMENT_REQUIRED');
    expect(limited.cloud.uploadSessionFile).not.toHaveBeenCalled();

    const failing = fixture({ cloud: { uploadSessionFile: async () => null } });
    failing.state.cloudError = 'Payload too large';
    expect(await codeOf(failing.controller.upload({}, 'x.asciimtn'))).toMatchObject({ code: 'LIMIT_REACHED', message: 'Payload too large' });
  });

  it('list surfaces the hook error recorded after commit', async () => {
    const f = fixture({ cloud: { listProjects: async () => [] } });
    await expect(f.controller.list(false)).resolves.toEqual([]);
    f.state.cloudError = 'JWT expired';
    expect((await codeOf(f.controller.list(false))).code).toBe('AUTH_REQUIRED');
  });

  it('updateMetadata returns the sanitized stored values', async () => {
    const f = fixture();
    await expect(f.controller.updateMetadata('a', { name: ' <New> ', description: '' })).resolves.toEqual({ name: 'New', description: '' });
    expect(f.cloud.renameProject).toHaveBeenCalledWith('a', 'New');
  });

  it('publish maps a missing published id to a rate limit', async () => {
    const f = fixture({ gallery: { publishProject: async () => '' } });
    expect(await codeOf(f.controller.publish({ projectId: 'a', title: 'T', tags: [], allowRemixes: true }))).toMatchObject({
      code: 'LIMIT_REACHED',
      details: { reason: 'rate_limit' },
    });
  });
});

describe('cloud remix', () => {
  it('runs the gallery remix workflow and loads the new copy', async () => {
    const f = fixture();
    const result = await f.controller.remix('orig');
    expect(f.hooks.remix).toHaveBeenCalledWith('orig', true);
    expect(f.cloud.loadFromCloud).toHaveBeenCalledWith('remix-1');
    expect(result.project.id).toBe('remix-1');
    expect(result.session).toEqual(session);
  });

  it('reports not found, remix-disabled, project limit and restricted accounts', async () => {
    const missing = fixture({ gallery: { getProjectById: async () => null } });
    expect((await codeOf(missing.controller.remix('x'))).code).toBe('NOT_FOUND');

    const authFail = fixture({ gallery: { getProjectById: async () => null } });
    authFail.state.galleryError = 'JWT expired';
    expect((await codeOf(authFail.controller.remix('x'))).code).toBe('AUTH_REQUIRED');

    const closed = fixture({ gallery: { getProjectById: async () => ({ allow_remixes: false }) } });
    expect(await codeOf(closed.controller.remix('x'))).toMatchObject({ code: 'INVALID_INPUT', details: { reason: 'remix_not_allowed' } });
    expect(closed.hooks.remix).not.toHaveBeenCalled();

    const limit = fixture({ hooks: { remix: async () => ({ success: false, error: 'PROJECT_LIMIT', message: 'Free users can only have 3 projects.' }) } });
    expect(await codeOf(limit.controller.remix('x'))).toMatchObject({ code: 'ENTITLEMENT_REQUIRED', details: { reason: 'project_limit' } });

    const banned = fixture({ hooks: { remix: async () => ({ success: false, error: 'OTHER', message: 'You have been banned from remixing projects. Reason: spam' }) } });
    expect(await codeOf(banned.controller.remix('x'))).toMatchObject({ code: 'ENTITLEMENT_REQUIRED', details: { reason: 'account_restricted' } });

    const loggedOut = fixture({ hooks: { remix: async () => ({ success: false, error: 'OTHER', message: 'You must be logged in to remix a project' }) } });
    expect((await codeOf(loggedOut.controller.remix('x'))).code).toBe('AUTH_REQUIRED');
  });
});

describe('cloud operations through the runtime', () => {
  beforeAll(() => {
    registerAllEffects();
    registerAllPostEffects();
    registerAllGenerators();
    registerAllOperationHandlers();
  });
  beforeEach(() => {
    useTimelineStore.getState().createNewProject();
    useProjectMetadataStore.getState().resetProject();
    __resetRuntimeForTests();
  });

  it('remix_cloud_project opens the remixed copy in the editor', async () => {
    const f = fixture();
    setCloudBridgeController(f.controller);
    try {
      const result = await runOperation('remix_cloud_project', { projectId: 'orig' }) as { ok: boolean; result?: Record<string, unknown> };
      expect(result.ok).toBe(true);
      expect(result.result).toMatchObject({ cloudProjectId: 'remix-1', remixedFrom: 'orig' });
      expect(useProjectMetadataStore.getState()).toMatchObject({ currentProjectId: 'remix-1', projectName: 'Loaded remix-1' });
    } finally {
      setCloudBridgeController(null);
    }
  });

  it('save_cloud_project returns the classified failure instead of success', async () => {
    const f = fixture({ meta: { currentProjectId: 'a' }, hooks: { saveToCloud: async () => { throw new Error('new row violates row-level security policy'); } } });
    setCloudBridgeController(f.controller);
    try {
      const result = await runOperation('save_cloud_project', {}) as { ok: boolean; error?: { code: string } };
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('ENTITLEMENT_REQUIRED');
    } finally {
      setCloudBridgeController(null);
    }
  });
});
