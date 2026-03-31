/** Procedural audio synthesis via Web Audio API.
 *  Zero audio files — all sounds generated in real-time.
 *  Designed for retro/neon-style games. Reusable across projects. */

// ── Types ───────────────────────────────────────────────────────────

export type WaveType = OscillatorType | 'noise';

export interface Envelope {
  attack: number;   // seconds
  decay: number;    // seconds
  sustain: number;  // 0..1 level
  release: number;  // seconds
}

export interface FilterDef {
  type: BiquadFilterType;
  frequency: number;
  Q?: number;
  /** Sweep filter frequency to this value over the sound's lifetime */
  sweepTo?: number;
}

export interface SynthVoiceDef {
  wave: WaveType;
  frequency: number;
  /** Detune in cents */
  detune?: number;
  /** Gain for this voice (0..1). Default 1. */
  gain?: number;
  /** Frequency sweep target */
  sweepTo?: number;
}

export interface SynthSoundDef {
  /** Unique name */
  id: string;
  /** One or more oscillator voices */
  voices: SynthVoiceDef[];
  /** ADSR envelope */
  envelope: Envelope;
  /** Optional filter */
  filter?: FilterDef;
  /** Base volume 0..1. Default 0.5 */
  volume?: number;
  /** Duration hint in seconds (total including release). Default: computed from envelope. */
  duration?: number;
  /** Random pitch variation in semitones (±). Default 0. */
  pitchVariation?: number;
  /** Random volume variation (±). Default 0. */
  volumeVariation?: number;
}

// ── Music Sequencer Types ──────────────────────────────────────────

export interface MusicVoiceDef {
  wave: WaveType;
  envelope: Envelope;
  filter?: FilterDef;
  /** Base gain for this voice. Default 1 */
  gain?: number;
  /** Detune in cents */
  detune?: number;
}

export interface MusicNote {
  /** Frequency in Hz. 0 = rest */
  freq: number;
  /** Duration in steps (1 step = one subdivision). */
  dur: number;
  /** Velocity 0..1. Default 1 */
  vel?: number;
}

export interface MusicPatternDef {
  /** Index into the track's voices array */
  voice: number;
  /** Note sequence. Loops automatically. */
  notes: MusicNote[];
}

export interface MusicTrackDef {
  id: string;
  /** Tempo in BPM */
  bpm: number;
  /** Subdivisions per beat (4 = sixteenth notes). Default 4 */
  subdivision?: number;
  /** Voice definitions */
  voices: MusicVoiceDef[];
  /** Parallel patterns (can reference the same voice) */
  patterns: MusicPatternDef[];
  /** Master volume 0..1. Default 0.15 */
  volume?: number;
  /** Fade-in seconds. Default 3 */
  fadeIn?: number;
}

export interface AmbientLayerDef {
  /** Unique name */
  id: string;
  /** Oscillator voices (typically low-freq drones) */
  voices: SynthVoiceDef[];
  /** Optional filter with slow sweep */
  filter?: FilterDef;
  /** Volume 0..1. Default 0.15 */
  volume?: number;
  /** Fade-in time in seconds. Default 2. */
  fadeIn?: number;
  /**
   * Amplitude tremolo — modulates volume at a musical rate to create
   * rhythmic pulsing (e.g. rate 1.4 = 84 BPM quarter notes).
   */
  tremolo?: {
    /** LFO rate in Hz. 1.4 = 84 BPM ♩, 2.8 = 84 BPM ♪ */
    rate: number;
    /** Depth 0..1. 1 = fully silent at trough, 0 = no effect */
    depth: number;
    /** LFO waveform. Default 'sine' */
    wave?: OscillatorType;
  };
}

// ── Noise buffer (shared) ───────────────────────────────────────────

let noiseBuffer: AudioBuffer | null = null;

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  const length = ctx.sampleRate * 2; // 2 seconds of noise
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  noiseBuffer = buffer;
  return buffer;
}

// ── Music sequencer state (internal) ──────────────────────────────

interface MusicTrackState {
  gain: GainNode;
  schedulerId: number;
  patternSteps: number[];
  patternTimes: number[];
  stepDuration: number;
  def: MusicTrackDef;
}

// ── SynthAudio ──────────────────────────────────────────────────────

export class SynthAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private defs = new Map<string, SynthSoundDef>();
  private ambientLayers = new Map<string, AmbientLayerDef>();
  private activeAmbient = new Map<string, { nodes: AudioNode[]; gain: GainNode }>();
  private musicTracks = new Map<string, MusicTrackDef>();
  private activeTracks = new Map<string, MusicTrackState>();
  private _muted = false;
  private _masterVolume = 1.0;
  private _sfxVolume = 1.0;
  private _musicVolume = 0.3;
  /** Cooldown tracking: sound ID → last play timestamp */
  private cooldowns = new Map<string, number>();

  /** Lazily create AudioContext (must be triggered by user gesture). */
  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this._masterVolume;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this._sfxVolume;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this._musicVolume;
      this.musicGain.connect(this.masterGain);
    }
    // Resume if suspended (autoplay policy)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /** Register sound definitions. */
  register(defs: SynthSoundDef | SynthSoundDef[]): void {
    const arr = Array.isArray(defs) ? defs : [defs];
    for (const def of arr) this.defs.set(def.id, def);
  }

  /** Register ambient layer definitions. */
  registerAmbient(defs: AmbientLayerDef | AmbientLayerDef[]): void {
    const arr = Array.isArray(defs) ? defs : [defs];
    for (const def of arr) this.ambientLayers.set(def.id, def);
  }

  /** Register music track definitions. */
  registerMusic(defs: MusicTrackDef | MusicTrackDef[]): void {
    const arr = Array.isArray(defs) ? defs : [defs];
    for (const def of arr) this.musicTracks.set(def.id, def);
  }

  /** Play a one-shot sound effect.
   *  @param minInterval — optional cooldown in seconds to prevent overlapping spam */
  play(id: string, minInterval = 0): void {
    const def = this.defs.get(id);
    if (!def || this._muted) return;

    // Cooldown check
    if (minInterval > 0) {
      const now = performance.now();
      const last = this.cooldowns.get(id) ?? 0;
      if (now - last < minInterval * 1000) return;
      this.cooldowns.set(id, now);
    }

    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const env = def.envelope;
    const totalDur = def.duration ?? (env.attack + env.decay + env.release + 0.1);

    // Pitch variation
    let pitchMult = 1;
    if (def.pitchVariation) {
      const semitones = (Math.random() * 2 - 1) * def.pitchVariation;
      pitchMult = Math.pow(2, semitones / 12);
    }

    // Volume variation
    let vol = def.volume ?? 0.5;
    if (def.volumeVariation) {
      vol *= 1 + (Math.random() * 2 - 1) * def.volumeVariation;
    }
    vol = Math.max(0, Math.min(1, vol));

    // Envelope gain node
    const envGain = ctx.createGain();
    envGain.gain.setValueAtTime(0, now);
    envGain.gain.linearRampToValueAtTime(vol, now + env.attack);
    envGain.gain.linearRampToValueAtTime(vol * env.sustain, now + env.attack + env.decay);
    envGain.gain.setValueAtTime(vol * env.sustain, now + totalDur - env.release);
    envGain.gain.linearRampToValueAtTime(0, now + totalDur);

    // Optional filter
    let filterNode: BiquadFilterNode | null = null;
    if (def.filter) {
      filterNode = ctx.createBiquadFilter();
      filterNode.type = def.filter.type;
      filterNode.frequency.setValueAtTime(def.filter.frequency, now);
      if (def.filter.Q !== undefined) filterNode.Q.value = def.filter.Q;
      if (def.filter.sweepTo !== undefined) {
        filterNode.frequency.linearRampToValueAtTime(def.filter.sweepTo, now + totalDur);
      }
    }

    // Connect chain: voices → filter? → envGain → sfxGain
    const target = filterNode ?? envGain;
    if (filterNode) filterNode.connect(envGain);
    envGain.connect(this.sfxGain!);

    // Create voices
    for (const voice of def.voices) {
      const freq = voice.frequency * pitchMult;
      const voiceGain = ctx.createGain();
      voiceGain.gain.value = voice.gain ?? 1;
      voiceGain.connect(target);

      if (voice.wave === 'noise') {
        const src = ctx.createBufferSource();
        src.buffer = getNoiseBuffer(ctx);
        src.loop = true;
        src.connect(voiceGain);
        src.start(now);
        src.stop(now + totalDur);
      } else {
        const osc = ctx.createOscillator();
        osc.type = voice.wave;
        osc.frequency.setValueAtTime(freq, now);
        if (voice.detune) osc.detune.setValueAtTime(voice.detune, now);
        if (voice.sweepTo !== undefined) {
          osc.frequency.exponentialRampToValueAtTime(
            Math.max(1, voice.sweepTo * pitchMult),
            now + totalDur,
          );
        }
        osc.connect(voiceGain);
        osc.start(now);
        osc.stop(now + totalDur);
      }
    }

    // Auto-cleanup (GC-friendly)
    setTimeout(() => {
      envGain.disconnect();
      filterNode?.disconnect();
    }, totalDur * 1000 + 100);
  }

  /** Start an ambient layer (loops until stopped). */
  startAmbient(id: string): void {
    if (this.activeAmbient.has(id) || this._muted) return;
    const def = this.ambientLayers.get(id);
    if (!def) return;

    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const fadeIn = def.fadeIn ?? 2;
    const vol = def.volume ?? 0.15;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(vol, now + fadeIn);

    // Optional filter
    let filterNode: BiquadFilterNode | null = null;
    if (def.filter) {
      filterNode = ctx.createBiquadFilter();
      filterNode.type = def.filter.type;
      filterNode.frequency.value = def.filter.frequency;
      if (def.filter.Q !== undefined) filterNode.Q.value = def.filter.Q;
      // Slow continuous sweep (loop via LFO)
      if (def.filter.sweepTo !== undefined) {
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 0.05; // very slow sweep
        const range = (def.filter.sweepTo - def.filter.frequency) / 2;
        const center = (def.filter.sweepTo + def.filter.frequency) / 2;
        filterNode.frequency.value = center;
        lfoGain.gain.value = range;
        lfo.connect(lfoGain);
        lfoGain.connect(filterNode.frequency);
        lfo.start(now);
      }
    }

    const target = filterNode ?? gainNode;
    if (filterNode) filterNode.connect(gainNode);
    gainNode.connect(this.musicGain!);

    const nodes: AudioNode[] = [];

    for (const voice of def.voices) {
      const voiceGain = ctx.createGain();
      voiceGain.gain.value = voice.gain ?? 1;
      voiceGain.connect(target);
      nodes.push(voiceGain);

      if (voice.wave === 'noise') {
        const src = ctx.createBufferSource();
        src.buffer = getNoiseBuffer(ctx);
        src.loop = true;
        src.connect(voiceGain);
        src.start(now);
        nodes.push(src);
      } else {
        const osc = ctx.createOscillator();
        osc.type = voice.wave;
        osc.frequency.value = voice.frequency;
        if (voice.detune) osc.detune.value = voice.detune;
        osc.connect(voiceGain);
        osc.start(now);
        nodes.push(osc);
      }
    }

    if (filterNode) nodes.push(filterNode);
    nodes.push(gainNode);

    this.activeAmbient.set(id, { nodes, gain: gainNode });
  }

  /** Stop an ambient layer with optional fade-out. */
  stopAmbient(id: string, fadeOut = 1): void {
    const active = this.activeAmbient.get(id);
    if (!active) return;
    this.activeAmbient.delete(id);

    const ctx = this.ctx;
    if (!ctx) return;

    const now = ctx.currentTime;
    active.gain.gain.setValueAtTime(active.gain.gain.value, now);
    active.gain.gain.linearRampToValueAtTime(0, now + fadeOut);

    setTimeout(() => {
      for (const node of active.nodes) {
        try {
          if ('stop' in node && typeof (node as OscillatorNode).stop === 'function') {
            (node as OscillatorNode).stop();
          }
          node.disconnect();
        } catch { /* already stopped */ }
      }
    }, fadeOut * 1000 + 100);
  }

  /** Stop all ambient layers. */
  stopAllAmbient(fadeOut = 1): void {
    for (const id of this.activeAmbient.keys()) {
      this.stopAmbient(id, fadeOut);
    }
  }

  // ── Music sequencer ──────────────────────────────────────────────

  /** Start a music track (loops until stopped). */
  startMusic(id: string): void {
    if (this.activeTracks.has(id) || this._muted) return;
    const def = this.musicTracks.get(id);
    if (!def) return;

    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const fadeIn = def.fadeIn ?? 3;
    const vol = def.volume ?? 0.15;
    const subdivision = def.subdivision ?? 4;
    const stepDur = 60 / def.bpm / subdivision;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(vol, now + fadeIn);
    gainNode.connect(this.musicGain!);

    const startTime = now + 0.05;
    const state: MusicTrackState = {
      gain: gainNode,
      schedulerId: 0,
      patternSteps: def.patterns.map(() => 0),
      patternTimes: def.patterns.map(() => startTime),
      stepDuration: stepDur,
      def,
    };

    const lookahead = 0.15; // seconds
    const schedule = () => {
      const currentTime = ctx.currentTime;
      for (let p = 0; p < def.patterns.length; p++) {
        const pattern = def.patterns[p];
        while (state.patternTimes[p] < currentTime + lookahead) {
          const noteIndex = state.patternSteps[p] % pattern.notes.length;
          const note = pattern.notes[noteIndex];
          const durSec = note.dur * stepDur;
          if (note.freq > 0) {
            this.playMusicNote(ctx, def.voices[pattern.voice], note, state.patternTimes[p], durSec, gainNode);
          }
          state.patternTimes[p] += durSec;
          state.patternSteps[p]++;
        }
      }
    };

    state.schedulerId = window.setInterval(schedule, 25);
    schedule();
    this.activeTracks.set(id, state);
  }

  /** Stop a music track with optional fade-out. */
  stopMusic(id: string, fadeOut = 2): void {
    const state = this.activeTracks.get(id);
    if (!state) return;
    this.activeTracks.delete(id);
    clearInterval(state.schedulerId);

    const ctx = this.ctx;
    if (!ctx) return;

    const now = ctx.currentTime;
    state.gain.gain.setValueAtTime(state.gain.gain.value, now);
    state.gain.gain.linearRampToValueAtTime(0, now + fadeOut);
    setTimeout(() => { state.gain.disconnect(); }, fadeOut * 1000 + 100);
  }

  /** Stop all music tracks. */
  stopAllMusic(fadeOut = 2): void {
    for (const id of this.activeTracks.keys()) {
      this.stopMusic(id, fadeOut);
    }
  }

  /** Schedule a single note on the Web Audio timeline. */
  private playMusicNote(
    ctx: AudioContext,
    voice: MusicVoiceDef,
    note: MusicNote,
    startTime: number,
    durationSec: number,
    destination: GainNode,
  ): void {
    const vel = note.vel ?? 1;
    const vGain = voice.gain ?? 1;
    const env = voice.envelope;
    const totalDur = durationSec + env.release;
    const peak = vel * vGain;

    // Envelope gain
    const envGain = ctx.createGain();
    const t0 = startTime;
    envGain.gain.setValueAtTime(0, t0);
    envGain.gain.linearRampToValueAtTime(peak, t0 + env.attack);
    envGain.gain.linearRampToValueAtTime(peak * env.sustain, t0 + env.attack + env.decay);
    envGain.gain.setValueAtTime(peak * env.sustain, t0 + durationSec);
    envGain.gain.linearRampToValueAtTime(0, t0 + totalDur);

    // Optional filter
    let filterNode: BiquadFilterNode | null = null;
    if (voice.filter) {
      filterNode = ctx.createBiquadFilter();
      filterNode.type = voice.filter.type;
      filterNode.frequency.setValueAtTime(voice.filter.frequency, t0);
      if (voice.filter.Q !== undefined) filterNode.Q.value = voice.filter.Q;
      if (voice.filter.sweepTo !== undefined) {
        filterNode.frequency.linearRampToValueAtTime(voice.filter.sweepTo, t0 + totalDur);
      }
    }

    const target = filterNode ?? envGain;
    if (filterNode) filterNode.connect(envGain);
    envGain.connect(destination);

    // Create oscillator / noise source
    if (voice.wave === 'noise') {
      const src = ctx.createBufferSource();
      src.buffer = getNoiseBuffer(ctx);
      src.loop = true;
      src.connect(target);
      src.start(t0);
      src.stop(t0 + totalDur);
    } else {
      const osc = ctx.createOscillator();
      osc.type = voice.wave;
      osc.frequency.setValueAtTime(note.freq, t0);
      if (voice.detune) osc.detune.setValueAtTime(voice.detune, t0);
      osc.connect(target);
      osc.start(t0);
      osc.stop(t0 + totalDur);
    }

    // Auto-cleanup
    const cleanupDelay = (t0 - ctx.currentTime + totalDur) * 1000 + 200;
    setTimeout(() => {
      envGain.disconnect();
      filterNode?.disconnect();
    }, Math.max(100, cleanupDelay));
  }

  // ── Volume controls ─────────────────────────────────────────────

  get masterVolume(): number { return this._masterVolume; }
  set masterVolume(v: number) {
    this._masterVolume = Math.max(0, Math.min(1, v));
    if (this.masterGain) this.masterGain.gain.value = this._masterVolume;
  }

  get sfxVolume(): number { return this._sfxVolume; }
  set sfxVolume(v: number) {
    this._sfxVolume = Math.max(0, Math.min(1, v));
    if (this.sfxGain) this.sfxGain.gain.value = this._sfxVolume;
  }

  get musicVolume(): number { return this._musicVolume; }
  set musicVolume(v: number) {
    this._musicVolume = Math.max(0, Math.min(1, v));
    if (this.musicGain) this.musicGain.gain.value = this._musicVolume;
  }

  get muted(): boolean { return this._muted; }
  set muted(v: boolean) {
    this._muted = v;
    if (this.masterGain) this.masterGain.gain.value = v ? 0 : this._masterVolume;
    if (v) {
      this.stopAllAmbient(0.5);
      this.stopAllMusic(0.5);
    }
  }

  /** Call on user gesture to ensure AudioContext is unlocked. */
  unlock(): void {
    this.ensureContext();
  }

  /** Suspend AudioContext — stops all audio processing (use on tab hide / minimize). */
  suspend(): void {
    this.ctx?.suspend().catch(() => {});
  }

  /** Resume AudioContext — restarts audio processing (use on tab show / restore). */
  resume(): void {
    if (this._muted) return;
    this.ctx?.resume().catch(() => {});
  }

  /** Dispose all resources. */
  dispose(): void {
    this.stopAllAmbient(0);
    this.stopAllMusic(0);
    this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.defs.clear();
    this.ambientLayers.clear();
    this.musicTracks.clear();
  }
}
