/**
 * Canvas2D drawing helpers — re-exported from @survivors/core.
 * drawShape is game-specific (neon-depths visual styles).
 */
export { drawJoystick, drawParticles, drawFloatingText, applyCameraToContext } from '@survivors/core';

const TWO_PI = Math.PI * 2;

export function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: string,
  x: number, y: number,
  size: number, color: string,
  glow: string | undefined, glowSize: number,
  rotation: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  if (rotation) ctx.rotate(rotation);

  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = glowSize;
  }
  ctx.fillStyle = color;

  switch (shape) {
    case 'circle':
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, TWO_PI);
      ctx.fill();
      break;
    case 'square':
      ctx.fillRect(-size, -size, size * 2, size * 2);
      break;
    case 'diamond':
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size, 0);
      ctx.lineTo(0, size);
      ctx.lineTo(-size, 0);
      ctx.closePath();
      ctx.fill();
      break;
    case 'triangle':
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.87, size * 0.5);
      ctx.lineTo(-size * 0.87, size * 0.5);
      ctx.closePath();
      ctx.fill();
      break;
    case 'hexagon': {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TWO_PI - Math.PI / 2;
        ctx.lineTo(Math.cos(a) * size, Math.sin(a) * size);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'star4': {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TWO_PI - Math.PI / 2;
        const r = i % 2 === 0 ? size : size * 0.45;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'spike': {
      const spikes = 6;
      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const a = (i / (spikes * 2)) * TWO_PI - Math.PI / 2;
        const r = i % 2 === 0 ? size : size * 0.55;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'cross': {
      const t = size * 0.3;
      ctx.beginPath();
      ctx.moveTo(-t, -size);
      ctx.lineTo(t, -size);
      ctx.lineTo(t, -t);
      ctx.lineTo(size, -t);
      ctx.lineTo(size, t);
      ctx.lineTo(t, t);
      ctx.lineTo(t, size);
      ctx.lineTo(-t, size);
      ctx.lineTo(-t, t);
      ctx.lineTo(-size, t);
      ctx.lineTo(-size, -t);
      ctx.lineTo(-t, -t);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'rocket': {
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.5, size * 0.3);
      ctx.lineTo(size * 0.2, size * 0.2);
      ctx.lineTo(size * 0.2, size);
      ctx.lineTo(-size * 0.2, size);
      ctx.lineTo(-size * 0.2, size * 0.2);
      ctx.lineTo(-size * 0.5, size * 0.3);
      ctx.closePath();
      ctx.fill();
      break;
    }
    default:
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, TWO_PI);
      ctx.fill();
  }

  ctx.restore();
}
