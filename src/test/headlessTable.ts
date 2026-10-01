import Matter from 'phaser/src/physics/matter-js/CustomMain.js';
import type { TableGeometry } from '../table';
import { ENGINE_CONFIG, RESOLVER_CONFIG, STEP_MS, SUBSTEPS, SUBSTEP_MS } from '../physics/PhysicsConfig';
import { TableWorld, type TableEvent } from '../physics/TableWorld';

export interface HeadlessTable {
  world: TableWorld;
  engine: MatterJS.Engine;
  events: TableEvent[];
  /** Ball positions sampled once per step. */
  trace: Array<{ x: number; y: number }>;
  step(count?: number): void;
}

/** Runs the real TableWorld on the Matter build bundled inside Phaser, at Phaser's fixed 60 Hz step. */
export function createHeadlessTable(table: TableGeometry): HeadlessTable {
  const engine = Matter.Engine.create({
    enableSleeping: ENGINE_CONFIG.enableSleeping,
    positionIterations: ENGINE_CONFIG.positionIterations,
    velocityIterations: ENGINE_CONFIG.velocityIterations,
    constraintIterations: ENGINE_CONFIG.constraintIterations,
  });
  // Matter 0.20 keeps gravity on the engine; the bundled typings still describe the old world.gravity.
  Object.assign((engine as unknown as { gravity: object }).gravity, ENGINE_CONFIG.gravity);
  // Phaser sets these resolver globals from its Matter config; mirror them so tests match the game.
  const resolver = (Matter as unknown as { Resolver: Record<string, number> }).Resolver;
  resolver._restingThresh = RESOLVER_CONFIG.restingThresh;
  resolver._restingThreshTangent = RESOLVER_CONFIG.restingThreshTangent;
  resolver._positionDampen = RESOLVER_CONFIG.positionDampen;
  resolver._positionWarming = RESOLVER_CONFIG.positionWarming;
  resolver._frictionNormalMultiplier = RESOLVER_CONFIG.frictionNormalMultiplier;

  const events: TableEvent[] = [];
  const trace: Array<{ x: number; y: number }> = [];
  const world = new TableWorld(Matter, engine, table, (event) => events.push(event));
  return {
    world,
    engine,
    events,
    trace,
    step(count = 1) {
      for (let index = 0; index < count; index += 1) {
        for (let sub = 0; sub < SUBSTEPS; sub += 1) Matter.Engine.update(engine, SUBSTEP_MS);
        world.update(STEP_MS);
        trace.push({ x: world.ball.position.x, y: world.ball.position.y });
      }
    },
  };
}
