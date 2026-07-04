/**
 * AgentSpriteConfig.ts — Maps agent IDs to spritesheet configuration.
 *
 * Supports both animated spritesheets (from Retro Diffusion walk cycles)
 * and static fallback sprites. The system checks for real assets first
 * and falls back to procedural generation in AgentSprite.ts.
 *
 * Spritesheet layout for `animation__four_angle_walking`:
 *   - 4 frames per direction
 *   - 4 directions: South (down), West (left), East (right), North (up)
 *   - Frame size: 48x48px
 *   - Total sheet: depends on API output (typically 192x192 or linear strip)
 */

export interface AgentSpriteConfig {
  /** Texture key for the spritesheet (e.g., 'agent-percy-walk') */
  walkKey: string;
  /** Texture key for static portrait fallback (e.g., 'agent-percy-static') */
  staticKey: string;
  /** Width of a single frame in pixels */
  frameWidth: number;
  /** Height of a single frame in pixels */
  frameHeight: number;
  /** Frames per direction in the walk cycle */
  framesPerDirection: number;
  /** Animation frame rate (fps) */
  frameRate: number;
}

/** Direction names matching Phaser animation keys */
export type SpriteDirection = 'south' | 'north' | 'east' | 'west';

/** Map direction to spritesheet row index */
export const DIRECTION_ROW: Record<SpriteDirection, number> = {
  south: 0,
  west: 1,
  east: 2,
  north: 3,
};

/**
 * Default sprite config shared by all agents.
 * The animation__four_angle_walking style outputs 48x48 frames.
 */
const DEFAULT_CONFIG: Omit<AgentSpriteConfig, 'walkKey' | 'staticKey'> = {
  frameWidth: 48,
  frameHeight: 48,
  framesPerDirection: 4,
  frameRate: 8,
};

/** Agent IDs — must match AGENTS in game/agents.ts */
const AGENT_IDS = [
  'percy', 'scout', 'sage', 'forge', 'relay',
  'pixel', 'wrench', 'lens', 'cog',
] as const;

export type AgentId = (typeof AGENT_IDS)[number];

/**
 * Build the sprite config map. All agents share the same frame layout,
 * just with different texture keys.
 */
export const AGENT_SPRITE_CONFIGS: Record<string, AgentSpriteConfig> = Object.fromEntries(
  AGENT_IDS.map((id) => [
    id,
    {
      ...DEFAULT_CONFIG,
      walkKey: `agent-${id}-walk`,
      staticKey: `agent-${id}-static`,
    },
  ])
);

/**
 * Get animation key for a specific agent + direction.
 * Format: 'walk-percy-south'
 */
export function getAnimKey(agentId: string, direction: SpriteDirection): string {
  return `walk-${agentId}-${direction}`;
}

/**
 * Get idle frame key for a specific agent.
 * Uses the first frame of the south-facing walk cycle.
 */
export function getIdleFrame(agentId: string): { key: string; frame: number } {
  const config = AGENT_SPRITE_CONFIGS[agentId];
  return {
    key: config?.walkKey ?? `agent-${agentId}`,
    frame: DIRECTION_ROW.south * (config?.framesPerDirection ?? 4),
  };
}

/**
 * Determine sprite direction from a movement delta.
 * Returns the closest cardinal direction.
 */
export function directionFromDelta(dx: number, dy: number): SpriteDirection {
  // In isometric coords: moving right in grid = east, down = south, etc.
  // But screen-space movement is what matters for visual direction.
  // dx positive = moving right on screen = east
  // dy positive = moving down on screen = south

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'east' : 'west';
  }
  return dy > 0 ? 'south' : 'north';
}

/**
 * The visual height of the animated sprite (used for name label positioning).
 * The 48px frame includes some padding, so the visual robot is ~40px tall.
 */
export const ANIMATED_SPRITE_HEIGHT = 48;

/**
 * Scale factor for animated sprites to match the isometric grid.
 * At 48px tall, agents are roughly the right size for 64x32 tiles.
 * Adjust this to fine-tune agent size in the village.
 */
export const ANIMATED_SPRITE_SCALE = 1.5;
