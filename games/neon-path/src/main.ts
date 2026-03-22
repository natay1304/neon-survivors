import { GameContext } from '@survivors/core';
import { initPlatform } from '@survivors/sdk';
import { NeonPathScene } from './game/game';

async function main() {
  const platform = await initPlatform();
  const canvas = document.getElementById('game') as HTMLCanvasElement;

  const ctx = GameContext.createCustom({
    canvas,
    tickRate: 60,
    maxFrameTime: 100,
    stats: import.meta.env.DEV,
  });

  const scene = new NeonPathScene(canvas, platform);
  ctx.scenes.register(scene);
  ctx.scenes.push('neon-path', ctx);

  ctx.start();
  (window as unknown as Record<string, unknown>).__game = ctx;
}

main();
