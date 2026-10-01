import Phaser from 'phaser';
import type { TableGeometry } from '../table';

export interface InputState {
  leftFlipper: boolean;
  rightFlipper: boolean;
  launchHeld: boolean;
  launchChargeMs: number;
  launchReleasedMs: number | null;
  pausePressed: boolean;
}

import { getTouchZone } from './touchZones';

export class GameInput {
  private readonly keysDown = new Set<string>();
  private readonly pointers = new Map<number, 'left' | 'right'>();
  private readonly launchPointers = new Set<number>();
  private launchStartedAt: number | null = null;
  private launchReleasedMs: number | null = null;
  private pausePressed = false;

  constructor(private readonly scene: Phaser.Scene, private readonly table: TableGeometry) {
    scene.input.addPointer(2);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    scene.input.on('pointerdown', this.onPointerDown);
    scene.input.on('pointerup', this.onPointerUp);
    scene.input.on('pointerupoutside', this.onPointerUp);
    scene.game.events.on(Phaser.Core.Events.BLUR, this.clear);
  }

  read(): InputState {
    const leftKey = this.keysDown.has('KeyA') || this.keysDown.has('ShiftLeft');
    const rightKey = this.keysDown.has('KeyL') || this.keysDown.has('ShiftRight');
    const launchHeld = this.isLaunchHeld();
    const now = performance.now();
    const state: InputState = {
      leftFlipper: leftKey || [...this.pointers.values()].includes('left'),
      rightFlipper: rightKey || [...this.pointers.values()].includes('right'),
      launchHeld,
      launchChargeMs: this.launchStartedAt === null
        ? this.launchReleasedMs ?? 0
        : Math.max(0, now - this.launchStartedAt),
      launchReleasedMs: this.launchReleasedMs,
      pausePressed: this.pausePressed,
    };
    this.launchReleasedMs = null;
    this.pausePressed = false;
    return state;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.scene.input.off('pointerdown', this.onPointerDown);
    this.scene.input.off('pointerup', this.onPointerUp);
    this.scene.input.off('pointerupoutside', this.onPointerUp);
    this.scene.game.events.off(Phaser.Core.Events.BLUR, this.clear);
    this.clear();
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const wasDown = this.keysDown.has(event.code);
    this.keysDown.add(event.code);
    if (event.code === 'Space' && !wasDown) this.beginLaunchCharge();
    if (event.code === 'Escape' && !event.repeat) this.pausePressed = true;
    if (event.code === 'Space') event.preventDefault();
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.keysDown.delete(event.code);
    if (event.code === 'Space') this.endLaunchCharge();
  };

  private readonly onPointerDown = (pointer: Phaser.Input.Pointer): void => {
    const { x, y } = pointer.positionToCamera(this.scene.cameras.main) as Phaser.Math.Vector2;
    const zone = getTouchZone(this.table, x, y);
    if (zone === 'launch') {
      this.launchPointers.add(pointer.id);
      this.beginLaunchCharge();
    } else if (zone) {
      this.pointers.set(pointer.id, zone);
    }
  };

  private readonly onPointerUp = (pointer: Phaser.Input.Pointer): void => {
    this.pointers.delete(pointer.id);
    if (this.launchPointers.delete(pointer.id)) this.endLaunchCharge();
  };

  private readonly clear = (): void => {
    this.keysDown.clear();
    this.pointers.clear();
    this.launchPointers.clear();
    this.launchStartedAt = null;
    this.launchReleasedMs = null;
    this.pausePressed = false;
  };

  private beginLaunchCharge(): void {
    if (this.launchStartedAt === null) this.launchStartedAt = performance.now();
    this.launchReleasedMs = null;
  }

  private endLaunchCharge(): void {
    if (this.isLaunchHeld() || this.launchStartedAt === null) return;
    this.launchReleasedMs = performance.now() - this.launchStartedAt;
    this.launchStartedAt = null;
  }

  private isLaunchHeld(): boolean {
    return this.keysDown.has('Space') || this.launchPointers.size > 0;
  }
}
