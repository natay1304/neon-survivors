/** Ad platform abstraction — game code calls these generic methods,
 *  the active adapter (CrazyGames / Yandex / Noop) handles the rest. */

export interface LeaderboardEntry {
  rank: number;
  score: number;
  name: string;
  avatarUrl: string;
  isCurrentPlayer: boolean;
}

export interface AdPlatform {
  readonly name: string;
  readonly hasAds: boolean;
  init(): Promise<void>;
  showInterstitial(): Promise<void>;
  showRewarded(): Promise<boolean>;
  gameplayStart(): void;
  gameplayStop(): void;
  happytime(): void;
  /** Returns platform language code (e.g. 'ru', 'en') or null if unavailable */
  getLanguage(): string | null;
  /** Save player data to platform cloud storage */
  savePlayerData(data: Record<string, unknown>): Promise<void>;
  /** Load player data from platform cloud storage */
  loadPlayerData(): Promise<Record<string, unknown> | null>;
  /** Submit a score to a named leaderboard */
  setLeaderboardScore(board: string, score: number): Promise<void>;
  /** Get top entries from a named leaderboard */
  getLeaderboardEntries(board: string, top?: number): Promise<LeaderboardEntry[]>;
}

/** Fallback for local dev / unknown host — does nothing. */
export class NoopPlatform implements AdPlatform {
  readonly name = 'none';
  readonly hasAds = false;
  async init() { console.log('[SDK] No ad platform detected — running standalone'); }
  async showInterstitial() {}
  async showRewarded() { return false; }
  gameplayStart() {}
  gameplayStop() {}
  happytime() {}
  getLanguage() { return null; }
  async savePlayerData() {}
  async loadPlayerData() { return null; }
  async setLeaderboardScore() {}
  async getLeaderboardEntries() { return []; }
}
