import { describe, expect, it } from 'vitest';
import { TABLE, TABLES, distanceToSegment, wallSegments, type Point, type TableGeometry } from './index';

const near = (a: number, b: number): boolean => Math.abs(a - b) < 0.6;

describe.each(TABLES.map((table) => [table.name, table] as const))('%s geometry', (_name, table: TableGeometry) => {
  const ballDiameter = 2 * table.ball.radius;

  it('uses unique ids for every physical and light element', () => {
    const ids = [
      ...table.walls, ...table.posts, ...table.bumpers, ...table.slingshots, ...table.targets,
      ...table.rollovers, ...table.orbitSensors, ...table.gates, ...table.lights,
    ].map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('builds only finite, non-zero rail segments', () => {
    for (const wall of table.walls) {
      expect(wall.thickness).toBeGreaterThan(0);
      for (const segment of wallSegments(wall)) {
        const length = Math.hypot(segment.x2 - segment.x1, segment.y2 - segment.y1);
        expect(Number.isFinite(length)).toBe(true);
        expect(length).toBeGreaterThan(0);
      }
    }
  });

  it('has a right-side shooter lane wide enough for the ball, outside the main playfield', () => {
    const { launcher } = table;
    expect(launcher.lane.right - launcher.lane.left).toBeGreaterThanOrEqual(ballDiameter + 4);
    expect(launcher.x - table.ball.radius).toBeGreaterThan(launcher.lane.left);
    expect(launcher.x + table.ball.radius).toBeLessThan(launcher.lane.right);
    expect(launcher.lane.left).toBeGreaterThan(table.flippers.rightPivot);
    expect(launcher.minVelocity.x).toBe(0);
    expect(launcher.maxVelocity.y).toBeLessThan(launcher.minVelocity.y);
    expect(table.gates.length).toBeGreaterThan(0);
  });

  it('keeps flippers mirrored with a ball-width opening at rest', () => {
    const { flippers } = table;
    const tipGap = flippers.rightPivot - flippers.leftPivot
      - 2 * flippers.length * Math.cos(flippers.restAngle)
      - flippers.thickness * Math.sin(flippers.restAngle);
    expect(flippers.leftPivot + flippers.rightPivot).toBe(2 * table.centerX);
    expect(tipGap).toBeGreaterThanOrEqual(ballDiameter);
  });

  it('mirrors bumpers, slingshots and posts around the playfield centerline', () => {
    const mirrored = (x: number, y: number, list: ReadonlyArray<{ x: number; y: number }>): boolean =>
      list.some((other) => near(other.x, 2 * table.centerX - x) && near(other.y, y));
    for (const bumper of table.bumpers) expect(mirrored(bumper.x, bumper.y, table.bumpers)).toBe(true);
    const playfieldPosts = table.posts.filter((post) => post.x < table.launcher.lane.left - 8);
    for (const post of playfieldPosts) expect(mirrored(post.x, post.y, playfieldPosts)).toBe(true);
    const slingTops = table.slingshots.map((sling) => ({ x: sling.top[0], y: sling.top[1] }));
    for (const top of slingTops) expect(mirrored(top.x, top.y, slingTops)).toBe(true);
  });

  it('leaves at least a ball width between bumpers and every other obstacle', () => {
    for (const bumper of table.bumpers) {
      for (const other of table.bumpers) {
        if (other === bumper) continue;
        expect(Math.hypot(other.x - bumper.x, other.y - bumper.y) - bumper.radius - other.radius).toBeGreaterThanOrEqual(ballDiameter);
      }
      for (const post of table.posts) {
        expect(Math.hypot(post.x - bumper.x, post.y - bumper.y) - bumper.radius - post.radius).toBeGreaterThanOrEqual(ballDiameter);
      }
      for (const wall of table.walls) {
        for (const segment of wallSegments(wall)) {
          const gap = distanceToSegment(bumper.x, bumper.y, segment) - bumper.radius - wall.thickness / 2;
          expect(gap, `${bumper.id} vs ${wall.id}`).toBeGreaterThanOrEqual(ballDiameter);
        }
      }
    }
  });

  it('has a busy middle and several distinct shots', () => {
    const middle = (y: number): boolean => y > table.playfield.top + 260 && y < table.flippers.y - 150;
    const middleObstacles = [...table.posts, ...table.bumpers, ...table.targets].filter((element) => middle(element.y));
    expect(middleObstacles.length).toBeGreaterThanOrEqual(10);
    expect(table.bumpers.filter((bumper) => bumper.kind === 'pop').length).toBeGreaterThanOrEqual(3);
    expect(table.orbitSensors.length).toBe(2);
    expect(table.rollovers.length).toBeGreaterThanOrEqual(3);
    expect(new Set(table.targets.map((target) => target.group)).size).toBeGreaterThanOrEqual(2);
  });

  it('links every light to an existing scoring element', () => {
    const scoring = new Set([...table.rollovers, ...table.targets, ...table.orbitSensors].map((element) => element.id));
    for (const light of table.lights) if (light.link) expect(scoring.has(light.link), light.id).toBe(true);
  });

  it('keeps the outer rail closed around the playfield and inside the frame', () => {
    const outer = table.walls.find((wall) => wall.id === 'outer');
    expect(outer).toBeDefined();
    const points = outer?.points ?? [];
    const inFrame = ([x, y]: Point): boolean =>
      x >= table.frame.x && x <= table.frame.x + table.frame.width && y >= table.frame.y && y <= table.frame.y + table.frame.height;
    expect(points.every(inFrame)).toBe(true);
    expect(Math.min(...points.map(([x]) => x))).toBeLessThan(table.playfield.left);
    expect(Math.max(...points.map(([x]) => x))).toBeGreaterThan(table.launcher.lane.right);
  });
});

it('exposes the default table', () => {
  expect(TABLES).toContain(TABLE);
});
