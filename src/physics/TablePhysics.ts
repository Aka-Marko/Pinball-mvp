import Phaser from 'phaser';
import type { TableGeometry } from '../table';
import { STEP_MS, SUBSTEP_MS, SUBSTEPS } from './PhysicsConfig';
import { TableWorld, type MatterApi, type TableEvent } from './TableWorld';

/** Never simulate more than this many frames in one render frame (e.g. after a tab stall). */
const MAX_FRAMES_PER_UPDATE = 4;

/**
 * Binds the engine-agnostic TableWorld to Phaser's Matter world and drives it with a
 * fixed 60 Hz timestep (each frame integrated in SUBSTEPS sub-steps).
 * The scene must configure Matter with `autoUpdate: false`.
 */
export class TablePhysics {
  readonly world: TableWorld;
  private accumulator = 0;

  constructor(private readonly scene: Phaser.Scene, table: TableGeometry, onEvent: (event: TableEvent) => void) {
    // Phaser exports its bundled Matter build at runtime, but the typings omit it.
    const matter = (Phaser.Physics.Matter as unknown as { Matter: MatterApi }).Matter;
    this.world = new TableWorld(matter, scene.matter.world.engine as unknown as MatterJS.Engine, table, onEvent);
  }

  /** Advances the simulation by real elapsed time. */
  update(deltaMs: number): void {
    this.accumulator = Math.min(this.accumulator + deltaMs, STEP_MS * MAX_FRAMES_PER_UPDATE);
    while (this.accumulator >= STEP_MS - 0.01) {
      this.accumulator -= STEP_MS;
      for (let step = 0; step < SUBSTEPS; step += 1) this.scene.matter.world.step(SUBSTEP_MS);
      this.world.update(STEP_MS);
    }
  }

  /** Drops any partially accumulated time, e.g. when resuming from pause. */
  resetClock(): void {
    this.accumulator = 0;
  }

  destroy(): void {
    this.world.destroy();
  }
}
