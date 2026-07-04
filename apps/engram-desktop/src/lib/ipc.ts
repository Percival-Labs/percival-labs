import { invoke } from "@tauri-apps/api/core";

/**
 * Open a URL in the system's default browser.
 * Uses Tauri's shell plugin under the hood.
 */
export async function openUrl(url: string): Promise<void> {
  try {
    await invoke("open_url", { url });
  } catch (err) {
    // Fallback for dev mode (running in regular browser)
    window.open(url, "_blank");
  }
}

/**
 * Get the port the Engram HTTP engine is running on.
 */
export async function getEnginePort(): Promise<number> {
  try {
    return await invoke<number>("get_engine_port");
  } catch {
    return 3939;
  }
}

/**
 * Check if running inside Tauri (vs. regular browser dev mode).
 */
export function isTauri(): boolean {
  return "__TAURI_INTERNALS__" in window;
}
