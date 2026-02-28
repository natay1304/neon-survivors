/** Game renderer — draws background, entities, effects, HUD */

import { World, Entity, Camera2D, ParticleSystem, FloatingTextManager } from '@survivors/core';
import { C, type Pos, type Health, type Visual, type Player, type Pickup, type Destructible, type Explosion } from './components';
import { WEAPONS, TOTAL_LEVELS } from './config';
import { drawShape, drawParticles, drawFloatingText, applyCameraToContext } from './canvas-helpers';

const BG_COLOR = '#0a0a1a';
const GRID_SIZE = 64;
const TWO_PI = Math.PI * 2;

export type RenderScreen = 'menu' | 'playing' | 'levelComplete' | 'gameover' | 'victory' | 'paused';

export class GameRenderer {
  private entityBuf: { e: Entity; pos: Pos; vis: Visual; y: number }[] = [];

  constructor(
    private ctx: CanvasRenderingContext2D,
    private camera: Camera2D,
    private particles: ParticleSystem,
    private floatingText: FloatingTextManager,
  ) {}

  render(world: World, arenaW: number, arenaH: number, levelIndex: number, screen: RenderScreen): void {
    const c = this.ctx;
    const cam = this.camera;
    const w = cam.width;
    const h = cam.height;

    // Clear
    c.fillStyle = BG_COLOR;
    c.fillRect(0, 0, w, h);

    // World space
    c.save();
    applyCameraToContext(c, cam.pos, cam.shakeOffset, cam.width, cam.height);

    // Arena floor
    this.drawArenaFloor(arenaW, arenaH);

    // Arena walls
    this.drawArenaWalls(arenaW, arenaH);

    // Sort entities by Y for depth
    this.entityBuf.length = 0;
    for (const e of world.query(C.Visual, C.Pos)) {
      const pos = world.get<Pos>(e, C.Pos);
      const vis = world.get<Visual>(e, C.Visual);
      if (!cam.isVisible(pos.x, pos.y, vis.size + 30)) continue;
      this.entityBuf.push({ e, pos, vis, y: pos.y });
    }
    this.entityBuf.sort((a, b) => a.y - b.y);

    // Draw entities
    for (const { e, pos, vis } of this.entityBuf) {
      // Damage flash — draw white
      const isFlashing = world.has(e, C.DamageFlash);
      const color = isFlashing ? '#ffffff' : vis.color;

      // Pickup bob
      let drawY = pos.y;
      if (world.has(e, C.Pickup)) {
        const pickup = world.get<Pickup>(e, C.Pickup);
        drawY += Math.sin(pickup.bobPhase) * 4;
        // Blink when expiring
        if (pickup.lifetime < 3 && Math.floor(pickup.lifetime * 6) % 2 === 0) continue;
      }

      // Invuln blink for player
      if (world.has(e, C.Player)) {
        const hp = world.get<Health>(e, C.Health);
        if (hp.invuln > 0 && Math.floor(hp.invuln * 10) % 2 === 0) continue;
      }

      drawShape(c, vis.shape, pos.x, drawY, vis.size, color, vis.glow, vis.glowSize || 8, vis.rotation || 0);

      // HP bar for enemies with > 50% missing HP
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
          c.fillRect(bx, by, barW * (hp.current / hp.max), barH);
        }
      }

      // HP bar for destructibles
      if (world.has(e, C.Destructible)) {
        const destr = world.get<Destructible>(e, C.Destructible);
        if (destr.hp < destr.maxHp) {
          const barW = vis.size * 2;
          const barH = 3;
          const bx = pos.x - barW / 2;
          const by = pos.y - vis.size - 8;
          c.fillStyle = '#332200';
          c.fillRect(bx, by, barW, barH);
          c.fillStyle = '#aa8844';
          c.fillRect(bx, by, barW * Math.max(0, destr.hp / destr.maxHp), barH);
        }
      }
    }

    // Explosions
    for (const e of world.query(C.Explosion, C.Pos)) {
      const expl = world.get<Explosion>(e, C.Explosion);
      const pos = world.get<Pos>(e, C.Pos);
      const t = expl.timer / 0.3;
      const r = expl.maxRadius * (1 - t * 0.5);

      c.save();
      c.globalAlpha = t * 0.6;
      c.shadowColor = '#ff6633';
      c.shadowBlur = 20;
      c.fillStyle = '#ff8844';
      c.beginPath();
      c.arc(pos.x, pos.y, r, 0, TWO_PI);
      c.fill();
      c.restore();
    }

    // Particles
    drawParticles(c, this.particles);

    // Floating text
    drawFloatingText(c, this.floatingText);

    c.restore();

    // HUD (screen space)
    if (screen === 'playing') {
      this.drawHUD(world, levelIndex);
    }
  }

  private drawArenaFloor(arenaW: number, arenaH: number): void {
    const c = this.ctx;
    const hw = arenaW / 2;
    const hh = arenaH / 2;

    // Grid lines
    c.strokeStyle = '#151530';
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

  private drawArenaWalls(arenaW: number, arenaH: number): void {
    const c = this.ctx;
    const hw = arenaW / 2;
    const hh = arenaH / 2;

    c.save();
    c.shadowColor = '#ff3366';
    c.shadowBlur = 15;
    c.strokeStyle = '#ff3366';
    c.lineWidth = 3;
    c.strokeRect(-hw, -hh, arenaW, arenaH);
    c.restore();
  }

  private drawHUD(world: World, levelIndex: number): void {
    const c = this.ctx;
    const w = this.camera.width;

    for (const e of world.query(C.Player)) {
      const player = world.get<Player>(e, C.Player);
      const hp = world.get<Health>(e, C.Health);

      // HP bar
      const hpW = 160;
      const hpH = 14;
      c.fillStyle = '#220000';
      c.fillRect(12, 12, hpW, hpH);
      c.fillStyle = hp.current / hp.max > 0.3 ? '#44ff44' : '#ff4444';
      c.fillRect(12, 12, hpW * Math.max(0, hp.current / hp.max), hpH);
      c.strokeStyle = '#444466';
      c.lineWidth = 1;
      c.strokeRect(12, 12, hpW, hpH);

      c.fillStyle = '#ccccdd';
      c.font = '11px monospace';
      c.textAlign = 'left';
      c.fillText(`HP ${Math.ceil(hp.current)}/${hp.max}`, 14, 23);

      // Lives
      c.fillStyle = '#ff6666';
      c.font = '13px monospace';
      c.fillText(`♥ × ${player.lives}`, 12, 42);

      // Score
      c.fillStyle = '#ffcc00';
      c.font = 'bold 16px monospace';
      c.textAlign = 'right';
      c.fillText(`${player.score}`, w - 12, 24);

      c.fillStyle = '#8888aa';
      c.font = '11px monospace';
      c.fillText('SCORE', w - 12, 38);

      // Level
      c.textAlign = 'center';
      c.fillStyle = '#00ffff';
      c.font = 'bold 14px monospace';
      c.fillText(`LEVEL ${levelIndex + 1} / ${TOTAL_LEVELS}`, w / 2, 22);

      // Enemies remaining
      const enemyCount = world.count(C.Enemy);
      c.fillStyle = '#ff6666';
      c.font = '11px monospace';
      c.fillText(`enemies: ${enemyCount}`, w / 2, 38);

      // Current weapon + ammo (bottom center)
      const wState = player.weapons[player.currentWeapon];
      if (wState) {
        const wDef = WEAPONS[wState.type];
        if (wDef) {
          c.textAlign = 'center';
          const ammoText = wState.ammo < 0 ? '∞' : `${wState.ammo}`;
          c.fillStyle = wDef.color;
          c.font = 'bold 15px monospace';
          c.fillText(`${wDef.icon} ${wDef.name}  [${ammoText}]`, w / 2, this.camera.height - 16);
        }
      }

      // Pause button hint
      c.textAlign = 'right';
      c.fillStyle = '#555566';
      c.font = '11px monospace';
      c.fillText('ESC = pause', w - 12, this.camera.height - 12);
    }
  }
}
