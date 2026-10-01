import { describe, expect, it } from 'vitest';
import Matter from 'phaser/src/physics/matter-js/CustomMain.js';
import { TABLE } from '../table';
import { createHeadlessTable } from '../test/headlessTable';

const { frame, launcher, flippers, drainY } = TABLE;
const lane = launcher.lane;

function inFrame({ x, y }: { x: number; y: number }): boolean {
  return x > frame.x && x < frame.x + frame.width && y > frame.y && y < drainY + 60;
}

/** Deterministic PRNG so the stress run is reproducible. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('Classic Orbit physics (headless Matter)', () => {
  it.each([0.3, 0.6, 1])('a %s-power plunge leaves the shooter lane over the top and does not come back', (charge) => {
    const sim = createHeadlessTable(TABLE);
    sim.world.setActive(true);
    sim.world.launch(charge * launcher.maxChargeMs);
    for (let frameIndex = 0; frameIndex < 240 && !sim.events.some((event) => event.type === 'drain'); frameIndex += 1) sim.step();

    expect(sim.trace.every(inFrame)).toBe(true);
    const topIndex = sim.trace.findIndex((point) => point.y < lane.top - 40);
    expect(topIndex).toBeGreaterThan(0);
    const after = sim.trace.slice(topIndex);
    expect(after.some((point) => point.x < lane.left - 20)).toBe(true);
    expect(after.some((point) => point.x > lane.left && point.y > lane.top + 40)).toBe(false);
    expect(sim.events.some((event) => event.type === 'shooter-return')).toBe(false);
  });

  it('a strong plunge follows the top arch into the left orbit', () => {
    const sim = createHeadlessTable(TABLE);
    sim.world.setActive(true);
    sim.world.launch(launcher.maxChargeMs);
    sim.step(180);
    expect(sim.events.some((event) => event.type === 'orbit' && event.id === 'orbit-left')).toBe(true);
  });

  it('re-arms a ball that rolls back down the shooter lane', () => {
    const sim = createHeadlessTable(TABLE);
    sim.world.setActive(true);
    sim.world.launch(0);
    Matter.Body.setPosition(sim.world.ball, { x: launcher.x, y: launcher.y - 120 });
    Matter.Body.setVelocity(sim.world.ball, { x: 0, y: -2 });
    sim.step(240);
    expect(sim.events).toContainEqual({ type: 'shooter-return' });
    expect(sim.world.isActive).toBe(false);
    expect(sim.world.ball.position).toMatchObject({ x: launcher.x, y: launcher.y });
  });

  it('ball search frees a ball balanced motionless on top of a post', () => {
    const sim = createHeadlessTable(TABLE);
    sim.world.setActive(true);
    sim.world.launch(0);
    const post = TABLE.posts.find((candidate) => candidate.id === 'pop-left-rubber');
    if (!post) throw new Error('missing post');
    const start = { x: post.x, y: post.y - post.radius - TABLE.ball.radius };
    Matter.Body.setPosition(sim.world.ball, start);
    Matter.Body.setVelocity(sim.world.ball, { x: 0, y: 0 });
    sim.step(200);
    const { x, y } = sim.world.ball.position;
    expect(Math.hypot(x - start.x, y - start.y)).toBeGreaterThan(30);
  });

  it.each([
    ['left', 101.3],
    ['right', 2 * TABLE.centerX - 101.3],
  ])('a ball dropped where the %s inlane meets the flipper rolls onto the flipper and drains', (_side, x) => {
    const sim = createHeadlessTable(TABLE);
    sim.step(60);
    sim.world.setActive(true);
    sim.world.launch(0);
    Matter.Body.setPosition(sim.world.ball, { x, y: 597.1 });
    Matter.Body.setVelocity(sim.world.ball, { x: 0, y: 0 });
    for (let frameIndex = 0; frameIndex < 360 && sim.world.isActive; frameIndex += 1) sim.step();
    expect(sim.events).toContainEqual({ type: 'drain' });
  });

  it('scores bumpers, sets lights and completes target banks', () => {
    const sim = createHeadlessTable(TABLE);
    sim.world.setActive(true);
    sim.world.launch(0);
    const bumper = TABLE.bumpers[0];
    Matter.Body.setPosition(sim.world.ball, { x: bumper.x, y: bumper.y - bumper.radius - 30 });
    Matter.Body.setVelocity(sim.world.ball, { x: 0, y: 4 });
    sim.step(30);
    expect(sim.events.some((event) => event.type === 'bumper' && event.id === bumper.id)).toBe(true);

    const bank = sim.world.targets.filter((target) => target.group === 'left-bank');
    for (const target of bank.slice(0, -1)) target.lit = true;
    const last = bank[bank.length - 1];
    Matter.Body.setPosition(sim.world.ball, { x: last.x + 30, y: last.y });
    Matter.Body.setVelocity(sim.world.ball, { x: -6, y: 0 });
    sim.step(20);
    expect(sim.events).toContainEqual(expect.objectContaining({ type: 'group-complete', id: 'left-bank' }));
    expect(bank.every((target) => !target.lit)).toBe(true);
  });

  it('never loses the ball through a wall and never traps it during random play', () => {
    const random = mulberry32(1234);
    const games = 24;
    const framesPerGame = 60 * 25;
    let drains = 0;
    for (let game = 0; game < games; game += 1) {
      const sim = createHeadlessTable(TABLE);
      const relaunch = (): void => {
        sim.world.setActive(false);
        sim.world.setActive(true);
        sim.world.launch(random() * launcher.maxChargeMs);
      };
      relaunch();
      let anchor = { ...sim.world.ball.position };
      let still = 0;
      let flipLeft = 0;
      let flipRight = 0;
      for (let frameIndex = 0; frameIndex < framesPerGame; frameIndex += 1) {
        const { x, y } = sim.world.ball.position;
        if (y > flippers.y - 45 && y < flippers.y + 10) {
          if (x < TABLE.centerX && flipLeft === 0 && random() < 0.3) flipLeft = 10;
          if (x >= TABLE.centerX && x < lane.left && flipRight === 0 && random() < 0.3) flipRight = 10;
        }
        sim.world.setFlippers(flipLeft > 0, flipRight > 0);
        flipLeft = Math.max(0, flipLeft - 1);
        flipRight = Math.max(0, flipRight - 1);
        const eventCount = sim.events.length;
        sim.step();
        const position = sim.world.ball.position;
        expect(inFrame(position), `game ${game} frame ${frameIndex} at ${position.x.toFixed(1)},${position.y.toFixed(1)}`).toBe(true);

        const lastEvents = sim.events.slice(eventCount);
        if (lastEvents.some((event) => event.type === 'drain' || event.type === 'shooter-return')) {
          if (lastEvents.some((event) => event.type === 'drain')) drains += 1;
          relaunch();
          still = 0;
          anchor = { ...sim.world.ball.position };
          continue;
        }
        // Displacement, not speed: a wedged ball can jitter in place with a non-zero velocity.
        if (Math.hypot(position.x - anchor.x, position.y - anchor.y) < 3) {
          still += 1;
        } else {
          still = 0;
          anchor = { ...position };
        }
        expect(still, `ball stuck in game ${game} at ${position.x.toFixed(1)},${position.y.toFixed(1)}`).toBeLessThan(300);
      }
    }
    expect(drains).toBeGreaterThan(games);
  }, 120_000);
});
