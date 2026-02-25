/**
 * VillageState.ts — Pure data model for the village builder.
 *
 * All rendering reads from this state. Editor tools mutate it.
 * No classes, no reactivity — just data + pure helper functions.
 */

import { ZONES, GRID_COLS, GRID_ROWS } from '../../game/zones';

// ═══ Interfaces ═══

export interface PlacedBuilding {
  type: string; // 'sanctum' | 'observatory' | 'workshop' | 'library' | 'fountain'
  col: number;
  row: number;
}

export interface PlacedDecoration {
  type: string; // 'tree-1' | 'tree-2' | 'tree-3' | 'bush-1' | 'bush-2' | 'lantern'
  col: number;
  row: number;
}

export interface VillageState {
  buildings: PlacedBuilding[];
  decorations: PlacedDecoration[];
  /** "col,row" → zoneId (e.g. "3,4" → "sanctum") */
  zonePaint: Record<string, string>;
}

// ═══ Key helper ═══

function tileKey(col: number, row: number): string {
  return `${col},${row}`;
}

// ═══ Factory functions ═══

/**
 * Create the default state — mirrors the original hardcoded layout.
 * Buildings at zone centers, decorations at their original positions,
 * zones painted to match the original rectangular bounds.
 */
export function createDefaultState(): VillageState {
  const buildings: PlacedBuilding[] = ZONES.map((z) => ({
    type: z.id === 'town-square' ? 'fountain' : z.id,
    col: z.center[0],
    row: z.center[1],
  }));

  const TREE_TYPES = ['tree-1', 'tree-2', 'tree-3'];
  const BUSH_TYPES = ['bush-1', 'bush-2'];

  const treePositions: [number, number][] = [
    [6, 1], [6, 3], [6, 5],
    [13, 1], [13, 3], [13, 5],
    [6, 7], [6, 9], [6, 12],
    [13, 7], [13, 10], [13, 12],
    [3, 6], [4, 7],
    [16, 6], [17, 7],
  ];
  const bushPositions: [number, number][] = [
    [1, 0], [4, 1], [0, 4], [5, 5],
    [1, 9], [4, 13], [0, 12],
    [15, 0], [18, 1], [19, 4],
    [15, 12], [18, 13], [19, 9],
  ];
  const lanternPositions: [number, number][] = [
    [7, 4], [12, 4], [7, 10], [12, 10],
    [9, 4], [10, 10],
  ];

  const decorations: PlacedDecoration[] = [
    ...treePositions.map((p, i) => ({
      type: TREE_TYPES[i % TREE_TYPES.length],
      col: p[0],
      row: p[1],
    })),
    ...bushPositions.map((p, i) => ({
      type: BUSH_TYPES[i % BUSH_TYPES.length],
      col: p[0],
      row: p[1],
    })),
    ...lanternPositions.map((p) => ({
      type: 'lantern',
      col: p[0],
      row: p[1],
    })),
  ];

  // Paint zones from original rectangular bounds
  const zonePaint: Record<string, string> = {};
  for (const z of ZONES) {
    const [c0, r0, c1, r1] = z.bounds;
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        zonePaint[tileKey(c, r)] = z.id;
      }
    }
  }

  return { buildings, decorations, zonePaint };
}

/** Create a blank canvas — no buildings, no decorations, no zones. */
export function createBlankState(): VillageState {
  return { buildings: [], decorations: [], zonePaint: {} };
}

// ═══ Zone helpers ═══

/** Get the zone ID painted at a tile position, or null if unpainted. */
export function getZoneAt(state: VillageState, col: number, row: number): string | null {
  return state.zonePaint[tileKey(col, row)] ?? null;
}

/** Paint a zone onto a tile. */
export function paintZone(state: VillageState, col: number, row: number, zoneId: string): void {
  if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return;
  state.zonePaint[tileKey(col, row)] = zoneId;
}

/** Clear the zone paint from a tile. */
export function clearZone(state: VillageState, col: number, row: number): void {
  delete state.zonePaint[tileKey(col, row)];
}

/** Find all tiles painted with a specific zone ID. */
export function findZoneTiles(state: VillageState, zoneId: string): [number, number][] {
  const tiles: [number, number][] = [];
  for (const [key, id] of Object.entries(state.zonePaint)) {
    if (id === zoneId) {
      const [c, r] = key.split(',').map(Number);
      tiles.push([c, r]);
    }
  }
  return tiles;
}

// ═══ Building helpers ═══

/** Add a building to the state. Returns the index. */
export function addBuilding(state: VillageState, type: string, col: number, row: number): number {
  state.buildings.push({ type, col, row });
  return state.buildings.length - 1;
}

/** Remove a building by index. */
export function removeBuilding(state: VillageState, index: number): void {
  state.buildings.splice(index, 1);
}

/** Move a building to a new position. */
export function moveBuilding(state: VillageState, index: number, col: number, row: number): void {
  const b = state.buildings[index];
  if (b) {
    b.col = col;
    b.row = row;
  }
}

/** Check if a grid cell is occupied by a building. */
export function isBuildingAt(state: VillageState, col: number, row: number): number {
  return state.buildings.findIndex(
    (b) => Math.round(b.col) === Math.round(col) && Math.round(b.row) === Math.round(row)
  );
}

// ═══ Decoration helpers ═══

/** Add a decoration to the state. Returns the index. */
export function addDecoration(state: VillageState, type: string, col: number, row: number): number {
  state.decorations.push({ type, col, row });
  return state.decorations.length - 1;
}

/** Remove a decoration by index. */
export function removeDecoration(state: VillageState, index: number): void {
  state.decorations.splice(index, 1);
}

/** Move a decoration to a new position. */
export function moveDecoration(state: VillageState, index: number, col: number, row: number): void {
  const d = state.decorations[index];
  if (d) {
    d.col = col;
    d.row = row;
  }
}

/** Check if a grid cell is occupied by a decoration. */
export function isDecorationAt(state: VillageState, col: number, row: number): number {
  return state.decorations.findIndex(
    (d) => Math.round(d.col) === Math.round(col) && Math.round(d.row) === Math.round(row)
  );
}

/** Check if a cell has any placed object (building or decoration). */
export function isOccupied(state: VillageState, col: number, row: number): boolean {
  return isBuildingAt(state, col, row) >= 0 || isDecorationAt(state, col, row) >= 0;
}

/** Check if coordinates are within the grid. */
export function isInGrid(col: number, row: number): boolean {
  return col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS;
}
