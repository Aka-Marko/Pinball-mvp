import { describe, expect, it } from 'vitest';
import { TABLE } from '../table';
import { getTouchZone } from './touchZones';

describe('touch zones', () => {
  const { flippers, launcher, centerX } = TABLE;

  it('flips the matching side in the lower table and ignores the upper table', () => {
    expect(getTouchZone(TABLE, centerX - 60, flippers.y)).toBe('left');
    expect(getTouchZone(TABLE, centerX + 60, flippers.y)).toBe('right');
    expect(getTouchZone(TABLE, centerX - 60, flippers.y - 200)).toBeNull();
  });

  it('launches from the bottom-right corner beside the shooter lane', () => {
    expect(getTouchZone(TABLE, launcher.x, launcher.lane.bottom)).toBe('launch');
    expect(getTouchZone(TABLE, launcher.x, flippers.y)).toBeNull();
  });
});
