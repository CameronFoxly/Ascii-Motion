/**
 * Registry for the mounted cloud controller. Cloud operations use the
 * browser's existing signed-in session through the premium hooks; the bridge
 * never handles credentials itself.
 */
import type { BridgeErrorCode } from '../contract/operations';

export interface CloudProjectInfo {
  id: string;
  name: string;
  description: string | null;
  createdAt?: string;
  updatedAt?: string;
  lastOpenedAt?: string;
  isPublished?: boolean;
}

export interface CloudBridgeController {
  /** True when the premium package is linked (not the open-source stub). */
  premiumAvailable: boolean;
  getUser(): { id: string } | null;
  list(deleted: boolean): Promise<CloudProjectInfo[]>;
  save(options: { name?: string; description?: string; saveAsNew?: boolean }): Promise<CloudProjectInfo>;
  remove(projectId: string): Promise<void>;
  restore(projectId: string): Promise<void>;
  permanentlyDelete(projectId: string): Promise<void>;
  updateMetadata(projectId: string, changes: { name?: string; description?: string }): Promise<void>;
  /** Fetch a project's stored session without importing it into the editor. */
  fetchSession(projectId: string): Promise<{ project: CloudProjectInfo; session: Record<string, unknown> }>;
  upload(session: Record<string, unknown>, filename: string): Promise<CloudProjectInfo>;
  publish(params: { projectId: string; title: string; description?: string; tags: string[]; allowRemixes: boolean }): Promise<{ projectId: string }>;
}

let controller: CloudBridgeController | null = null;

export function setCloudBridgeController(next: CloudBridgeController | null): void {
  controller = next;
}

export function getCloudBridgeController(): CloudBridgeController | null {
  return controller;
}

/** Operations with no app API to call (see report: premium does not export it). */
export const CLOUD_UNSUPPORTED: Record<string, string> = {
  remix_cloud_project: 'The premium package does not export a remix API (useRemix is internal to the gallery UI)',
};

export function getCloudBridgeStatus() {
  const c = controller;
  const signedIn = !!c?.getUser();
  return {
    features: { mounted: !!c, premium: !!c?.premiumAvailable, signedIn },
    unavailable(op: string): { code: BridgeErrorCode; reason: string } | null {
      if (CLOUD_UNSUPPORTED[op]) return { code: 'UNSUPPORTED', reason: CLOUD_UNSUPPORTED[op] };
      if (!c) return { code: 'UI_NOT_READY', reason: 'Cloud controller is not mounted' };
      if (!c.premiumAvailable) return { code: 'UNSUPPORTED', reason: 'This build does not include cloud features' };
      if (!signedIn) return { code: 'AUTH_REQUIRED', reason: 'Sign in to Ascii Motion in the browser' };
      return null;
    },
  };
}

/** Map premium hook error text onto bridge error codes. */
export function classifyCloudError(message: string): BridgeErrorCode {
  if (/signed in|sign in|authenticat|log in|logged in/i.test(message)) return 'AUTH_REQUIRED';
  if (/rate limit|too many/i.test(message)) return 'LIMIT_REACHED';
  if (/limit|tier|upgrade|subscription|pro\b/i.test(message)) return 'ENTITLEMENT_REQUIRED';
  if (/not found|no rows/i.test(message)) return 'NOT_FOUND';
  return 'INTERNAL';
}
