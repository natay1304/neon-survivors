/** Yandex Games SDK adapter */

import type { AdPlatform, LeaderboardEntry } from './ads';

export class YandexPlatform implements AdPlatform {
  readonly name = 'yandex';
  readonly hasAds = true;
  private ysdk: YandexSDK | null = null;
  private leaderboards: YandexLeaderboards | null = null;
  private player: YandexPlayer | null = null;
  private lang: string | null = null;

  async init(): Promise<void> {
    if (!window.YaGames) {
      console.warn('[SDK] YaGames global not found');
      return;
    }
    try {
      this.ysdk = await window.YaGames.init();
      console.log('[SDK] Yandex Games platform initialized');

      // Read environment language
      this.lang = this.ysdk.environment.i18n.lang ?? null;
      console.log('[SDK] Yandex language:', this.lang);

      // Init player (without scopes — no auth dialog on start)
      try {
        this.player = await this.ysdk.getPlayer({ scopes: false });
        console.log('[SDK] Yandex player initialized');
      } catch (e) {
        console.warn('[SDK] Yandex player init failed:', e);
      }

      // Init leaderboards
      try {
        this.leaderboards = await this.ysdk.getLeaderboards();
        console.log('[SDK] Yandex leaderboards initialized');
      } catch (e) {
        console.warn('[SDK] Yandex leaderboards init failed:', e);
      }
    } catch (e) {
      console.warn('[SDK] Yandex init failed:', e);
    }
  }

  showInterstitial(): Promise<void> {
    if (!this.ysdk) return Promise.resolve();
    return new Promise((resolve) => {
      this.ysdk!.adv.showFullscreenAdv({
        callbacks: {
          onOpen: () => console.log('[SDK] YA interstitial opened'),
          onClose: () => { console.log('[SDK] YA interstitial closed'); resolve(); },
          onOffline: () => { console.log('[SDK] YA offline'); resolve(); },
          onError: (err) => { console.warn('[SDK] YA interstitial error:', err); resolve(); },
        },
      });
    });
  }

  showRewarded(): Promise<boolean> {
    if (!this.ysdk) return Promise.resolve(false);
    return new Promise((resolve) => {
      let rewarded = false;
      this.ysdk!.adv.showRewardedVideo({
        callbacks: {
          onOpen: () => console.log('[SDK] YA rewarded opened'),
          onRewarded: () => { rewarded = true; },
          onClose: () => { console.log('[SDK] YA rewarded closed'); resolve(rewarded); },
          onError: (err) => { console.warn('[SDK] YA rewarded error:', err); resolve(false); },
        },
      });
    });
  }

  gameplayStart(): void { this.ysdk?.features.GameplayAPI?.start(); }
  gameplayStop(): void { this.ysdk?.features.GameplayAPI?.stop(); }
  happytime(): void { /* Yandex has no happytime equivalent */ }

  getLanguage(): string | null {
    return this.lang;
  }

  async savePlayerData(data: Record<string, unknown>): Promise<void> {
    if (!this.player) return;
    try {
      await this.player.setData(data, true);
      console.log('[SDK] Yandex player data saved');
    } catch (e) {
      console.warn('[SDK] Yandex savePlayerData failed:', e);
    }
  }

  async loadPlayerData(): Promise<Record<string, unknown> | null> {
    if (!this.player) return null;
    try {
      const data = await this.player.getData();
      console.log('[SDK] Yandex player data loaded');
      return data;
    } catch (e) {
      console.warn('[SDK] Yandex loadPlayerData failed:', e);
      return null;
    }
  }

  async setLeaderboardScore(board: string, score: number): Promise<void> {
    if (!this.leaderboards) return;
    try {
      await this.leaderboards.setLeaderboardScore(board, score);
      console.log(`[SDK] Yandex leaderboard "${board}" score set: ${score}`);
    } catch (e) {
      console.warn('[SDK] Yandex setLeaderboardScore failed:', e);
    }
  }

  async getLeaderboardEntries(board: string, top = 10): Promise<LeaderboardEntry[]> {
    if (!this.leaderboards) return [];
    try {
      const result = await this.leaderboards.getLeaderboardEntries(board, {
        quantityTop: top,
        includeUser: true,
      });
      return result.entries.map((e) => ({
        rank: e.rank,
        score: e.score,
        name: e.player.publicName || `Player #${e.rank}`,
        avatarUrl: e.player.getAvatarSrc('small'),
        isCurrentPlayer: false, // Yandex doesn't flag this directly
      }));
    } catch (e) {
      console.warn('[SDK] Yandex getLeaderboardEntries failed:', e);
      return [];
    }
  }
}
