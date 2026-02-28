/**
 * Canvas2D drawing helpers — re-exported from @survivors/core.
 * Only drawShape is game-specific (neon-strike visual styles).
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
    case 'crate':
      ctx.fillRect(-size, -size, size * 2, size * 2);
      break;
    case 'barrel':
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, TWO_PI);
      ctx.fill();
      // inner ring
      ctx.strokeStyle = color === '#ff6633' ? '#cc4422' : '#886644';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.6, 0, TWO_PI);
      ctx.stroke();
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
    case 'rocket': {
      // Arrow/rocket shape
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
    case 'mech': {
      // Mech/robot warrior
      const s = size;
      // Legs
      ctx.fillRect(-s * 0.45, s * 0.2, s * 0.25, s * 0.8);
      ctx.fillRect(s * 0.2, s * 0.2, s * 0.25, s * 0.8);
      // Body (torso)
      ctx.fillRect(-s * 0.5, -s * 0.4, s, s * 0.7);
      // Shoulder armor
      ctx.fillRect(-s * 0.7, -s * 0.4, s * 0.25, s * 0.35);
      ctx.fillRect(s * 0.45, -s * 0.4, s * 0.25, s * 0.35);
      // Arms (extending from shoulders)
      ctx.fillRect(-s * 0.75, -s * 0.05, s * 0.2, s * 0.55);
      ctx.fillRect(s * 0.55, -s * 0.05, s * 0.2, s * 0.55);
      // Head
      ctx.fillRect(-s * 0.3, -s * 0.75, s * 0.6, s * 0.4);
      // Visor (neon accent)
      ctx.fillStyle = glow || color;
      ctx.fillRect(-s * 0.22, -s * 0.65, s * 0.44, s * 0.15);
      // Core reactor glow
      ctx.beginPath();
      ctx.arc(0, -s * 0.1, s * 0.15, 0, TWO_PI);
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
