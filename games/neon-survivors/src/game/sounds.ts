/** Neon Survivors — procedural sound definitions.
 *  All sounds synthesized via Web Audio API, zero audio files. */

import type { SynthSoundDef, AmbientLayerDef } from '@survivors/core';

// ── SFX ─────────────────────────────────────────────────────────────

export const SFX: SynthSoundDef[] = [
  // Player shoot — soft gentle pop
  {
    id: 'shoot',
    voices: [
      { wave: 'sine', frequency: 800, sweepTo: 400, gain: 0.3 },
      { wave: 'triangle', frequency: 500, sweepTo: 280, gain: 0.15 },
    ],
    envelope: { attack: 0.005, decay: 0.03, sustain: 0.01, release: 0.02 },
    filter: { type: 'lowpass', frequency: 1800, sweepTo: 600 },
    volume: 0.04,
    duration: 0.06,
    pitchVariation: 1.5,
  },

  // Enemy death — soft dissolve pop
  {
    id: 'enemy_death',
    voices: [
      { wave: 'triangle', frequency: 300, sweepTo: 100, gain: 0.35 },
      { wave: 'sine', frequency: 500, sweepTo: 150, gain: 0.2 },
    ],
    envelope: { attack: 0.005, decay: 0.08, sustain: 0.06, release: 0.1 },
    filter: { type: 'lowpass', frequency: 1500, sweepTo: 300, Q: 1 },
    volume: 0.1,
    duration: 0.15,
    pitchVariation: 2,
    volumeVariation: 0.1,
  },

  // Player hit — distorted thump
  {
    id: 'player_hit',
    voices: [
      { wave: 'sine', frequency: 120, sweepTo: 40, gain: 0.7 },
      { wave: 'square', frequency: 200, sweepTo: 60, gain: 0.3 },
      { wave: 'noise', frequency: 0, gain: 0.3 },
    ],
    envelope: { attack: 0.005, decay: 0.08, sustain: 0.2, release: 0.1 },
    filter: { type: 'lowpass', frequency: 800, sweepTo: 200 },
    volume: 0.2,
    duration: 0.2,
  },

  // XP pickup — rising blip
  {
    id: 'xp_pickup',
    voices: [
      { wave: 'sine', frequency: 600, sweepTo: 1200, gain: 0.7 },
      { wave: 'triangle', frequency: 900, sweepTo: 1800, gain: 0.3 },
    ],
    envelope: { attack: 0.01, decay: 0.08, sustain: 0.3, release: 0.06 },
    volume: 0.08,
    duration: 0.15,
    pitchVariation: 1,
  },

  // Level up — ascending chime chord
  {
    id: 'level_up',
    voices: [
      { wave: 'sine', frequency: 523, sweepTo: 1047, gain: 0.4 },  // C5→C6
      { wave: 'sine', frequency: 659, sweepTo: 1319, gain: 0.3 },  // E5→E6
      { wave: 'sine', frequency: 784, sweepTo: 1568, gain: 0.3 },  // G5→G6
    ],
    envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.4 },
    volume: 0.18,
    duration: 0.8,
  },

  // Boss warning — deep rumble
  {
    id: 'boss_warning',
    voices: [
      { wave: 'sawtooth', frequency: 55, sweepTo: 40, gain: 0.5 },
      { wave: 'sine', frequency: 80, sweepTo: 50, gain: 0.4 },
      { wave: 'noise', frequency: 0, gain: 0.2 },
    ],
    envelope: { attack: 0.1, decay: 0.5, sustain: 0.6, release: 0.5 },
    filter: { type: 'lowpass', frequency: 400, sweepTo: 150 },
    volume: 0.25,
    duration: 1.2,
  },

  // Bonus pickup (health/magnet/shield)
  {
    id: 'bonus_pickup',
    voices: [
      { wave: 'triangle', frequency: 440, sweepTo: 880, gain: 0.5 },
      { wave: 'sine', frequency: 660, sweepTo: 1320, gain: 0.4 },
    ],
    envelope: { attack: 0.01, decay: 0.12, sustain: 0.3, release: 0.15 },
    volume: 0.15,
    duration: 0.3,
    pitchVariation: 1,
  },

  // Lightning strike
  {
    id: 'lightning',
    voices: [
      { wave: 'noise', frequency: 0, gain: 0.6 },
      { wave: 'square', frequency: 2000, sweepTo: 100, gain: 0.3 },
    ],
    envelope: { attack: 0.002, decay: 0.04, sustain: 0.05, release: 0.08 },
    filter: { type: 'highpass', frequency: 800, sweepTo: 200 },
    volume: 0.12,
    duration: 0.13,
    pitchVariation: 2,
  },

  // Frost nova
  {
    id: 'frost_nova',
    voices: [
      { wave: 'sine', frequency: 1200, sweepTo: 300, gain: 0.4 },
      { wave: 'noise', frequency: 0, gain: 0.3 },
    ],
    envelope: { attack: 0.01, decay: 0.15, sustain: 0.2, release: 0.2 },
    filter: { type: 'bandpass', frequency: 3000, sweepTo: 500, Q: 3 },
    volume: 0.12,
    duration: 0.4,
  },

  // Game over — dramatic descending tone
  {
    id: 'game_over',
    voices: [
      { wave: 'sawtooth', frequency: 300, sweepTo: 60, gain: 0.4 },
      { wave: 'sine', frequency: 200, sweepTo: 40, gain: 0.4 },
    ],
    envelope: { attack: 0.02, decay: 0.4, sustain: 0.3, release: 0.6 },
    filter: { type: 'lowpass', frequency: 2000, sweepTo: 200 },
    volume: 0.2,
    duration: 1.2,
  },

  // Victory — triumphant chord
  {
    id: 'victory',
    voices: [
      { wave: 'sine', frequency: 523, gain: 0.3 },     // C5
      { wave: 'sine', frequency: 659, gain: 0.25 },    // E5
      { wave: 'sine', frequency: 784, gain: 0.25 },    // G5
      { wave: 'triangle', frequency: 1047, gain: 0.2 }, // C6
    ],
    envelope: { attack: 0.05, decay: 0.5, sustain: 0.6, release: 1.0 },
    volume: 0.18,
    duration: 2.0,
  },
];

// ── Ambient ─────────────────────────────────────────────────────────

export const AMBIENT: AmbientLayerDef[] = [
  // Deep space pad — warm low-mid drone with slow breathing
  {
    id: 'space_drone',
    voices: [
      { wave: 'sine', frequency: 65, gain: 0.35 },       // low C
      { wave: 'sine', frequency: 98, gain: 0.2, detune: 3 },  // G below middle
      { wave: 'triangle', frequency: 130, gain: 0.1 },    // octave C
    ],
    filter: { type: 'lowpass', frequency: 180, sweepTo: 300, Q: 0.8 },
    volume: 0.08,
    fadeIn: 4,
  },
  // Ethereal shimmer — soft high-register sparkle
  {
    id: 'neon_shimmer',
    voices: [
      { wave: 'sine', frequency: 3200, gain: 0.04, detune: 8 },
      { wave: 'sine', frequency: 4800, gain: 0.02, detune: -5 },
    ],
    filter: { type: 'bandpass', frequency: 4000, sweepTo: 6000, Q: 0.4 },
    volume: 0.025,
    fadeIn: 6,
  },
];
