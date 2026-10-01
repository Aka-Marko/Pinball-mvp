import { getLaunchVelocity } from '../game/LaunchPower';
import {
  slingshotSegments,
  wallSegments,
  type BumperDef,
  type Point,
  type Segment,
  type SensorDef,
  type TableGeometry,
  type TargetDef,
} from '../table/TableGeometry';
import { MATERIALS } from './PhysicsConfig';

/** The subset of the Matter namespace the table needs (Phaser's bundled Matter or a headless copy). */
export interface MatterApi {
  Bodies: typeof MatterJS.Bodies;
  Body: typeof MatterJS.Body;
  Composite: typeof MatterJS.Composite;
  Constraint: typeof MatterJS.Constraint;
  Events: typeof MatterJS.Events;
}

export interface FlipperState {
  x: number;
  y: number;
  angle: number;
  length: number;
  thickness: number;
}

export interface BumperState extends BumperDef {
  flash: number;
}

export interface LitState {
  id: string;
  group: string;
  x: number;
  y: number;
  points: number;
  lit: boolean;
  flash: number;
}

export type TableEvent =
  | { type: 'bumper'; id: string; points: number; x: number; y: number; radius: number }
  | { type: 'slingshot'; id: string; points: number; x: number; y: number }
  | { type: 'target'; id: string; points: number; x: number; y: number }
  | { type: 'rollover'; id: string; points: number; x: number; y: number }
  | { type: 'orbit'; id: string; points: number; x: number; y: number }
  | { type: 'loop'; id: string; points: number; x: number; y: number }
  | { type: 'group-complete'; id: string; points: number; x: number; y: number }
  | { type: 'drain' }
  | { type: 'shooter-return' };

export const GROUP_BONUS: Readonly<Record<string, number>> = {
  'top-lanes': 1000,
  'left-bank': 750,
  'right-bank': 750,
};
export const LOOP_BONUS = 1000;
const LOOP_WINDOW_MS = 3000;
const FLASH_MS = 180;
const ORBIT_LIGHT_MS = 1400;
const SHOOTER_REST_SPEED = 0.25;
const SHOOTER_REST_STEPS = 30;
/** Ball search: a ball that stays within STALL_RADIUS px (balanced or wedged) for this long gets a small kick. */
const STALL_RADIUS = 3;
const STALL_STEPS = 120;
const STALL_KICK = { x: 1.5, y: -1 };
const BALL_CATEGORY = 0x0001;
const FLIPPER_CATEGORY = 0x8000;
const ROUND_SIDES = 32;

export class TableWorld {
  readonly ball: MatterJS.BodyType;
  readonly leftFlipper: MatterJS.BodyType;
  readonly rightFlipper: MatterJS.BodyType;
  readonly bumpers: BumperState[];
  readonly slingshots: LitState[];
  readonly targets: LitState[];
  readonly rollovers: LitState[];
  readonly orbitSensors: LitState[];
  readonly gateSolid = new Map<string, boolean>();

  private readonly bodies: MatterJS.BodyType[] = [];
  private readonly constraints: MatterJS.ConstraintType[] = [];
  private readonly gateBits = new Map<string, number>();
  private leftHeld = false;
  private rightHeld = false;
  private active = false;
  private shooterRestSteps = 0;
  private stallSteps = 0;
  private stallAnchor = { x: 0, y: 0 };
  private lastOrbit: { id: string; time: number } | null = null;

  constructor(
    private readonly matter: MatterApi,
    private readonly engine: MatterJS.Engine,
    readonly table: TableGeometry,
    private readonly onEvent: (event: TableEvent) => void,
  ) {
    this.createStaticBodies();
    this.bumpers = table.bumpers.map((bumper) => {
      this.add(this.round(bumper.x, bumper.y, bumper.radius, {
        label: `bumper:${bumper.id}`,
        isStatic: true,
        ...MATERIALS.bumper,
      }));
      return { ...bumper, flash: 0 };
    });
    this.slingshots = table.slingshots.map((sling) => this.createSlingshot(sling));
    this.targets = table.targets.map((target) => this.createTarget(target));
    this.rollovers = table.rollovers.map((sensor) => this.createSensor(sensor, 'rollover'));
    this.orbitSensors = table.orbitSensors.map((sensor) => this.createSensor(sensor, 'orbit'));
    table.gates.forEach((gate, index) => this.createGate(gate.id, gate.a, gate.b, gate.thickness, 0x0002 << index));

    const ballOptions = {
      label: 'ball',
      ...MATERIALS.ball,
      collisionFilter: { group: 0, category: BALL_CATEGORY, mask: 0xffffffff },
    };
    this.ball = this.add(this.round(table.launcher.x, table.launcher.y, table.ball.radius, ballOptions));
    // Keep the exact mass/inertia of the original Matter circle so flipper hits feel the same.
    const reference = matter.Bodies.circle(0, 0, table.ball.radius, ballOptions);
    matter.Body.setMass(this.ball, reference.mass);
    matter.Body.setInertia(this.ball, reference.inertia);
    matter.Body.setStatic(this.ball, true);

    this.leftFlipper = this.createFlipper(table.flippers.leftPivot, table.flippers.y, false);
    this.rightFlipper = this.createFlipper(table.flippers.rightPivot, table.flippers.y, true);
    matter.Events.on(engine, 'beforeUpdate', this.beforeUpdate);
    matter.Events.on(engine, 'collisionStart', this.onCollisionStart);
  }

  get isActive(): boolean {
    return this.active;
  }

  get leftFlipperState(): FlipperState {
    return this.flipperState(this.leftFlipper, this.table.flippers.leftPivot);
  }

  get rightFlipperState(): FlipperState {
    return this.flipperState(this.rightFlipper, this.table.flippers.rightPivot);
  }

  setFlippers(left: boolean, right: boolean): void {
    this.leftHeld = left;
    this.rightHeld = right;
  }

  setActive(active: boolean): void {
    this.active = active;
    this.shooterRestSteps = 0;
    this.stallSteps = 0;
    if (!active) {
      this.leftHeld = false;
      this.rightHeld = false;
      this.parkBall();
    }
  }

  launch(chargeMs: number): void {
    if (!this.active) return;
    const { Body } = this.matter;
    Body.setStatic(this.ball, false);
    Body.setPosition(this.ball, { x: this.table.launcher.x, y: this.table.launcher.y });
    Body.setVelocity(this.ball, getLaunchVelocity(chargeMs, this.table.launcher));
    Body.setAngularVelocity(this.ball, 0);
    this.shooterRestSteps = 0;
  }

  /** Per-frame bookkeeping: light timers, drain and shooter-lane return detection. */
  update(delta: number): void {
    for (const bumper of this.bumpers) bumper.flash = Math.max(0, bumper.flash - delta);
    for (const element of [...this.slingshots, ...this.targets, ...this.rollovers, ...this.orbitSensors]) {
      element.flash = Math.max(0, element.flash - delta);
    }
    for (const sensor of this.orbitSensors) if (sensor.flash === 0) sensor.lit = false;
    if (!this.active) return;

    const { x, y } = this.ball.position;
    if (y > this.table.drainY) {
      this.active = false;
      this.onEvent({ type: 'drain' });
      return;
    }

    const lane = this.table.launcher.lane;
    const inShooterLane = x > lane.left && x < lane.right && y > lane.top + 60 && y < lane.bottom;
    const speed = this.matter.Body.getSpeed(this.ball);
    this.shooterRestSteps = inShooterLane && speed < SHOOTER_REST_SPEED ? this.shooterRestSteps + 1 : 0;
    if (this.shooterRestSteps >= SHOOTER_REST_STEPS) {
      this.setActive(false);
      this.onEvent({ type: 'shooter-return' });
      return;
    }

    // Never search while the ball is in the shooter lane or cradled on a flipper. Uses displacement,
    // not speed, because a wedged ball can jitter in place with a non-zero velocity.
    const searchable = !inShooterLane && y < this.table.flippers.y - 40;
    const anchored = Math.hypot(x - this.stallAnchor.x, y - this.stallAnchor.y) < STALL_RADIUS;
    if (searchable && anchored) {
      this.stallSteps += 1;
    } else {
      this.stallSteps = 0;
      this.stallAnchor = { x, y };
    }
    if (this.stallSteps >= STALL_STEPS) {
      this.stallSteps = 0;
      this.matter.Body.setVelocity(this.ball, {
        x: Math.sign(this.table.centerX - x || 1) * STALL_KICK.x,
        y: STALL_KICK.y,
      });
    }
  }

  destroy(): void {
    const { Events, Composite } = this.matter;
    Events.off(this.engine, 'beforeUpdate', this.beforeUpdate);
    Events.off(this.engine, 'collisionStart', this.onCollisionStart);
    for (const constraint of this.constraints) Composite.remove(this.composite, constraint);
    for (const body of this.bodies) Composite.remove(this.composite, body);
  }

  /** The engine's root world composite (Matter's typings model it as a separate type). */
  private get composite(): MatterJS.CompositeType {
    return this.engine.world as unknown as MatterJS.CompositeType;
  }

  private add(body: MatterJS.BodyType): MatterJS.BodyType {
    this.matter.Composite.add(this.composite, body);
    this.bodies.push(body);
    return body;
  }

  private parkBall(): void {
    const { Body } = this.matter;
    Body.setVelocity(this.ball, { x: 0, y: 0 });
    Body.setAngularVelocity(this.ball, 0);
    Body.setStatic(this.ball, true);
    Body.setPosition(this.ball, { x: this.table.launcher.x, y: this.table.launcher.y });
  }

  private createStaticBodies(): void {
    for (const wall of this.table.walls) {
      for (const segment of wallSegments(wall)) {
        this.addSegment(segment, wall.thickness, `wall:${wall.role}`, wall.backing);
      }
    }
    for (const post of this.table.posts) {
      this.add(this.round(post.x, post.y, post.radius, {
        label: `post:${post.role}`,
        isStatic: true,
        ...MATERIALS.post,
      }));
    }
  }

  private addSegment(
    segment: Segment,
    thickness: number,
    label: string,
    backing?: { depth: number; interior: Point },
  ): MatterJS.BodyType {
    const dx = segment.x2 - segment.x1;
    const dy = segment.y2 - segment.y1;
    const length = Math.hypot(dx, dy);
    let centerX = (segment.x1 + segment.x2) / 2;
    let centerY = (segment.y1 + segment.y2) / 2;
    let depth = thickness;
    // Round the playfield-facing corners so chained segments behave like a smooth capsule
    // chain instead of exposing flat end caps that can stop a fast ball dead.
    const round = Math.max(0, thickness / 2 - 0.5);
    let chamfer: number[] = [round, round, round, round];
    if (backing && backing.depth > thickness) {
      let nx = -dy / length;
      let ny = dx / length;
      let flipped = false;
      if (nx * (centerX - backing.interior[0]) + ny * (centerY - backing.interior[1]) < 0) {
        nx = -nx;
        ny = -ny;
        flipped = true;
      }
      const shift = (backing.depth - thickness) / 2;
      centerX += nx * shift;
      centerY += ny * shift;
      depth = backing.depth;
      // Local +y is the outward side unless the normal was flipped.
      chamfer = flipped ? [0, 0, round, round] : [round, round, 0, 0];
    }
    return this.add(this.matter.Bodies.rectangle(centerX, centerY, length, depth, {
      label,
      isStatic: true,
      angle: Math.atan2(dy, dx),
      chamfer: length > 2 * round + 1 ? { radius: chamfer } : undefined,
      ...MATERIALS.wall,
    }));
  }

  /**
   * Matter turns small circles into 10-sided polygons, which bends rebounds in 36° steps.
   * A 32-sided polygon behaves like a true circle at pinball speeds.
   */
  private round(x: number, y: number, radius: number, options: MatterJS.IChamferableBodyDefinition): MatterJS.BodyType {
    const body = this.matter.Bodies.polygon(x, y, ROUND_SIDES, radius, options);
    body.circleRadius = radius;
    return body;
  }

  private createSlingshot(sling: TableGeometry['slingshots'][number]): LitState {
    const { face, others } = slingshotSegments(sling);
    this.addSegment(face, sling.thickness, `sling:${sling.id}`);
    for (const segment of others) this.addSegment(segment, sling.thickness, 'wall:slingshot');
    return {
      id: sling.id,
      group: 'slingshots',
      x: (face.x1 + face.x2) / 2,
      y: (face.y1 + face.y2) / 2,
      points: sling.points,
      lit: false,
      flash: 0,
    };
  }

  private createTarget(target: TargetDef): LitState {
    this.add(this.matter.Bodies.rectangle(target.x, target.y, target.width, target.height, {
      label: `target:${target.id}`,
      isStatic: true,
      angle: target.angle,
      ...MATERIALS.post,
    }));
    return { id: target.id, group: target.group, x: target.x, y: target.y, points: target.points, lit: false, flash: 0 };
  }

  private createSensor(sensor: SensorDef, kind: 'rollover' | 'orbit'): LitState {
    this.add(this.matter.Bodies.rectangle(sensor.x, sensor.y, sensor.width, sensor.height, {
      label: `${kind}:${sensor.id}`,
      isStatic: true,
      isSensor: true,
    }));
    return { id: sensor.id, group: sensor.group, x: sensor.x, y: sensor.y, points: sensor.points, lit: false, flash: 0 };
  }

  private createGate(id: string, a: Point, b: Point, thickness: number, category: number): void {
    const body = this.addSegment({ x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, thickness, `gate:${id}`);
    body.collisionFilter = { group: 0, category, mask: BALL_CATEGORY };
    this.gateBits.set(id, category);
    this.gateSolid.set(id, false);
  }

  private createFlipper(pivotX: number, y: number, mirrored: boolean): MatterJS.BodyType {
    const { length, thickness, restAngle } = this.table.flippers;
    const startAngle = mirrored ? -restAngle : restAngle;
    const centerX = mirrored
      ? pivotX - Math.cos(startAngle) * length / 2
      : pivotX + Math.cos(startAngle) * length / 2;
    const centerY = y + Math.sin(startAngle) * length / 2 * (mirrored ? -1 : 1);
    const { chamferRadius, ...material } = MATERIALS.flipper;
    const flipper = this.add(this.matter.Bodies.rectangle(centerX, centerY, length, thickness, {
      label: mirrored ? 'flipper:right' : 'flipper:left',
      angle: startAngle,
      chamfer: { radius: chamferRadius },
      // Flippers sit below the lane guides (as on a real table): they only ever touch the ball.
      collisionFilter: { group: 0, category: FLIPPER_CATEGORY, mask: BALL_CATEGORY },
      ...material,
    }));
    flipper.inertia = Infinity;
    flipper.inverseInertia = 0;
    const constraint = this.matter.Constraint.create({
      bodyB: flipper,
      pointA: { x: pivotX, y },
      pointB: { x: mirrored ? length / 2 : -length / 2, y: 0 },
      length: 0,
      stiffness: 1,
      damping: MATERIALS.flipperMotor.damping,
    });
    this.matter.Composite.add(this.composite, constraint);
    this.constraints.push(constraint);
    return flipper;
  }

  private readonly beforeUpdate = (): void => {
    const { restAngle, activeAngle } = this.table.flippers;
    this.driveFlipper(this.leftFlipper, this.leftHeld, restAngle, -activeAngle);
    this.driveFlipper(this.rightFlipper, this.rightHeld, -restAngle, activeAngle);
    this.updateGates();
  };

  /** One-way gates: solid only once the ball is completely on the upper side of the gate. */
  private updateGates(): void {
    const { x, y } = this.ball.position;
    const radius = this.table.ball.radius;
    for (const gate of this.table.gates) {
      const [ax, ay] = gate.a;
      const [bx, by] = gate.b;
      const length = Math.hypot(bx - ax, by - ay);
      let nx = -(by - ay) / length;
      let ny = (bx - ax) / length;
      if (ny > 0) {
        nx = -nx;
        ny = -ny;
      }
      const distanceAbove = (x - ax) * nx + (y - ay) * ny;
      const solid = distanceAbove > radius + gate.thickness / 2;
      const bit = this.gateBits.get(gate.id) ?? 0;
      const filter = this.ball.collisionFilter;
      filter.mask = solid ? (filter.mask ?? 0) | bit : (filter.mask ?? 0) & ~bit;
      this.gateSolid.set(gate.id, solid);
    }
  }

  private driveFlipper(body: MatterJS.BodyType, held: boolean, rest: number, active: number): void {
    const { Body } = this.matter;
    const motor = MATERIALS.flipperMotor;
    const target = held ? active : rest;
    const difference = target - body.angle;
    if (Math.abs(difference) < motor.snapTolerance) {
      Body.setAngle(body, target);
      Body.setAngularVelocity(body, 0);
    } else {
      Body.setAngularVelocity(body, Math.sign(difference) * (held ? motor.raiseSpeed : motor.lowerSpeed));
    }
  }

  private readonly onCollisionStart = (event: MatterJS.IEventCollision<MatterJS.Engine>): void => {
    if (!this.active) return;
    for (const pair of event.pairs) {
      const other = pair.bodyA === this.ball ? pair.bodyB : pair.bodyB === this.ball ? pair.bodyA : null;
      if (!other) continue;
      const [kind, id] = (other as MatterJS.BodyType).label.split(':');
      switch (kind) {
        case 'bumper': this.hitBumper(id); break;
        case 'sling': this.hitElement(this.slingshots, id, 'slingshot'); break;
        case 'target': this.hitElement(this.targets, id, 'target'); break;
        case 'rollover': this.hitElement(this.rollovers, id, 'rollover'); break;
        case 'orbit': this.hitOrbit(id); break;
        default: break;
      }
    }
  };

  private hitBumper(id: string): void {
    const bumper = this.bumpers.find((candidate) => candidate.id === id);
    if (!bumper) return;
    bumper.flash = FLASH_MS;
    this.onEvent({ type: 'bumper', id, points: bumper.points, x: bumper.x, y: bumper.y, radius: bumper.radius });
  }

  private hitElement(elements: LitState[], id: string, type: 'slingshot' | 'target' | 'rollover'): void {
    const element = elements.find((candidate) => candidate.id === id);
    if (!element) return;
    element.flash = FLASH_MS;
    this.onEvent({ type, id, points: element.points, x: element.x, y: element.y });
    if (type === 'slingshot') return;
    element.lit = true;
    const group = elements.filter((candidate) => candidate.group === element.group);
    if (!group.every((candidate) => candidate.lit)) return;
    for (const member of group) {
      member.lit = false;
      member.flash = FLASH_MS * 4;
    }
    this.onEvent({
      type: 'group-complete',
      id: element.group,
      points: GROUP_BONUS[element.group] ?? 0,
      x: element.x,
      y: element.y,
    });
  }

  private hitOrbit(id: string): void {
    const sensor = this.orbitSensors.find((candidate) => candidate.id === id);
    if (!sensor) return;
    sensor.lit = true;
    sensor.flash = ORBIT_LIGHT_MS;
    const now = this.engine.timing.timestamp;
    this.onEvent({ type: 'orbit', id, points: sensor.points, x: sensor.x, y: sensor.y });
    if (this.lastOrbit && this.lastOrbit.id !== id && now - this.lastOrbit.time <= LOOP_WINDOW_MS) {
      this.onEvent({ type: 'loop', id, points: LOOP_BONUS, x: sensor.x, y: sensor.y });
      this.lastOrbit = null;
      return;
    }
    this.lastOrbit = { id, time: now };
  }

  private flipperState(body: MatterJS.BodyType, pivotX: number): FlipperState {
    return {
      x: pivotX,
      y: this.table.flippers.y,
      angle: body.angle,
      length: this.table.flippers.length,
      thickness: this.table.flippers.thickness,
    };
  }
}
