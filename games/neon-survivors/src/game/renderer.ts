/** Game renderer — draws background, entities, effects, HUD */

import { World, Entity, Camera2D, ParticleSystem, FloatingTextManager, TWO_PI, clamp } from '@survivors/core';
import { C, Pos, Health, Visual, Player, LightningData, Bonus } from './components';
import { WEAPONS, type GameMode } from './config';
import { drawParticles, drawFloatingText, applyCameraToContext } from './canvas-helpers';

import { t } from './i18n';

const GRID_SIZE = 64;
const BG_COLOR = '#0a0a1a';

// Simple seeded PRNG (mulberry32) for deterministic star/planet placement
function seededRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Shared star/planet data — generated once, reused across renderer instances
let _sharedStars: { x: number; y: number; s: number; a: number }[][] | null = null;
let _sharedPlanets: { x: number; y: number; radius: number; color: string; ringColor: string | null; highlight: string }[] | null = null;

function getSharedStars(): { x: number; y: number; s: number; a: number }[][] {
  if (_sharedStars) return _sharedStars;
  const rng = seededRng(42);
  const layers: { x: number; y: number; s: number; a: number }[][] = [[], [], []];
  for (let i = 0; i < 70; i++) {
    layers[0].push({ x: rng() * 800, y: rng() * 800, s: 1.5 + rng() * 1.5, a: 0.4 + rng() * 0.3 });
  }
  for (let i = 0; i < 50; i++) {
    layers[1].push({ x: rng() * 800, y: rng() * 800, s: 2 + rng() * 2.5, a: 0.5 + rng() * 0.4 });
  }
  for (let i = 0; i < 30; i++) {
    layers[2].push({ x: rng() * 800, y: rng() * 800, s: 3 + rng() * 3, a: 0.6 + rng() * 0.4 });
  }
  _sharedStars = layers;
  return layers;
}

type PlanetData = { x: number; y: number; radius: number; color: string; ringColor: string | null; highlight: string };

function getSharedPlanets(): PlanetData[] {
  if (_sharedPlanets) return _sharedPlanets;
  const rng = seededRng(123);
  const planetColors = [
    { color: '#334466', highlight: '#5577aa', ring: '#667799' as string | null },
    { color: '#553344', highlight: '#885566', ring: null as string | null },
    { color: '#335544', highlight: '#558866', ring: '#447755' as string | null },
    { color: '#444466', highlight: '#7777aa', ring: null as string | null },
    { color: '#553322', highlight: '#886644', ring: '#775533' as string | null },
    { color: '#223355', highlight: '#4466aa', ring: null as string | null },
  ];
  const planets: PlanetData[] = [];
  for (let i = 0; i < 6; i++) {
    const pc = planetColors[i % planetColors.length];
    planets.push({
      x: 100 + rng() * 1800, y: 100 + rng() * 1800,
      radius: 25 + rng() * 55,
      color: pc.color, highlight: pc.highlight, ringColor: pc.ring,
    });
  }
  _sharedPlanets = planets;
  return planets;
}

export class GameRenderer {
  private starLayers: { x: number; y: number; s: number; a: number }[][];
  private planets: { x: number; y: number; radius: number; color: string; ringColor: string | null; highlight: string }[];
  private now = 0;
  private entityBuf: { e: Entity; pos: Pos; vis: Visual; y: number }[] = [];
  gameMode: GameMode = 'classic';

  constructor(
    private ctx: CanvasRenderingContext2D,
    private camera: Camera2D,
    private particles: ParticleSystem,
    private floatingText: FloatingTextManager,
  ) {
    this.starLayers = getSharedStars();
    this.planets = getSharedPlanets();
  }

  render(world: World, _gameTime: number, _state: string): void {
    const ctx = this.ctx;
    const w = this.camera.width;
    const h = this.camera.height;
    this.now = Date.now();

    // Clear
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, w, h);

    // Parallax star layers (screen space)
    this.drawParallax(w, h);

    ctx.save();
    applyCameraToContext(ctx, this.camera.pos, this.camera.shakeOffset, w, h);

    this.drawBackground(w, h);
    this.drawAuras(world);
    this.drawEntities(world);
    this.drawLightning(world);
    drawParticles(ctx, this.particles);
    drawFloatingText(ctx, this.floatingText);

    ctx.restore();
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
    const speeds = [0.15, 0.35, 0.55];
    const colors = ['#667799', '#99bbdd', '#bbddff'];

    // Draw planets (very slow parallax, large tile)
    const PT = 2000;
    const planetSpeed = 0.04;
    const pox = (this.camera.pos.x * planetSpeed) % PT;
    const poy = (this.camera.pos.y * planetSpeed) % PT;
    for (const planet of this.planets) {
      const bx = ((planet.x - pox) % PT + PT) % PT;
      const by = ((planet.y - poy) % PT + PT) % PT;
      // Only draw if on screen (with margin)
      for (let tx = bx - PT; tx < w + planet.radius; tx += PT) {
        if (tx + planet.radius < -planet.radius) continue;
        for (let ty = by - PT; ty < h + planet.radius; ty += PT) {
          if (ty + planet.radius < -planet.radius) continue;
          this.drawPlanet(ctx, tx, ty, planet);
        }
      }
    }

    // Stars (pre-organized by layer — no per-star layer check)
    for (let layer = 0; layer < 3; layer++) {
      const ox = (this.camera.pos.x * speeds[layer]) % T;
      const oy = (this.camera.pos.y * speeds[layer]) % T;
      ctx.fillStyle = colors[layer];

      for (const star of this.starLayers[layer]) {
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

  private drawPlanet(
    ctx: CanvasRenderingContext2D, x: number, y: number,
    p: { radius: number; color: string; highlight: string; ringColor: string | null },
  ): void {
    const r = p.radius;
    ctx.save();
    ctx.globalAlpha = 0.18;

    // Body with radial gradient (lit from top-left)
    const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    grad.addColorStop(0, p.highlight);
    grad.addColorStop(1, p.color);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TWO_PI);
    ctx.fill();

    // Ring (for planets that have one)
    if (p.ringColor) {
      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = p.ringColor;
      ctx.lineWidth = 2 + r * 0.04;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.5, r * 0.3, -0.3, 0, TWO_PI);
      ctx.stroke();
    }

    ctx.restore();
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
        const pulse = 1 + Math.sin(this.now * 0.005) * 0.05;
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

    // Collect into persistent buffer and sort by Y for pseudo-depth
    let count = 0;
    for (const e of world.query(C.Pos, C.Visual)) {
      // Skip XP gems and bonuses — drawn separately with animations below
      if (world.has(e, C.XPGem) || world.has(e, C.Bonus)) continue;
      const pos = world.get<Pos>(e, C.Pos);
      if (!cam.isVisible(pos.x, pos.y, 50)) continue;
      const vis = world.get<Visual>(e, C.Visual);
      if (count >= this.entityBuf.length) {
        this.entityBuf.push({ e, pos, vis, y: pos.y });
      } else {
        const entry = this.entityBuf[count];
        entry.e = e; entry.pos = pos; entry.vis = vis; entry.y = pos.y;
      }
      count++;
    }
    this.entityBuf.length = count;
    this.entityBuf.sort((a, b) => a.y - b.y);

    for (let i = 0; i < count; i++) {
      const { e, pos, vis } = this.entityBuf[i];
      ctx.save();
      ctx.translate(pos.x, pos.y);

      // Fire trail — lightweight layered circles (no shadowBlur for perf)
      if (vis.shape === 'flame') {
        const s = vis.size;
        const seed = pos.x * 73.17 + pos.y * 37.91;
        const t = this.now * 0.006;
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

      // Fake glow — cheap radial circle instead of expensive shadowBlur
      if (vis.glow && !world.has(e, C.Enemy)) {
        const isEProj = world.has(e, C.EnemyProjectile);
        ctx.globalAlpha = isEProj ? 0.25 + Math.sin(this.now * 0.012) * 0.1 : 0.15;
        ctx.fillStyle = vis.glow;
        ctx.beginPath();
        ctx.arc(0, 0, vis.size + (vis.glowSize ?? 10), 0, TWO_PI);
        ctx.fill();
        ctx.globalAlpha = 1;
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
        ctx.globalAlpha = 0.5 + Math.sin(this.now * 0.02) * 0.5;
      }

      const r = vis.rotation ?? 0;
      if (r) ctx.rotate(r);

      this.drawShape(ctx, vis.shape, vis.size);

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
      const bob = Math.sin(this.now * 0.006 + pos.x * 0.1) * 2;

      ctx.save();
      ctx.translate(pos.x, pos.y + bob);
      if (vis.glow) {
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = vis.glow;
        ctx.beginPath();
        ctx.arc(0, 0, vis.size + (vis.glowSize ?? 6), 0, TWO_PI);
        ctx.fill();
        ctx.globalAlpha = 1;
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
      const bob = Math.sin(this.now * 0.005 + pos.y * 0.1) * 3;
      const pulse = 0.7 + Math.sin(this.now * 0.004) * 0.3;

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
      // Fake glow for bonus
      const glowColor = vis.glow ?? vis.color;
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = glowColor;
      ctx.beginPath();
      ctx.arc(0, 0, vis.size + 14, 0, TWO_PI);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = vis.color;
      this.drawShape(ctx, vis.shape, vis.size);

      // Bonus type icon (text label)
      ctx.rotate(-(vis.rotation ?? 0)); // undo spin for label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      const strings = t();
      const bonusLabels: Record<string, string> = {
        heal: strings.bonusHeal,
        magnet: strings.bonusMagnet,
        bomb: strings.bonusBomb,
        speed: strings.bonusSpeed,
      };
      const label = bonusLabels[bonus.type] ?? bonus.type.toUpperCase();
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
      ctx.globalAlpha = clamp(l.timer / 0.1, 0, 1);

      // Thick blue under-stroke for glow effect (cheaper than shadowBlur)
      ctx.strokeStyle = '#4488ff';
      ctx.lineWidth = 7;
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

      // Thin white core line
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
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
      case 'bullet': {
        // Elongated oval / pill shape — stretched along Y axis
        ctx.ellipse(0, 0, size * 0.45, size, 0, 0, TWO_PI);
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

}

