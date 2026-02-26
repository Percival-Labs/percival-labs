/**
 * coordinates.ts — Single source of truth for isometric coordinate conversion.
 *
 * All grid-to-screen and screen-to-grid conversions go through here.
 * Previously duplicated in VillageScene, AgentManager, BuildingPalette, and ZonePainter.
 */

import { TILE_W, TILE_H } from '../sprites/TileGenerator';
import { GRID_OFFSET_Y } from './constants';

/** Convert grid coordinates to screen pixel position. */
export function isoToScreen(
  col: number,
  row: number,
  viewWidth: number
): { x: number; y: number } {
  const offsetX = viewWidth / 2;
  return {
    x: (col - row) * (TILE_W / 2) + offsetX,
    y: (col + row) * (TILE_H / 2) + GRID_OFFSET_Y,
  };
}

/** Convert screen pixel position to fractional grid coordinates. */
export function screenToGrid(
  sx: number,
  sy: number,
  viewWidth: number
): { col: number; row: number } {
  const offsetX = viewWidth / 2;
  const rx = sx - offsetX;
  const ry = sy - GRID_OFFSET_Y;
  return {
    col: rx / TILE_W + ry / TILE_H,
    row: ry / TILE_H - rx / TILE_W,
  };
}
