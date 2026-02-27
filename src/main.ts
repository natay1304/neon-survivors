import { Game } from './game/game';
import { initPlatform } from './sdk';

async function main() {
  const platform = await initPlatform();
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const game = new Game(canvas, platform);
  (window as any).__game = game;
  game.start();
}

main();
