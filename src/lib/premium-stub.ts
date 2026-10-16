/**
 * ASCII Motion - Premium Package Stub
 *
 * This module provides no-op/fallback implementations of all exports from
 * `@ascii-motion/premium`. It is used automatically when the premium
 * submodule is not available (e.g., for open-source contributors).
 *
 * The app runs fully without premium — auth, cloud, and community features
 * are simply disabled.
 */

import type { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Types (match packages/premium/src/cloud/types.ts)
// ---------------------------------------------------------------------------

export interface CloudProject {
  id: string;
  name: string;
  description: string | null;
  sessionData: SessionData;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
  isPublished?: boolean;
}

export interface SessionData {
  version: string;
  name?: string;
  description?: string;
  metadata?: {
    exportedAt: string;
    exportVersion: string;
    userAgent?: string;
  };
  canvas: {
    width: number;
    height: number;
    canvasBackgroundColor: string;
    showGrid: boolean;
  };
  animation?: {
    frames: SessionFrame[];
    currentFrameIndex: number;
    frameRate: number;
    looping: boolean;
  };
  timeline?: {
    frameRate: number;
    durationFrames: number;
    looping: boolean;
  };
  layers?: unknown[];
  layerGroups?: unknown[];
  globalEffects?: unknown[];
  postEffectTracks?: unknown[];
  tools?: SessionToolState;
  ui?: SessionUIState;
  typography?: TypographySettings;
  palettes?: PaletteState;
  characterPalettes?: CharacterPaletteState;
}

export interface SessionFrame {
  id: string;
  name: string;
  duration: number;
  data: Record<string, Cell>;
}

export interface Cell {
  char: string;
  color: string;
  bgColor: string;
}

export interface SessionToolState {
  activeTool: string;
  selectedCharacter: string;
  selectedColor: string;
  selectedBgColor: string;
  paintBucketContiguous?: boolean;
  rectangleFilled?: boolean;
}

export interface SessionUIState {
  theme?: string;
  zoom?: number;
  panOffset?: { x: number; y: number };
  fontMetrics?: {
    characterWidth: number;
    characterHeight: number;
    aspectRatio: number;
    fontSize: number;
    fontFamily: string;
  };
}

export interface TypographySettings {
  fontSize: number;
  characterSpacing: number;
  lineSpacing: number;
  selectedFontId?: string;
}

export interface PaletteColor {
  id: string;
  value: string;
  name?: string;
}

export interface PaletteState {
  activePaletteId: string;
  customPalettes: Array<{
    id: string;
    name: string;
    colors: PaletteColor[];
    isPreset: boolean;
    isCustom: boolean;
  }>;
  recentColors: string[];
}

export interface CharacterPaletteState {
  activePaletteId: string;
  customPalettes: Array<{
    id: string;
    name: string;
    characters: string[];
  }>;
  mappingMethod: string;
  invertDensity: boolean;
  characterSpacing: number;
}

export interface ProjectListItem {
  id: string;
  name: string;
  description: string | null;
  canvasSize: { width: number; height: number };
  frameCount: number;
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
}

export interface SaveProjectOptions {
  name: string;
  description?: string;
  projectId?: string;
}

export type ConflictStrategy = 'use-cloud' | 'use-local' | 'create-copy' | 'cancel';

export interface ConflictDetection {
  hasConflict: boolean;
  cloudUpdated?: Date;
  localUpdated?: Date;
  cloudProject?: CloudProject;
}

export interface SubscriptionTier {
  id: string;
  name: string;
  displayName: string;
  maxProjects: number;
  features: string[];
  priceMonthly: number;
}

export interface UserProfile {
  id: string;
  subscriptionTierId: string | null;
  subscriptionTier: SubscriptionTier | null;
  autoSaveEnabled: boolean;
  emailNotifications: boolean;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
  isAdmin?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export type Profile = {
  id: string;
  is_admin: boolean;
  subscription_tier: {
    id: string;
    name: string;
    display_name: string;
    max_projects: number;
    max_frames_per_project: number;
    max_canvas_size: number;
    features: unknown;
  } | null;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
};

export type Database = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Supabase client stub
// ---------------------------------------------------------------------------

// Minimal Supabase client stub — just enough to satisfy TypeScript.
// Runtime code that uses supabase is gated behind auth checks (`if (!user)`) so
// these methods are never actually called when premium is absent.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const chainable: any = new Proxy({}, {
  get: () => (..._args: unknown[]) => chainable,
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: any = {
  from: () => chainable,
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
  storage: {
    from: () => chainable,
  },
};

// ---------------------------------------------------------------------------
// Auth hooks
// ---------------------------------------------------------------------------

const noopAsync = async () => ({ error: null });

export function useAuth() {
  return {
    user: null as { id: string; email?: string } | null,
    profile: null as Profile | null,
    session: null,
    loading: false,
    signUp: noopAsync,
    signIn: noopAsync,
    signOut: noopAsync,
    resetPassword: noopAsync,
    updatePassword: noopAsync,
    deleteAccount: noopAsync,
    refreshProfile: async () => {},
    getAccessToken: async () => null as string | null,
  };
}

// Alias used by some imports
export const useAuthHook = useAuth;

export function usePasswordRecoveryCallback() {
  return { isRecovery: false, resetRecovery: () => {} };
}

export function useEmailVerificationCallback() {
  // No-op — nothing to detect without real auth
}

// ---------------------------------------------------------------------------
// Cloud hooks
// ---------------------------------------------------------------------------

export function useCloudProject() {
  return {
    loading: false,
    error: null as string | null,
    saveProgress: 0,
    saveProgressMessage: '',
    saveToCloud: async (_sessionData: SessionData, _options: SaveProjectOptions): Promise<CloudProject | null> => null,
    loadFromCloud: async (_projectId: string): Promise<CloudProject | null> => null,
    loadPublishedProject: async (_projectId: string): Promise<CloudProject | null> => null,
    listProjects: async (): Promise<CloudProject[]> => [],
    listDeletedProjects: async (): Promise<CloudProject[]> => [],
    deleteProject: async (_projectId: string): Promise<boolean> => false,
    restoreProject: async (_projectId: string): Promise<boolean> => false,
    permanentlyDeleteProject: async (_projectId: string): Promise<boolean> => false,
    renameProject: async (_projectId: string, _newName: string): Promise<boolean> => false,
    updateDescription: async (_projectId: string, _desc: string): Promise<boolean> => false,
    uploadSessionFile: async (_file: File): Promise<CloudProject | null> => null,
    getProjectForDownload: async (_projectId: string): Promise<CloudProject | null> => null,
    loadProjectsSessionData: async (_projectIds: string[], _onUpdate?: (id: string, sessionData: SessionData) => void): Promise<null> => null,
    getUserProfile: async (): Promise<UserProfile | null> => null,
  };
}

// ---------------------------------------------------------------------------
// Community gallery (publish)
// ---------------------------------------------------------------------------

export interface PublishProjectParams {
  projectId: string;
  title: string;
  description: string | null;
  previewImageUrl: string;
  thumbnailUrl: string;
  tags: string[];
  allowRemixes: boolean;
}

export function useGallery() {
  return {
    isPublishing: false,
    error: null as string | null,
    publishProject: async (_params: PublishProjectParams): Promise<string> => {
      throw new Error('Publishing requires the premium package');
    },
    getProjectById: async (_projectId: string): Promise<{ allow_remixes: boolean } | null> => null,
  };
}

/** Stand-in for premium's community/hooks/useRemix (aliased as @ascii-motion/premium/remix). */
export function useRemix(_options: { projectId: string; allowRemixes: boolean }) {
  return {
    canRemix: false,
    isRemixing: false,
    remixProject: async (): Promise<
      { success: true; projectId: string } | { success: false; error: 'PROJECT_LIMIT' | 'OTHER'; message: string }
    > => ({ success: false, error: 'OTHER', message: 'Remixing requires the premium package' }),
  };
}

// ---------------------------------------------------------------------------
// Admin check context
// ---------------------------------------------------------------------------

export function useAdminCheckContext() {
  return { isAdmin: false, isLoading: false, error: null };
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

export function validateProjectName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Project name is required' };
  }
  if (name.length > 100) {
    return { valid: false, error: 'Project name must be 100 characters or less' };
  }
  return { valid: true };
}

export function validateProjectDescription(description: string): ValidationResult {
  if (description.length > 500) {
    return { valid: false, error: 'Description must be 500 characters or less' };
  }
  return { valid: true };
}

export function sanitizeString(input: string): string {
  if (!input) return '';
  const tagPattern = /<[^>]*>/g;
  let result = input;
  while (tagPattern.test(result)) {
    result = result.replace(tagPattern, '');
  }
  return result.trim();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generatePreview(_frames: any[], _options?: any): Promise<any> {
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateThumbnail(..._args: any[]): Promise<any> {
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generatePreviewAndThumbnail(..._args: any[]): Promise<any> {
  return null;
}

export function estimatePreviewSize() {
  return 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function uploadPreviewImage(_projectId: string, _blob: any): Promise<any> {
  return null;
}

export function getFontStack(_fontId?: string): string {
  return 'monospace';
}

// ---------------------------------------------------------------------------
// Cloud serialization stubs
// ---------------------------------------------------------------------------

export function deserializeProject() { return null; }
export function deserializeProjectListItem() { return null; }
export function serializeProject() { return null; }
export function validateSessionData() { return true; }
export function extractProjectNameFromFilename(filename: string) {
  return filename.replace(/\.[^.]+$/, '');
}

// ---------------------------------------------------------------------------
// Stripe stubs
// ---------------------------------------------------------------------------

export function useStripeCheckout() {
  return { checkout: async () => {}, loading: false, error: null };
}

export function useStripePortal() {
  return { openPortal: async () => {}, loading: false, error: null };
}

export function getStripe() { return null; }
export function getStripePriceId() { return ''; }

// ---------------------------------------------------------------------------
// React component stubs
//
// Provider components render children; UI components render null.
// Page components render a "premium required" message.
// ---------------------------------------------------------------------------

function childrenPassthrough({ children }: { children?: ReactNode }) {
  return children ?? null;
}

export const AuthProvider = childrenPassthrough;
export const AdminCheckProvider = childrenPassthrough;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProps = Record<string, any>;
function nullComponent(_props?: AnyProps) { return null; }

export const SignUpDialog = nullComponent;
export const SignInDialog = nullComponent;
export const PasswordResetDialog = nullComponent;
export const UpdatePasswordDialog = nullComponent;
export const UserMenu = nullComponent;
export const ChangePasswordDialog = nullComponent;
export const AccountSettingsDialog = nullComponent;
export const ProfileSettingsDialog = nullComponent;
export const AdminProjectViewerDialog = nullComponent;
export const UpgradeDialog = nullComponent as (props: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  getAccessToken?: () => Promise<string | null>;
  isAuthenticated?: boolean;
  defaultInterval?: string;
  onAuthRequired?: () => void;
}) => null;
export const SubscriptionManager = nullComponent;

export const NotificationButton = nullComponent;
export const GalleryHeaderText = nullComponent;
export const PublishToGalleryDialog = nullComponent;

export const TagInput = nullComponent;
export const GalleryCard = nullComponent;
export const GalleryGrid = nullComponent;
export const ProjectDetailOverlay = nullComponent;
export const FramePreview = nullComponent;
export const CommentsSection = nullComponent;
export const InitialsAvatar = nullComponent;
export const CommunityHeader = nullComponent;
export const UserBadge = nullComponent;
export const AdminRoute = nullComponent;
export const ReportsDashboard = nullComponent;
export const ReportCard = nullComponent;
export const ModerationActionsDialog = nullComponent;

export const CommunityGalleryPage = nullComponent;
export const ProjectDetailPage = nullComponent;
export const UserProfilePage = nullComponent;
export const AdminModerationPanel = nullComponent;
