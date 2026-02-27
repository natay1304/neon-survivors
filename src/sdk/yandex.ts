/** Yandex Games SDK adapter */

import type { AdPlatform } from './ads';

export class YandexPlatform implements AdPlatform {
  readonly name = 'yandex';
  private ysdk: YandexSDK | null = null;

  async init(): Promise<void> {
    if (!window.YaGames) {
      console.warn('[SDK] YaGames global not found');
      return;
    }
    try {
      this.ysdk = await window.YaGames.init();
      console.log('[SDK] Yandex Games platform initialized');
    } catch (e) {
      console.warn('[SDK] Yandex init failed:', e);
    }
  }

  showInterstitial(): Promise<void> {
    if (!this.ysdk) return Promise.resolve();
    return new Promise((resolve) => {
      this.ysdk!.adv.showFullscreenAdv({
        open: () => console.log('[SDK] YA interstitial opened'),
        close: () => { console.log('[SDK] YA interstitial closed'); resolve(); },
        offline: () => { console.log('[SDK] YA offline'); resolve(); },
        error: (err) => { console.warn('[SDK] YA interstitial error:', err); resolve(); },
      });
    });
  }

  showRewarded(): Promise<boolean> {
    if (!this.ysdk) return Promise.resolve(false);
    return new Promise((resolve) => {
      let rewarded = false;
      this.ysdk!.adv.showRewardedVideo({
        open: () => console.log('[SDK] YA rewarded opened'),
        rewarded: () => { rewarded = true; },
        close: () => { console.log('[SDK] YA rewarded closed'); resolve(rewarded); },
        error: (err) => { console.warn('[SDK] YA rewarded error:', err); resolve(false); },
      });
    });
  }

  gameplayStart(): void { this.ysdk?.features.GameplayAPI?.start(); }
  gameplayStop(): void { this.ysdk?.features.GameplayAPI?.stop(); }
  happytime(): void { /* Yandex has no happytime equivalent */ }
}
