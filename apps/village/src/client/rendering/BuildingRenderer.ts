/**
 * BuildingRenderer.ts — Renders buildings from VillageState.
 *
 * Uses real PNG sprites when available, procedural graphics otherwise.
 */

import Phaser from 'phaser';
import { isoToScreen } from '../core/coordinates';
import { type VillageState } from '../state/VillageState';
import { BUILDING_CONFIG } from '../config';

export function renderBuildings(
  scene: Phaser.Scene,
  state: VillageState,
  container: Phaser.GameObjects.Container,
  viewWidth: number
): void {
  for (const building of state.buildings) {
    const { x, y } = isoToScreen(building.col, building.row, viewWidth);
    drawBuilding(scene, container, building.type, x, y, building.row);
  }
}

function drawBuilding(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  type: string,
  cx: number,
  cy: number,
  row: number
): void {
  const key = `building-${type}`;
  const config = BUILDING_CONFIG[type];

  if (scene.textures.exists(key) && config) {
    const img = scene.add.image(cx, cy, key);
    img.setOrigin(config.originX, config.originY);
    img.setScale(config.scale);
    img.setDepth(-400 + row * 0.1);
    container.add(img);
  } else {
    drawBuildingProcedural(scene, container, type, cx, cy, row);
  }
}

function drawBuildingProcedural(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  id: string,
  cx: number,
  cy: number,
  row: number
): void {
  const g = scene.add.graphics();
  g.setDepth(-400 + row * 0.1);
  container.add(g);

  switch (id) {
    case 'observatory':
      drawObservatory(g, cx, cy);
      break;
    case 'workshop':
      drawWorkshop(g, cx, cy);
      break;
    case 'fountain':
      drawFountain(g, cx, cy);
      break;
    case 'library':
      drawLibrary(g, cx, cy);
      break;
    case 'sanctum':
      drawSanctum(g, cx, cy);
      break;
  }
}

function drawObservatory(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x2d2440);
  g.fillEllipse(x, y + 10, 56, 28);
  g.fillStyle(0x3d3060);
  g.fillRect(x - 14, y - 50, 28, 60);
  g.fillStyle(0x2d2248);
  g.fillRect(x - 14, y - 50, 6, 60);
  g.fillStyle(0x6d5ca8);
  g.fillEllipse(x, y - 50, 36, 18);
  g.fillStyle(0x8d7cc8);
  g.fillEllipse(x - 4, y - 54, 16, 8);
  g.fillStyle(0xc8b8ff);
  g.fillRect(x - 4, y - 30, 8, 12);
  g.fillStyle(0xe8d8ff);
  g.fillRect(x - 2, y - 28, 4, 8);
  g.lineStyle(3, 0x94a3b8);
  g.lineBetween(x + 8, y - 58, x + 24, y - 72);
  g.fillStyle(0xa0b0c8);
  g.fillCircle(x + 24, y - 72, 5);
  g.fillStyle(0xc8b8ff, 0.6);
  for (const [dx, dy] of [[-20, -65], [18, -80], [-28, -55], [25, -60]]) {
    g.fillRect(x + dx, y + dy, 2, 2);
  }
}

function drawWorkshop(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x4a3828);
  g.fillTriangle(x, y + 5, x + 30, y + 20, x, y + 35);
  g.fillTriangle(x, y + 5, x - 30, y + 20, x, y + 35);
  g.fillStyle(0x5c4030);
  g.fillRect(x - 24, y - 40, 48, 45);
  g.fillStyle(0x4a3020);
  g.fillRect(x - 24, y - 40, 10, 45);
  g.fillStyle(0x8b5e3c);
  g.fillTriangle(x - 28, y - 40, x, y - 58, x + 28, y - 40);
  g.fillStyle(0x7a4e2c);
  g.fillTriangle(x - 28, y - 40, x - 2, y - 56, x - 2, y - 40);
  g.fillStyle(0x6b4028);
  g.fillRect(x + 10, y - 65, 8, 25);
  g.fillStyle(0xa0a0b4, 0.3);
  g.fillCircle(x + 14, y - 70, 5);
  g.fillCircle(x + 12, y - 78, 4);
  g.fillStyle(0x3a2010);
  g.fillRect(x - 6, y - 14, 12, 18);
  g.fillStyle(0x555566);
  g.fillRect(x + 16, y - 8, 10, 5);
  g.fillRect(x + 18, y - 3, 6, 6);
  g.fillStyle(0x777788);
  g.fillRect(x + 16, y - 8, 10, 2);
  g.fillStyle(0xffb060);
  g.fillRect(x - 18, y - 30, 8, 8);
  g.fillStyle(0xffc880);
  g.fillRect(x - 16, y - 28, 4, 4);
}

function drawFountain(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x4a6080);
  g.fillEllipse(x, y + 6, 48, 24);
  g.fillStyle(0x5a90c0);
  g.fillEllipse(x, y + 4, 40, 20);
  g.fillStyle(0x8cc8ff, 0.4);
  g.fillEllipse(x - 4, y + 2, 16, 8);
  g.fillStyle(0x9a9080);
  g.fillRect(x - 4, y - 28, 8, 32);
  g.fillStyle(0xb0a898);
  g.fillRect(x - 3, y - 28, 3, 32);
  g.fillStyle(0xa09888);
  g.fillEllipse(x, y - 28, 24, 12);
  g.lineStyle(2, 0x8cc8ff, 0.6);
  g.lineBetween(x, y - 28, x + 12, y);
  g.lineBetween(x, y - 28, x - 12, y);
}

function drawLibrary(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x1e3028);
  g.fillTriangle(x, y + 8, x + 28, y + 22, x, y + 36);
  g.fillTriangle(x, y + 8, x - 28, y + 22, x, y + 36);
  g.fillStyle(0x2a4838);
  g.fillRect(x - 22, y - 42, 44, 50);
  g.fillStyle(0x1e3828);
  g.fillRect(x - 22, y - 42, 8, 50);
  g.fillStyle(0x1a5040);
  g.fillTriangle(x - 26, y - 42, x, y - 56, x + 26, y - 42);
  g.fillStyle(0x4a2810);
  g.fillRect(x - 5, y - 10, 10, 18);
  g.lineStyle(2, 0x5a3820);
  g.beginPath();
  g.arc(x, y - 10, 5, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360));
  g.strokePath();
  g.fillStyle(0x60c890);
  g.fillRect(x - 16, y - 34, 8, 10);
  g.fillRect(x + 8, y - 34, 8, 10);
  g.fillStyle(0xa04040);
  g.fillRect(x - 14, y - 32, 2, 6);
  g.fillStyle(0x4060a0);
  g.fillRect(x - 11, y - 31, 2, 5);
  g.fillStyle(0xa08040);
  g.fillRect(x + 10, y - 33, 2, 7);
  g.fillStyle(0x60a060);
  g.fillRect(x + 13, y - 32, 2, 6);
  g.fillStyle(0x666677);
  g.fillRect(x + 28, y - 20, 2, 22);
  g.fillStyle(0xffffaa);
  g.fillCircle(x + 29, y - 22, 4);
  g.fillStyle(0xffffb4, 0.15);
  g.fillCircle(x + 29, y - 20, 14);
}

function drawSanctum(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x506860);
  g.fillEllipse(x, y + 4, 48, 20);
  g.fillStyle(0x607870, 0.5);
  g.fillEllipse(x, y + 2, 40, 16);
  g.fillStyle(0x90b8a8);
  for (const [dx, dy] of [[-14, -2], [14, -2], [-14, 2], [14, 2]]) {
    g.fillRect(x + dx - 2, y + dy - 36, 4, 38);
    g.fillStyle(0xa8d0c0);
    g.fillRect(x + dx - 3, y + dy - 38, 6, 3);
    g.fillStyle(0x90b8a8);
  }
  g.fillStyle(0xa8d0c0);
  g.fillRect(x - 17, y - 38, 34, 3);
  g.fillStyle(0x5eead4, 0.8);
  g.fillTriangle(x - 20, y - 38, x, y - 52, x + 20, y - 38);
  g.fillStyle(0x4ecaba, 0.6);
  g.fillTriangle(x - 20, y - 38, x - 2, y - 50, x - 2, y - 38);
  g.fillStyle(0x5eead4, 0.15);
  g.fillCircle(x, y - 8, 16);
  g.fillStyle(0x5eead4, 0.3);
  g.fillCircle(x, y - 8, 8);
  g.fillStyle(0xaafff0, 0.6);
  g.fillCircle(x, y - 8, 3);
  g.fillStyle(0x708880);
  g.fillRect(x - 5, y - 4, 10, 6);
  g.fillStyle(0x88a898);
  g.fillRect(x - 4, y - 4, 8, 2);
  const petals = [0x5eead4, 0x80f0e0, 0xa0fff0, 0x60d8c0, 0x90ffe8];
  const flowerPos: [number, number][] = [[-22, 6], [20, 8], [-18, -4], [22, -2], [-6, 12], [8, 12]];
  flowerPos.forEach(([dx, dy], i) => {
    g.fillStyle(petals[i % petals.length], 0.7);
    g.fillRect(x + dx, y + dy, 3, 3);
    g.fillStyle(0x408060);
    g.fillRect(x + dx, y + dy + 3, 3, 2);
  });
}
