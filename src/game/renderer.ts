/** Game renderer — draws background, entities, effects, HUD */

import { World, Entity } from '../core/ecs';
import { Camera } from '../core/camera';
import { ParticleSystem } from '../core/particles';
import { FloatingTextManager } from '../core/utils';
import { C, Pos, Health, Visual, Player, LightningData, Bonus } from './components';
import { WEAPONS, GAME_DURATION, STAT_UPGRADES } from './config';
import { TWO_PI, clamp } from '../core/math';

const GRID_SIZE = 64;
const BG_COLOR = '#0a0a1a';

export class GameRenderer {
  private stars: { x: number; y: number; s: number; a: number; layer: number }[] = [];

  constructor(
    private ctx: CanvasRenderingContext2D,
    private camera: Camera,
    private particles: ParticleSystem,
    private floatingText: FloatingTextManager,
  ) {
    // Generate parallax dot layers
    for (let i = 0; i < 70; i++) {
      this.stars.push({
        x: Math.random() * 800, y: Math.random() * 800,
        s: 2 + Math.random() * 2.5, a: 0.6 + Math.random() * 0.4, layer: 0,
      });
    }
    for (let i = 0; i < 45; i++) {
      this.stars.push({
        x: Math.random() * 800, y: Math.random() * 800,
        s: 2.5 + Math.random() * 3, a: 0.4 + Math.random() * 0.4, layer: 1,
      });
    }
  }

  render(world: World, gameTime: number, _state: string): void {
    const ctx = this.ctx;
    const w = this.camera.width;
    const h = this.camera.height;

    // Clear
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, w, h);

    // Parallax star layers (screen space)
    this.drawParallax(w, h);

    ctx.save();
    this.camera.apply(ctx);

    this.drawBackground(w, h);
    this.drawAuras(world);
    this.drawEntities(world);
    this.drawLightning(world);
    this.particles.draw(ctx);
    this.floatingText.draw(ctx);

    ctx.restore();

    // HUD (screen space, CSS pixel coords)
    this.drawHUD(world, gameTime, w, h);
  }

  private drawBackground(w: number, h: number): void {
    const ctx = this.ctx;
    const cam = this.camera;
    const spacing = GRID_SIZE;

    const startX = Math.floor((cam.pos.x - w / 2) / spacing) * spacing;
    const startY = Math.floor((cam.pos.y - h / 2) / spacing) * spacing;
    const endX = cam.pos.x + w / 2 + spacing;
    const endY = cam.pos.y + h / 2 + spacing;

    // Subtle dots at grid intersections instead of lines
    ctx.fillStyle = '#222244';
    for (let x = startX; x <= endX; x += spacing) {
      for (let y = startY; y <= endY; y += spacing) {
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }
  }

  private drawParallax(w: number, h: number): void {
    const ctx = this.ctx;
    const T = 800;
    const speeds = [0.05, 0.15];
    const colors = ['#99bbdd', '#bbddff'];

    for (let layer = 0; layer < 2; layer++) {
      const ox = (this.camera.pos.x * speeds[layer]) % T;
      const oy = (this.camera.pos.y * speeds[layer]) % T;
      ctx.fillStyle = colors[layer];

      for (const star of this.stars) {
        if (star.layer !== layer) continue;
        ctx.globalAlpha = star.a;
        const baseX = ((star.x - ox) % T + T) % T;
        const baseY = ((star.y - oy) % T + T) % T;
        for (let tx = baseX - T; tx < w + star.s; tx += T) {
          if (tx + star.s < 0) continue;
          for (let ty = baseY - T; ty < h + star.s; ty += T) {
            if (ty + star.s < 0) continue;
            ctx.fillRect(tx, ty, star.s, star.s);
          }
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawAuras(world: World): void {
    const ctx = this.ctx;
    const players = world.query(C.Player, C.Pos);
    if (players.length === 0) return;

    const pPos = world.get<Pos>(players[0], C.Pos);
    const player = world.get<Player>(players[0], C.Player);

    for (const slot of player.weapons) {
      if (slot.type === 'holy_aura') {
        const lvl = WEAPONS.holy_aura.levels[Math.min(slot.level, WEAPONS.holy_aura.levels.length - 1)];
        const pulse = 1 + Math.sin(Date.now() * 0.005) * 0.05;
        ctx.save();
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = WEAPONS.holy_aura.color;
        ctx.beginPath();
        ctx.arc(pPos.x, pPos.y, lvl.size * pulse, 0, TWO_PI);
        ctx.fill();
        ctx.globalAlpha = 0.2;
        ctx.strokeStyle = WEAPONS.holy_aura.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  private drawEntities(world: World): void {
    const ctx = this.ctx;
    const cam = this.camera;

    // Collect and sort by Y for pseudo-depth
    const entities: { e: Entity; pos: Pos; vis: Visual }[] = [];
    for (const e of world.query(C.Pos, C.Visual)) {
      const pos = world.get<Pos>(e, C.Pos);
      if (!cam.isVisible(pos.x, pos.y, 50)) continue;
      const vis = world.get<Visual>(e, C.Visual);
      entities.push({ e, pos, vis });
    }
    entities.sort((a, b) => a.pos.y - b.pos.y);

    for (const { e, pos, vis } of entities) {
      ctx.save();
      ctx.translate(pos.x, pos.y);

      // Fire trail — lightweight layered circles (no shadowBlur for perf)
      if (vis.shape === 'flame') {
        const s = vis.size;
        const seed = pos.x * 73.17 + pos.y * 37.91;
        const t = Date.now() * 0.006;
        const flicker = 0.85 + Math.sin(t + seed) * 0.15;

        // Outer red glow (large, transparent)
        ctx.globalAlpha = 0.2 * flicker;
        ctx.fillStyle = '#ff2200';
        ctx.beginPath();
        ctx.arc(0, 0, s * 1.2, 0, TWO_PI);
        ctx.fill();

        // Middle orange
        ctx.globalAlpha = 0.5 * flicker;
        ctx.fillStyle = vis.color;
        ctx.beginPath();
        ctx.arc(Math.sin(t * 1.3 + seed) * s * 0.1, -s * 0.05, s * 0.7, 0, TWO_PI);
        ctx.fill();

        // Inner yellow core
        ctx.globalAlpha = 0.8 * flicker;
        ctx.fillStyle = '#ffee66';
        ctx.beginPath();
        ctx.arc(0, s * 0.05, s * 0.3, 0, TWO_PI);
        ctx.fill();

        ctx.restore();
        continue;
      }

      // Glow effect
      if (vis.glow) {
        ctx.shadowColor = vis.glow;
        ctx.shadowBlur = vis.glowSize ?? 10;
      }

      // Damage flash
      const hp = world.maybe<Health>(e, C.Health);
      if (hp && hp.invuln > 0 && world.has(e, C.Enemy)) {
        ctx.fillStyle = '#ffffff';
      } else {
        ctx.fillStyle = vis.color;
      }

      // Player invuln blink
      if (world.has(e, C.Player) && hp && hp.invuln > 0) {
        ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.02) * 0.5;
      }

      const r = vis.rotation ?? 0;
      if (r) ctx.rotate(r);

      this.drawShape(ctx, vis.shape, vis.size);

      ctx.shadowBlur = 0;

      // Health bar for enemies
      if (world.has(e, C.Enemy) && hp && hp.current < hp.max) {
        ctx.rotate(-r); // undo rotation for health bar
        const barW = vis.size * 2.5;
        const barH = 3;
        const barY = -vis.size - 8;
        ctx.fillStyle = '#333';
        ctx.fillRect(-barW / 2, barY, barW, barH);
        const pct = clamp(hp.current / hp.max, 0, 1);
        ctx.fillStyle = pct > 0.5 ? '#44ff44' : pct > 0.25 ? '#ffcc00' : '#ff4444';
        ctx.fillRect(-barW / 2, barY, barW * pct, barH);
      }

      ctx.restore();
    }

    // XP Gems (draw with bob animation)
    for (const e of world.query(C.XPGem, C.Pos, C.Visual)) {
      const pos = world.get<Pos>(e, C.Pos);
      if (!cam.isVisible(pos.x, pos.y)) continue;
      const vis = world.get<Visual>(e, C.Visual);
      const bob = Math.sin(Date.now() * 0.006 + pos.x * 0.1) * 2;

      ctx.save();
      ctx.translate(pos.x, pos.y + bob);
      if (vis.glow) {
        ctx.shadowColor = vis.glow;
        ctx.shadowBlur = vis.glowSize ?? 6;
      }
      ctx.fillStyle = vis.color;
      this.drawShape(ctx, 'diamond', vis.size);
      ctx.restore();
    }

    // Bonus pickups (bob + spin + aura)
    for (const e of world.query(C.Bonus, C.Pos, C.Visual)) {
      const pos = world.get<Pos>(e, C.Pos);
      if (!cam.isVisible(pos.x, pos.y, 40)) continue;
      const vis = world.get<Visual>(e, C.Visual);
      const bonus = world.get<Bonus>(e, C.Bonus);
      const bob = Math.sin(Date.now() * 0.005 + pos.y * 0.1) * 3;
      const pulse = 0.7 + Math.sin(Date.now() * 0.004) * 0.3;

      ctx.save();
      ctx.translate(pos.x, pos.y + bob);

      // Pulsing aura circle
      ctx.globalAlpha = 0.12 + pulse * 0.08;
      ctx.fillStyle = vis.color;
      ctx.beginPath();
      ctx.arc(0, 0, 28 * pulse, 0, TWO_PI);
      ctx.fill();

      // Aura ring
      ctx.globalAlpha = 0.3 + pulse * 0.2;
      ctx.strokeStyle = vis.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 22 * pulse, 0, TWO_PI);
      ctx.stroke();

      // Shape
      ctx.globalAlpha = 1;
      if (vis.rotation) ctx.rotate(vis.rotation);
      ctx.shadowColor = vis.glow ?? vis.color;
      ctx.shadowBlur = 18;
      ctx.fillStyle = vis.color;
      this.drawShape(ctx, vis.shape, vis.size);

      // Bonus type icon (text label)
      ctx.shadowBlur = 0;
      ctx.rotate(-(vis.rotation ?? 0)); // undo spin for label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      const label = bonus.type === 'heal' ? 'HP' : bonus.type === 'magnet' ? 'MAG' : bonus.type === 'bomb' ? 'DMG' : 'SPD';
      ctx.fillText(label, 0, vis.size + 16);

      ctx.restore();
    }
  }

  private drawLightning(world: World): void {
    const ctx = this.ctx;
    for (const e of world.query(C.Lightning, C.Pos)) {
      const pos = world.get<Pos>(e, C.Pos);
      const l = world.get<LightningData>(e, C.Lightning);

      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#4488ff';
      ctx.shadowBlur = 15;
      ctx.globalAlpha = clamp(l.timer / 0.1, 0, 1);

      // Jagged lightning line
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      const dx = l.targetX - pos.x;
      const dy = l.targetY - pos.y;
      const segments = 6;
      for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const jitter = i < segments ? (Math.random() - 0.5) * 30 : 0;
        ctx.lineTo(pos.x + dx * t + jitter, pos.y + dy * t + jitter);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawShape(ctx: CanvasRenderingContext2D, shape: string, size: number): void {
    ctx.beginPath();
    switch (shape) {
      case 'circle':
        ctx.arc(0, 0, size, 0, TWO_PI);
        break;
      case 'triangle': {
        ctx.moveTo(0, -size);
        ctx.lineTo(-size * 0.85, size * 0.65);
        ctx.lineTo(size * 0.85, size * 0.65);
        ctx.closePath();
        break;
      }
      case 'diamond': {
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.65, 0);
        ctx.lineTo(0, size);
        ctx.lineTo(-size * 0.65, 0);
        ctx.closePath();
        break;
      }
      case 'square':
        ctx.rect(-size * 0.7, -size * 0.7, size * 1.4, size * 1.4);
        break;
      case 'hexagon': {
        for (let i = 0; i < 6; i++) {
          const a = (i * 60 - 30) * Math.PI / 180;
          const x = Math.cos(a) * size;
          const y = Math.sin(a) * size;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        break;
      }
      case 'rocket': {
        // Nose
        ctx.moveTo(0, -size * 1.3);
        // Right side
        ctx.lineTo(size * 0.45, -size * 0.3);
        // Right fin
        ctx.lineTo(size * 0.8, size * 0.9);
        ctx.lineTo(size * 0.3, size * 0.5);
        // Exhaust notch
        ctx.lineTo(0, size * 0.75);
        // Left side (mirror)
        ctx.lineTo(-size * 0.3, size * 0.5);
        ctx.lineTo(-size * 0.8, size * 0.9);
        ctx.lineTo(-size * 0.45, -size * 0.3);
        ctx.closePath();
        break;
      }
      case 'spike': {
        // Jagged angular shard — irregular sharp polygon
        ctx.moveTo(0, -size * 1.1);
        ctx.lineTo(size * 0.5, -size * 0.4);
        ctx.lineTo(size * 1.0, -size * 0.15);
        ctx.lineTo(size * 0.55, size * 0.3);
        ctx.lineTo(size * 0.3, size * 0.95);
        ctx.lineTo(-size * 0.15, size * 0.45);
        ctx.lineTo(-size * 0.7, size * 0.8);
        ctx.lineTo(-size * 0.5, size * 0.1);
        ctx.lineTo(-size * 0.9, -size * 0.35);
        ctx.lineTo(-size * 0.35, -size * 0.45);
        ctx.closePath();
        break;
      }
      case 'star4': {
        // Angular claw / shuriken — 3 sharp prongs
        ctx.moveTo(0, -size * 1.15);
        ctx.lineTo(size * 0.25, -size * 0.2);
        ctx.lineTo(size * 1.0, size * 0.35);
        ctx.lineTo(size * 0.15, size * 0.25);
        ctx.lineTo(-size * 0.15, size * 1.0);
        ctx.lineTo(-size * 0.2, size * 0.15);
        ctx.lineTo(-size * 1.0, -size * 0.1);
        ctx.lineTo(-size * 0.2, -size * 0.2);
        ctx.closePath();
        break;
      }
    }
    ctx.fill();
  }

  drawHUD(world: World, gameTime: number, w: number, h: number): void {
    const ctx = this.ctx;
    const players = world.query(C.Player);
    if (players.length === 0) return;

    const player = world.get<Player>(players[0], C.Player);
    const hp = world.get<Health>(players[0], C.Health);

    // Timer (top center)
    const remaining = Math.max(0, GAME_DURATION - gameTime);
    const min = Math.floor(remaining / 60);
    const sec = Math.floor(remaining % 60);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${min}:${sec.toString().padStart(2, '0')}`, w / 2, 35);

    // Kill count (top right)
    ctx.font = '18px monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ff8888';
    ctx.fillText(`kills: ${player.kills}`, w - 60, 35);

    // Pause button (top right corner)
    const pbX = w - 48, pbY = 12, pbS = 36;
    ctx.fillStyle = '#1a1a3a';
    ctx.fillRect(pbX, pbY, pbS, pbS);
    ctx.strokeStyle = '#444466';
    ctx.lineWidth = 1;
    ctx.strokeRect(pbX, pbY, pbS, pbS);
    ctx.fillStyle = '#888899';
    ctx.fillRect(pbX + 11, pbY + 9, 5, 18);
    ctx.fillRect(pbX + 20, pbY + 9, 5, 18);

    // HP Bar (top left, under enemy count)
    const hpBarW = 160;
    const hpBarH = 14;
    const hpBarX = 20;
    const hpBarY = 44;
    ctx.fillStyle = '#331111';
    ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);
    const hpPct = clamp(hp.current / hp.max, 0, 1);
    ctx.fillStyle = hpPct > 0.5 ? '#44ff44' : hpPct > 0.25 ? '#ffcc00' : '#ff4444';
    ctx.fillRect(hpBarX, hpBarY, hpBarW * hpPct, hpBarH);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(hpBarX, hpBarY, hpBarW, hpBarH);

    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    const hpText = `HP ${Math.ceil(hp.current)}/${Math.ceil(hp.max)}`;
    // Dark outline for readability on green/yellow bar
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeText(hpText, hpBarX + 4, hpBarY + 11);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(hpText, hpBarX + 4, hpBarY + 11);

    // Enemy count (top left, below HP)
    ctx.fillStyle = '#888888';
    const enemyCount = world.count(C.Enemy);
    ctx.font = '12px monospace';
    ctx.fillText(`enemies: ${enemyCount}`, 20, hpBarY + hpBarH + 16);

    // Stat picks (under enemy count, left side)
    const statKeys = Object.keys(player.statPicks).filter(k => player.statPicks[k] > 0);
    if (statKeys.length > 0) {
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      let sx = 20;
      const sy = hpBarY + hpBarH + 32;
      for (const key of statKeys) {
        const stat = STAT_UPGRADES[key as keyof typeof STAT_UPGRADES];
        if (!stat) continue;
        const label = `${stat.icon}x${player.statPicks[key]}`;
        ctx.fillStyle = '#aaaacc';
        ctx.fillText(label, sx, sy);
        sx += ctx.measureText(label).width + 8;
      }
    }

    // Active buffs (right side, stacked vertically)
    if (player.buffs.length > 0) {
      const buffIcons: Record<string, [string, string]> = {
        heal: ['❤️', '#ff4466'],
        magnet: ['🧲', '#44ff88'],
        bomb: ['💥', '#ff8800'],
        speed: ['⚡', '#44ccff'],
      };
      const bSize = 26;
      const bPad = 4;
      const bx = w - 20 - bSize;
      let by = 60;
      for (const buff of player.buffs) {
        const [icon, color] = buffIcons[buff.type] ?? ['?', '#ffffff'];
        const pct = clamp(buff.remaining / buff.duration, 0, 1);

        // Background
        ctx.fillStyle = '#1a1a3a';
        ctx.fillRect(bx, by, bSize, bSize);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, bSize, bSize);

        // Timer fill (drains from bottom up)
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.25;
        ctx.fillRect(bx, by + bSize * (1 - pct), bSize, bSize * pct);
        ctx.globalAlpha = 1;

        // Icon
        ctx.font = '14px serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(icon, bx + bSize / 2, by + bSize / 2 + 5);

        // Timer text
        ctx.font = 'bold 8px monospace';
        ctx.fillStyle = color;
        ctx.fillText(`${Math.ceil(buff.remaining)}s`, bx + bSize / 2, by + bSize + 10);

        by += bSize + bPad + 12;
      }
    }

    // XP Bar (bottom, orange)
    const barH = 8;
    const barY = h - barH;
    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(0, barY, w, barH);
    const xpPct = player.nextLevelXp > 0 ? clamp(player.xp / player.nextLevelXp, 0, 1) : 0;
    const gradient = ctx.createLinearGradient(0, barY, w * xpPct, barY);
    gradient.addColorStop(0, '#cc6600');
    gradient.addColorStop(1, '#ffaa33');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, barY, w * xpPct, barH);

    // Level badge (orange)
    ctx.fillStyle = '#ffaa33';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`LV ${player.level}`, w / 2, h - 16);

    // Weapon icons (bottom right)
    const iconSize = 28;
    const iconPad = 6;
    const startX = w - 20;
    ctx.textAlign = 'center';
    for (let i = player.weapons.length - 1; i >= 0; i--) {
      const slot = player.weapons[i];
      const wDef = WEAPONS[slot.type];
      if (!wDef) continue;
      const ix = startX - (player.weapons.length - 1 - i) * (iconSize + iconPad) - iconSize / 2;
      const iy = h - 60;

      // Background
      ctx.fillStyle = '#1a1a3a';
      ctx.fillRect(ix - iconSize / 2, iy - iconSize / 2, iconSize, iconSize);
      ctx.strokeStyle = wDef.color;
      ctx.lineWidth = 1;
      ctx.strokeRect(ix - iconSize / 2, iy - iconSize / 2, iconSize, iconSize);

      // Icon
      ctx.font = '16px serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(wDef.icon, ix, iy + 5);

      // Level
      ctx.font = '9px monospace';
      ctx.fillStyle = wDef.color;
      ctx.fillText(`${slot.level + 1}`, ix, iy + iconSize / 2 + 10);

      // Cooldown overlay
      const lvl = wDef.levels[Math.min(slot.level, wDef.levels.length - 1)];
      const cdPct = clamp(slot.timer / lvl.cooldown, 0, 1);
      if (cdPct > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(ix - iconSize / 2, iy - iconSize / 2, iconSize, iconSize * cdPct);
      }
    }

    // Hints (bottom left)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#444466';
    ctx.font = '11px monospace';
    ctx.fillText('MOUSE = aim  |  ESC = pause', 20, h - 16);
  }
}
