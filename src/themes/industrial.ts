import type { VisualTheme } from './VisualTheme';

export const INDUSTRIAL: VisualTheme = {
  id: 'factory',
  name: 'Industrial',
  cabinet: { background: 0x17191f, frame: 0x36363b, frameEdge: 0x9c9b91, accent: '#ffc04d' },
  playfield: { top: 0x41434b, bottom: 0x2a3032, outside: 0x141519, grid: 0xf4e7bf, gridAlpha: 0.07, shooterLane: 0x1f2124 },
  walls: {
    rail: 0x9c9b91,
    orbit: 0xffc04d,
    shooter: 0xffcf68,
    'lane-guide': 0xffc04d,
    island: 0xb77c37,
    apron: 0x9c9b91,
  },
  rail: { metal: 0x36363b, highlight: 0xf4e7bf, glowAlpha: 0.2, highlightAlpha: 0.96 },
  posts: { rubber: 0xe39c39, cap: 0xf4e7bf, outlane: 0xe35d4f },
  bumpers: { base: 0x343538, rings: [0xffc04d, 0xe35d4f, 0x57d3ce], mini: 0xb77c37 },
  slingshot: { face: 0xe39c39, fillAlpha: 0.35 },
  targets: { idle: 0x5da2c9, lit: 0xffc04d },
  lights: { off: 0x36363b, offAlpha: 0.95, lane: 0xffc04d, target: 0xe35d4f, arrow: 0xffc04d, ambient: [0xffc04d, 0xe35d4f, 0x57d3ce] },
  gate: 0xf4e7bf,
  flipper: { body: 0xd3c6a8, left: 0xffc04d, right: 0xe35d4f, glow: 0xffa32b },
  ball: { core: 0xe6e3dc, highlight: 0xffffff, glow: 0xffc04d },
  ui: { text: 0xfff3d5, accent: 0xffc04d, panel: 0x36363b, muted: 0xf4e7bf, good: 0x57d3ce, warn: 0xe35d4f },
  effects: { particles: true, screenShake: true, glowAlpha: 0.45 },
};
