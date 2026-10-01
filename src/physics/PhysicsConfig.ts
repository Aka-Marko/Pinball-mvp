/** Shared physics settings. These are the existing game values and must stay unchanged. */
export const ENGINE_CONFIG = {
  gravity: { x: 0, y: 1.05, scale: 0.001 },
  enableSleeping: false,
  positionIterations: 8,
  velocityIterations: 6,
  constraintIterations: 4,
} as const;

/** Phaser steps Matter at a fixed 60 Hz. */
export const STEP_MS = 1000 / 60;

/**
 * Each 60 Hz frame is integrated in smaller sub-steps. Matter 0.20 is delta-aware, so
 * gravity, launch speeds and flipper speeds are unchanged per frame; the ball simply
 * moves at most ~10 px per sub-step instead of ~40 px, so it can no longer sink deep
 * into (or tunnel through) rails before the collision is resolved.
 */
export const SUBSTEPS = 4;
export const SUBSTEP_MS = STEP_MS / SUBSTEPS;

/**
 * Matter resolver globals as Phaser sets them (Phaser's defaults, which the original game used).
 * Phaser applies these from the Matter config; headless simulations must apply them explicitly.
 */
export const RESOLVER_CONFIG = {
  restingThresh: 4,
  restingThreshTangent: 6,
  positionDampen: 0.9,
  positionWarming: 0.8,
  frictionNormalMultiplier: 5,
} as const;

export const MATERIALS = {
  ball: { restitution: 0.48, friction: 0.015, frictionAir: 0.0015, density: 0.002, slop: 0.01 },
  wall: { restitution: 0.42, friction: 0.08 },
  post: { restitution: 0.55, friction: 0.02 },
  bumper: { restitution: 1.45, friction: 0, slop: 0.005 },
  flipper: { density: 0.08, friction: 0.04, restitution: 0.28, slop: 0.005, chamferRadius: 9 },
  flipperMotor: { raiseSpeed: 0.14, lowerSpeed: 0.09, snapTolerance: 0.045, damping: 0.12 },
} as const;
