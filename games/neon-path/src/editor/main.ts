/**
 * Neon Path — Level Editor
 * Visual canvas-based editor for creating and editing levels.
 */

import {
  LEVELS, WORLD_W, WORLD_H,
  SPIKE_W, SPIKE_H, DOOR_W, DOOR_H,
  COLOR_BG, COLOR_GRID,
  COLOR_PLATFORM_FILL, COLOR_PLATFORM_EDGE,
  COLOR_SPIKE, COLOR_DOOR_EDGE, COLOR_DOOR_FILL,
  COLOR_MOV_PLATFORM,
  COLOR_LASER, COLOR_SAW,
  COLOR_FIRE, COLOR_ACID, COLOR_ORBIT, COLOR_TURRET, COLOR_CRUSHER,
} from '../game/config';
import type {
  LevelDef, Platform, Spike, MovingPlatform, Laser, SawBlade,
  FirePillar, AcidDrop, OrbitBlade, Turret, Crusher,
} from '../game/config';

// ── Types ──────────────────────────────────────────────────────────────────────

type Tool = 'select' | 'platform' | 'spike' | 'door' | 'spawn'
          | 'movingPlatform' | 'laser' | 'saw'
          | 'firePillar' | 'acidDrop' | 'orbitBlade' | 'turret' | 'crusher';

interface Selection { type: string; idx: number }

interface EditorLevel {
  id: number;
  name: string;
  playerSpawn: { x: number; y: number };
  platforms: Platform[];
  spikes: Spike[];
  door: { x: number; y: number };
  movingPlatforms: MovingPlatform[];
  lasers: Laser[];
  saws: SawBlade[];
  firePillars: FirePillar[];
  acidDrops: AcidDrop[];
  orbitBlades: OrbitBlade[];
  turrets: Turret[];
  crushers: Crusher[];
}

const GRID = 20;

// ── State ──────────────────────────────────────────────────────────────────────

let levels: EditorLevel[] = LEVELS.map(normalizeLevel);
let currentIdx = 0;
let level: EditorLevel = levels[0]!;
let tool: Tool = 'platform';
let selected: Selection | null = null;

// Drag / placement state
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let mouseWorld = { x: 0, y: 0 };

// Laser two-click state
let laserStep = 0;
let laserTmp = { x1: 0, y1: 0 };

// OrbitBlade two-click state (first click = center, second = radius point)
let orbitStep = 0;
let orbitTmp = { cx: 0, cy: 0 };

// Undo stack (stores serialized level snapshots)
const undoStack: string[] = [];

// ── DOM references ─────────────────────────────────────────────────────────────

const canvas = document.getElementById('editor-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const coordsEl = document.getElementById('coords')!;
const propContent = document.getElementById('prop-content')!;
const jsonOutput = document.getElementById('json-output') as HTMLTextAreaElement;
const levelNameInput = document.getElementById('level-name-input') as HTMLInputElement;
const levelTabs = document.getElementById('level-tabs')!;
const noSel = document.getElementById('no-sel')!;
const copyMsg = document.getElementById('copy-msg')!;

// ── Canvas sizing ──────────────────────────────────────────────────────────────

let scale = 1;
let offsetX = 0;
let offsetY = 0;

function resizeCanvas(): void {
  const wrap = canvas.parentElement!;
  const cw = wrap.clientWidth;
  const ch = wrap.clientHeight;
  scale = Math.min(cw / WORLD_W, ch / WORLD_H) * 0.95;
  offsetX = (cw - WORLD_W * scale) / 2;
  offsetY = (ch - WORLD_H * scale) / 2;
  canvas.width = cw;
  canvas.height = ch;
  render();
}

window.addEventListener('resize', resizeCanvas);

// ── Coordinate helpers ─────────────────────────────────────────────────────────

function toWorld(sx: number, sy: number): { x: number; y: number } {
  return {
    x: (sx - offsetX) / scale,
    y: (sy - offsetY) / scale,
  };
}

function snap(v: number): number {
  return Math.round(v / GRID) * GRID;
}

function snapPt(x: number, y: number): { x: number; y: number } {
  return { x: snap(x), y: snap(y) };
}

// ── Level helpers ──────────────────────────────────────────────────────────────

function normalizeLevel(l: LevelDef): EditorLevel {
  return {
    id: l.id,
    name: l.name,
    playerSpawn: { ...l.playerSpawn },
    platforms: l.platforms.map(p => ({ ...p })),
    spikes: l.spikes.map(s => ({ ...s })),
    door: { ...l.door },
    movingPlatforms: (l.movingPlatforms ?? []).map(m => ({ ...m })),
    lasers: (l.lasers ?? []).map(la => ({ ...la })),
    saws: (l.saws ?? []).map(s => ({ ...s })),
    firePillars: (l.firePillars ?? []).map(f => ({ ...f })),
    acidDrops: (l.acidDrops ?? []).map(a => ({ ...a })),
    orbitBlades: (l.orbitBlades ?? []).map(o => ({ ...o })),
    turrets: (l.turrets ?? []).map(t => ({ ...t })),
    crushers: (l.crushers ?? []).map(c => ({ ...c })),
  };
}

function switchLevel(idx: number): void {
  currentIdx = idx;
  level = levels[idx]!;
  selected = null;
  laserStep = 0;
  levelNameInput.value = level.name;
  updateLevelTabs();
  updateJSON();
  render();
}

function saveUndo(): void {
  undoStack.push(JSON.stringify(level));
  if (undoStack.length > 50) undoStack.shift();
}

function undo(): void {
  const snap = undoStack.pop();
  if (!snap) return;
  levels[currentIdx] = JSON.parse(snap) as EditorLevel;
  level = levels[currentIdx]!;
  selected = null;
  updateJSON();
  render();
}

// ── Tool helpers ───────────────────────────────────────────────────────────────

function setTool(t: Tool): void {
  tool = t;
  laserStep = 0;
  orbitStep = 0;
  selected = null;
  document.querySelectorAll('.tool-btn').forEach(el => {
    (el as HTMLElement).classList.toggle('active', (el as HTMLElement).dataset['tool'] === t);
  });
  render();
}

// ── Level tabs ─────────────────────────────────────────────────────────────────

function updateLevelTabs(): void {
  levelTabs.innerHTML = '';
  levels.forEach((l, i) => {
    const btn = document.createElement('button');
    btn.className = 'level-btn' + (i === currentIdx ? ' active' : '');
    btn.textContent = String(l.id);
    btn.title = l.name;
    btn.addEventListener('click', () => switchLevel(i));
    levelTabs.appendChild(btn);
  });
}

// ── JSON export ────────────────────────────────────────────────────────────────

function levelToJSON(l: EditorLevel): string {
  const lines: string[] = [];
  lines.push(`  {`);
  lines.push(`    id: ${l.id},`);
  lines.push(`    name: '${l.name}',`);
  lines.push(`    playerSpawn: { x: ${l.playerSpawn.x}, y: ${l.playerSpawn.y} },`);

  lines.push(`    platforms: [`);
  for (const p of l.platforms)
    lines.push(`      { x: ${p.x}, y: ${p.y}, w: ${p.w}, h: ${p.h} },`);
  lines.push(`    ],`);

  lines.push(`    spikes: [`);
  for (const s of l.spikes)
    lines.push(`      { x: ${s.x}, y: ${s.y} },`);
  lines.push(`    ],`);

  lines.push(`    door: { x: ${l.door.x}, y: ${l.door.y} },`);

  if (l.movingPlatforms.length > 0) {
    lines.push(`    movingPlatforms: [`);
    for (const m of l.movingPlatforms)
      lines.push(`      { x: ${m.x}, y: ${m.y}, w: ${m.w}, h: ${m.h}, endX: ${m.endX}, endY: ${m.endY}, speed: ${m.speed} },`);
    lines.push(`    ],`);
  }

  if (l.lasers.length > 0) {
    lines.push(`    lasers: [`);
    for (const la of l.lasers)
      lines.push(`      { x1: ${la.x1}, y1: ${la.y1}, x2: ${la.x2}, y2: ${la.y2}, onTime: ${la.onTime}, offTime: ${la.offTime}, phase: ${la.phase}, thickness: ${la.thickness} },`);
    lines.push(`    ],`);
  }

  if (l.saws.length > 0) {
    lines.push(`    saws: [`);
    for (const s of l.saws)
      lines.push(`      { x: ${s.x}, y: ${s.y}, endX: ${s.endX}, endY: ${s.endY}, radius: ${s.radius}, speed: ${s.speed} },`);
    lines.push(`    ],`);
  }

  if (l.firePillars.length > 0) {
    lines.push(`    firePillars: [`);
    for (const f of l.firePillars)
      lines.push(`      { x: ${f.x}, y: ${f.y}, height: ${f.height}, onTime: ${f.onTime}, offTime: ${f.offTime}, phase: ${f.phase} },`);
    lines.push(`    ],`);
  }

  if (l.acidDrops.length > 0) {
    lines.push(`    acidDrops: [`);
    for (const a of l.acidDrops)
      lines.push(`      { x: ${a.x}, y: ${a.y}, interval: ${a.interval}, speed: ${a.speed} },`);
    lines.push(`    ],`);
  }

  if (l.orbitBlades.length > 0) {
    lines.push(`    orbitBlades: [`);
    for (const o of l.orbitBlades)
      lines.push(`      { cx: ${o.cx}, cy: ${o.cy}, radius: ${o.radius}, speed: ${o.speed}, bladeRadius: ${o.bladeRadius} },`);
    lines.push(`    ],`);
  }

  if (l.turrets.length > 0) {
    lines.push(`    turrets: [`);
    for (const t of l.turrets)
      lines.push(`      { x: ${t.x}, y: ${t.y}, direction: ${t.direction}, interval: ${t.interval}, bulletSpeed: ${t.bulletSpeed} },`);
    lines.push(`    ],`);
  }

  if (l.crushers.length > 0) {
    lines.push(`    crushers: [`);
    for (const c of l.crushers)
      lines.push(`      { x: ${c.x}, y: ${c.y}, w: ${c.w}, h: ${c.h}, strikeY: ${c.strikeY}, triggerX1: ${c.triggerX1}, triggerX2: ${c.triggerX2}, speed: ${c.speed}, retractSpeed: ${c.retractSpeed} },`);
    lines.push(`    ],`);
  }

  lines.push(`  },`);
  return lines.join('\n');
}

function updateJSON(): void {
  jsonOutput.value = levelToJSON(level);
}

// ── Hit testing ────────────────────────────────────────────────────────────────

interface HitResult { type: string; idx: number }

function hitTest(wx: number, wy: number): HitResult | null {
  // Door
  if (wx >= level.door.x - 4 && wx <= level.door.x + DOOR_W + 4 &&
      wy >= level.door.y - 4 && wy <= level.door.y + DOOR_H + 4)
    return { type: 'door', idx: 0 };

  // Spawn
  const sp = level.playerSpawn;
  if (Math.abs(wx - sp.x) < 12 && Math.abs(wy - sp.y) < 12)
    return { type: 'spawn', idx: 0 };

  // Spikes
  for (let i = level.spikes.length - 1; i >= 0; i--) {
    const s = level.spikes[i]!;
    if (Math.abs(wx - s.x) < SPIKE_W / 2 + 4 && Math.abs(wy - s.y) < SPIKE_H + 4)
      return { type: 'spike', idx: i };
  }

  // Moving platforms
  for (let i = level.movingPlatforms.length - 1; i >= 0; i--) {
    const m = level.movingPlatforms[i]!;
    if (wx >= m.x - 4 && wx <= m.x + m.w + 4 && wy >= m.y - 4 && wy <= m.y + m.h + 4)
      return { type: 'movingPlatform', idx: i };
  }

  // Static platforms
  for (let i = level.platforms.length - 1; i >= 0; i--) {
    const p = level.platforms[i]!;
    if (wx >= p.x - 2 && wx <= p.x + p.w + 2 && wy >= p.y - 2 && wy <= p.y + p.h + 2)
      return { type: 'platform', idx: i };
  }

  // Lasers (click near the line)
  for (let i = level.lasers.length - 1; i >= 0; i--) {
    const la = level.lasers[i]!;
    const d = distToSegment(wx, wy, la.x1, la.y1, la.x2, la.y2);
    if (d < 8) return { type: 'laser', idx: i };
  }

  // Saws
  for (let i = level.saws.length - 1; i >= 0; i--) {
    const s = level.saws[i]!;
    const dx = wx - s.x; const dy = wy - s.y;
    if (dx * dx + dy * dy < (s.radius + 6) * (s.radius + 6))
      return { type: 'saw', idx: i };
  }

  // Fire pillars
  for (let i = level.firePillars.length - 1; i >= 0; i--) {
    const f = level.firePillars[i]!;
    if (Math.abs(wx - f.x) < 16 && Math.abs(wy - f.y) < 16)
      return { type: 'firePillar', idx: i };
  }

  // Acid drops
  for (let i = level.acidDrops.length - 1; i >= 0; i--) {
    const a = level.acidDrops[i]!;
    if (Math.abs(wx - a.x) < 12 && Math.abs(wy - a.y) < 12)
      return { type: 'acidDrop', idx: i };
  }

  // Orbit blades
  for (let i = level.orbitBlades.length - 1; i >= 0; i--) {
    const o = level.orbitBlades[i]!;
    const dx = wx - o.cx; const dy = wy - o.cy;
    if (dx * dx + dy * dy < (o.radius + 10) * (o.radius + 10))
      return { type: 'orbitBlade', idx: i };
  }

  // Turrets
  for (let i = level.turrets.length - 1; i >= 0; i--) {
    const t = level.turrets[i]!;
    if (Math.abs(wx - t.x) < 16 && Math.abs(wy - t.y) < 16)
      return { type: 'turret', idx: i };
  }

  // Crushers
  for (let i = level.crushers.length - 1; i >= 0; i--) {
    const c = level.crushers[i]!;
    if (wx >= c.x - 4 && wx <= c.x + c.w + 4 && wy >= c.y - 4 && wy <= c.y + c.h + 4)
      return { type: 'crusher', idx: i };
  }

  return null;
}

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax; const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.sqrt((px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2);
}

// ── Properties panel ───────────────────────────────────────────────────────────

function buildPropRow(label: string, key: string, value: number | string, type = 'number'): HTMLElement {
  const row = document.createElement('div');
  row.className = 'prop-row';
  const lbl = document.createElement('span');
  lbl.className = 'prop-label';
  lbl.textContent = label;
  const inp = document.createElement('input');
  inp.className = 'prop-input';
  inp.type = type;
  inp.value = String(value);
  inp.dataset['key'] = key;
  inp.addEventListener('change', () => { saveUndo(); applyProperty(key, inp.value); });
  row.appendChild(lbl);
  row.appendChild(inp);
  return row;
}

function applyProperty(key: string, rawVal: string): void {
  const val = parseFloat(rawVal);
  if (!selected) return;
  const { type, idx } = selected;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const set = (obj: unknown) => { (obj as any)[key] = val; };
  if (type === 'platform') set(level.platforms[idx]);
  else if (type === 'spike') set(level.spikes[idx]);
  else if (type === 'movingPlatform') set(level.movingPlatforms[idx]);
  else if (type === 'laser') set(level.lasers[idx]);
  else if (type === 'saw') set(level.saws[idx]);
  else if (type === 'firePillar') set(level.firePillars[idx]);
  else if (type === 'acidDrop') set(level.acidDrops[idx]);
  else if (type === 'orbitBlade') set(level.orbitBlades[idx]);
  else if (type === 'turret') set(level.turrets[idx]);
  else if (type === 'crusher') set(level.crushers[idx]);
  else if (type === 'door') set(level.door);
  else if (type === 'spawn') set(level.playerSpawn);

  updateJSON();
  render();
}

function showProperties(sel: Selection | null): void {
  propContent.innerHTML = '';

  if (!sel) {
    propContent.appendChild(noSel);
    return;
  }

  const { type, idx } = sel;
  const title = document.createElement('div');
  title.className = 'section-title';
  title.textContent = type.replace(/([A-Z])/g, ' $1').toUpperCase();
  propContent.appendChild(title);

  const addRow = (label: string, key: string, value: number) =>
    propContent.appendChild(buildPropRow(label, key, value));

  if (type === 'platform') {
    const p = level.platforms[idx]!;
    addRow('X', 'x', p.x); addRow('Y', 'y', p.y);
    addRow('W', 'w', p.w); addRow('H', 'h', p.h);
  } else if (type === 'spike') {
    const s = level.spikes[idx]!;
    addRow('X', 'x', s.x); addRow('Y', 'y', s.y);
  } else if (type === 'movingPlatform') {
    const m = level.movingPlatforms[idx]!;
    addRow('X', 'x', m.x); addRow('Y', 'y', m.y);
    addRow('W', 'w', m.w); addRow('H', 'h', m.h);
    addRow('End X', 'endX', m.endX); addRow('End Y', 'endY', m.endY);
    addRow('Speed', 'speed', m.speed);
  } else if (type === 'laser') {
    const la = level.lasers[idx]!;
    addRow('X1', 'x1', la.x1); addRow('Y1', 'y1', la.y1);
    addRow('X2', 'x2', la.x2); addRow('Y2', 'y2', la.y2);
    addRow('On time', 'onTime', la.onTime); addRow('Off time', 'offTime', la.offTime);
    addRow('Phase', 'phase', la.phase); addRow('Thickness', 'thickness', la.thickness);
  } else if (type === 'saw') {
    const s = level.saws[idx]!;
    addRow('X', 'x', s.x); addRow('Y', 'y', s.y);
    addRow('End X', 'endX', s.endX); addRow('End Y', 'endY', s.endY);
    addRow('Radius', 'radius', s.radius); addRow('Speed', 'speed', s.speed);
  } else if (type === 'firePillar') {
    const f = level.firePillars[idx]!;
    addRow('X', 'x', f.x); addRow('Y (base)', 'y', f.y);
    addRow('Height', 'height', f.height);
    addRow('On time', 'onTime', f.onTime); addRow('Off time', 'offTime', f.offTime);
    addRow('Phase', 'phase', f.phase);
  } else if (type === 'acidDrop') {
    const a = level.acidDrops[idx]!;
    addRow('X', 'x', a.x); addRow('Y', 'y', a.y);
    addRow('Interval', 'interval', a.interval); addRow('Speed', 'speed', a.speed);
  } else if (type === 'orbitBlade') {
    const o = level.orbitBlades[idx]!;
    addRow('Center X', 'cx', o.cx); addRow('Center Y', 'cy', o.cy);
    addRow('Orbit R', 'radius', o.radius); addRow('Speed', 'speed', o.speed);
    addRow('Blade R', 'bladeRadius', o.bladeRadius);
  } else if (type === 'turret') {
    const t = level.turrets[idx]!;
    addRow('X', 'x', t.x); addRow('Y', 'y', t.y);
    addRow('Dir (±1)', 'direction', t.direction);
    addRow('Interval', 'interval', t.interval); addRow('Bullet spd', 'bulletSpeed', t.bulletSpeed);
  } else if (type === 'crusher') {
    const c = level.crushers[idx]!;
    addRow('X', 'x', c.x); addRow('Y', 'y', c.y);
    addRow('W', 'w', c.w); addRow('H', 'h', c.h);
    addRow('Strike Y', 'strikeY', c.strikeY);
    addRow('Trigger X1', 'triggerX1', c.triggerX1); addRow('Trigger X2', 'triggerX2', c.triggerX2);
    addRow('Speed', 'speed', c.speed); addRow('Retract spd', 'retractSpeed', c.retractSpeed);
  } else if (type === 'door') {
    addRow('X', 'x', level.door.x); addRow('Y', 'y', level.door.y);
  } else if (type === 'spawn') {
    addRow('X', 'x', level.playerSpawn.x); addRow('Y', 'y', level.playerSpawn.y);
  }

  const delBtn = document.createElement('button');
  delBtn.id = 'delete-btn';
  delBtn.textContent = 'Delete element';
  delBtn.addEventListener('click', deleteSelected);
  propContent.appendChild(delBtn);
}

function deleteSelected(): void {
  if (!selected) return;
  saveUndo();
  const { type, idx } = selected;
  if (type === 'platform') level.platforms.splice(idx, 1);
  else if (type === 'spike') level.spikes.splice(idx, 1);
  else if (type === 'movingPlatform') level.movingPlatforms.splice(idx, 1);
  else if (type === 'laser') level.lasers.splice(idx, 1);
  else if (type === 'saw') level.saws.splice(idx, 1);
  else if (type === 'firePillar') level.firePillars.splice(idx, 1);
  else if (type === 'acidDrop') level.acidDrops.splice(idx, 1);
  else if (type === 'orbitBlade') level.orbitBlades.splice(idx, 1);
  else if (type === 'turret') level.turrets.splice(idx, 1);
  else if (type === 'crusher') level.crushers.splice(idx, 1);
  // door and spawn cannot be deleted
  selected = null;
  showProperties(null);
  updateJSON();
  render();
}

// ── Drag-move selected element ─────────────────────────────────────────────────

let dragOffX = 0;
let dragOffY = 0;

function applyDragMove(wx: number, wy: number): void {
  if (!selected) return;
  const { type, idx } = selected;
  const nx = snap(wx - dragOffX);
  const ny = snap(wy - dragOffY);

  if (type === 'platform') {
    const p = level.platforms[idx]!;
    p.x = nx; p.y = ny;
  } else if (type === 'spike') {
    const s = level.spikes[idx]!;
    s.x = nx; s.y = ny;
  } else if (type === 'movingPlatform') {
    const m = level.movingPlatforms[idx]!;
    const dx = nx - m.x; const dy = ny - m.y;
    m.endX += dx; m.endY += dy;
    m.x = nx; m.y = ny;
  } else if (type === 'laser') {
    const la = level.lasers[idx]!;
    const dx = nx - la.x1; const dy = ny - la.y1;
    la.x2 += dx; la.y2 += dy;
    la.x1 = nx; la.y1 = ny;
  } else if (type === 'saw') {
    const s = level.saws[idx]!;
    const dx = nx - s.x; const dy = ny - s.y;
    s.endX += dx; s.endY += dy;
    s.x = nx; s.y = ny;
  } else if (type === 'firePillar') {
    const f = level.firePillars[idx]!;
    f.x = nx; f.y = ny;
  } else if (type === 'acidDrop') {
    const a = level.acidDrops[idx]!;
    a.x = nx; a.y = ny;
  } else if (type === 'orbitBlade') {
    const o = level.orbitBlades[idx]!;
    o.cx = nx; o.cy = ny;
  } else if (type === 'turret') {
    const t = level.turrets[idx]!;
    t.x = nx; t.y = ny;
  } else if (type === 'crusher') {
    const c = level.crushers[idx]!;
    c.x = nx; c.y = ny;
  } else if (type === 'door') {
    level.door.x = nx; level.door.y = ny;
  } else if (type === 'spawn') {
    level.playerSpawn.x = nx; level.playerSpawn.y = ny;
  }
  showProperties(selected);
  updateJSON();
  render();
}

// ── Pointer events ─────────────────────────────────────────────────────────────

canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const raw = toWorld(e.clientX - rect.left, e.clientY - rect.top);
  const sp = snapPt(raw.x, raw.y);

  // ── Select tool ───────────────────────────────────────────────────
  if (tool === 'select') {
    const hit = hitTest(raw.x, raw.y);
    if (hit) {
      selected = hit;
      showProperties(selected);
      isDragging = true;
      // Compute offset from element origin
      const el = getElementOrigin(hit);
      dragOffX = raw.x - el.x;
      dragOffY = raw.y - el.y;
      saveUndo();
    } else {
      selected = null;
      showProperties(null);
    }
    render();
    return;
  }

  // ── Placement tools ───────────────────────────────────────────────
  saveUndo();

  if (tool === 'spike') {
    level.spikes.push({ x: sp.x, y: sp.y });
    selected = { type: 'spike', idx: level.spikes.length - 1 };
    showProperties(selected);
    updateJSON(); render(); return;
  }
  if (tool === 'door') {
    level.door = { x: sp.x, y: sp.y };
    selected = { type: 'door', idx: 0 };
    showProperties(selected);
    updateJSON(); render(); return;
  }
  if (tool === 'spawn') {
    level.playerSpawn = { x: sp.x, y: sp.y };
    selected = { type: 'spawn', idx: 0 };
    showProperties(selected);
    updateJSON(); render(); return;
  }
  if (tool === 'saw') {
    level.saws.push({ x: sp.x, y: sp.y, endX: sp.x + 120, endY: sp.y, radius: 12, speed: 90 });
    selected = { type: 'saw', idx: level.saws.length - 1 };
    showProperties(selected);
    updateJSON(); render(); return;
  }
  if (tool === 'firePillar') {
    level.firePillars.push({ x: sp.x, y: sp.y, height: 80, onTime: 0.8, offTime: 1.6, phase: 0 });
    selected = { type: 'firePillar', idx: level.firePillars.length - 1 };
    showProperties(selected);
    updateJSON(); render(); return;
  }
  if (tool === 'acidDrop') {
    level.acidDrops.push({ x: sp.x, y: sp.y, interval: 2.0, speed: 180 });
    selected = { type: 'acidDrop', idx: level.acidDrops.length - 1 };
    showProperties(selected);
    updateJSON(); render(); return;
  }
  if (tool === 'turret') {
    level.turrets.push({ x: sp.x, y: sp.y, direction: 1, interval: 2.0, bulletSpeed: 160 });
    selected = { type: 'turret', idx: level.turrets.length - 1 };
    showProperties(selected);
    updateJSON(); render(); return;
  }

  // OrbitBlade: two clicks (center, then radius point)
  if (tool === 'orbitBlade') {
    if (orbitStep === 0) {
      orbitTmp = { cx: sp.x, cy: sp.y };
      orbitStep = 1;
    } else {
      const r = Math.round(Math.sqrt((sp.x - orbitTmp.cx) ** 2 + (sp.y - orbitTmp.cy) ** 2));
      level.orbitBlades.push({ cx: orbitTmp.cx, cy: orbitTmp.cy, radius: Math.max(r, 20), speed: 2.0, bladeRadius: 10 });
      selected = { type: 'orbitBlade', idx: level.orbitBlades.length - 1 };
      showProperties(selected);
      orbitStep = 0;
      updateJSON(); render();
    }
    return;
  }

  // Laser: two clicks
  if (tool === 'laser') {
    if (laserStep === 0) {
      laserTmp = { x1: sp.x, y1: sp.y };
      laserStep = 1;
    } else {
      level.lasers.push({ x1: laserTmp.x1, y1: laserTmp.y1, x2: sp.x, y2: sp.y, onTime: 1.2, offTime: 0.9, phase: 0, thickness: 4 });
      selected = { type: 'laser', idx: level.lasers.length - 1 };
      showProperties(selected);
      laserStep = 0;
      updateJSON(); render();
    }
    return;
  }

  // Rect-drag tools
  isDragging = true;
  dragStart = sp;
});

canvas.addEventListener('pointermove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const raw = toWorld(e.clientX - rect.left, e.clientY - rect.top);
  mouseWorld = snapPt(raw.x, raw.y);
  coordsEl.textContent = `${mouseWorld.x}, ${mouseWorld.y}`;

  if (isDragging && tool === 'select' && selected) {
    applyDragMove(raw.x, raw.y);
  }

  render();
});

canvas.addEventListener('pointerup', () => {
  if (!isDragging) return;
  isDragging = false;

  if (tool === 'platform' || tool === 'movingPlatform' || tool === 'crusher') {
    const x = Math.min(dragStart.x, mouseWorld.x);
    const y = Math.min(dragStart.y, mouseWorld.y);
    const w = Math.abs(mouseWorld.x - dragStart.x);
    const h = Math.abs(mouseWorld.y - dragStart.y);
    if (w < GRID || h < GRID) return; // too small

    if (tool === 'platform') {
      level.platforms.push({ x, y, w, h });
      selected = { type: 'platform', idx: level.platforms.length - 1 };
    } else if (tool === 'movingPlatform') {
      level.movingPlatforms.push({ x, y, w, h, endX: x + 100, endY: y, speed: 80 });
      selected = { type: 'movingPlatform', idx: level.movingPlatforms.length - 1 };
    } else {
      level.crushers.push({ x, y, w, h, strikeY: y + 120, triggerX1: x, triggerX2: x + w, speed: 400, retractSpeed: 80 });
      selected = { type: 'crusher', idx: level.crushers.length - 1 };
    }
    showProperties(selected);
    updateJSON();
    render();
  }
});

// ── Right-click to delete ──────────────────────────────────────────────────────

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const raw = toWorld(e.clientX - rect.left, e.clientY - rect.top);
  const hit = hitTest(raw.x, raw.y);
  if (hit && hit.type !== 'door' && hit.type !== 'spawn') {
    saveUndo();
    selected = hit;
    deleteSelected();
  }
});

// ── Keyboard shortcuts ─────────────────────────────────────────────────────────

window.addEventListener('keydown', (e) => {
  if (e.target !== document.body && e.target !== canvas) return;

  if (e.key === 'Escape') { selected = null; laserStep = 0; showProperties(null); render(); }
  if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
  if (e.ctrlKey && e.key === 'z') undo();

  // Tool shortcuts
  const map: Record<string, Tool> = {
    v: 'select', p: 'platform', s: 'spike', d: 'door',
    w: 'spawn', m: 'movingPlatform', l: 'laser', a: 'saw',
    f: 'firePillar', c: 'acidDrop', o: 'orbitBlade', t: 'turret', r: 'crusher',
  };
  if (!e.ctrlKey && map[e.key.toLowerCase()]) setTool(map[e.key.toLowerCase()]!);
});

// ── Element origin for drag offset ────────────────────────────────────────────

function getElementOrigin(sel: Selection): { x: number; y: number } {
  const { type, idx } = sel;
  if (type === 'platform') { const p = level.platforms[idx]!; return { x: p.x, y: p.y }; }
  if (type === 'spike') { const s = level.spikes[idx]!; return { x: s.x, y: s.y }; }
  if (type === 'movingPlatform') { const m = level.movingPlatforms[idx]!; return { x: m.x, y: m.y }; }
  if (type === 'laser') { const la = level.lasers[idx]!; return { x: la.x1, y: la.y1 }; }
  if (type === 'saw') { const s = level.saws[idx]!; return { x: s.x, y: s.y }; }
  if (type === 'firePillar') { const f = level.firePillars[idx]!; return { x: f.x, y: f.y }; }
  if (type === 'acidDrop') { const a = level.acidDrops[idx]!; return { x: a.x, y: a.y }; }
  if (type === 'orbitBlade') { const o = level.orbitBlades[idx]!; return { x: o.cx, y: o.cy }; }
  if (type === 'turret') { const t = level.turrets[idx]!; return { x: t.x, y: t.y }; }
  if (type === 'crusher') { const c = level.crushers[idx]!; return { x: c.x, y: c.y }; }
  if (type === 'door') return { x: level.door.x, y: level.door.y };
  return { x: level.playerSpawn.x, y: level.playerSpawn.y };
}

// ── Rendering ──────────────────────────────────────────────────────────────────

function worldToScreen(wx: number, wy: number): { sx: number; sy: number } {
  return { sx: offsetX + wx * scale, sy: offsetY + wy * scale };
}

function scaleN(n: number): number { return n * scale; }

function render(): void {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = COLOR_BG;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  // Grid
  ctx.strokeStyle = COLOR_GRID;
  ctx.lineWidth = 1 / scale;
  for (let x = 0; x <= WORLD_W; x += GRID) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_H); ctx.stroke();
  }
  for (let y = 0; y <= WORLD_H; y += GRID) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_W, y); ctx.stroke();
  }

  // World border
  ctx.strokeStyle = 'rgba(0, 191, 255, 0.3)';
  ctx.lineWidth = 2 / scale;
  ctx.strokeRect(0, 0, WORLD_W, WORLD_H);

  // ── Static platforms
  for (let i = 0; i < level.platforms.length; i++) {
    const p = level.platforms[i]!;
    const sel = selected?.type === 'platform' && selected.idx === i;
    drawPlatform(p.x, p.y, p.w, p.h, sel, COLOR_PLATFORM_EDGE);
  }

  // ── Moving platforms
  for (let i = 0; i < level.movingPlatforms.length; i++) {
    const m = level.movingPlatforms[i]!;
    const sel = selected?.type === 'movingPlatform' && selected.idx === i;

    // Path line
    ctx.save();
    ctx.setLineDash([6 / scale, 6 / scale]);
    ctx.strokeStyle = 'rgba(0,229,255,0.35)';
    ctx.lineWidth = 1.5 / scale;
    ctx.beginPath();
    ctx.moveTo(m.x + m.w / 2, m.y + m.h / 2);
    ctx.lineTo(m.endX + m.w / 2, m.endY + m.h / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // End point marker
    ctx.fillStyle = COLOR_MOV_PLATFORM;
    ctx.beginPath();
    ctx.arc(m.endX + m.w / 2, m.endY + m.h / 2, 4 / scale, 0, Math.PI * 2);
    ctx.fill();

    drawPlatform(m.x, m.y, m.w, m.h, sel, COLOR_MOV_PLATFORM);
  }

  // ── Spikes
  for (let i = 0; i < level.spikes.length; i++) {
    const s = level.spikes[i]!;
    const sel = selected?.type === 'spike' && selected.idx === i;
    ctx.fillStyle = sel ? '#ff8080' : COLOR_SPIKE;
    ctx.beginPath();
    ctx.moveTo(s.x - SPIKE_W / 2, s.y);
    ctx.lineTo(s.x, s.y - SPIKE_H);
    ctx.lineTo(s.x + SPIKE_W / 2, s.y);
    ctx.closePath();
    ctx.fill();
    if (sel) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5 / scale; ctx.stroke(); }
  }

  // ── Lasers
  for (let i = 0; i < level.lasers.length; i++) {
    const la = level.lasers[i]!;
    const sel = selected?.type === 'laser' && selected.idx === i;
    ctx.strokeStyle = sel ? '#ff8844' : COLOR_LASER;
    ctx.lineWidth = (la.thickness || 4) / scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(la.x1, la.y1);
    ctx.lineTo(la.x2, la.y2);
    ctx.stroke();
    // End caps
    ctx.fillStyle = sel ? '#ff8844' : COLOR_LASER;
    for (const [ex, ey] of [[la.x1, la.y1], [la.x2, la.y2]] as [number, number][]) {
      ctx.beginPath(); ctx.arc(ex, ey, 5 / scale, 0, Math.PI * 2); ctx.fill();
    }
    // Label
    ctx.font = `${10 / scale}px monospace`;
    ctx.fillStyle = '#ff8844';
    ctx.fillText(`on:${la.onTime} off:${la.offTime}`, la.x1 + 4, la.y1 - 6);
  }

  // ── Saw blades
  for (let i = 0; i < level.saws.length; i++) {
    const s = level.saws[i]!;
    const sel = selected?.type === 'saw' && selected.idx === i;

    // Path
    ctx.save();
    ctx.setLineDash([5 / scale, 8 / scale]);
    ctx.strokeStyle = 'rgba(255,0,204,0.35)';
    ctx.lineWidth = 1.5 / scale;
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.endX, s.endY); ctx.stroke();
    ctx.setLineDash([]); ctx.restore();

    // End marker
    ctx.fillStyle = COLOR_SAW;
    ctx.beginPath(); ctx.arc(s.endX, s.endY, 4 / scale, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = sel ? '#ff88ee' : COLOR_SAW;
    ctx.lineWidth = 2 / scale;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2); ctx.stroke();
    // Cross
    ctx.beginPath();
    ctx.moveTo(s.x - s.radius + 3, s.y); ctx.lineTo(s.x + s.radius - 3, s.y);
    ctx.moveTo(s.x, s.y - s.radius + 3); ctx.lineTo(s.x, s.y + s.radius - 3);
    ctx.stroke();
  }

  // ── Door
  {
    const { x, y } = level.door;
    const sel = selected?.type === 'door';
    ctx.fillStyle = COLOR_DOOR_FILL;
    ctx.fillRect(x, y, DOOR_W, DOOR_H);
    ctx.strokeStyle = sel ? '#88ffcc' : COLOR_DOOR_EDGE;
    ctx.lineWidth = 2 / scale;
    ctx.strokeRect(x, y, DOOR_W, DOOR_H);
    ctx.fillStyle = COLOR_DOOR_EDGE;
    ctx.font = `${8 / scale}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', x + DOOR_W / 2, y + DOOR_H / 2);
    ctx.textAlign = 'left';
  }

  // ── Spawn
  {
    const { x, y } = level.playerSpawn;
    const sel = selected?.type === 'spawn';
    ctx.strokeStyle = sel ? '#88ddff' : 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2 / scale;
    ctx.beginPath();
    ctx.moveTo(x - 8, y); ctx.lineTo(x + 8, y);
    ctx.moveTo(x, y - 8); ctx.lineTo(x, y + 8);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.stroke();
    ctx.font = `${9 / scale}px monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('SPAWN', x + 6, y - 4);
  }

  // ── Fire pillars
  for (let i = 0; i < level.firePillars.length; i++) {
    const f = level.firePillars[i]!;
    const sel = selected?.type === 'firePillar' && selected.idx === i;
    ctx.strokeStyle = sel ? '#ffaa44' : COLOR_FIRE;
    ctx.lineWidth = 2 / scale;
    // Base marker
    ctx.beginPath(); ctx.arc(f.x, f.y, 8, 0, Math.PI * 2); ctx.stroke();
    // Height indicator
    ctx.setLineDash([4 / scale, 4 / scale]);
    ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x, f.y - f.height); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(f.x, f.y - f.height, 4, 0, Math.PI * 2); ctx.stroke();
    ctx.font = `${9 / scale}px monospace`;
    ctx.fillStyle = COLOR_FIRE;
    ctx.fillText(`FIRE h:${f.height}`, f.x + 10, f.y - 4);
  }

  // ── Acid drops
  for (let i = 0; i < level.acidDrops.length; i++) {
    const a = level.acidDrops[i]!;
    const sel = selected?.type === 'acidDrop' && selected.idx === i;
    ctx.strokeStyle = sel ? '#88ff44' : COLOR_ACID;
    ctx.fillStyle = COLOR_ACID;
    ctx.lineWidth = 2 / scale;
    ctx.beginPath(); ctx.arc(a.x, a.y, 7, 0, Math.PI * 2); ctx.stroke();
    // Drop arrow
    ctx.beginPath(); ctx.moveTo(a.x, a.y + 7); ctx.lineTo(a.x, a.y + 28);
    ctx.moveTo(a.x - 5, a.y + 22); ctx.lineTo(a.x, a.y + 28); ctx.lineTo(a.x + 5, a.y + 22);
    ctx.stroke();
    ctx.font = `${9 / scale}px monospace`;
    ctx.fillText(`ACID`, a.x + 9, a.y + 4);
  }

  // ── Orbit blades
  for (let i = 0; i < level.orbitBlades.length; i++) {
    const o = level.orbitBlades[i]!;
    const sel = selected?.type === 'orbitBlade' && selected.idx === i;
    ctx.strokeStyle = sel ? '#ffcc44' : COLOR_ORBIT;
    ctx.lineWidth = 1.5 / scale;
    ctx.setLineDash([5 / scale, 5 / scale]);
    ctx.beginPath(); ctx.arc(o.cx, o.cy, o.radius, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    // Center
    ctx.beginPath(); ctx.arc(o.cx, o.cy, 4, 0, Math.PI * 2); ctx.stroke();
    // Blade preview at angle 0
    ctx.fillStyle = COLOR_ORBIT;
    ctx.beginPath(); ctx.arc(o.cx + o.radius, o.cy, o.bladeRadius, 0, Math.PI * 2); ctx.fill();
    ctx.font = `${9 / scale}px monospace`;
    ctx.fillStyle = COLOR_ORBIT;
    ctx.fillText(`ORBIT r:${o.radius}`, o.cx + 4, o.cy - 4);
  }

  // ── Turrets
  for (let i = 0; i < level.turrets.length; i++) {
    const t = level.turrets[i]!;
    const sel = selected?.type === 'turret' && selected.idx === i;
    ctx.strokeStyle = sel ? '#ff6666' : COLOR_TURRET;
    ctx.fillStyle = COLOR_TURRET;
    ctx.lineWidth = 2 / scale;
    ctx.strokeRect(t.x - 10, t.y - 10, 20, 20);
    // Barrel
    const blen = 20;
    ctx.beginPath();
    ctx.moveTo(t.x, t.y);
    ctx.lineTo(t.x + t.direction * blen, t.y);
    ctx.stroke();
    ctx.font = `${9 / scale}px monospace`;
    ctx.fillText(`TURRET`, t.x + t.direction * (blen + 4), t.y + 4);
  }

  // ── Crushers
  for (let i = 0; i < level.crushers.length; i++) {
    const c = level.crushers[i]!;
    const sel = selected?.type === 'crusher' && selected.idx === i;
    drawPlatform(c.x, c.y, c.w, c.h, sel, COLOR_CRUSHER);
    // Strike line
    ctx.strokeStyle = 'rgba(153,51,255,0.4)';
    ctx.lineWidth = 1 / scale;
    ctx.setLineDash([4 / scale, 4 / scale]);
    ctx.beginPath(); ctx.moveTo(c.x, c.strikeY); ctx.lineTo(c.x + c.w, c.strikeY); ctx.stroke();
    ctx.setLineDash([]);
    // Trigger zone
    ctx.strokeStyle = 'rgba(153,51,255,0.25)';
    ctx.lineWidth = 1 / scale;
    ctx.strokeRect(c.triggerX1, c.y, c.triggerX2 - c.triggerX1, WORLD_H - c.y);
    ctx.font = `${9 / scale}px monospace`;
    ctx.fillStyle = COLOR_CRUSHER;
    ctx.fillText(`CRUSH`, c.x + 2, c.y - 4);
  }

  // ── Placement preview
  if (isDragging && (tool === 'platform' || tool === 'movingPlatform' || tool === 'crusher')) {
    const x = Math.min(dragStart.x, mouseWorld.x);
    const y = Math.min(dragStart.y, mouseWorld.y);
    const w = Math.abs(mouseWorld.x - dragStart.x);
    const h = Math.abs(mouseWorld.y - dragStart.y);
    ctx.globalAlpha = 0.45;
    const previewColor = tool === 'movingPlatform' ? COLOR_MOV_PLATFORM
      : tool === 'crusher' ? COLOR_CRUSHER : COLOR_PLATFORM_EDGE;
    drawPlatform(x, y, w, h, false, previewColor);
    ctx.globalAlpha = 1;
  }

  // Laser first-click preview
  if (tool === 'laser' && laserStep === 1) {
    ctx.strokeStyle = COLOR_LASER;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 4 / scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(laserTmp.x1, laserTmp.y1);
    ctx.lineTo(mouseWorld.x, mouseWorld.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // OrbitBlade first-click preview
  if (tool === 'orbitBlade' && orbitStep === 1) {
    const r = Math.round(Math.sqrt((mouseWorld.x - orbitTmp.cx) ** 2 + (mouseWorld.y - orbitTmp.cy) ** 2));
    ctx.strokeStyle = COLOR_ORBIT;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1.5 / scale;
    ctx.setLineDash([5 / scale, 5 / scale]);
    ctx.beginPath(); ctx.arc(orbitTmp.cx, orbitTmp.cy, Math.max(r, 20), 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  void scaleN(0); // suppress unused warning
  void worldToScreen(0, 0);
  void scaleN;
  void worldToScreen;
}

function drawPlatform(x: number, y: number, w: number, h: number, selected: boolean, color: string): void {
  ctx.fillStyle = COLOR_PLATFORM_FILL;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = selected ? '#ffffff' : color;
  ctx.lineWidth = selected ? 2.5 / scale : 1.5 / scale;
  ctx.strokeRect(x, y, w, h);
  // Bright top edge
  ctx.strokeStyle = color;
  ctx.lineWidth = 2 / scale;
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + w, y);
  ctx.stroke();
  if (selected) {
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.5 / scale;
    ctx.setLineDash([4 / scale, 4 / scale]);
    ctx.strokeRect(x - 3, y - 3, w + 6, h + 6);
    ctx.setLineDash([]);
  }
}

// ── Wire up toolbar buttons ────────────────────────────────────────────────────

document.querySelectorAll<HTMLElement>('.tool-btn').forEach(btn => {
  btn.addEventListener('click', () => setTool(btn.dataset['tool'] as Tool));
});

levelNameInput.addEventListener('input', () => {
  level.name = levelNameInput.value;
  updateLevelTabs();
  updateJSON();
});

document.getElementById('reset-btn')!.addEventListener('click', () => {
  if (!confirm('Reset level to default? This cannot be undone.')) return;
  levels[currentIdx] = normalizeLevel(LEVELS[currentIdx] ?? {
    id: levels.length + 1, name: 'New Level', playerSpawn: { x: 400, y: 200 },
    platforms: [], spikes: [], door: { x: 20, y: 200 },
  } as LevelDef);
  level = levels[currentIdx]!;
  levelNameInput.value = level.name;
  selected = null;
  showProperties(null);
  updateJSON(); render();
});

document.getElementById('new-level-btn')!.addEventListener('click', () => {
  const newLevel: EditorLevel = {
    id: levels.length + 1,
    name: `LEVEL ${levels.length + 1}`,
    playerSpawn: { x: 700, y: 360 },
    platforms: [
      { x: 0, y: 400, w: 800, h: 50 },
      { x: 600, y: 360, w: 200, h: 90 },
    ],
    spikes: [],
    door: { x: 20, y: 350 },
    movingPlatforms: [],
    lasers: [],
    saws: [],
    firePillars: [],
    acidDrops: [],
    orbitBlades: [],
    turrets: [],
    crushers: [],
  };
  levels.push(newLevel);
  updateLevelTabs();
  switchLevel(levels.length - 1);
});

document.getElementById('copy-btn')!.addEventListener('click', () => {
  navigator.clipboard.writeText(jsonOutput.value).then(() => {
    copyMsg.style.display = 'block';
    setTimeout(() => { copyMsg.style.display = 'none'; }, 1800);
  });
});

document.getElementById('import-btn')!.addEventListener('click', () => {
  const raw = prompt('Paste level JSON object:');
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as LevelDef;
    saveUndo();
    levels[currentIdx] = normalizeLevel(parsed);
    level = levels[currentIdx]!;
    levelNameInput.value = level.name;
    selected = null;
    showProperties(null);
    updateJSON(); render();
  } catch {
    alert('Invalid JSON. Make sure it is a valid level object.');
  }
});

// ── Prevent context menu on canvas ────────────────────────────────────────────
canvas.addEventListener('contextmenu', e => e.preventDefault());

// ── Init ──────────────────────────────────────────────────────────────────────

setTool('platform');
showProperties(null);
updateLevelTabs();
levelNameInput.value = level.name;
updateJSON();
resizeCanvas();
