import { GameContext } from '@survivors/core';
import { initPlatform } from '@survivors/sdk';
import { NeonDashScene } from './game/game';

async function main() {
  const platform = await initPlatform();
  const canvas = document.getElementById('game') as HTMLCanvasElement;

  const ctx = GameContext.createCustom({ canvas, tickRate: 60, maxFrameTime: 100, stats: import.meta.env.DEV });

  const scene = new NeonDashScene(canvas, platform);
  ctx.scenes.register(scene);
  ctx.scenes.push('neon-dash', ctx);

  ctx.start();
  (window as any).__game = ctx;
}

main();
