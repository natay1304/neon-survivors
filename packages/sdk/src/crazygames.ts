/** CrazyGames SDK adapter */

import type { AdPlatform } from './ads';

export class CrazyGamesPlatform implements AdPlatform {
  readonly name = 'crazygames';
  readonly hasAds = true;
  private sdk: CrazyGamesSDK | null = null;

  async init(): Promise<void> {
    this.sdk = window.CrazyGames?.SDK ?? null;
    if (this.sdk) {
      console.log('[SDK] CrazyGames platform detected');
    }
  }

  showInterstitial(): Promise<void> {
    if (!this.sdk) return Promise.resolve();
    return new Promise((resolve) => {
      this.sdk!.ad.requestAd('midgame', {
        adStarted: () => console.log('[SDK] CG interstitial started'),
        adFinished: () => { console.log('[SDK] CG interstitial finished'); resolve(); },
        adError: (err) => { console.warn('[SDK] CG interstitial error:', err); resolve(); },
      });
    });
  }

  showRewarded(): Promise<boolean> {
    if (!this.sdk) return Promise.resolve(false);
    return new Promise((resolve) => {
      let rewarded = false;
      this.sdk!.ad.requestAd('rewarded', {
        adStarted: () => console.log('[SDK] CG rewarded started'),
        adFinished: () => { rewarded = true; console.log('[SDK] CG rewarded finished'); resolve(true); },
        adError: (err) => { console.warn('[SDK] CG rewarded error:', err); resolve(rewarded); },
      });
    });
  }

  gameplayStart(): void { this.sdk?.game.gameplayStart(); }
  gameplayStop(): void { this.sdk?.game.gameplayStop(); }
  gameReady(): void { this.sdk?.game.loadingStop(); }
  happytime(): void { this.sdk?.game.happytime(); }
  getLanguage() { return null; }
  async savePlayerData() {}
  async loadPlayerData() { return null; }
  async setLeaderboardScore() {}
  async getLeaderboardEntries() { return []; }
}
