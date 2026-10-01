import type { TableGeometry } from '../table';

export type TouchZone = 'left' | 'right' | 'launch';

/**
 * Touch zones in table (world) coordinates: the lower table flips, the bottom-right
 * corner beside the shooter lane launches. Upper-table taps are ignored.
 */
export function getTouchZone(table: TableGeometry, x: number, y: number): TouchZone | null {
  const { flippers, launcher, centerX } = table;
  if (y < flippers.y - 90) return null;
  if (y >= flippers.y + 50 && x >= launcher.lane.left - 44) return 'launch';
  if (x < centerX) return 'left';
  if (x < launcher.lane.left - 36) return 'right';
  return null;
}
