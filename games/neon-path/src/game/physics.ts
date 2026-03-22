/** Platformer physics — player body, gravity, AABB collision resolution */

import {
  GRAVITY, MAX_FALL_SPEED, PLAYER_SPEED, JUMP_FORCE,
  PLAYER_W, PLAYER_H, WORLD_W, WORLD_H,
} from './config';
import type { Platform } from './config';

export interface Player {
  x: number;         // left edge
  y: number;         // top edge
  vx: number;
  vy: number;
  onGround: boolean;
  facingLeft: boolean;
  walkCycle: number; // 0–2π, advances while walking on ground
  dead: boolean;
}

function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function createPlayer(feetCenterX: number, feetY: number): Player {
  return {
    x: feetCenterX - PLAYER_W / 2,
    y: feetY - PLAYER_H,
    vx: 0,
    vy: 0,
    onGround: false,
    facingLeft: false,
    walkCycle: 0,
    dead: false,
  };
}

/**
 * Advance the player one physics step.
 * @param moveX  -1 to 1 horizontal input axis
 * @param jump   true if jump was just pressed this frame
 */
export function stepPlayer(
  player: Player,
  dt: number,
  moveX: number,
  jump: boolean,
  platforms: Platform[],
): void {
  // ── Gravity ──────────────────────────────────────────────────────────────
  player.vy = Math.min(player.vy + GRAVITY * dt, MAX_FALL_SPEED);

  // ── Jump ─────────────────────────────────────────────────────────────────
  if (jump && player.onGround) {
    player.vy = -JUMP_FORCE;
    player.onGround = false;
  }

  // ── Horizontal movement ───────────────────────────────────────────────────
  player.vx = moveX * PLAYER_SPEED;
  if (Math.abs(moveX) > 0.1) player.facingLeft = moveX < 0;

  // Walk animation
  if (player.onGround && Math.abs(moveX) > 0.1) {
    player.walkCycle += dt * 9;
  }

  // Move X, then resolve horizontal platform collisions
  player.x += player.vx * dt;

  // World horizontal clamp
  player.x = Math.max(0, Math.min(WORLD_W - PLAYER_W, player.x));

  for (const p of platforms) {
    if (rectsOverlap(player.x, player.y, PLAYER_W, PLAYER_H, p.x, p.y, p.w, p.h)) {
      if (player.vx > 0) {
        player.x = p.x - PLAYER_W;
      } else if (player.vx < 0) {
        player.x = p.x + p.w;
      } else {
        // stationary — push out whichever side is closer
        const overlapRight = (player.x + PLAYER_W) - p.x;
        const overlapLeft  = (p.x + p.w) - player.x;
        if (overlapRight < overlapLeft) player.x = p.x - PLAYER_W;
        else player.x = p.x + p.w;
      }
      player.vx = 0;
    }
  }

  // ── Vertical movement ─────────────────────────────────────────────────────
  player.onGround = false;
  player.y += player.vy * dt;

  for (const p of platforms) {
    if (rectsOverlap(player.x, player.y, PLAYER_W, PLAYER_H, p.x, p.y, p.w, p.h)) {
      if (player.vy >= 0) {
        // Falling — land on top of platform
        player.y = p.y - PLAYER_H;
        player.vy = 0;
        player.onGround = true;
      } else {
        // Rising — hit ceiling
        player.y = p.y + p.h;
        player.vy = 0;
      }
    }
  }
}

/** True if the player has fallen below the world (death pit). */
export function isOutOfBounds(player: Player): boolean {
  return player.y > WORLD_H + 60;
}
