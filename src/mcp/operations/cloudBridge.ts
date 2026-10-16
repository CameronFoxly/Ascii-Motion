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
  /** Returns the sanitized values actually stored. */
  updateMetadata(projectId: string, changes: { name?: string; description?: string }): Promise<{ name?: string; description?: string }>;
  /** Fetch a project's stored session without importing it into the editor. */
  fetchSession(projectId: string): Promise<{ project: CloudProjectInfo; session: Record<string, unknown> }>;
  upload(session: Record<string, unknown>, filename: string): Promise<CloudProjectInfo>;
  publish(params: { projectId: string; title: string; description?: string; tags: string[]; allowRemixes: boolean }): Promise<{ projectId: string }>;
  /** Create a remix of a published project (gallery workflow) and fetch its session. */
  remix(projectId: string): Promise<{ project: CloudProjectInfo; session: Record<string, unknown> }>;
}

let controller: CloudBridgeController | null = null;

export function setCloudBridgeController(next: CloudBridgeController | null): void {
  controller = next;
}

export function getCloudBridgeController(): CloudBridgeController | null {
  return controller;
}

/** Operations with no app API to call. */
export const CLOUD_UNSUPPORTED: Record<string, string> = {};

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

/** Map premium hook / Supabase error text onto bridge error codes. */
export function classifyCloudError(message: string): BridgeErrorCode {
  if (/signed in|sign in|authenticat|log in|logged in|jwt|session (has )?expired|refresh token/i.test(message)) return 'AUTH_REQUIRED';
  if (/rate limit|too many/i.test(message)) return 'LIMIT_REACHED';
  if (/too large|payload|request entity/i.test(message)) return 'LIMIT_REACHED';
  if (/limit|tier|upgrade|subscription|pro\b|row-level security|permission denied|not allowed|forbidden|banned/i.test(message)) return 'ENTITLEMENT_REQUIRED';
  if (/not found|no rows|\(or no\) rows|PGRST116/i.test(message)) return 'NOT_FOUND';
  if (/required|invalid|cannot (be|start)|must be|characters/i.test(message)) return 'INVALID_INPUT';
  if (/timed? ?out|timeout/i.test(message)) return 'BUSY';
  return 'INTERNAL';
}
