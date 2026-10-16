/**
 * Mounts the cloud bridge: exposes the signed-in browser's existing premium
 * cloud APIs to bridge operations. Renders nothing.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useAuth,
  useCloudProject,
  useGallery,
  generatePreview,
  uploadPreviewImage,
  sanitizeString,
  validateProjectName,
  validateProjectDescription,
} from '@ascii-motion/premium';
import { useRemix } from '@ascii-motion/premium/remix';
import { useCloudProjectActions } from '../../hooks/useCloudProjectActions';
import { ExportDataCollector } from '../../utils/exportDataCollector';
import { useProjectMetadataStore } from '../../stores/projectMetadataStore';
import { setCloudBridgeController } from '../../mcp/operations/cloudBridge';
import { createCloudBridgeController, type CloudHookValues, type RemixOutcome } from '../../mcp/operations/cloudController';

const PREMIUM_AVAILABLE = typeof __ASCII_MOTION_PREMIUM__ !== 'undefined' && __ASCII_MOTION_PREMIUM__ === true;

interface RemixRequest {
  projectId: string;
  allowRemixes: boolean;
  resolve: (outcome: RemixOutcome) => void;
  reject: (error: unknown) => void;
}

export function CloudBridgeHost() {
  const { user } = useAuth();
  const cloud = useCloudProject();
  const gallery = useGallery();
  const actions = useCloudProjectActions();

  // useRemix binds its target at render time, so a remix request re-renders
  // with the target and runs the gallery's own remixProject in an effect.
  const [remixRequest, setRemixRequest] = useState<RemixRequest | null>(null);
  const remix = useRemix({ projectId: remixRequest?.projectId ?? '', allowRemixes: remixRequest?.allowRemixes ?? false });
  const startedRemix = useRef<RemixRequest | null>(null);
  useEffect(() => {
    if (!remixRequest || startedRemix.current === remixRequest) return;
    startedRemix.current = remixRequest;
    remix.remixProject()
      .then(remixRequest.resolve, remixRequest.reject)
      .finally(() => setRemixRequest(null));
  }, [remixRequest, remix]);
  const runRemix = useCallback(
    (projectId: string, allowRemixes: boolean) =>
      new Promise<RemixOutcome>((resolve, reject) => setRemixRequest({ projectId, allowRemixes, resolve, reject })),
    [],
  );

  // Premium hooks report failures through React state rather than throwing;
  // the controller reads the latest committed values through this ref.
  const latest = useRef<CloudHookValues | null>(null);
  const commitWaiters = useRef<Array<() => void>>([]);
  useEffect(() => {
    latest.current = {
      user,
      cloud,
      gallery,
      saveToCloud: (name, description, forceNew) =>
        actions.saveToCloudOrThrow(ExportDataCollector.collect(), name, description, forceNew),
      remix: runRemix,
    };
    commitWaiters.current.splice(0).forEach((resolve) => resolve());
  });

  useEffect(() => {
    const controller = createCloudBridgeController({
      premiumAvailable: PREMIUM_AVAILABLE,
      hooks: () => latest.current!,
      afterCommit: () => new Promise<void>((resolve) => {
        commitWaiters.current.push(resolve);
        setTimeout(resolve, 250);
      }),
      validation: { sanitizeString, validateProjectName, validateProjectDescription },
      metadata: {
        get: () => {
          const m = useProjectMetadataStore.getState();
          return { projectName: m.projectName, projectDescription: m.projectDescription, currentProjectId: m.currentProjectId };
        },
        setProjectName: (name) => useProjectMetadataStore.getState().setProjectName(name),
        setProjectDescription: (description) => useProjectMetadataStore.getState().setProjectDescription(description),
      },
      preview: {
        generatePreview: (frames, options) =>
          generatePreview(frames as Parameters<typeof generatePreview>[0], options as unknown as Parameters<typeof generatePreview>[1]),
        uploadPreviewImage,
      },
    });
    setCloudBridgeController(controller);
    return () => setCloudBridgeController(null);
  }, []);

  return null;
}
