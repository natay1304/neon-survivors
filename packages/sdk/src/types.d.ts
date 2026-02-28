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
}

interface AdsgramController {
  show(): Promise<{ done: boolean }>;
  destroy(): void;
}

interface TelegramWebApp {
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
