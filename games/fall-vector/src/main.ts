import { GameContext } from '@survivors/core';
import { initPlatform } from '@survivors/sdk';
import { FallVectorScene } from './game/game';

async function main() {
  const platform = await initPlatform();
  const canvas = document.getElementById('game') as HTMLCanvasElement;

  const ctx = GameContext.create2D({
    canvas,
    tickRate: 60,
    maxFrameTime: 100,
    stats: import.meta.env.DEV,
    antialias: true,
  });

  const scene = new FallVectorScene(ctx, platform);
  ctx.scenes.register(scene);
  ctx.scenes.push('fall-vector', ctx);

  ctx.start();
  (window as any).__game = ctx;
}

main();
