/** Telegram Mini App adapter (uses Adsgram for ads) */

import type { AdPlatform } from './ads';

// Adsgram block ID — replace with your own from https://adsgram.ai
const ADSGRAM_BLOCK_ID = '23869';

export class TelegramPlatform implements AdPlatform {
  readonly name = 'telegram';
  private adController: AdsgramController | null = null;

  async init(): Promise<void> {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    tg.ready();
    tg.expand();
    console.log('[SDK] Telegram Mini App detected');

    // Init Adsgram ads if script loaded
    if (window.Adsgram) {
      try {
        this.adController = window.Adsgram.init({ blockId: ADSGRAM_BLOCK_ID });
        console.log('[SDK] Adsgram initialized');
      } catch (e) {
        console.warn('[SDK] Adsgram init failed:', e);
      }
    }
  }

  async showInterstitial(): Promise<void> {
    if (!this.adController) return;
    try {
      await this.adController.show();
    } catch (e) {
      console.warn('[SDK] TG interstitial error:', e);
    }
  }

  async showRewarded(): Promise<boolean> {
    if (!this.adController) return false;
    try {
      await this.adController.show();
      return true;
    } catch {
      return false;
    }
  }

  gameplayStart(): void {}
  gameplayStop(): void {}
  happytime(): void {
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
  }
}
