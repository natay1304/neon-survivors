/** Game renderer — background, entities, effects, HUD */

import { World, Entity, Camera2D, ParticleSystem, FloatingTextManager } from '@survivors/core';
import { C, type Pos, type Health, type Visual, type Player, type Pickup } from './components';
import { WEAPONS, FLOORS } from './config';
import { drawShape, drawParticles, drawFloatingText, applyCameraToContext } from './canvas-helpers';

const BG_COLOR = '#050510';
const GRID_SIZE = 64;

export class GameRenderer {
  private entityBuf: { e: Entity; pos: Pos; vis: Visual; y: number }[] = [];

  constructor(
    private ctx: CanvasRenderingContext2D,
    private camera: Camera2D,
    private particles: ParticleSystem,
    private floatingText: FloatingTextManager,
  ) {}

  render(world: World, arenaW: number, arenaH: number, floorIndex: number): void {
    const c = this.ctx;
    const cam = this.camera;
    const w = cam.width;
    const h = cam.height;

    c.fillStyle = BG_COLOR;
    c.fillRect(0, 0, w, h);

    c.save();
    applyCameraToContext(c, cam.pos, cam.shakeOffset, cam.width, cam.height);

    this.drawArenaFloor(arenaW, arenaH, floorIndex);
    this.drawArenaWalls(arenaW, arenaH, floorIndex);

    // Sort entities by Y for depth
    this.entityBuf.length = 0;
    for (const e of world.query(C.Visual, C.Pos)) {
      const pos = world.get<Pos>(e, C.Pos);
      const vis = world.get<Visual>(e, C.Visual);
      if (!cam.isVisible(pos.x, pos.y, vis.size + 30)) continue;
      this.entityBuf.push({ e, pos, vis, y: pos.y });
    }
    this.entityBuf.sort((a, b) => a.y - b.y);

    for (const { e, pos, vis } of this.entityBuf) {
      const isFlashing = world.has(e, C.DamageFlash);
      const color = isFlashing ? '#ffffff' : vis.color;

      let drawY = pos.y;
      if (world.has(e, C.Pickup)) {
        const pickup = world.get<Pickup>(e, C.Pickup);
        drawY += Math.sin(pickup.bobPhase) * 4;
        if (pickup.lifetime < 3 && Math.floor(pickup.lifetime * 6) % 2 === 0) continue;
      }

      if (world.has(e, C.Player)) {
        const hp = world.get<Health>(e, C.Health);
        if (hp.invuln > 0 && Math.floor(hp.invuln * 10) % 2 === 0) continue;
      }

      drawShape(c, vis.shape, pos.x, drawY, vis.size, color, vis.glow, vis.glowSize || 8, vis.rotation || 0);

      if (world.has(e, C.Enemy) && world.has(e, C.Health)) {
        const hp = world.get<Health>(e, C.Health);
        if (hp.current < hp.max) {
          const barW = vis.size * 2;
          const barH = 3;
          const bx = pos.x - barW / 2;
          const by = pos.y - vis.size - 8;
          c.fillStyle = '#330000';
          c.fillRect(bx, by, barW, barH);
          c.fillStyle = '#ff3333';
          c.fillRect(bx, by, barW * Math.max(0, hp.current / hp.max), barH);
        }
      }
    }

    drawParticles(c, this.particles);
    drawFloatingText(c, this.floatingText);

    c.restore();
  }

  drawHUD(world: World, floorIndex: number, roomIndex: number, totalRooms: number): void {
    const c = this.ctx;
    const w = this.camera.width;

    for (const e of world.query(C.Player)) {
      const player = world.get<Player>(e, C.Player);
      const hp = world.get<Health>(e, C.Health);
      const floor = FLOORS[floorIndex];

      // HP bar
      const hpW = 160;
      const hpH = 14;
      c.fillStyle = '#220000';
      c.fillRect(12, 12, hpW, hpH);
      const hpPct = Math.max(0, hp.current / hp.max);
      c.fillStyle = hpPct > 0.3 ? '#44ff44' : '#ff4444';
      c.fillRect(12, 12, hpW * hpPct, hpH);
      c.strokeStyle = '#444466';
      c.lineWidth = 1;
      c.strokeRect(12, 12, hpW, hpH);

      c.fillStyle = '#ccccdd';
      c.font = '11px monospace';
      c.textAlign = 'left';
      c.fillText(`HP ${Math.ceil(hp.current)}/${hp.max}`, 14, 23);

      // Floor / Room
      c.fillStyle = floor?.color ?? '#ffffff';
      c.font = 'bold 13px monospace';
      c.fillText(`${floor?.name ?? 'Floor ' + (floorIndex + 1)}`, 12, 42);

      c.fillStyle = '#8888aa';
      c.font = '11px monospace';
      c.fillText(`Room ${roomIndex + 1}/${totalRooms}`, 12, 56);

      // Score
      c.fillStyle = '#ffcc00';
      c.font = 'bold 16px monospace';
      c.textAlign = 'right';
      c.fillText(`${player.score}`, w - 12, 24);

      c.fillStyle = '#8888aa';
      c.font = '11px monospace';
      c.fillText('SCORE', w - 12, 38);

      // Kills
      c.fillStyle = '#ff6666';
      c.fillText(`Kills: ${player.kills}`, w - 12, 52);

      // Weapon info
      const wSlot = player.weapons[player.currentWeapon];
      if (wSlot) {
        const levels = WEAPONS[wSlot.type];
        const wDef = levels?.[Math.min(wSlot.level, (levels?.length ?? 1) - 1)];
        if (wDef) {
          c.textAlign = 'center';
          c.fillStyle = wDef.color;
          c.font = 'bold 12px monospace';
          c.fillText(wDef.name, w / 2, 20);

          // Weapon switch hint
          if (player.weapons.length > 1) {
            c.fillStyle = '#666688';
            c.font = '10px monospace';
            c.fillText(`[Q] Switch (${player.currentWeapon + 1}/${player.weapons.length})`, w / 2, 34);
          }
        }
      }

      // Armor indicator
      if (player.armor > 0) {
        c.textAlign = 'left';
        c.fillStyle = '#6688cc';
        c.font = '11px monospace';
        c.fillText(`🛡️ ${player.armor}`, 12, 72);
      }

      // Enemy count
      const enemyCount = world.count(C.Enemy);
      if (enemyCount > 0) {
        c.textAlign = 'left';
        c.fillStyle = '#ff6644';
        c.font = '11px monospace';
        c.fillText(`Enemies: ${enemyCount}`, 12, 86);
      }
    }
  }

  private drawArenaFloor(arenaW: number, arenaH: number, floorIndex: number): void {
    const c = this.ctx;
    const hw = arenaW / 2;
    const hh = arenaH / 2;
    const floor = FLOORS[floorIndex];
    const gridColor = floor ? this.dimColor(floor.color, 0.1) : '#111125';

    c.strokeStyle = gridColor;
    c.lineWidth = 1;

    const startX = Math.floor(-hw / GRID_SIZE) * GRID_SIZE;
    const endX = Math.ceil(hw / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor(-hh / GRID_SIZE) * GRID_SIZE;
    const endY = Math.ceil(hh / GRID_SIZE) * GRID_SIZE;

    c.beginPath();
    for (let x = startX; x <= endX; x += GRID_SIZE) {
      c.moveTo(x, -hh);
      c.lineTo(x, hh);
    }
    for (let y = startY; y <= endY; y += GRID_SIZE) {
      c.moveTo(-hw, y);
      c.lineTo(hw, y);
    }
    c.stroke();
  }

  private drawArenaWalls(arenaW: number, arenaH: number, floorIndex: number): void {
    const c = this.ctx;
    const hw = arenaW / 2;
    const hh = arenaH / 2;
    const floor = FLOORS[floorIndex];
    const wallColor = floor?.color ?? '#ff3366';

    c.save();
    c.shadowColor = wallColor;
    c.shadowBlur = 15;
    c.strokeStyle = wallColor;
    c.lineWidth = 3;
    c.strokeRect(-hw, -hh, arenaW, arenaH);
    c.restore();
  }

  private dimColor(hex: string, amount: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.round(r * amount)},${Math.round(g * amount)},${Math.round(b * amount)})`;
  }
}
