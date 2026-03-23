/** Neon Survivors — procedural sound definitions.
 *  All sounds synthesized via Web Audio API, zero audio files. */

import type { SynthSoundDef, AmbientLayerDef, MusicTrackDef } from '@survivors/core';

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

export const AMBIENT: AmbientLayerDef[] = [];

// ── Music ───────────────────────────────────────────────────────────

/** MIDI note → Hz */
const m = (note: number) => 440 * Math.pow(2, (note - 69) / 12);

// Note shorthand: freq, duration in steps, optional velocity
const nt = (midi: number, dur: number, vel = 1): { freq: number; dur: number; vel: number } =>
  ({ freq: m(midi), dur, vel });
const rest = (dur: number): { freq: number; dur: number; vel: number } =>
  ({ freq: 0, dur, vel: 0 });

export const MUSIC: MusicTrackDef[] = [
  {
    id: 'cosmic_drift',
    bpm: 72,
    subdivision: 4,
    volume: 0.18,
    fadeIn: 4,
    voices: [
      // 0 — Sub bass (deep sine)
      {
        wave: 'sine',
        envelope: { attack: 0.4, decay: 0.3, sustain: 0.7, release: 0.8 },
        filter: { type: 'lowpass', frequency: 200 },
        gain: 0.6,
      },
      // 1 — Pad (warm triangle, slow swell)
      {
        wave: 'triangle',
        envelope: { attack: 0.6, decay: 0.4, sustain: 0.5, release: 1.0 },
        filter: { type: 'lowpass', frequency: 800, Q: 0.5 },
        gain: 0.3,
        detune: 5,
      },
      // 2 — Arp (clean sine, plucky)
      {
        wave: 'sine',
        envelope: { attack: 0.01, decay: 0.15, sustain: 0.2, release: 0.3 },
        gain: 0.35,
      },
      // 3 — Rhythmic pulse (filtered square, subtle)
      {
        wave: 'square',
        envelope: { attack: 0.005, decay: 0.06, sustain: 0.0, release: 0.05 },
        filter: { type: 'lowpass', frequency: 300 },
        gain: 0.2,
      },
    ],
    patterns: [
      // ── Bass (voice 0): whole notes, 16 steps each — Am Em F Dm ──
      {
        voice: 0,
        notes: [
          nt(33, 16),  // A1
          nt(40, 16),  // E2
          nt(41, 16),  // F2
          nt(38, 16),  // D2
        ],
      },
      // ── Pad root (voice 1): half notes, 8 steps ──
      {
        voice: 1,
        notes: [
          nt(57, 8), nt(57, 8),   // A3, A3  (Am)
          nt(52, 8), nt(52, 8),   // E3, E3  (Em)
          nt(53, 8), nt(53, 8),   // F3, F3  (F)
          nt(50, 8), nt(50, 8),   // D3, D3  (Dm)
        ],
      },
      // ── Pad fifth (voice 1): half notes, harmony ──
      {
        voice: 1,
        notes: [
          nt(64, 8), nt(64, 8),   // E4, E4  (Am)
          nt(59, 8), nt(59, 8),   // B3, B3  (Em)
          nt(60, 8), nt(60, 8),   // C4, C4  (F)
          nt(57, 8), nt(57, 8),   // A3, A3  (Dm)
        ],
      },
      // ── Arp (voice 2): eighth notes, ascending/descending arpeggios ──
      {
        voice: 2,
        notes: [
          // Am: A3-C4-E4-A4-E4-C4-A3-rest
          nt(57, 2, 0.8), nt(60, 2, 0.6), nt(64, 2, 0.9), nt(69, 2, 0.7),
          nt(64, 2, 0.6), nt(60, 2, 0.5), nt(57, 2, 0.7), rest(2),
          // Em: E3-G3-B3-E4-B3-G3-E3-rest
          nt(52, 2, 0.8), nt(55, 2, 0.6), nt(59, 2, 0.9), nt(64, 2, 0.7),
          nt(59, 2, 0.6), nt(55, 2, 0.5), nt(52, 2, 0.7), rest(2),
          // F: F3-A3-C4-F4-C4-A3-F3-rest
          nt(53, 2, 0.8), nt(57, 2, 0.6), nt(60, 2, 0.9), nt(65, 2, 0.7),
          nt(60, 2, 0.6), nt(57, 2, 0.5), nt(53, 2, 0.7), rest(2),
          // Dm: D3-F3-A3-D4-A3-F3-D3-rest
          nt(50, 2, 0.8), nt(53, 2, 0.6), nt(57, 2, 0.9), nt(62, 2, 0.7),
          nt(57, 2, 0.6), nt(53, 2, 0.5), nt(50, 2, 0.7), rest(2),
        ],
      },
      // ── Rhythmic pulse (voice 3): quarter-note kick on beats ──
      {
        voice: 3,
        notes: [
          nt(45, 1, 0.7), rest(3),  // beat 1
          rest(4),                    // beat 2 (rest)
          nt(45, 1, 0.5), rest(3),  // beat 3
          rest(4),                    // beat 4 (rest)
        ],
      },
    ],
  },
];
