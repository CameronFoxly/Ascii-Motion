/**
 * Mounts the cloud bridge: exposes the signed-in browser's existing premium
 * cloud APIs to bridge operations. Renders nothing.
 */
import { useEffect, useRef } from 'react';
import {
  useAuth,
  useCloudProject,
  useGallery,
  generatePreview,
  uploadPreviewImage,
  type CloudProject,
} from '@ascii-motion/premium';
import { useCloudProjectActions } from '../../hooks/useCloudProjectActions';
import { ExportDataCollector } from '../../utils/exportDataCollector';
import { useProjectMetadataStore } from '../../stores/projectMetadataStore';
import { classifyCloudError, setCloudBridgeController, type CloudBridgeController, type CloudProjectInfo } from '../../mcp/operations/cloudBridge';
import { BridgeError } from '../../mcp/operations/errors';

const PREMIUM_AVAILABLE = typeof __ASCII_MOTION_PREMIUM__ !== 'undefined' && __ASCII_MOTION_PREMIUM__ === true;


function info(p: CloudProject): CloudProjectInfo {
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

const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

export function CloudBridgeHost() {
  const { user } = useAuth();
  const cloud = useCloudProject();
  const gallery = useGallery();
  const actions = useCloudProjectActions();

  // Premium hooks report failures through React state rather than throwing.
  const latest = useRef({ user, cloud, gallery, actions });
  latest.current = { user, cloud, gallery, actions };

  useEffect(() => {
    const fail = async (fallback: string): Promise<never> => {
      await nextTick();
      const message = latest.current.cloud.error || fallback;
      throw new BridgeError(classifyCloudError(message), message);
    };
    const ok = async (result: boolean, fallback: string) => {
      if (!result) await fail(fallback);
    };
    const load = async (projectId: string) => {
      const project = await latest.current.cloud.loadFromCloud(projectId);
      if (!project) return fail(`Cloud project ${projectId} could not be loaded`);
      return project;
    };

    const controller: CloudBridgeController = {
      premiumAvailable: PREMIUM_AVAILABLE,
      getUser: () => (latest.current.user ? { id: latest.current.user.id } : null),
      async list(deleted) {
        const c = latest.current.cloud;
        const projects = deleted ? await c.listDeletedProjects() : await c.listProjects();
        await nextTick();
        if (projects.length === 0 && latest.current.cloud.error) await fail(latest.current.cloud.error);
        return projects.map(info);
      },
      async save({ name, description, saveAsNew }) {
        const meta = useProjectMetadataStore.getState();
        const project = await latest.current.actions.handleSaveToCloud(
          ExportDataCollector.collect(),
          name ?? meta.projectName,
          description ?? meta.projectDescription,
          saveAsNew === true,
        );
        // handleSaveToCloud logs and swallows the underlying error.
        if (!project) throw new BridgeError('INTERNAL', 'Cloud save failed (validation, project limit, or network); see the browser console');
        if (name !== undefined) meta.setProjectName(project.name);
        return info(project);
      },
      async fetchSession(projectId) {
        const project = await load(projectId);
        return { project: info(project), session: project.sessionData as unknown as Record<string, unknown> };
      },
      async remove(projectId) {
        await ok(await latest.current.cloud.deleteProject(projectId), 'Delete failed');
      },
      async restore(projectId) {
        await ok(await latest.current.cloud.restoreProject(projectId), 'Restore failed');
      },
      async permanentlyDelete(projectId) {
        await ok(await latest.current.cloud.permanentlyDeleteProject(projectId), 'Permanent delete failed');
      },
      async updateMetadata(projectId, { name, description }) {
        if (name !== undefined) await ok(await latest.current.cloud.renameProject(projectId, name), 'Rename failed');
        if (description !== undefined) await ok(await latest.current.cloud.updateDescription(projectId, description), 'Description update failed');
      },
      async upload(session, filename) {
        const file = new File([JSON.stringify(session)], filename, { type: 'application/json' });
        const project = await latest.current.cloud.uploadSessionFile(file);
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
          const preview = await generatePreview([frame], {
            frameIndex: 0,
            width: session.canvas.width,
            height: session.canvas.height,
            backgroundColor: session.canvas.canvasBackgroundColor,
            fontSize: session.typography?.fontSize || 16,
            selectedFontId: session.typography?.selectedFontId,
            postEffectTracks: session.postEffectTracks,
            timelineFrameIndex: 0,
          });
          const upload = await uploadPreviewImage(projectId, preview.blob);
          publishedId = await latest.current.gallery.publishProject({
            projectId,
            title,
            description: description ?? null,
            previewImageUrl: upload.url,
            thumbnailUrl: upload.url,
            tags,
            allowRemixes,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          throw new BridgeError(classifyCloudError(message), message);
        }
        if (!publishedId) throw new BridgeError('LIMIT_REACHED', 'Publish rate limit reached (10 per hour)');
        return { projectId: publishedId };
      },
    };
    setCloudBridgeController(controller);
    return () => setCloudBridgeController(null);
  }, []);

  return null;
}
