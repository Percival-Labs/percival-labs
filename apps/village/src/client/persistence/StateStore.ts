/**
 * StateStore.ts — localStorage persistence for VillageState.
 *
 * Saves/loads the village layout with versioning so future
 * schema changes can be handled gracefully.
 */

import { type VillageState } from '../state/VillageState';

const STORAGE_KEY = 'octopus-village-state';
const STATE_VERSION = 1;

interface StoredState {
  version: number;
  state: VillageState;
  savedAt: string;
}

/** Save village state to localStorage. */
export function saveState(state: VillageState): void {
  try {
    const stored: StoredState = {
      version: STATE_VERSION,
      state,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

/** Load village state from localStorage. Returns null if missing or incompatible. */
export function loadState(): VillageState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const stored: StoredState = JSON.parse(raw);
    if (stored.version !== STATE_VERSION) return null;

    // Basic shape validation
    const s = stored.state;
    if (!Array.isArray(s.buildings) || !Array.isArray(s.decorations) || typeof s.zonePaint !== 'object') {
      return null;
    }

    return s;
  } catch {
    return null;
  }
}

/** Clear saved state from localStorage. */
export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // silently fail
  }
}
