/** Global type declarations for ad platform SDKs */

interface CrazyGamesAdCallbacks {
  adStarted?: () => void;
  adFinished?: () => void;
  adError?: (error: string, errorData?: unknown) => void;
}

interface CrazyGamesSDK {
  ad: {
    requestAd(type: 'midgame' | 'rewarded', callbacks: CrazyGamesAdCallbacks): void;
  };
  game: {
    gameplayStart(): void;
    gameplayStop(): void;
    happytime(): void;
    loadingStart(): void;
    loadingStop(): void;
  };
}

interface YandexLeaderboards {
  getLeaderboardDescription(name: string): Promise<{ name: string }>;
  setLeaderboardScore(name: string, score: number): Promise<void>;
  getLeaderboardEntries(name: string, options?: {
    quantityTop?: number;
    quantityAround?: number;
    includeUser?: boolean;
  }): Promise<{
    leaderboard: { name: string };
    entries: Array<{
      score: number;
      rank: number;
      player: {
        uniqueID: string;
        publicName: string;
        lang: string;
        scopePermissions: { avatar: string; public_name: string };
        getAvatarSrc(size: 'small' | 'medium' | 'large'): string;
      };
      formattedScore: string;
    }>;
    userRank: number;
    ranges: Array<{ start: number; size: number }>;
  }>;
}

interface YandexPlayer {
  getUniqueID(): string;
  getName(): string;
  setData(data: Record<string, unknown>, flush?: boolean): Promise<void>;
  getData(keys?: string[]): Promise<Record<string, unknown>>;
  setStats(stats: Record<string, number>): Promise<void>;
  getStats(keys?: string[]): Promise<Record<string, number>>;
}

interface YandexSDK {
  adv: {
    showFullscreenAdv(params: {
      open?: () => void;
      close?: (wasShown: boolean) => void;
      offline?: () => void;
      error?: (error: unknown) => void;
    }): void;
    showRewardedVideo(params: {
      open?: () => void;
      rewarded?: () => void;
      close?: () => void;
      error?: (error: unknown) => void;
    }): void;
  };
  features: {
    GameplayAPI?: {
      start(): void;
      stop(): void;
    };
  };
  environment: {
    i18n: { lang: string; tld: string };
  };
  getLeaderboards(): Promise<YandexLeaderboards>;
  getPlayer(options?: { scopes?: boolean; signed?: boolean }): Promise<YandexPlayer>;
}

interface AdsgramController {
  show(): Promise<{ done: boolean }>;
  destroy(): void;
}

interface TelegramWebApp {
  readonly initData: string;
  ready(): void;
  expand(): void;
  close(): void;
  HapticFeedback?: {
    notificationOccurred(type: 'error' | 'success' | 'warning'): void;
    impactOccurred(style: 'light' | 'medium' | 'heavy'): void;
  };
}

interface Window {
  CrazyGames?: { SDK: CrazyGamesSDK };
  YaGames?: { init(): Promise<YandexSDK> };
  Telegram?: { WebApp?: TelegramWebApp };
  Adsgram?: { init(params: { blockId: string }): AdsgramController };
}
