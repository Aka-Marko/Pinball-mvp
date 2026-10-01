import type { VisualTheme } from './VisualTheme';

export const JUNGLE: VisualTheme = {
  id: 'jungle',
  name: 'Jungle',
  cabinet: { background: 0x102c31, frame: 0x25493e, frameEdge: 0x9eb98e, accent: '#9bdb67' },
  playfield: { top: 0x225d49, bottom: 0x1d5945, outside: 0x0c2226, grid: 0xe3f4bd, gridAlpha: 0.06, shooterLane: 0x153a33 },
  walls: {
    rail: 0x9eb98e,
    orbit: 0x9bdb67,
    shooter: 0x8be6a5,
    'lane-guide': 0x9bdb67,
    island: 0x52bb88,
    apron: 0x9eb98e,
  },
  rail: { metal: 0x25493e, highlight: 0xe3f4bd, glowAlpha: 0.22, highlightAlpha: 0.86 },
  posts: { rubber: 0xe2cb61, cap: 0xe3f4bd, outlane: 0xed7b55 },
  bumpers: { base: 0x285244, rings: [0x9bdb67, 0x65e0cb, 0xed7b55], mini: 0x52bb88 },
  slingshot: { face: 0xe2cb61, fillAlpha: 0.32 },
  targets: { idle: 0x54a9cb, lit: 0xe2cb61 },
  lights: { off: 0x25493e, offAlpha: 0.9, lane: 0x9bdb67, target: 0xed7b55, arrow: 0x65e0cb, ambient: [0x9bdb67, 0x65e0cb, 0xed7b55] },
  gate: 0xe3f4bd,
  flipper: { body: 0xe1e6c4, left: 0x65e0cb, right: 0xe2cb61, glow: 0x9bdb67 },
  ball: { core: 0xf0f5dc, highlight: 0xffffff, glow: 0x9bdb67 },
  ui: { text: 0xf0f5cd, accent: 0x9bdb67, panel: 0x25493e, muted: 0xe3f4bd, good: 0x65e0cb, warn: 0xed7b55 },
  effects: { particles: true, screenShake: true, glowAlpha: 0.58 },
};
