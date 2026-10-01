import type { VisualTheme } from './VisualTheme';

export const NEON_BLUE: VisualTheme = {
  id: 'neon-blue',
  name: 'Neon Blue',
  cabinet: { background: 0x101832, frame: 0x202b42, frameEdge: 0x829bbd, accent: '#1c77c9' },
  playfield: { top: 0x174a7e, bottom: 0x164371, outside: 0x0b1428, grid: 0xe7f6ff, gridAlpha: 0.06, shooterLane: 0x0f2747 },
  walls: {
    rail: 0x829bbd,
    orbit: 0x31d9f3,
    shooter: 0x31d9f3,
    'lane-guide': 0x31d9f3,
    island: 0x56b8ed,
    apron: 0x829bbd,
  },
  rail: { metal: 0x202b42, highlight: 0xe7f6ff, glowAlpha: 0.34, highlightAlpha: 0.88 },
  posts: { rubber: 0x2edbf2, cap: 0xe7f6ff, outlane: 0xea4fff },
  bumpers: { base: 0x111a31, rings: [0x31d9f3, 0xea4fff, 0x258cff], mini: 0x56b8ed },
  slingshot: { face: 0x2edbf2, fillAlpha: 0.28 },
  targets: { idle: 0x258cff, lit: 0xea4fff },
  lights: { off: 0x202b42, offAlpha: 0.9, lane: 0x31d9f3, target: 0xea4fff, arrow: 0x31d9f3, ambient: [0x31d9f3, 0xea4fff, 0x258cff] },
  gate: 0xe7f6ff,
  flipper: { body: 0xe1edf9, left: 0x31d9f3, right: 0xea4fff, glow: 0x258cff },
  ball: { core: 0xb7fbff, highlight: 0xffffff, glow: 0x31d9f3 },
  ui: { text: 0xeafaff, accent: 0x31d9f3, panel: 0x202b42, muted: 0xe7f6ff, good: 0x31d9f3, warn: 0xea4fff },
  effects: { particles: true, screenShake: true, glowAlpha: 0.8 },
};
