import { TABLE, type LauncherGeometry } from '../table';

export function getLaunchCharge(chargeMs: number, launcher: LauncherGeometry = TABLE.launcher): number {
  return Math.max(0, Math.min(chargeMs / launcher.maxChargeMs, 1));
}

export function getLaunchVelocity(chargeMs: number, launcher: LauncherGeometry = TABLE.launcher): { x: number; y: number } {
  const charge = getLaunchCharge(chargeMs, launcher);
  const { minVelocity, maxVelocity } = launcher;

  return {
    x: minVelocity.x + (maxVelocity.x - minVelocity.x) * charge,
    y: minVelocity.y + (maxVelocity.y - minVelocity.y) * charge,
  };
}
