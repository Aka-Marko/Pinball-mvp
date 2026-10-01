import type { VisualTheme } from './VisualTheme';

export const SPACE: VisualTheme = {
  id: 'space',
  name: 'Space',
  cabinet: { background: 0x060719, frame: 0x1c2141, frameEdge: 0x7483c8, accent: '#7462ff' },
  playfield: { top: 0x111538, bottom: 0x131a43, outside: 0x05061a, grid: 0xe1d9ff, gridAlpha: 0.05, shooterLane: 0x0b0e2a },
  walls: {
    rail: 0x7483c8,
    orbit: 0x8b6cff,
    shooter: 0x6eeaff,
    'lane-guide': 0x8b6cff,
    island: 0x6678da,
    apron: 0x7483c8,
  },
  rail: { metal: 0x1c2141, highlight: 0xe1d9ff, glowAlpha: 0.38, highlightAlpha: 0.82 },
  posts: { rubber: 0x55daf9, cap: 0xe1d9ff, outlane: 0xed58e8 },
  bumpers: { base: 0x171b3b, rings: [0x8b6cff, 0x55daf9, 0xed58e8], mini: 0x6678da },
  slingshot: { face: 0x55daf9, fillAlpha: 0.3 },
  targets: { idle: 0x596dff, lit: 0xed58e8 },
  lights: { off: 0x1c2141, offAlpha: 0.9, lane: 0x55daf9, target: 0xed58e8, arrow: 0xa78bff, ambient: [0x8b6cff, 0x55daf9, 0xed58e8] },
  gate: 0xe1d9ff,
  flipper: { body: 0xd9d8ff, left: 0x55daf9, right: 0xed58e8, glow: 0x7462ff },
  ball: { core: 0xd9e4ff, highlight: 0xffffff, glow: 0x8b6cff },
  ui: { text: 0xf0edff, accent: 0xa78bff, panel: 0x1c2141, muted: 0xe1d9ff, good: 0x55daf9, warn: 0xed58e8 },
  effects: { particles: true, screenShake: true, glowAlpha: 0.9 },
};
