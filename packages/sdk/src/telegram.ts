/** Telegram Mini App adapter (uses Adsgram for ads) */

import type { AdPlatform } from './ads';

// Adsgram block ID — replace with your own from https://adsgram.ai
const ADSGRAM_BLOCK_ID = '23869';

export class TelegramPlatform implements AdPlatform {
  readonly name = 'telegram';
  readonly hasAds = true;
  private adController: AdsgramController | null = null;

  async init(): Promise<void> {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    tg.ready();
    tg.expand();
    console.log('[SDK] Telegram Mini App detected');

    try {
      await this.waitForAdsgram();
      this.adController = window.Adsgram!.init({ blockId: ADSGRAM_BLOCK_ID });
      console.log('[SDK] Adsgram initialized');
    } catch (e) {
      console.warn('[SDK] Adsgram init failed:', e);
    }
  }

  /** Wait for window.Adsgram to be defined (script loads async). Times out after 5s. */
  private waitForAdsgram(): Promise<void> {
    if (window.Adsgram) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.querySelector<HTMLScriptElement>('script[src*="adsgram"]');
      if (script) {
        script.addEventListener('load', () => resolve(), { once: true });
        script.addEventListener('error', () => reject(new Error('Adsgram script failed to load')), { once: true });
      }
      // Timeout fallback
      setTimeout(() => {
        window.Adsgram ? resolve() : reject(new Error('Adsgram load timeout'));
      }, 5000);
    });
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
  getLanguage() { return null; }
  async savePlayerData() {}
  async loadPlayerData() { return null; }
  async setLeaderboardScore() {}
  async getLeaderboardEntries() { return []; }
}
