/** Unified keyboard + touch input manager with dual joystick + mouse aim */

import { Vec2 } from './math';

export class InputManager {
  readonly dir = new Vec2();
  readonly aimDir = new Vec2();
  private keys = new Set<string>();

  // Movement joystick (left side, mobile)
  private moveId: number | null = null;
  private moveStart = new Vec2();
  private moveCurrent = new Vec2();

  // Aim joystick (right side, mobile)
  private aimId: number | null = null;
  private aimStart = new Vec2();
  private aimCurrent = new Vec2();

  // Mouse aim (PC)
  private mouseX = 0;
  private mouseY = 0;
  private mouseMoved = false;

  private _anyKey = false;
  private _tap = false;
  private _pauseTap = false;
  isMobile = false;

  constructor(private canvas: HTMLCanvasElement) {
    this.isMobile = 'ontouchstart' in window;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd, { passive: false });
    canvas.addEventListener('mousedown', this.onMouseDown);
    if (!this.isMobile) {
      canvas.addEventListener('mousemove', this.onMouseMove);
    }
  }

  get anyKey(): boolean { return this._anyKey; }
  get tap(): boolean { return this._tap; }
  get pauseTap(): boolean { return this._pauseTap; }

  /** PC: always shooting. Mobile: shooting when aim joystick active */
  get isShooting(): boolean {
    return this.isMobile ? this.aimId !== null : true;
  }

  /** Whether there's an active aim direction */
  get isAiming(): boolean {
    return this.isMobile ? this.aimId !== null : this.mouseMoved;
  }

  /** Remove all event listeners to prevent leaks */
  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.canvas.removeEventListener('touchstart', this.onTouchStart);
    this.canvas.removeEventListener('touchmove', this.onTouchMove);
    this.canvas.removeEventListener('touchend', this.onTouchEnd);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
  }

  /** Call once per frame after systems have read input */
  clearFrame(): void {
    this._anyKey = false;
    this._tap = false;
    this._pauseTap = false;
  }

  update(): void {
    // Movement direction
    if (this.moveId !== null) {
      const dx = this.moveCurrent.x - this.moveStart.x;
      const dy = this.moveCurrent.y - this.moveStart.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const deadzone = 15;
      if (dist > deadzone) {
        this.dir.set(dx / dist, dy / dist);
      } else {
        this.dir.set(0, 0);
      }
    } else {
      let x = 0, y = 0;
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
      const len = Math.sqrt(x * x + y * y);
      this.dir.set(len > 0 ? x / len : 0, len > 0 ? y / len : 0);
    }

    // Aim direction
    if (this.isMobile) {
      // Mobile: right joystick
      if (this.aimId !== null) {
        const dx = this.aimCurrent.x - this.aimStart.x;
        const dy = this.aimCurrent.y - this.aimStart.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const deadzone = 15;
        if (dist > deadzone) {
          this.aimDir.set(dx / dist, dy / dist);
        } else {
          this.aimDir.set(0, 0);
        }
      } else {
        this.aimDir.set(0, 0);
      }
    } else {
      // PC: mouse aim from screen center
      const cx = this.canvas.width / (window.devicePixelRatio || 1) / 2;
      const cy = this.canvas.height / (window.devicePixelRatio || 1) / 2;
      const dx = this.mouseX - cx;
      const dy = this.mouseY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 5) {
        this.aimDir.set(dx / dist, dy / dist);
      }
    }
  }

  /** Draw movement joystick (left, cyan) */
  drawJoystick(ctx: CanvasRenderingContext2D): void {
    if (this.moveId === null) return;
    this.drawJoystickVisual(ctx, this.moveStart, this.moveCurrent, '#00ffff');
  }

  /** Draw aim joystick (right, orange) */
  drawAimJoystick(ctx: CanvasRenderingContext2D): void {
    if (this.aimId === null) return;
    this.drawJoystickVisual(ctx, this.aimStart, this.aimCurrent, '#ff6633');
  }

  private drawJoystickVisual(ctx: CanvasRenderingContext2D, start: Vec2, current: Vec2, color: string): void {
    const sx = start.x, sy = start.y;
    const cx = current.x, cy = current.y;

    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx, sy, 60, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.5;
    ctx.fillStyle = color;
    const dx = cx - sx, dy = cy - sy;
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), 40);
    const angle = Math.atan2(dy, dx);
    ctx.beginPath();
    ctx.arc(sx + Math.cos(angle) * dist, sy + Math.sin(angle) * dist, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  get joystickActive(): boolean { return this.moveId !== null; }

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.code);
    this._anyKey = true;
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onMouseDown = (e: MouseEvent) => {
    this._anyKey = true;
    // Pause button zone: top-right corner (matches HUD button position)
    if (e.clientX > window.innerWidth - 48 && e.clientY < 48) {
      this._pauseTap = true;
    }
  };

  private onMouseMove = (e: MouseEvent) => {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
    this.mouseMoved = true;
  };

  private onTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    this._anyKey = true;
    this._tap = true;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];

      // Pause button zone: top-right corner
      if (t.clientX > window.innerWidth - 55 && t.clientY < 55) {
        this._pauseTap = true;
        continue;
      }

      const halfW = window.innerWidth / 2;

      // Left half → movement joystick
      if (t.clientX < halfW && this.moveId === null) {
        this.moveId = t.identifier;
        this.moveStart.set(t.clientX, t.clientY);
        this.moveCurrent.set(t.clientX, t.clientY);
      }
      // Right half → aim joystick
      else if (t.clientX >= halfW && this.aimId === null) {
        this.aimId = t.identifier;
        this.aimStart.set(t.clientX, t.clientY);
        this.aimCurrent.set(t.clientX, t.clientY);
      }
    }
  };

  private onTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === this.moveId) {
        this.moveCurrent.set(t.clientX, t.clientY);
      }
      if (t.identifier === this.aimId) {
        this.aimCurrent.set(t.clientX, t.clientY);
      }
    }
  };

  private onTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const id = e.changedTouches[i].identifier;
      if (id === this.moveId) {
        this.moveId = null;
        this.dir.set(0, 0);
      }
      if (id === this.aimId) {
        this.aimId = null;
        this.aimDir.set(0, 0);
      }
    }
  };
}
