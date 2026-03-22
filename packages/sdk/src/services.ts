/** PlatformServices — reusable high-level wrappers over AdPlatform.
 *  Cloud storage with localStorage fallback, language detection, leaderboards.
 *  Designed to be shared across multiple games. */

import type { AdPlatform, LeaderboardEntry } from './ads';

// ── Language detection ──────────────────────────────────────────────

/** Map of platform language codes to app-supported locales.
 *  Keys: platform lang codes. Values: your app locale codes. */
export type LocaleMapping = Record<string, string>;

const CIS_TO_RU: LocaleMapping = { ru: 'ru', be: 'ru', uk: 'ru', kk: 'ru' };

/**
 * Detect locale from platform SDK.
 * @param platform  — the initialized AdPlatform
 * @param fallback  — locale to use if platform provides no language (default: 'en')
 * @param mapping   — custom lang→locale map (default: CIS languages → 'ru')
 * @returns resolved locale string
 */
export function detectLocale(
  platform: AdPlatform,
  fallback = 'en',
  mapping: LocaleMapping = CIS_TO_RU,
): string {
  const lang = platform.getLanguage();
  if (!lang) return fallback;
  return mapping[lang] ?? fallback;
}

// ── Cloud storage with localStorage fallback ────────────────────────

export class CloudStorage {
  constructor(
    private platform: AdPlatform,
    /** localStorage key prefix (e.g. 'ns_' for neon-survivors) */
    private prefix: string,
  ) {}

  /** Save data to both localStorage (sync, immediate) and cloud (async). */
  async save(data: Record<string, unknown>): Promise<void> {
    // localStorage — instant fallback
    try {
      localStorage.setItem(this.key(), JSON.stringify(data));
    } catch { /* ignore */ }

    // Cloud — async
    try {
      await this.platform.savePlayerData(data);
    } catch { /* ignore */ }
  }

  /** Load data. Returns localStorage data immediately, then merges cloud data.
   *  @param onCloudLoaded — optional callback when cloud data arrives (may be newer) */
  load(onCloudLoaded?: (data: Record<string, unknown>) => void): Record<string, unknown> | null {
    // 1. Read localStorage (sync)
    let local: Record<string, unknown> | null = null;
    try {
      const raw = localStorage.getItem(this.key());
      if (raw) local = JSON.parse(raw);
    } catch { /* ignore */ }

    // 2. Fetch cloud data (async)
    if (onCloudLoaded) {
      this.platform.loadPlayerData().then((cloud) => {
        if (cloud) onCloudLoaded(cloud);
      }).catch(() => {});
    }

    return local;
  }

  /** Load data — async version. Tries cloud first, falls back to localStorage. */
  async loadAsync(): Promise<Record<string, unknown> | null> {
    try {
      const cloud = await this.platform.loadPlayerData();
      if (cloud) return cloud;
    } catch { /* ignore */ }

    try {
      const raw = localStorage.getItem(this.key());
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }

    return null;
  }

  private key(): string {
    return `${this.prefix}save`;
  }
}

// ── Leaderboards ────────────────────────────────────────────────────

export class Leaderboards {
  constructor(private platform: AdPlatform) {}

  /** Submit a score to a named leaderboard. Fire-and-forget. */
  submit(board: string, score: number): void {
    this.platform.setLeaderboardScore(board, score).catch(() => {});
  }

  /** Submit multiple scores at once. */
  submitAll(scores: Record<string, number>): void {
    for (const [board, score] of Object.entries(scores)) {
      this.submit(board, score);
    }
  }

  /** Get top entries from a leaderboard. */
  async getTop(board: string, count = 10): Promise<LeaderboardEntry[]> {
    try {
      return await this.platform.getLeaderboardEntries(board, count);
    } catch {
      return [];
    }
  }
}

// ── Convenience factory ─────────────────────────────────────────────

export interface PlatformServices {
  storage: CloudStorage;
  leaderboards: Leaderboards;
  /** Detected locale from platform (e.g. 'en', 'ru') */
  locale: string;
}

/**
 * Create all platform services for a game.
 * @param platform   — initialized AdPlatform
 * @param prefix     — localStorage key prefix for this game (e.g. 'ns_')
 * @param fallbackLocale — default locale if platform provides none
 * @param localeMapping  — lang→locale map (default: CIS → 'ru')
 */
export function createPlatformServices(
  platform: AdPlatform,
  prefix: string,
  fallbackLocale = 'en',
  localeMapping?: LocaleMapping,
): PlatformServices {
  return {
    storage: new CloudStorage(platform, prefix),
    leaderboards: new Leaderboards(platform),
    locale: detectLocale(platform, fallbackLocale, localeMapping),
  };
}
