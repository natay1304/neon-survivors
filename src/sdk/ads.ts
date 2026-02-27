/** Ad platform abstraction — game code calls these generic methods,
 *  the active adapter (CrazyGames / Yandex / Noop) handles the rest. */

export interface AdPlatform {
  readonly name: string;
  init(): Promise<void>;
  showInterstitial(): Promise<void>;
  showRewarded(): Promise<boolean>;
  gameplayStart(): void;
  gameplayStop(): void;
  happytime(): void;
}

/** Fallback for local dev / unknown host — does nothing. */
export class NoopPlatform implements AdPlatform {
  readonly name = 'none';
  async init() { console.log('[SDK] No ad platform detected — running standalone'); }
  async showInterstitial() {}
  async showRewarded() { return false; }
  gameplayStart() {}
  gameplayStop() {}
  happytime() {}
}
