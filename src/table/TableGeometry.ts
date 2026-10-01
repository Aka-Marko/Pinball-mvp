/**
 * Pure table geometry: positions, shapes and gameplay roles only.
 * Nothing in here knows about colors, glow, fonts or any other visual style.
 */

export type Point = readonly [number, number];

export type WallRole =
  | 'rail'
  | 'orbit'
  | 'shooter'
  | 'lane-guide'
  | 'island'
  | 'apron';

export interface WallDef {
  id: string;
  role: WallRole;
  /** Polyline through the visual centerline of the rail. */
  points: readonly Point[];
  /** Visual (and default collision) thickness. */
  thickness: number;
  closed?: boolean;
  /**
   * Optional deeper collision body for fast-ball walls. The extra depth extends
   * away from `interior`, so the face the ball touches stays exactly on the drawn rail.
   */
  backing?: { depth: number; interior: Point };
}

export type PostRole = 'rubber' | 'cap' | 'outlane';

export interface PostDef {
  id: string;
  role: PostRole;
  x: number;
  y: number;
  radius: number;
}

export interface BumperDef {
  id: string;
  kind: 'pop' | 'mini';
  x: number;
  y: number;
  radius: number;
  points: number;
}

export interface SlingshotDef {
  id: string;
  /** top: upper corner, heel: lower corner beside the inlane, toe: corner nearest the flipper. */
  top: Point;
  heel: Point;
  toe: Point;
  thickness: number;
  points: number;
}

export interface TargetDef {
  id: string;
  group: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  points: number;
}

export interface SensorDef {
  id: string;
  group: string;
  x: number;
  y: number;
  width: number;
  height: number;
  points: number;
}

export interface GateDef {
  id: string;
  /** Low end of the gate (the side a blocked ball rolls toward). */
  a: Point;
  b: Point;
  thickness: number;
}

export type LightRole = 'lane' | 'target' | 'arrow' | 'ambient';

export interface LightDef {
  id: string;
  role: LightRole;
  x: number;
  y: number;
  radius: number;
  /** Arrow direction in radians (0 = pointing right). */
  angle?: number;
  /** Element whose lit state drives this light (rollover, target or orbit sensor). */
  link?: string;
}

export interface FlipperGeometry {
  y: number;
  leftPivot: number;
  rightPivot: number;
  length: number;
  thickness: number;
  restAngle: number;
  activeAngle: number;
}

export interface LauncherGeometry {
  x: number;
  y: number;
  maxChargeMs: number;
  minVelocity: { x: number; y: number };
  maxVelocity: { x: number; y: number };
  /** Inner faces of the shooter lane. */
  lane: { left: number; right: number; top: number; bottom: number };
}

export interface TableGeometry {
  id: string;
  name: string;
  width: number;
  height: number;
  centerX: number;
  frame: { x: number; y: number; width: number; height: number; radius: number };
  /** Inner faces of the outer playfield walls (shooter lane excluded). */
  playfield: { left: number; right: number; top: number; bottom: number };
  /** Outer arch centerline, used by renderers to shade the area outside the arch. */
  arch: readonly Point[];
  drainY: number;
  ball: { radius: number };
  launcher: LauncherGeometry;
  flippers: FlipperGeometry;
  walls: readonly WallDef[];
  posts: readonly PostDef[];
  bumpers: readonly BumperDef[];
  slingshots: readonly SlingshotDef[];
  targets: readonly TargetDef[];
  rollovers: readonly SensorDef[];
  orbitSensors: readonly SensorDef[];
  gates: readonly GateDef[];
  lights: readonly LightDef[];
}

/** Points on an ellipse from `start` to `end` radians (0 = right, PI/2 = top, screen y-down). */
export function arcPoints(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  start: number,
  end: number,
  steps: number,
): Point[] {
  const points: Point[] = [];
  for (let index = 0; index <= steps; index += 1) {
    const angle = start + ((end - start) * index) / steps;
    points.push([round(cx + rx * Math.cos(angle)), round(cy - ry * Math.sin(angle))]);
  }
  return points;
}

export function mirrorPoint([x, y]: Point, axisX: number): Point {
  return [2 * axisX - x, y];
}

export function mirrorPoints(points: readonly Point[], axisX: number): Point[] {
  return points.map((point) => mirrorPoint(point, axisX));
}

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function wallSegments(wall: WallDef): Segment[] {
  const points = wall.closed ? [...wall.points, wall.points[0]] : wall.points;
  return points.slice(1).map(([x2, y2], index) => {
    const [x1, y1] = points[index];
    return { x1, y1, x2, y2 };
  });
}

export function slingshotSegments(sling: SlingshotDef): { face: Segment; others: Segment[] } {
  const [tx, ty] = sling.top;
  const [hx, hy] = sling.heel;
  const [ox, oy] = sling.toe;
  return {
    face: { x1: tx, y1: ty, x2: ox, y2: oy },
    others: [
      { x1: tx, y1: ty, x2: hx, y2: hy },
      { x1: hx, y1: hy, x2: ox, y2: oy },
    ],
  };
}

/** Distance from a point to a finite segment. */
export function distanceToSegment(px: number, py: number, segment: Segment): number {
  const dx = segment.x2 - segment.x1;
  const dy = segment.y2 - segment.y1;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - segment.x1) * dx + (py - segment.y1) * dy) / lengthSq));
  return Math.hypot(px - (segment.x1 + t * dx), py - (segment.y1 + t * dy));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
