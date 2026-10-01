import Phaser from 'phaser';
import { getLaunchCharge } from '../game/LaunchPower';
import {
  slingshotSegments,
  wallSegments,
  type LightDef,
  type Point,
  type TableGeometry,
  type WallDef,
} from '../table';
import type { BumperState, FlipperState, LitState, TableWorld } from '../physics/TableWorld';
import type { VisualTheme } from '../themes';

const GRADIENT_ROW = 4;

/**
 * Draws any TableGeometry with any VisualTheme. Every coordinate comes from the geometry;
 * every color comes from the theme.
 */
export class TableRenderer {
  private readonly board: Phaser.GameObjects.Graphics;
  private readonly dynamic: Phaser.GameObjects.Graphics;
  private readonly outline: Point[];
  private theme!: VisualTheme;

  constructor(scene: Phaser.Scene, private readonly table: TableGeometry) {
    this.board = scene.add.graphics().setDepth(0);
    this.dynamic = scene.add.graphics().setDepth(5);
    this.outline = table.walls.find((wall) => wall.id === 'outer')?.points.slice() ?? [
      [table.playfield.left, table.playfield.bottom],
      [table.playfield.left, table.playfield.top],
      [table.playfield.right, table.playfield.top],
      [table.playfield.right, table.playfield.bottom],
    ];
  }

  setTheme(theme: VisualTheme): void {
    this.theme = theme;
    this.drawBoard();
  }

  /** Per-frame layer: lights, targets, bumpers, gate, plunger, flippers and ball. */
  drawDynamic(world: TableWorld, time: number, launchChargeMs: number): void {
    const g = this.dynamic;
    g.clear();
    for (const light of this.table.lights) this.drawLight(light, world, time);
    for (const sling of world.slingshots) this.drawSlingFlash(sling);
    for (const rollover of world.rollovers) this.drawRollover(rollover);
    for (const target of world.targets) this.drawTarget(target);
    for (const bumper of world.bumpers) this.drawBumper(bumper, time);
    this.drawGates(world);
    this.drawPlunger(launchChargeMs, world.isActive);
    this.drawFlipper(world.leftFlipperState, false);
    this.drawFlipper(world.rightFlipperState, true);
    this.drawBall(world.ball.position, time);
  }

  destroy(): void {
    this.board.destroy();
    this.dynamic.destroy();
  }

  private drawBoard(): void {
    const g = this.board;
    const theme = this.theme;
    const { frame } = this.table;
    g.clear();

    g.fillStyle(0x020409, 1);
    g.fillRoundedRect(frame.x - 2, frame.y - 2, frame.width + 4, frame.height + 4, frame.radius + 2);
    g.fillStyle(theme.cabinet.frame, 1);
    g.fillRoundedRect(frame.x, frame.y, frame.width, frame.height, frame.radius);
    g.lineStyle(2, theme.cabinet.frameEdge, 0.9);
    g.strokeRoundedRect(frame.x + 2, frame.y + 2, frame.width - 4, frame.height - 4, frame.radius - 2);
    g.fillStyle(theme.playfield.outside, 1);
    g.fillRoundedRect(frame.x + 8, frame.y + 8, frame.width - 16, frame.height - 16, frame.radius - 6);

    this.drawPlayfieldGradient();
    this.drawShooterLane();
    this.drawGrid();
    this.drawAprons();
    this.drawInserts();
    for (const sling of this.table.slingshots) this.drawSlingshot(sling);
    for (const wall of this.table.walls) this.drawWall(wall);
    for (const bumper of this.table.bumpers) {
      g.fillStyle(theme.rail.metal, 1);
      g.fillCircle(bumper.x, bumper.y, bumper.radius + 7);
      g.lineStyle(2, theme.walls.rail, 0.9);
      g.strokeCircle(bumper.x, bumper.y, bumper.radius + 6);
    }
    for (const post of this.table.posts) this.drawPost(post.x, post.y, post.radius, theme.posts[post.role]);
  }

  /** Vertical gradient clipped to the outer rail, built from horizontal scanline spans. */
  private drawPlayfieldGradient(): void {
    const g = this.board;
    const { top, bottom } = this.theme.playfield;
    const ys = this.outline.map(([, y]) => y);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const from = Phaser.Display.Color.IntegerToColor(top);
    const to = Phaser.Display.Color.IntegerToColor(bottom);
    for (let y = minY; y < maxY; y += GRADIENT_ROW) {
      const t = (y - minY) / (maxY - minY);
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(from, to, 1, t);
      g.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b), 1);
      for (const [x1, x2] of this.spansAt(y + GRADIENT_ROW / 2)) g.fillRect(x1, y, x2 - x1, GRADIENT_ROW + 0.5);
    }
  }

  private drawShooterLane(): void {
    const g = this.board;
    const { lane } = this.table.launcher;
    g.fillStyle(this.theme.playfield.shooterLane, 1);
    g.fillRect(lane.left - 2, lane.top, lane.right - lane.left + 4, lane.bottom - lane.top);
    g.lineStyle(1, this.theme.walls.shooter, 0.18);
    for (let y = lane.top + 24; y < lane.bottom - 30; y += 36) {
      const cx = (lane.left + lane.right) / 2;
      g.lineBetween(cx - 5, y + 5, cx, y);
      g.lineBetween(cx, y, cx + 5, y + 5);
    }
  }

  private drawGrid(): void {
    const g = this.board;
    const { grid, gridAlpha } = this.theme.playfield;
    g.lineStyle(1, grid, gridAlpha);
    for (let y = this.table.playfield.top + 40; y < this.table.flippers.y + 60; y += 34) {
      for (const [x1, x2] of this.spansAt(y)) {
        const right = Math.min(x2, this.table.launcher.lane.left - 6);
        if (right - x1 > 20) g.lineBetween(x1 + 10, y, right - 10, y);
      }
    }
  }

  /** Fills the dead area behind each apron wall (between the wall and the outer rail). */
  private drawAprons(): void {
    const g = this.board;
    for (const wall of this.table.walls.filter((candidate) => candidate.role === 'apron')) {
      const [a, b] = [wall.points[0], wall.points[wall.points.length - 1]];
      const [upper, lower] = a[1] < b[1] ? [a, b] : [b, a];
      const bottom = this.table.playfield.bottom + 6;
      g.fillStyle(this.theme.rail.metal, 1);
      g.fillPoints([
        { x: upper[0], y: upper[1] },
        { x: lower[0], y: lower[1] },
        { x: lower[0], y: bottom },
        { x: upper[0], y: bottom },
      ], true);
    }
  }

  /** Static playfield art that hints at the shots: inlane/outlane arrows and the center shot glow. */
  private drawInserts(): void {
    const g = this.board;
    const { flippers, centerX } = this.table;
    g.fillStyle(this.theme.lights.arrow, 0.06);
    g.fillTriangle(centerX, flippers.y - 200, centerX - 60, flippers.y - 50, centerX + 60, flippers.y - 50);
  }

  private drawSlingshot(sling: TableGeometry['slingshots'][number]): void {
    const g = this.board;
    const { face: faceColor, fillAlpha } = this.theme.slingshot;
    g.fillStyle(faceColor, fillAlpha);
    g.fillTriangle(sling.top[0], sling.top[1], sling.heel[0], sling.heel[1], sling.toe[0], sling.toe[1]);
    const { face, others } = slingshotSegments(sling);
    for (const segment of others) this.stroke(segment.x1, segment.y1, segment.x2, segment.y2, sling.thickness - 4, this.theme.walls.rail);
    this.stroke(face.x1, face.y1, face.x2, face.y2, sling.thickness, faceColor);
  }

  private drawWall(wall: WallDef): void {
    const color = this.theme.walls[wall.role];
    const g = this.board;
    const segments = wallSegments(wall);
    const joints = wall.points;
    const path = joints.map(([x, y]) => ({ x, y }));
    g.lineStyle(wall.thickness + 8, color, this.theme.rail.glowAlpha * 0.25);
    g.strokePoints(path, wall.closed ?? false);
    // Two passes with shared round joints so chained segments read as one smooth rail.
    g.lineStyle(wall.thickness + 2, this.theme.rail.metal, 1);
    for (const s of segments) g.lineBetween(s.x1, s.y1, s.x2, s.y2);
    g.fillStyle(this.theme.rail.metal, 1);
    for (const [x, y] of joints) g.fillCircle(x, y, wall.thickness / 2 + 1);
    const face = Math.max(2, wall.thickness - 3);
    g.lineStyle(face, color, 0.9);
    for (const s of segments) g.lineBetween(s.x1, s.y1, s.x2, s.y2);
    g.fillStyle(color, 0.9);
    for (const [x, y] of joints) g.fillCircle(x, y, face / 2);
    g.lineStyle(1, this.theme.rail.highlight, this.theme.rail.highlightAlpha * 0.6);
    g.strokePoints(path, wall.closed ?? false);
  }

  /** A metal-edged, round-capped rail stroke matching the capsule collision shape. */
  private stroke(x1: number, y1: number, x2: number, y2: number, thickness: number, color: number): void {
    const g = this.board;
    g.lineStyle(thickness + 2, this.theme.rail.metal, 1);
    g.lineBetween(x1, y1, x2, y2);
    g.fillStyle(this.theme.rail.metal, 1);
    g.fillCircle(x1, y1, thickness / 2 + 1);
    g.fillCircle(x2, y2, thickness / 2 + 1);
    g.lineStyle(Math.max(2, thickness - 3), color, 0.9);
    g.lineBetween(x1, y1, x2, y2);
    g.fillStyle(color, 0.9);
    g.fillCircle(x1, y1, Math.max(1, thickness / 2 - 1.5));
    g.fillCircle(x2, y2, Math.max(1, thickness / 2 - 1.5));
  }

  private drawPost(x: number, y: number, radius: number, color: number): void {
    const g = this.board;
    g.fillStyle(this.theme.rail.metal, 1);
    g.fillCircle(x, y, radius + 1.5);
    g.fillStyle(color, 1);
    g.fillCircle(x, y, radius);
    g.fillStyle(this.theme.rail.highlight, 0.85);
    g.fillCircle(x - radius * 0.3, y - radius * 0.3, Math.max(1, radius * 0.35));
  }

  private drawLight(light: LightDef, world: TableWorld, time: number): void {
    const g = this.dynamic;
    const theme = this.theme;
    if (light.role === 'ambient') {
      const index = Number(light.id.split('-').pop()) || 0;
      const pulse = Math.max(0, Math.sin(time / 420 - index * 0.82));
      const colors = theme.lights.ambient;
      const color = colors[(index + Math.floor(time / 550)) % colors.length];
      g.fillStyle(color, 0.08 + pulse * 0.19);
      g.fillCircle(light.x, light.y, light.radius + 3 + pulse * 2);
      g.fillStyle(color, 0.3 + pulse * 0.7);
      g.fillCircle(light.x, light.y, light.radius * 0.7 + pulse);
      return;
    }

    const state = light.link ? this.linkedState(world, light.link) : undefined;
    const color = theme.lights[light.role];
    // Unlinked arrows (e.g. the center shot) chase slowly to invite the shot.
    const lit = state ? state.lit || state.flash > 0 : Math.sin(time / 300) > 0.2;
    const blink = state && state.flash > 0 ? 0.5 + 0.5 * Math.sin(time / 40) : 1;
    const alpha = lit ? blink : 1;
    if (lit) {
      g.fillStyle(color, theme.effects.glowAlpha * 0.3 * alpha);
      g.fillCircle(light.x, light.y, light.radius * 1.9);
    }
    g.fillStyle(lit ? color : theme.lights.off, lit ? alpha : theme.lights.offAlpha);
    if (light.role === 'arrow') this.fillArrow(light.x, light.y, light.radius, light.angle ?? -Math.PI / 2);
    else g.fillCircle(light.x, light.y, light.radius);
    g.lineStyle(1, lit ? theme.rail.highlight : color, lit ? 0.8 : 0.35);
    if (light.role === 'arrow') this.strokeArrow(light.x, light.y, light.radius, light.angle ?? -Math.PI / 2);
    else g.strokeCircle(light.x, light.y, light.radius);
  }

  private arrowPoints(x: number, y: number, size: number, angle: number): Phaser.Types.Math.Vector2Like[] {
    const shape: Point[] = [[size, 0], [-size * 0.7, size * 0.75], [-size * 0.3, 0], [-size * 0.7, -size * 0.75]];
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return shape.map(([px, py]) => ({ x: x + px * cos - py * sin, y: y + px * sin + py * cos }));
  }

  private fillArrow(x: number, y: number, size: number, angle: number): void {
    this.dynamic.fillPoints(this.arrowPoints(x, y, size, angle), true);
  }

  private strokeArrow(x: number, y: number, size: number, angle: number): void {
    this.dynamic.strokePoints(this.arrowPoints(x, y, size, angle), true);
  }

  private linkedState(world: TableWorld, id: string): LitState | undefined {
    return [...world.rollovers, ...world.targets, ...world.orbitSensors].find((state) => state.id === id);
  }

  private drawSlingFlash(sling: LitState): void {
    if (sling.flash <= 0) return;
    const def = this.table.slingshots.find((candidate) => candidate.id === sling.id);
    if (!def) return;
    const g = this.dynamic;
    const alpha = Math.min(1, sling.flash / 180);
    g.lineStyle(def.thickness + 6, this.theme.slingshot.face, 0.45 * alpha);
    g.lineBetween(def.top[0], def.top[1], def.toe[0], def.toe[1]);
  }

  private drawRollover(rollover: LitState): void {
    const def = this.table.rollovers.find((candidate) => candidate.id === rollover.id);
    if (!def) return;
    const g = this.dynamic;
    const lit = rollover.lit || rollover.flash > 0;
    g.lineStyle(2, lit ? this.theme.lights.lane : this.theme.rail.highlight, lit ? 1 : 0.35);
    g.lineBetween(def.x - def.width / 3, def.y - 2, def.x, def.y + 3);
    g.lineBetween(def.x, def.y + 3, def.x + def.width / 3, def.y - 2);
  }

  private drawTarget(target: LitState): void {
    const def = this.table.targets.find((candidate) => candidate.id === target.id);
    if (!def) return;
    const g = this.dynamic;
    const lit = target.lit || target.flash > 0;
    const color = lit ? this.theme.targets.lit : this.theme.targets.idle;
    const cos = Math.cos(def.angle);
    const sin = Math.sin(def.angle);
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
      const lx = (sx * def.width) / 2;
      const ly = (sy * def.height) / 2;
      return { x: def.x + lx * cos - ly * sin, y: def.y + lx * sin + ly * cos };
    });
    if (target.flash > 0) {
      g.fillStyle(color, 0.35);
      g.fillCircle(def.x, def.y, def.height * 0.7);
    }
    g.fillStyle(color, 1);
    g.fillPoints(corners, true);
    g.lineStyle(1, this.theme.rail.highlight, 0.7);
    g.strokePoints(corners, true);
  }

  private drawBumper(bumper: BumperState, time: number): void {
    const g = this.dynamic;
    const theme = this.theme;
    const pulse = 1 + 0.035 * Math.sin(time / 190 + bumper.x);
    const flash = Phaser.Math.Clamp(bumper.flash / 180, 0, 1);
    const radius = bumper.radius * pulse;
    const pops = this.table.bumpers.filter((candidate) => candidate.kind === 'pop');
    const color = bumper.kind === 'mini'
      ? theme.bumpers.mini
      : theme.bumpers.rings[Math.max(0, pops.findIndex((candidate) => candidate.id === bumper.id)) % theme.bumpers.rings.length];
    const inner = Math.max(2, radius - (bumper.kind === 'mini' ? 4 : 7));
    g.fillStyle(color, theme.effects.glowAlpha * (0.06 + pulse * 0.025 + flash * 0.18));
    g.fillCircle(bumper.x, bumper.y, radius + (bumper.kind === 'mini' ? 8 : 15));
    g.fillStyle(theme.bumpers.base, 0.99);
    g.fillCircle(bumper.x, bumper.y, radius);
    g.lineStyle(2, theme.walls.rail, 0.8);
    g.strokeCircle(bumper.x, bumper.y, radius - 1);
    g.lineStyle(3 + flash * 3, color, 0.74 + flash * 0.26);
    g.strokeCircle(bumper.x, bumper.y, radius - 2);
    g.fillStyle(flash > 0 ? theme.rail.highlight : color, 0.15 + flash * 0.4);
    g.fillCircle(bumper.x, bumper.y, inner);
    if (bumper.kind === 'pop') {
      g.lineStyle(1, 0xf5fdff, 0.48);
      g.strokeCircle(bumper.x, bumper.y, radius - 9);
    }
    g.fillStyle(theme.ui.text, 0.96);
    g.fillCircle(bumper.x, bumper.y, (bumper.kind === 'mini' ? 2.5 : 4) + flash * 3);
  }

  private drawGates(world: TableWorld): void {
    const g = this.dynamic;
    for (const gate of this.table.gates) {
      const solid = world.gateSolid.get(gate.id) ?? false;
      g.lineStyle(gate.thickness, this.theme.gate, solid ? 0.95 : 0.4);
      g.lineBetween(gate.a[0], gate.a[1], gate.b[0], gate.b[1]);
      g.fillStyle(this.theme.rail.metal, 1);
      g.fillCircle(gate.b[0], gate.b[1], gate.thickness / 2 + 1);
    }
  }

  /** Plunger rod in the shooter lane plus a charge meter on the dead apron area beside it. */
  private drawPlunger(chargeMs: number, ballInPlay: boolean): void {
    const g = this.dynamic;
    const theme = this.theme;
    const { launcher, ball } = this.table;
    const charge = getLaunchCharge(chargeMs, launcher);
    const width = launcher.lane.right - launcher.lane.left - 8;
    const tipY = launcher.y + ball.radius + 1 + charge * 12;
    const baseY = launcher.lane.bottom + 2;
    if (!ballInPlay || charge > 0) {
      g.fillStyle(theme.rail.metal, 1);
      g.fillRect(launcher.x - 3, tipY, 6, Math.max(0, baseY - tipY));
      g.fillStyle(charge >= 1 ? theme.ui.warn : theme.ui.accent, 1);
      g.fillRoundedRect(launcher.x - width / 2, tipY, width, 4, 2);
    }

    const meterWidth = 64;
    const meterX = launcher.lane.left - 12 - meterWidth;
    const meterY = launcher.lane.bottom - 4;
    g.fillStyle(theme.ui.panel, 1);
    g.fillRoundedRect(meterX, meterY, meterWidth, 6, 3);
    if (charge > 0) {
      g.fillStyle(charge >= 1 ? theme.ui.warn : theme.ui.accent, 1);
      g.fillRoundedRect(meterX, meterY, Math.max(6, meterWidth * charge), 6, 3);
    }
  }

  private drawFlipper(flipper: FlipperState, mirrored: boolean): void {
    const g = this.dynamic;
    const theme = this.theme;
    const style = theme.flipper;
    const direction = mirrored ? -1 : 1;
    const tipX = flipper.x + Math.cos(flipper.angle) * flipper.length * direction;
    const tipY = flipper.y + Math.sin(flipper.angle) * flipper.length * direction;
    g.lineStyle(flipper.thickness + 12, style.glow, theme.effects.glowAlpha * 0.15);
    g.lineBetween(flipper.x, flipper.y, tipX, tipY);
    g.lineStyle(flipper.thickness + 4, theme.rail.metal, 1);
    g.lineBetween(flipper.x, flipper.y, tipX, tipY);
    g.lineStyle(flipper.thickness, style.body, 1);
    g.lineBetween(flipper.x, flipper.y, tipX, tipY);
    g.lineStyle(5, mirrored ? style.right : style.left, 1);
    g.lineBetween(flipper.x, flipper.y, tipX, tipY);
    g.fillStyle(theme.rail.metal, 1);
    g.fillCircle(flipper.x, flipper.y, 10);
    g.lineStyle(2, theme.rail.highlight, 0.85);
    g.strokeCircle(flipper.x, flipper.y, 8);
  }

  private drawBall(position: MatterJS.Vector, time: number): void {
    const g = this.dynamic;
    const { radius } = this.table.ball;
    const { core, highlight, glow } = this.theme.ball;
    g.fillStyle(glow, 0.14);
    g.fillCircle(position.x, position.y, radius + 11);
    g.fillStyle(core, 1);
    g.fillCircle(position.x, position.y, radius);
    g.fillStyle(highlight, 1);
    g.fillCircle(position.x - 3, position.y - 4, 3);
    const glintX = position.x + Math.sin(time / 80) * 3;
    g.lineStyle(2, highlight, 0.68);
    g.lineBetween(glintX - 4, position.y - 1, glintX + 3, position.y + 2);
  }

  /** Horizontal spans at height y that lie inside the outer rail polygon (even-odd rule). */
  private spansAt(y: number): Array<[number, number]> {
    const xs: number[] = [];
    const points = this.outline;
    for (let index = 0; index < points.length; index += 1) {
      const [x1, y1] = points[index];
      const [x2, y2] = points[(index + 1) % points.length];
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
    }
    xs.sort((a, b) => a - b);
    const spans: Array<[number, number]> = [];
    for (let index = 0; index + 1 < xs.length; index += 2) spans.push([xs[index], xs[index + 1]]);
    return spans;
  }
}
