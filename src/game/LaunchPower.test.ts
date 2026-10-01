import { describe, expect, it } from 'vitest';
import { getLaunchCharge, getLaunchVelocity } from './LaunchPower';
import { TABLE } from '../table';

describe('launcher charge', () => {
  it('uses minimum launch power when released immediately', () => {
    expect(getLaunchCharge(0)).toBe(0);
    expect(getLaunchVelocity(0)).toEqual(TABLE.launcher.minVelocity);
  });

  it('scales launch power to maximum over two seconds', () => {
    expect(getLaunchCharge(TABLE.launcher.maxChargeMs / 2)).toBe(0.5);
    expect(getLaunchVelocity(TABLE.launcher.maxChargeMs)).toEqual(TABLE.launcher.maxVelocity);
  });

  it('caps charge and launch power after two seconds', () => {
    expect(getLaunchCharge(TABLE.launcher.maxChargeMs * 2)).toBe(1);
    expect(getLaunchVelocity(TABLE.launcher.maxChargeMs * 2)).toEqual(TABLE.launcher.maxVelocity);
    expect(getLaunchCharge(-100)).toBe(0);
  });
});
