import type { VisualTheme } from './VisualTheme';

export const RETRO_ARCADE: VisualTheme = {
  id: 'retro',
  name: 'Retro Arcade',
  cabinet: { background: 0x27164a, frame: 0x512552, frameEdge: 0xffc77b, accent: '#ffcf4a' },
  playfield: { top: 0x7b275b, bottom: 0x63295f, outside: 0x1e1038, grid: 0xfff1bd, gridAlpha: 0.06, shooterLane: 0x3b1846 },
  walls: {
    rail: 0xffc77b,
    orbit: 0xffe14c,
    shooter: 0x68e8df,
    'lane-guide': 0xffe14c,
    island: 0xff935a,
    apron: 0xffc77b,
  },
  rail: { metal: 0x512552, highlight: 0xfff1bd, glowAlpha: 0.3, highlightAlpha: 0.88 },
  posts: { rubber: 0x61edcf, cap: 0xfff1bd, outlane: 0xff62a8 },
  bumpers: { base: 0x552553, rings: [0xffe14c, 0x61edcf, 0xff62a8], mini: 0xff935a },
  slingshot: { face: 0x61edcf, fillAlpha: 0.3 },
  targets: { idle: 0x4eafff, lit: 0xffe14c },
  lights: { off: 0x512552, offAlpha: 0.9, lane: 0xffe14c, target: 0xff62a8, arrow: 0x61edcf, ambient: [0xffe14c, 0x61edcf, 0xff62a8] },
  gate: 0xfff1bd,
  flipper: { body: 0xffe6b4, left: 0x61edcf, right: 0xff62a8, glow: 0xffd34e },
  ball: { core: 0xfff4e0, highlight: 0xffffff, glow: 0xffd34e },
  ui: { text: 0xfff6d6, accent: 0xffd34e, panel: 0x512552, muted: 0xfff1bd, good: 0x61edcf, warn: 0xff62a8 },
  effects: { particles: true, screenShake: true, glowAlpha: 0.72 },
};
