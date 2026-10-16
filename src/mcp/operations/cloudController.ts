/**
 * Cloud bridge controller. It drives the same premium hook APIs the editor
 * dialogs use (passed in by CloudBridgeHost) and applies the same client-side
 * gates as the UI, so the bridge never bypasses validation or plan limits.
 *
 * Kept free of `@ascii-motion/premium` imports so it can be tested with
 * fixtures in builds without the private premium package.
 */
import { BridgeError } from './errors';
import { classifyCloudError, type CloudBridgeController, type CloudProjectInfo } from './cloudBridge';

export interface CloudProjectLike {
  id: string;
  name: string;
  description: string | null;
  createdAt?: string;
  updatedAt?: string;
  lastOpenedAt?: string;
  isPublished?: boolean;
}

export interface CloudSessionLike {
  canvas: { width: number; height: number; canvasBackgroundColor?: string };
  animation?: { frames?: unknown[] };
  typography?: { fontSize?: number; selectedFontId?: string };
  postEffectTracks?: unknown;
}

export type RemixOutcome =
  | { success: true; projectId: string }
  | { success: false; error: 'PROJECT_LIMIT' | 'OTHER'; message: string };

/** The live premium hook values CloudBridgeHost reads on each call. */
export interface CloudHookValues {
  user: { id: string } | null;
  cloud: {
    error: string | null;
    listProjects(): Promise<CloudProjectLike[]>;
    listDeletedProjects(): Promise<CloudProjectLike[]>;
    loadFromCloud(projectId: string): Promise<(CloudProjectLike & { sessionData: CloudSessionLike }) | null>;
    deleteProject(projectId: string): Promise<boolean>;
    restoreProject(projectId: string): Promise<boolean>;
    permanentlyDeleteProject(projectId: string): Promise<boolean>;
    renameProject(projectId: string, name: string): Promise<boolean>;
    updateDescription(projectId: string, description: string): Promise<boolean>;
    uploadSessionFile(file: File): Promise<CloudProjectLike | null>;
    getUserProfile(): Promise<{ subscriptionTier: { maxProjects: number } | null } | null>;
  };
  gallery: {
    error?: string | null;
    getProjectById(projectId: string): Promise<{ allow_remixes: boolean } | null>;
    publishProject(params: {
      projectId: string;
      title: string;
      description: string | null;
      previewImageUrl: string;
      thumbnailUrl: string;
      tags: string[];
      allowRemixes: boolean;
    }): Promise<string>;
  };
  /** useCloudProjectActions().saveToCloudOrThrow — throws with the real failure message. */
  saveToCloud(name: string, description: string | undefined, forceNew: boolean): Promise<CloudProjectLike>;
  /** Runs premium's useRemix workflow (ban check, plan limit, attributed copy). */
  remix(projectId: string, allowRemixes: boolean): Promise<RemixOutcome>;
}

export interface CloudControllerDeps {
  premiumAvailable: boolean;
  hooks(): CloudHookValues;
  /** Resolves after React commits pending hook state (premium hooks report errors via state). */
  afterCommit(): Promise<void>;
  validation: {
    sanitizeString(value: string): string;
    validateProjectName(name: string): { valid: boolean; error?: string };
    validateProjectDescription(description: string): { valid: boolean; error?: string };
  };
  metadata: {
    get(): { projectName: string; projectDescription: string; currentProjectId: string | null };
    setProjectName(name: string): void;
    setProjectDescription(description: string): void;
  };
  preview: {
    generatePreview(frames: unknown[], options: Record<string, unknown>): Promise<{ blob: Blob }>;
    uploadPreviewImage(projectId: string, blob: Blob): Promise<{ url: string }>;
  };
}

function info(p: CloudProjectLike): CloudProjectInfo {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    lastOpenedAt: p.lastOpenedAt,
    isPublished: p.isPublished,
  };
}

export function cloudError(message: string, details?: Record<string, unknown>): BridgeError {
  return new BridgeError(classifyCloudError(message), message, details);
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function createCloudBridgeController(deps: CloudControllerDeps): CloudBridgeController {
  const h = deps.hooks;

  /** Throw the premium hook's recorded failure (or the fallback) as a classified bridge error. */
  const fail = async (fallback: string): Promise<never> => {
    await deps.afterCommit();
    throw cloudError(h().cloud.error || fallback);
  };
  const ok = async (result: boolean, fallback: string) => {
    if (!result) await fail(fallback);
  };
  const load = async (projectId: string) => {
    const project = await h().cloud.loadFromCloud(projectId);
    if (!project) return fail(`Cloud project ${projectId} could not be loaded`);
    return project;
  };

  /** Same rule as SaveToCloudDialog/ProjectsDialog before creating a project. */
  const assertCanCreateProject = async () => {
    const [profile, projects] = await Promise.all([h().cloud.getUserProfile(), h().cloud.listProjects()]);
    const maxProjects = profile?.subscriptionTier?.maxProjects;
    if (maxProjects === undefined || maxProjects === -1 || projects.length < maxProjects) return;
    throw new BridgeError(
      'ENTITLEMENT_REQUIRED',
      `Project limit reached (${projects.length}/${maxProjects}). Delete a cloud project or upgrade your plan in the app.`,
      { reason: 'project_limit', maxProjects, projectCount: projects.length },
    );
  };

  /** Same sanitize/validate steps as SaveToCloudDialog.handleSave. */
  const validName = (name: string) => {
    const clean = deps.validation.sanitizeString(name);
    const check = deps.validation.validateProjectName(clean);
    if (!check.valid) throw new BridgeError('INVALID_INPUT', check.error || 'Invalid project name', { field: 'name' });
    return clean;
  };
  const validDescription = (description: string) => {
    const clean = deps.validation.sanitizeString(description);
    const check = clean ? deps.validation.validateProjectDescription(clean) : { valid: true };
    if (!check.valid) throw new BridgeError('INVALID_INPUT', check.error || 'Invalid description', { field: 'description' });
    return clean;
  };

  return {
    premiumAvailable: deps.premiumAvailable,
    getUser: () => (h().user ? { id: h().user!.id } : null),

    async list(deleted) {
      const c = h().cloud;
      const projects = deleted ? await c.listDeletedProjects() : await c.listProjects();
      if (projects.length === 0) {
        await deps.afterCommit();
        if (h().cloud.error) throw cloudError(h().cloud.error!);
      }
      return projects.map(info);
    },

    async save({ name, description, saveAsNew }) {
      const meta = deps.metadata.get();
      const cleanName = validName(name ?? meta.projectName);
      const cleanDescription = validDescription(description ?? meta.projectDescription ?? '');
      const forceNew = saveAsNew === true;
      if (forceNew || !meta.currentProjectId) await assertCanCreateProject();
      let project: CloudProjectLike;
      try {
        project = await h().saveToCloud(cleanName, cleanDescription || undefined, forceNew);
      } catch (error) {
        throw cloudError(messageOf(error));
      }
      deps.metadata.setProjectName(cleanName);
      deps.metadata.setProjectDescription(cleanDescription);
      return info(project);
    },

    async fetchSession(projectId) {
      const project = await load(projectId);
      return { project: info(project), session: project.sessionData as unknown as Record<string, unknown> };
    },
    async remove(projectId) {
      await ok(await h().cloud.deleteProject(projectId), 'Delete failed');
    },
    async restore(projectId) {
      await ok(await h().cloud.restoreProject(projectId), 'Restore failed');
    },
    async permanentlyDelete(projectId) {
      await ok(await h().cloud.permanentlyDeleteProject(projectId), 'Permanent delete failed');
    },
    async updateMetadata(projectId, { name, description }) {
      const cleanName = name === undefined ? undefined : validName(name);
      const cleanDescription = description === undefined ? undefined : validDescription(description);
      if (cleanName !== undefined) await ok(await h().cloud.renameProject(projectId, cleanName), 'Rename failed');
      if (cleanDescription !== undefined) await ok(await h().cloud.updateDescription(projectId, cleanDescription), 'Description update failed');
      return { name: cleanName, description: cleanDescription };
    },

    async upload(session, filename) {
      await assertCanCreateProject();
      const file = new File([JSON.stringify(session)], filename, { type: 'application/json' });
      const project = await h().cloud.uploadSessionFile(file);
      if (!project) return fail('Upload failed');
      return info(project);
    },

    async publish({ projectId, title, description, tags, allowRemixes }) {
      // Same steps as PublishToGalleryDialog: preview from the saved first frame, upload, publish.
      const project = await load(projectId);
      const session = project.sessionData;
      const frame = session.animation?.frames?.[0];
      if (!frame) throw new BridgeError('INVALID_INPUT', 'Cloud project has no frames to preview; save it from the editor first');
      let publishedId: string;
      try {
        const preview = await deps.preview.generatePreview([frame], {
          frameIndex: 0,
          width: session.canvas.width,
          height: session.canvas.height,
          backgroundColor: session.canvas.canvasBackgroundColor,
          fontSize: session.typography?.fontSize || 16,
          selectedFontId: session.typography?.selectedFontId,
          postEffectTracks: session.postEffectTracks,
          timelineFrameIndex: 0,
        });
        const upload = await deps.preview.uploadPreviewImage(projectId, preview.blob);
        publishedId = await h().gallery.publishProject({
          projectId,
          title,
          description: description ?? null,
          previewImageUrl: upload.url,
          thumbnailUrl: upload.url,
          tags,
          allowRemixes,
        });
      } catch (error) {
        throw cloudError(messageOf(error));
      }
      if (!publishedId) throw new BridgeError('LIMIT_REACHED', 'Publish rate limit reached (10 per hour)', { reason: 'rate_limit' });
      return { projectId: publishedId };
    },

    async remix(projectId) {
      // The gallery's RemixButton is only offered for visible published projects that allow remixes.
      const published = await h().gallery.getProjectById(projectId);
      if (!published) {
        await deps.afterCommit();
        const reason = h().gallery.error;
        if (reason && classifyCloudError(reason) !== 'NOT_FOUND') throw cloudError(reason);
        throw new BridgeError('NOT_FOUND', `Published project not found: ${projectId}`);
      }
      if (!published.allow_remixes) {
        throw new BridgeError('INVALID_INPUT', 'This project does not allow remixes', { reason: 'remix_not_allowed', projectId });
      }
      const outcome = await h().remix(projectId, true);
      if (!outcome.success) {
        if (outcome.error === 'PROJECT_LIMIT') {
          throw new BridgeError('ENTITLEMENT_REQUIRED', outcome.message, { reason: 'project_limit' });
        }
        if (/banned/i.test(outcome.message)) {
          throw new BridgeError('ENTITLEMENT_REQUIRED', outcome.message, { reason: 'account_restricted' });
        }
        throw cloudError(outcome.message);
      }
      const project = await load(outcome.projectId);
      return { project: info(project), session: project.sessionData as unknown as Record<string, unknown> };
    },
  };
}
