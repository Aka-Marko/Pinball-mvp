import {
  arcPoints,
  mirrorPoint,
  mirrorPoints,
  type LightDef,
  type Point,
  type PostDef,
  type SensorDef,
  type TableGeometry,
  type TargetDef,
  type WallDef,
} from '../TableGeometry';

/**
 * "Classic Orbit": a right-side shooter lane feeding a full top orbit, three upper
 * rollover lanes over a pop-bumper nest, a crowded middle (target banks, island,
 * rubber posts, mini bumpers) and classic slingshot / inlane / outlane bottom.
 *
 * Coordinates are canvas pixels (ball diameter 20 px ≈ 1 1/16", so ~19 px per inch).
 * The main playfield is mirrored around CX; the shooter lane sits to its right.
 */
const CX = 223;
const mirror = (points: readonly Point[]): Point[] => mirrorPoints(points, CX);

const OUTER_INTERIOR: Point = [241, 420];
const ARCH = arcPoints(241, 220, 211, 186, 0, Math.PI, 64);

const LANE_DIVIDERS = [166, 204, 242, 280];
const LANE_CENTERS = [185, 223, 261];

const leftTargets: TargetDef[] = [
  { id: 'target-l1', group: 'left-bank', x: 76, y: 228, width: 6, height: 22, angle: 0, points: 100 },
  { id: 'target-l2', group: 'left-bank', x: 76, y: 252, width: 6, height: 22, angle: 0, points: 100 },
  { id: 'target-l3', group: 'left-bank', x: 76, y: 276, width: 6, height: 22, angle: 0, points: 100 },
];
const rightTargets: TargetDef[] = leftTargets.map((target, index) => ({
  ...target,
  id: `target-r${index + 1}`,
  group: 'right-bank',
  x: 2 * CX - target.x,
  angle: -target.angle,
}));

const walls: WallDef[] = [
  {
    id: 'outer',
    role: 'rail',
    points: [[452, 760], ...ARCH, [30, 760]],
    thickness: 12,
    backing: { depth: 44, interior: OUTER_INTERIOR },
  },
  { id: 'shooter-divider', role: 'shooter', points: [[416, 752], [416, 206]], thickness: 8 },
  {
    id: 'shooter-floor',
    role: 'shooter',
    points: [[416, 750], [452, 750]],
    thickness: 10,
    backing: { depth: 40, interior: [434, 700] },
  },

  { id: 'orbit-left-guide', role: 'orbit', points: [[68, 206], [68, 292], [100, 338]], thickness: 8 },
  { id: 'orbit-right-guide', role: 'orbit', points: mirror([[68, 206], [68, 292], [100, 338]]), thickness: 8 },
  { id: 'orbit-left-deflector', role: 'orbit', points: [[36, 300], [58, 410]], thickness: 8 },
  { id: 'orbit-right-deflector', role: 'orbit', points: mirror([[36, 300], [58, 410]]), thickness: 8 },

  ...LANE_DIVIDERS.map((x, index): WallDef => ({
    id: `lane-divider-${index + 1}`,
    role: 'lane-guide',
    points: [[x, 114], [x, 160]],
    thickness: 6,
  })),

  {
    id: 'island',
    role: 'island',
    points: [[223, 368], [245, 392], [223, 416], [201, 392]],
    thickness: 8,
    closed: true,
  },

  // Inlane guides end just past the flipper pivot (flippers pass beneath them), so the ball is
  // fed onto the flipper and can't lodge between the guide tip and the pivot.
  { id: 'outlane-left-guide', role: 'lane-guide', points: [[68, 466], [68, 570], [106, 602]], thickness: 8 },
  { id: 'outlane-right-guide', role: 'lane-guide', points: mirror([[68, 466], [68, 570], [106, 602]]), thickness: 8 },

  { id: 'apron-left', role: 'apron', points: [[30, 684], [150, 756]], thickness: 10 },
  { id: 'apron-right', role: 'apron', points: mirror([[30, 684], [150, 756]]), thickness: 10 },
];

const posts: PostDef[] = [
  { id: 'shooter-cap', role: 'cap', x: 416, y: 206, radius: 5 },
  { id: 'orbit-left-top', role: 'cap', x: 68, y: 206, radius: 5 },
  { id: 'orbit-right-top', role: 'cap', x: 378, y: 206, radius: 5 },
  { id: 'orbit-left-mouth', role: 'rubber', x: 100, y: 338, radius: 6 },
  { id: 'orbit-right-mouth', role: 'rubber', x: 346, y: 338, radius: 6 },
  { id: 'deflector-left-tip', role: 'rubber', x: 58, y: 410, radius: 5 },
  { id: 'deflector-right-tip', role: 'rubber', x: 388, y: 410, radius: 5 },
  ...LANE_DIVIDERS.map((x, index): PostDef => ({ id: `lane-cap-${index + 1}`, role: 'cap', x, y: 114, radius: 4 })),
  { id: 'pop-left-rubber', role: 'rubber', x: 138, y: 250, radius: 7 },
  { id: 'pop-right-rubber', role: 'rubber', x: 308, y: 250, radius: 7 },
  { id: 'mid-left-rubber', role: 'rubber', x: 170, y: 335, radius: 7 },
  { id: 'mid-right-rubber', role: 'rubber', x: 276, y: 335, radius: 7 },
  { id: 'island-top', role: 'rubber', x: 223, y: 368, radius: 6 },
  { id: 'island-left', role: 'rubber', x: 201, y: 392, radius: 6 },
  { id: 'island-right', role: 'rubber', x: 245, y: 392, radius: 6 },
  { id: 'island-bottom', role: 'rubber', x: 223, y: 416, radius: 6 },
  { id: 'outlane-left-post', role: 'outlane', x: 68, y: 466, radius: 6 },
  { id: 'outlane-right-post', role: 'outlane', x: 378, y: 466, radius: 6 },
];

const rollovers: SensorDef[] = LANE_CENTERS.map((x, index) => ({
  id: `lane-${'ABC'[index]}`,
  group: 'top-lanes',
  x,
  y: 146,
  width: 18,
  height: 10,
  points: 50,
}));

const orbitSensors: SensorDef[] = [
  { id: 'orbit-left', group: 'orbit', x: 50, y: 250, width: 24, height: 8, points: 250 },
  { id: 'orbit-right', group: 'orbit', x: 396, y: 250, width: 24, height: 8, points: 250 },
];

function targetLight(target: TargetDef): LightDef {
  const direction = Math.sign(CX - target.x);
  return {
    id: `${target.id}-light`,
    role: 'target',
    x: target.x + direction * 18 * Math.cos(target.angle),
    y: target.y + direction * 18 * Math.sin(target.angle),
    radius: 4,
    link: target.id,
  };
}

const ambientLights: LightDef[] = arcPoints(241, 220, 186, 162, 0.35, Math.PI - 0.35, 10).map(([x, y], index) => ({
  id: `ambient-${index}`,
  role: 'ambient',
  x,
  y,
  radius: 2,
}));

const lights: LightDef[] = [
  ...rollovers.map((lane): LightDef => ({ id: `${lane.id}-light`, role: 'lane', x: lane.x, y: 128, radius: 5, link: lane.id })),
  ...[...leftTargets, ...rightTargets].map(targetLight),
  { id: 'orbit-left-arrow', role: 'arrow', x: 116, y: 368, radius: 9, angle: -2.21, link: 'orbit-left' },
  { id: 'orbit-right-arrow', role: 'arrow', x: 330, y: 368, radius: 9, angle: -0.93, link: 'orbit-right' },
  { id: 'center-arrow', role: 'arrow', x: 223, y: 458, radius: 10, angle: -Math.PI / 2 },
  ...ambientLights,
];

export const CLASSIC_ORBIT: TableGeometry = {
  id: 'classic-orbit',
  name: 'Classic Orbit',
  width: 480,
  height: 800,
  centerX: CX,
  frame: { x: 12, y: 18, width: 456, height: 770, radius: 26 },
  playfield: { left: 36, right: 410, top: 40, bottom: 760 },
  arch: ARCH,
  drainY: 815,
  ball: { radius: 10 },
  launcher: {
    x: 435,
    y: 720,
    maxChargeMs: 2000,
    minVelocity: { x: 0, y: -20 },
    maxVelocity: { x: 0, y: -40 },
    lane: { left: 420, right: 446, top: 206, bottom: 745 },
  },
  flippers: {
    y: 625,
    leftPivot: 93,
    rightPivot: 353,
    length: 108,
    thickness: 20,
    restAngle: 0.18,
    activeAngle: 0.68,
  },
  walls,
  posts,
  bumpers: [
    { id: 'pop-left', kind: 'pop', x: 184, y: 218, radius: 26, points: 100 },
    { id: 'pop-right', kind: 'pop', x: 262, y: 218, radius: 26, points: 100 },
    { id: 'pop-bottom', kind: 'pop', x: 223, y: 290, radius: 26, points: 150 },
    { id: 'mini-left', kind: 'mini', x: 118, y: 400, radius: 14, points: 75 },
    { id: 'mini-right', kind: 'mini', x: 328, y: 400, radius: 14, points: 75 },
  ],
  slingshots: [
    { id: 'sling-left', top: [106, 474], heel: [106, 548], toe: [138, 562], thickness: 12, points: 10 },
    {
      id: 'sling-right',
      top: mirrorPoint([106, 474], CX),
      heel: mirrorPoint([106, 548], CX),
      toe: mirrorPoint([138, 562], CX),
      thickness: 12,
      points: 10,
    },
  ],
  targets: [...leftTargets, ...rightTargets],
  rollovers,
  orbitSensors,
  gates: [{ id: 'shooter-gate', a: [412, 196], b: [446, 176], thickness: 6 }],
  lights,
};
