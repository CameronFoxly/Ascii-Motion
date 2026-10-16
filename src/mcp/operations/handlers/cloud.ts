/**
 * Cloud project operations. They run through the browser's signed-in premium
 * session (CloudBridgeHost); the bridge never sees credentials.
 */
import { useProjectMetadataStore } from '../../../stores/projectMetadataStore';
import { SessionImporter } from '../../../utils/sessionImporter';
import { clearAllSelections } from '../../../hooks/useSelectionSync';
import { getCloudBridgeController, getCloudBridgeStatus, type CloudBridgeController } from '../cloudBridge';
import { BridgeError, invalid } from '../errors';
import type { OperationHandler } from '../runtime';
import { useToolStore } from '../../../stores/toolStore';

function controllerFor(op: string): CloudBridgeController {
  const blocked = getCloudBridgeStatus().unavailable(op);
  if (blocked) throw new BridgeError(blocked.code, blocked.reason);
  return getCloudBridgeController()!;
}

function sessionArtifact(name: string, session: Record<string, unknown>) {
  const data = JSON.stringify(session, null, 2);
  const filename = `${(name || 'cloud-project').replace(/[\\/:*?"<>|]+/g, '_')}.asciimtn`;
  return { filename, mimeType: 'application/json', encoding: 'utf8' as const, bytes: new TextEncoder().encode(data).length, data };
}

export const cloudHandlers: Record<string, OperationHandler> = {
  list_cloud_projects: async (input) => {
    const deleted = input.deleted === true;
    const projects = await controllerFor('list_cloud_projects').list(deleted);
    return { deleted, projects };
  },

  save_cloud_project: async (input) => {
    const c = controllerFor('save_cloud_project');
    const project = await c.save({
      name: input.name as string | undefined,
      description: input.description as string | undefined,
      saveAsNew: input.saveAsNew === true,
    });
    return { project, cloudProjectId: project.id };
  },

  open_cloud_project: async (input, ctx) => {
    const c = controllerFor('open_cloud_project');
    const projectId = input.projectId as string;
    const { project, session } = await c.fetchSession(projectId);
    try {
      await SessionImporter.importSessionData(session);
    } catch (error) {
      throw new BridgeError('INTERNAL', `Cloud project could not be imported: ${error instanceof Error ? error.message : String(error)}`);
    }
    const meta = useProjectMetadataStore.getState();
    meta.setCurrentProjectId(project.id);
    if (project.name) meta.setProjectName(project.name);
    clearAllSelections();
    useToolStore.getState().clearHistory();
    ctx.replaceDocument();
    return { project, cloudProjectId: project.id };
  },

  delete_cloud_project: async (input) => {
    const projectId = input.projectId as string;
    await controllerFor('delete_cloud_project').remove(projectId);
    if (useProjectMetadataStore.getState().currentProjectId === projectId) useProjectMetadataStore.getState().setCurrentProjectId(null);
    return { projectId, deleted: true };
  },

  restore_cloud_project: async (input) => {
    const projectId = input.projectId as string;
    await controllerFor('restore_cloud_project').restore(projectId);
    return { projectId, restored: true };
  },

  permanently_delete_cloud_project: async (input) => {
    const projectId = input.projectId as string;
    await controllerFor('permanently_delete_cloud_project').permanentlyDelete(projectId);
    return { projectId, permanentlyDeleted: true };
  },

  update_cloud_project_metadata: async (input) => {
    const projectId = input.projectId as string;
    const changes = { name: input.name as string | undefined, description: input.description as string | undefined };
    await controllerFor('update_cloud_project_metadata').updateMetadata(projectId, changes);
    const meta = useProjectMetadataStore.getState();
    if (meta.currentProjectId === projectId) {
      if (changes.name !== undefined) meta.setProjectName(changes.name);
      if (changes.description !== undefined) meta.setProjectDescription(changes.description);
    }
    return { projectId, ...changes };
  },

  download_cloud_project: async (input) => {
    const { project, session } = await controllerFor('download_cloud_project').fetchSession(input.projectId as string);
    return { artifact: sessionArtifact(project.name, session), result: { project } };
  },

  upload_session_to_cloud: async (input) => {
    const session = input.session as Record<string, unknown>;
    if (!session || typeof session !== 'object') throw invalid('session must be a native session object');
    const filename = (input.filename as string | undefined) ?? `${(session.name as string | undefined) ?? 'Uploaded Project'}.asciimtn`;
    const project = await controllerFor('upload_session_to_cloud').upload(session, filename);
    return { project, cloudProjectId: project.id };
  },

  publish_cloud_project: async (input) => {
    const result = await controllerFor('publish_cloud_project').publish({
      projectId: input.projectId as string,
      title: input.title as string,
      description: input.description as string | undefined,
      tags: (input.tags as string[] | undefined) ?? [],
      allowRemixes: input.allowRemixes !== false,
    });
    return { ...result, published: true };
  },

  remix_cloud_project: () => {
    controllerFor('remix_cloud_project');
    throw new BridgeError('UNSUPPORTED', 'remix_cloud_project is not available');
  },
};
