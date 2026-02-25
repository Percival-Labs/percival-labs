/**
 * Zone definitions for the Agent Village.
 *
 * Each zone maps 1:1 to a PAI/Engram architectural component.
 * The village IS your AI infrastructure, rendered as a living space.
 *
 * ┌─────────────────────────────────────────────┐
 * │  PAI Component  →  Village Zone             │
 * │  ─────────────────────────────────────────── │
 * │  TELOS / SOUL   →  Sanctum (identity)       │
 * │  MEMORY         →  Library (persistence)     │
 * │  SKILLS         →  Workshop (capabilities)   │
 * │  CONTEXT        →  Observatory (awareness)   │
 * │  CORE           →  Town Square (coordination)│
 * └─────────────────────────────────────────────┘
 *
 * Users customize the visual form (temple vs shrine vs grove for the Sanctum)
 * but the structural function — which PAI component it represents — is fixed.
 * Every village has all five. The village IS the PAI, spatially.
 */

export interface Zone {
  id: string;
  name: string;

  /**
   * Which PAI/Engram component this zone represents.
   * This is the structural identity — it doesn't change even if the
   * user reskins the zone's visual appearance.
   */
  paiComponent: 'telos' | 'memory' | 'skills' | 'context' | 'core';

  /** What kind of work happens here (routes agents to zones) */
  problemType: string;
  color: string;
  /** Grid bounds: [colStart, rowStart, colEnd, rowEnd] (inclusive) */
  bounds: [number, number, number, number];
  /** Center of the zone in grid coords */
  center: [number, number];
  icon: string;
  description: string;
  /** How this zone maps to PAI architecture */
  paiDescription: string;
}

export const GRID_COLS = 20;
export const GRID_ROWS = 14;

export const ZONES: Zone[] = [
  {
    id: 'sanctum',
    name: 'Sanctum',
    paiComponent: 'telos',
    problemType: 'ambiguity',
    color: '#5eead4',   // soft teal
    bounds: [0, 0, 5, 5],
    center: [2.5, 2.5],
    icon: '\u{1F54A}',  // dove — peace, soul
    description: 'Sacred ground for identity alignment and value-driven decisions',
    paiDescription: 'TELOS / SOUL — When agents face ambiguity, they return here to align with core values and mission. The sanctum IS your identity file, rendered as a place.',
  },
  {
    id: 'observatory',
    name: 'Observatory',
    paiComponent: 'context',
    problemType: 'reasoning',
    color: '#a78bfa',   // deep purple
    bounds: [14, 0, 19, 5],
    center: [16.5, 2.5],
    icon: '\u{1F52D}',
    description: 'Star charts and telescopes for deep analysis',
    paiDescription: 'CONTEXT — Environmental scanning, situational awareness, deep reasoning. This is your context.md rendered as a watchtower — the agent surveys the landscape before acting.',
  },
  {
    id: 'town-square',
    name: 'Town Square',
    paiComponent: 'core',
    problemType: 'coordination',
    color: '#d4a574',   // warm stone
    bounds: [7, 5, 12, 9],
    center: [9.5, 7],
    icon: '\u{26F2}',
    description: 'Central fountain for planning and delegation',
    paiDescription: 'CORE — The coordination hub, the central nervous system. Agents meet here to plan, delegate, and communicate. This is your CLAUDE.md / CORE skill — the operating principles that govern how everything works together.',
  },
  {
    id: 'workshop',
    name: 'Workshop',
    paiComponent: 'skills',
    problemType: 'effort',
    color: '#fbbf24',   // warm amber
    bounds: [0, 8, 5, 13],
    center: [2.5, 10.5],
    icon: '\u{1F528}',
    description: 'Anvils and workbenches for building tasks',
    paiDescription: 'SKILLS — Where capabilities are forged. Each tool on the workbench is a skill your AI can wield. When agents build, implement, or create, they come here.',
  },
  {
    id: 'library',
    name: 'Library',
    paiComponent: 'memory',
    problemType: 'domain',
    color: '#34d399',   // dark green
    bounds: [14, 8, 19, 13],
    center: [16.5, 10.5],
    icon: '\u{1F4DA}',
    description: 'Bookshelves and scrolls for specialized knowledge',
    paiDescription: 'MEMORY — Knowledge that persists across sessions. Every book on the shelf is a memory file, every scroll is accumulated wisdom. When agents need domain knowledge, they research here.',
  },
];

/** Look up zone by problem type */
export function zoneForProblemType(problemType: string): Zone | undefined {
  return ZONES.find(z => z.problemType === problemType);
}

/** Look up zone by PAI component */
export function zoneForComponent(component: Zone['paiComponent']): Zone | undefined {
  return ZONES.find(z => z.paiComponent === component);
}
