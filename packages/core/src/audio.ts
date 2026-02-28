/** Sound system wrapping Howler.js — SFX, Music, and Spatial Audio */

import { Howl, Howler } from 'howler';

export interface SoundDef {
  /** Unique sound ID (e.g. 'hit', 'explosion', 'bgm_level1') */
  id: string;
  /** File path(s). Howler selects the first supported format. */
  src: string | string[];
  /** Whether this is a music track (loops by default, uses music volume) */
  music?: boolean;
  /** Base volume 0..1, default 1.0 */
  volume?: number;
  /** Whether to preload. Default true. */
  preload?: boolean;
  /** Whether to loop. Default: true for music, false for SFX. */
  loop?: boolean;
}

export interface PlayOptions {
  /** Volume override 0..1 */
  volume?: number;
  /** Playback rate (1.0 = normal) */
  rate?: number;
  /** Random variation applied to rate (e.g. 0.1 means ±10%) */
  rateVariation?: number;
  /** Random variation applied to volume (e.g. 0.1 means ±10%) */
  volumeVariation?: number;
  /** Loop this instance */
  loop?: boolean;
}

export interface SpatialPlayOptions extends PlayOptions {
  /** World X position of the sound source */
  x: number;
  /** World Y position of the sound source */
  y: number;
  /** Maximum distance at which the sound is audible. Default 500. */
  maxDistance?: number;
  /** Minimum distance (full volume). Default 50. */
  refDistance?: number;
  /** Attenuation rolloff factor. Default 1.0. */
  rolloff?: number;
}

export class SoundManager {
  private sounds = new Map<string, Howl>();
  private defs = new Map<string, SoundDef>();
  private currentMusic: { id: string; howl: Howl; soundId: number } | null = null;

  private listenerX = 0;
  private listenerY = 0;

  private _masterVolume = 1.0;
  private _sfxVolume = 1.0;
  private _musicVolume = 0.5;
  private _muted = false;

  /** Register one or more sound definitions. Call before play. */
  register(defs: SoundDef | SoundDef[]): void {
    const arr = Array.isArray(defs) ? defs : [defs];
    for (const def of arr) {
      this.defs.set(def.id, def);
      const isMusic = def.music ?? false;
      const howl = new Howl({
        src: Array.isArray(def.src) ? def.src : [def.src],
        volume: def.volume ?? 1.0,
        loop: def.loop ?? isMusic,
        preload: def.preload ?? true,
      });
      this.sounds.set(def.id, howl);
    }
  }

  /** Preload specific sounds (or all registered). Returns when all are loaded. */
  preload(ids?: string[]): Promise<void> {
    const targets = ids
      ? ids.map(id => this.sounds.get(id)).filter((h): h is Howl => h != null)
      : [...this.sounds.values()];

    return Promise.all(
      targets.map(howl =>
        new Promise<void>((resolve, reject) => {
          if (howl.state() === 'loaded') { resolve(); return; }
          howl.once('load', () => resolve());
          howl.once('loaderror', (_id, err) => reject(err));
          howl.load();
        }),
      ),
    ).then(() => {});
  }

  /** Fire-and-forget SFX playback. Returns the Howl sound instance ID. */
  play(id: string, options?: PlayOptions): number {
    const howl = this.sounds.get(id);
    if (!howl) return -1;

    const def = this.defs.get(id);
    const isMusic = def?.music ?? false;
    const channelVol = isMusic ? this._musicVolume : this._sfxVolume;

    let vol = (options?.volume ?? def?.volume ?? 1.0) * channelVol * this._masterVolume;
    if (options?.volumeVariation) {
      vol *= 1 + (Math.random() * 2 - 1) * options.volumeVariation;
    }
    vol = Math.max(0, Math.min(1, vol));

    const soundId = howl.play();

    howl.volume(vol, soundId);

    let rate = options?.rate ?? 1.0;
    if (options?.rateVariation) {
      rate *= 1 + (Math.random() * 2 - 1) * options.rateVariation;
    }
    if (rate !== 1.0) howl.rate(rate, soundId);

    if (options?.loop !== undefined) howl.loop(options.loop, soundId);

    return soundId;
  }

  /** Stop all instances of a sound. */
  stop(id: string): void {
    this.sounds.get(id)?.stop();
  }

  /** Play a music track. Stops current music (optionally crossfades). */
  playMusic(id: string, crossfade = false): void {
    if (crossfade && this.currentMusic) {
      this.crossfadeTo(id);
      return;
    }

    if (this.currentMusic) {
      this.currentMusic.howl.stop(this.currentMusic.soundId);
      this.currentMusic = null;
    }

    const howl = this.sounds.get(id);
    if (!howl) return;

    const def = this.defs.get(id);
    const vol = (def?.volume ?? 1.0) * this._musicVolume * this._masterVolume;
    const soundId = howl.play();
    howl.volume(vol, soundId);
    howl.loop(true, soundId);
    this.currentMusic = { id, howl, soundId };
  }

  /** Stop current music with optional fade-out. */
  stopMusic(fadeDuration = 0): void {
    if (!this.currentMusic) return;
    const { howl, soundId } = this.currentMusic;

    if (fadeDuration > 0) {
      howl.fade(howl.volume(), 0, fadeDuration * 1000, soundId);
      howl.once('fade', () => howl.stop(soundId), soundId);
    } else {
      howl.stop(soundId);
    }
    this.currentMusic = null;
  }

  /** Crossfade from current music to a new track over duration seconds. */
  crossfadeTo(id: string, duration = 1.0): void {
    const durationMs = duration * 1000;

    // Fade out current
    if (this.currentMusic) {
      const old = this.currentMusic;
      old.howl.fade(old.howl.volume(), 0, durationMs, old.soundId);
      old.howl.once('fade', () => old.howl.stop(old.soundId), old.soundId);
    }

    // Fade in new
    const howl = this.sounds.get(id);
    if (!howl) { this.currentMusic = null; return; }

    const def = this.defs.get(id);
    const targetVol = (def?.volume ?? 1.0) * this._musicVolume * this._masterVolume;
    const soundId = howl.play();
    howl.volume(0, soundId);
    howl.loop(true, soundId);
    howl.fade(0, targetVol, durationMs, soundId);
    this.currentMusic = { id, howl, soundId };
  }

  /** Play a sound at a world position with distance-based attenuation. */
  playSpatial(id: string, options: SpatialPlayOptions): number {
    const maxDist = options.maxDistance ?? 500;
    const refDist = options.refDistance ?? 50;
    const rolloff = options.rolloff ?? 1.0;

    const dist = Math.hypot(options.x - this.listenerX, options.y - this.listenerY);
    if (dist > maxDist) return -1;

    const attenuation = refDist / (refDist + rolloff * (Math.max(dist, refDist) - refDist));
    const spatialVol = attenuation * (options.volume ?? 1.0);

    return this.play(id, { ...options, volume: spatialVol });
  }

  /** Update the listener's world position (call each frame, typically camera pos). */
  setListenerPosition(x: number, y: number): void {
    this.listenerX = x;
    this.listenerY = y;
  }

  get masterVolume(): number { return this._masterVolume; }
  set masterVolume(v: number) {
    this._masterVolume = Math.max(0, Math.min(1, v));
    Howler.volume(this._masterVolume);
    this.updateMusicVolume();
  }

  get sfxVolume(): number { return this._sfxVolume; }
  set sfxVolume(v: number) {
    this._sfxVolume = Math.max(0, Math.min(1, v));
  }

  get musicVolume(): number { return this._musicVolume; }
  set musicVolume(v: number) {
    this._musicVolume = Math.max(0, Math.min(1, v));
    this.updateMusicVolume();
  }

  get muted(): boolean { return this._muted; }
  set muted(v: boolean) {
    this._muted = v;
    Howler.mute(v);
  }

  private updateMusicVolume(): void {
    if (!this.currentMusic) return;
    const def = this.defs.get(this.currentMusic.id);
    const vol = (def?.volume ?? 1.0) * this._musicVolume * this._masterVolume;
    this.currentMusic.howl.volume(vol, this.currentMusic.soundId);
  }

  /** Unload all sounds and stop all playback. */
  dispose(): void {
    this.currentMusic = null;
    for (const howl of this.sounds.values()) howl.unload();
    this.sounds.clear();
    this.defs.clear();
  }
}
