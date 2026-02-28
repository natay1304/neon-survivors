/** SDK entry point — auto-detects platform and exports singleton */

import { type AdPlatform, NoopPlatform } from './ads';
import { CrazyGamesPlatform } from './crazygames';
import { YandexPlatform } from './yandex';
import { TelegramPlatform } from './telegram';

export type { AdPlatform } from './ads';

let platform: AdPlatform = new NoopPlatform();

function detectPlatform(): AdPlatform {
  if (window.CrazyGames?.SDK) return new CrazyGamesPlatform();
  // YaGames global only exists when SDK script is loaded (on yandex.net)
  if (window.YaGames) return new YandexPlatform();
  if (window.Telegram?.WebApp) return new TelegramPlatform();
  return new NoopPlatform();
}

export async function initPlatform(): Promise<AdPlatform> {
  platform = detectPlatform();
  try {
    await platform.init();
  } catch (e) {
    console.warn('[SDK] Platform init failed, falling back to noop:', e);
    platform = new NoopPlatform();
    await platform.init();
  }
  return platform;
}

export function getAdPlatform(): AdPlatform {
  return platform;
}
