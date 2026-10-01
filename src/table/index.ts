import { CLASSIC_ORBIT } from './layouts/classicOrbit';
import type { TableGeometry } from './TableGeometry';

export * from './TableGeometry';

export const TABLES: readonly TableGeometry[] = [CLASSIC_ORBIT];

/** The table used by the game. Geometry is shared by physics, rendering and input. */
export const TABLE: TableGeometry = CLASSIC_ORBIT;
