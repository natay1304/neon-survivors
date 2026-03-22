import { GameContext } from '@survivors/core';
import { initPlatform, createPlatformServices } from '@survivors/sdk';
import { NeonSurvivorsScene } from './game/game';
import { setLocale, type Locale } from './game/i18n';

async function main() {
  const platform = await initPlatform();
  const services = createPlatformServices(platform, 'ns_');

  // Auto-detect language from platform SDK
  setLocale(services.locale as Locale);

  const canvas = document.getElementById('game') as HTMLCanvasElement;

  const ctx = GameContext.createCustom({ canvas, tickRate: 60, maxFrameTime: 100, stats: import.meta.env.DEV });

  const scene = new NeonSurvivorsScene(canvas, platform, services);
  ctx.scenes.register(scene);
  ctx.scenes.push('neon-survivors', ctx);

  ctx.start();
  (window as any).__game = ctx;
}

main();
