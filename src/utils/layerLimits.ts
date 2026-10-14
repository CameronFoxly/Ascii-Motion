/**
 * Layer Limit Utilities
 * 
 * Centralized layer limit checking for subscription tier enforcement.
 * All layer creation paths MUST go through canAddLayer() — see §2.1 in the plan.
 * 
 * Paths that create layers:
 * - addLayer() (manual)
 * - duplicateLayer() (manual)
 * - pasteLayer() (clipboard)
 * - importSession() (file load — silently truncate excess layers)
 * - MCP add_layer tool (return error response)
 * - addGeneratorLayer() (generator buttons disabled with upgrade tooltip)
 * 
 * Part of the Layer Timeline Refactor (Phase 2)
 * See: docs/LAYER_TIMELINE_REFACTOR_PLAN.md §2.1
 */

import { useTimelineStore } from '../stores/timelineStore';

// ============================================
// CONSTANTS
// ============================================

/** Free tier layer limit */
export const FREE_TIER_MAX_LAYERS = 5;

/** Unlimited layers sentinel value */
export const UNLIMITED_LAYERS = -1;

// ============================================
// SUBSCRIPTION LAYER LIMIT
// ============================================

/**
 * Get the maximum number of layers allowed for the current subscription tier.
 * 
 * This function reads from the premium package's auth context. Since the premium
 * package uses React context (not a Zustand store), we use a registration pattern:
 * the app registers a getter at startup, and this function reads from it.
 * 
 * Returns -1 for unlimited (Pro tier), or a positive number for limited tiers.
 */
let _getSubscriptionLayerLimit: (() => number) | null = null;

/**
 * Register the subscription layer limit getter.
 * Call this from the app root where the auth context is available.
 * 
 * @example
 * ```ts
 * // In App.tsx or a provider component:
 * const { profile } = useAuth();
 * registerSubscriptionLayerLimit(() => {
 *   if (profile?.subscription_tier?.name === 'pro') return UNLIMITED_LAYERS;
 *   return profile?.subscription_tier?.max_layers ?? FREE_TIER_MAX_LAYERS;
 * });
 * ```
 */
export function registerSubscriptionLayerLimit(getter: () => number): void {
  _getSubscriptionLayerLimit = getter;
}

/**
 * Get the layer limit for the current subscription tier.
 * Falls back to FREE_TIER_MAX_LAYERS if no getter is registered.
 */
export function getSubscriptionLayerLimit(): number {
  if (_getSubscriptionLayerLimit) {
    return _getSubscriptionLayerLimit();
  }
  // Default to free tier limit when premium package is not loaded
  return FREE_TIER_MAX_LAYERS;
}

// ============================================
// LAYER LIMIT CHECKS
// ============================================

/**
 * Check if a new layer can be added given the current count and subscription tier.
 * All layer creation paths MUST call this before creating layers.
 * 
 * @returns true if a layer can be added, false if the limit is reached
 */
export function canAddLayer(): boolean {
  const layerLimit = getSubscriptionLayerLimit();
  const currentCount = useTimelineStore.getState().layers.length;
  return layerLimit === UNLIMITED_LAYERS || currentCount < layerLimit;
}

/**
 * Check if importing N layers would exceed the limit.
 * Returns the maximum number of layers that can be imported.
 * 
 * Used by importSession() to silently truncate excess layers.
 * 
 * @param incomingLayers - Number of layers to import
 * @returns Number of layers that can actually be imported (0 to incomingLayers)
 */
export function getImportableLayerCount(incomingLayers: number): number {
  const layerLimit = getSubscriptionLayerLimit();
  if (layerLimit === UNLIMITED_LAYERS) return incomingLayers;
  const currentCount = useTimelineStore.getState().layers.length;
  const available = Math.max(0, layerLimit - currentCount);
  return Math.min(incomingLayers, available);
}

/**
 * Get the number of remaining layers that can be added.
 * Returns Infinity for unlimited tiers.
 */
export function getRemainingLayerCount(): number {
  const layerLimit = getSubscriptionLayerLimit();
  if (layerLimit === UNLIMITED_LAYERS) return Infinity;
  const currentCount = useTimelineStore.getState().layers.length;
  return Math.max(0, layerLimit - currentCount);
}
