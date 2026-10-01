import type { LightRole, PostRole, WallRole } from '../table';

/**
 * A visual theme styles table *roles* (rail, orbit guide, rubber post, lane light...).
 * It never contains coordinates, so any theme can be applied to any table geometry.
 */
export interface VisualTheme {
  id: string;
  name: string;
  /** Cabinet colors around and behind the playfield. */
  cabinet: { background: number; frame: number; frameEdge: number; accent: string };
  playfield: { top: number; bottom: number; outside: number; grid: number; gridAlpha: number; shooterLane: number };
  walls: Readonly<Record<WallRole, number>>;
  rail: { metal: number; highlight: number; glowAlpha: number; highlightAlpha: number };
  posts: Readonly<Record<PostRole, number>>;
  bumpers: { base: number; rings: readonly number[]; mini: number };
  slingshot: { face: number; fillAlpha: number };
  targets: { idle: number; lit: number };
  lights: { off: number; offAlpha: number } & Readonly<Record<Exclude<LightRole, 'ambient'>, number>> & {
    ambient: readonly number[];
  };
  gate: number;
  flipper: { body: number; left: number; right: number; glow: number };
  ball: { core: number; highlight: number; glow: number };
  ui: { text: number; accent: number; panel: number; muted: number; good: number; warn: number };
  effects: { particles: boolean; screenShake: boolean; glowAlpha: number };
}

export function toCssColor(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
