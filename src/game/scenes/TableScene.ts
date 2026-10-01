import Phaser from 'phaser';
import { GameSession } from '../GameSession';
import { getLaunchCharge } from '../LaunchPower';
import { GameInput, type InputState } from '../../input/GameInput';
import { TablePhysics } from '../../physics/TablePhysics';
import type { TableEvent } from '../../physics/TableWorld';
import { TableRenderer } from '../../render/TableRenderer';
import { TABLE } from '../../table';
import { THEMES, ThemeStore, getTheme, toCssColor, type VisualTheme } from '../../themes';

/** Height of the score bar above the table. The camera is scrolled so table coordinates stay unchanged. */
export const HUD_HEIGHT = 60;

const NO_INPUT: InputState = {
  leftFlipper: false,
  rightFlipper: false,
  launchHeld: false,
  launchChargeMs: 0,
  launchReleasedMs: null,
  pausePressed: false,
};

const GROUP_LABELS: Readonly<Record<string, string>> = {
  'top-lanes': 'LANES COMPLETE',
  'left-bank': 'LEFT BANK',
  'right-bank': 'RIGHT BANK',
};

export class TableScene extends Phaser.Scene {
  private readonly table = TABLE;
  private readonly session = new GameSession();
  private readonly themeStore = new ThemeStore();
  private theme: VisualTheme = getTheme(null);
  private inputController!: GameInput;
  private tablePhysics!: TablePhysics;
  private tableRenderer!: TableRenderer;
  private hudBar!: Phaser.GameObjects.Graphics;
  private hudTitle!: Phaser.GameObjects.Text;
  private hudScoreLabel!: Phaser.GameObjects.Text;
  private hudScore!: Phaser.GameObjects.Text;
  private hudBalls!: Phaser.GameObjects.Text;
  private pauseText!: Phaser.GameObjects.Text;
  private launchText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private overlay!: Phaser.GameObjects.Container;
  private overlayBackdrop!: Phaser.GameObjects.Rectangle;
  private overlayRule!: Phaser.GameObjects.Rectangle;
  private overlayAccent!: Phaser.GameObjects.Rectangle;
  private overlayTitle!: Phaser.GameObjects.Text;
  private overlaySubtitle!: Phaser.GameObjects.Text;
  private overlayCopy!: Phaser.GameObjects.Text;
  private overlayButton!: Phaser.GameObjects.Text;
  private overlayControls!: Phaser.GameObjects.Text;
  private touchControls!: Phaser.GameObjects.Text;
  private themeLabel!: Phaser.GameObjects.Text;
  private themeNameText!: Phaser.GameObjects.Text;
  private themePrevious!: Phaser.GameObjects.Text;
  private themeNext!: Phaser.GameObjects.Text;
  private launchChargeMs = 0;
  private lastLaunchChargePercent = -1;
  private activePopups: Phaser.GameObjects.Text[] = [];
  private activeBursts: Phaser.GameObjects.Container[] = [];

  constructor() {
    super('table');
  }

  create(): void {
    this.theme = getTheme(this.themeStore.load());
    this.cameras.main.setScroll(0, -HUD_HEIGHT);
    this.tableRenderer = new TableRenderer(this, this.table);
    this.createHud();
    this.createOverlay();
    this.inputController = new GameInput(this, this.table);
    this.tablePhysics = new TablePhysics(this, this.table, (event) => this.onTableEvent(event));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.applyTheme();
    this.syncUi();
  }

  update(time: number, delta: number): void {
    const input = this.inputController.read();
    if (input.pausePressed) this.togglePause();
    const world = this.tablePhysics.world;

    if (this.session.phase === 'paused') {
      this.tableRenderer.drawDynamic(world, time, this.launchChargeMs);
      return;
    }

    world.setFlippers(input.leftFlipper, input.rightFlipper);
    if (this.session.phase === 'ready' && input.launchHeld) {
      this.launchChargeMs = Math.min(input.launchChargeMs, this.table.launcher.maxChargeMs);
    }
    if (this.session.phase === 'ready' && input.launchReleasedMs !== null) {
      this.launchChargeMs = Math.min(input.launchReleasedMs, this.table.launcher.maxChargeMs);
      if (this.session.launch()) {
        world.setActive(true);
        world.launch(this.launchChargeMs);
        this.launchChargeMs = 0;
        this.showMessage('BALL IN PLAY', this.theme.ui.good);
        this.syncUi();
      }
    }

    this.tablePhysics.update(delta);
    this.updateLaunchText();
    this.tableRenderer.drawDynamic(world, time, this.launchChargeMs);
  }

  private onTableEvent(event: TableEvent): void {
    switch (event.type) {
      case 'drain':
        this.onBallLost();
        return;
      case 'shooter-return':
        this.session.returnToShooter();
        this.launchChargeMs = 0;
        this.showMessage('SHOOT AGAIN', this.theme.ui.good);
        this.syncUi();
        return;
      default:
        break;
    }

    this.addScore(event.points);
    switch (event.type) {
      case 'bumper':
        this.spawnBurst(event.x, event.y, this.theme.bumpers.rings[0]);
        this.spawnPopup(event.x, event.y - event.radius - 9, `+${event.points}`, event.points >= 150);
        if (event.points >= 150 && this.theme.effects.screenShake) this.cameras.main.shake(110, 0.0025);
        break;
      case 'target':
      case 'rollover':
        this.spawnPopup(event.x, event.y - 14, `+${event.points}`, false);
        break;
      case 'orbit':
        this.spawnPopup(event.x, event.y + 24, `ORBIT +${event.points}`, false);
        break;
      case 'loop':
        this.showMessage(`LOOP  +${event.points}`, this.theme.ui.accent);
        if (this.theme.effects.screenShake) this.cameras.main.shake(140, 0.003);
        break;
      case 'group-complete':
        this.showMessage(`${GROUP_LABELS[event.id] ?? 'COMPLETE'}  +${event.points}`, this.theme.ui.warn);
        this.spawnBurst(event.x, event.y, this.theme.ui.warn);
        break;
      default:
        break;
    }
  }

  private addScore(points: number): void {
    const before = this.session.score;
    this.session.addScore(points);
    if (this.session.score === before) return;
    this.hudScore.setText(this.session.score.toString().padStart(6, '0'));
    this.hudScore.setScale(1.12);
    this.tweens.add({ targets: this.hudScore, scale: 1, duration: 170, ease: 'Back.easeOut' });
  }

  private onBallLost(): void {
    this.session.loseBall();
    this.tablePhysics.world.setActive(false);
    this.syncUi();
    if (this.session.phase === 'ready') this.showMessage('BALL LOST  /  NEXT BALL', this.theme.ui.warn);
    else this.showMessage('GAME OVER', this.theme.ui.warn);
  }

  private startGame(): void {
    this.session.start();
    this.launchChargeMs = 0;
    this.tablePhysics.world.setActive(false);
    this.syncUi();
  }

  private togglePause(): void {
    if (this.session.phase === 'start' || this.session.phase === 'gameover') return;
    this.session.togglePause();
    this.launchChargeMs = 0;
    this.tablePhysics.world.setFlippers(NO_INPUT.leftFlipper, NO_INPUT.rightFlipper);
    this.tablePhysics.resetClock();
    this.syncUi();
  }

  private selectTheme(offset: number): void {
    const index = THEMES.findIndex((theme) => theme.id === this.theme.id);
    this.theme = THEMES[(index + offset + THEMES.length) % THEMES.length];
    this.themeStore.save(this.theme.id);
    this.applyTheme();
    this.syncUi();
  }

  private applyTheme(): void {
    const theme = this.theme;
    const css = (color: number): string => toCssColor(color);
    this.cameras.main.setBackgroundColor(theme.cabinet.background);
    this.game.canvas.parentElement?.style.setProperty('--theme-glow-color', theme.cabinet.accent);
    this.tableRenderer.setTheme(theme);

    this.hudBar.clear();
    this.hudBar.fillStyle(theme.cabinet.frame, 1);
    this.hudBar.fillRoundedRect(this.table.frame.x, 6, this.table.frame.width, HUD_HEIGHT - 10, 12);
    this.hudBar.lineStyle(1, theme.cabinet.frameEdge, 0.8);
    this.hudBar.strokeRoundedRect(this.table.frame.x, 6, this.table.frame.width, HUD_HEIGHT - 10, 12);
    this.hudTitle.setColor(css(theme.ui.text)).setShadow(0, 0, theme.cabinet.accent, 10, true, true);
    this.hudScoreLabel.setColor(css(theme.ui.muted));
    this.hudScore.setColor(css(theme.ui.text)).setShadow(0, 0, theme.cabinet.accent, 10, true, true);
    this.hudBalls.setColor(css(theme.ui.accent));
    this.pauseText.setColor(css(theme.ui.text)).setBackgroundColor(css(theme.ui.panel));
    this.launchText.setShadow(0, 0, theme.cabinet.accent, 8, true, true);

    this.overlayBackdrop.setStrokeStyle(1, theme.ui.accent, 1);
    this.overlayRule.setFillStyle(theme.ui.good, 0.95);
    this.overlayAccent.setFillStyle(theme.ui.warn, 1);
    this.overlayTitle.setColor(css(theme.ui.text)).setShadow(0, 0, theme.cabinet.accent, 15, true, true);
    this.overlaySubtitle.setColor(css(theme.ui.accent)).setShadow(0, 0, theme.cabinet.accent, 8, true, true);
    this.overlayCopy.setColor(css(theme.ui.text));
    this.overlayButton.setBackgroundColor(css(theme.ui.accent)).setShadow(0, 0, theme.cabinet.accent, 12, true, true);
    this.overlayControls.setColor(css(theme.ui.muted));
    this.touchControls.setColor(css(theme.ui.muted));
    this.themeLabel.setColor(css(theme.ui.muted));
    this.themeNameText.setText(theme.name.toUpperCase()).setColor(css(theme.ui.text));
    for (const arrow of [this.themePrevious, this.themeNext]) {
      arrow.setColor(css(theme.ui.accent)).setBackgroundColor(css(theme.ui.panel));
    }
    this.lastLaunchChargePercent = -1;
  }

  private createHud(): void {
    const right = this.table.frame.x + this.table.frame.width;
    this.hudBar = this.add.graphics().setScrollFactor(0).setDepth(20);
    this.hudTitle = this.add.text(this.table.frame.x + 14, 12, 'NEON TILT', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '15px',
      letterSpacing: 2,
    }).setScrollFactor(0).setDepth(21);
    this.hudScoreLabel = this.add.text(this.table.frame.x + 14, 34, this.table.name.toUpperCase(), {
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      letterSpacing: 2,
    }).setScrollFactor(0).setDepth(21);
    this.hudScore = this.add.text(this.table.width / 2, 30, '000000', {
      fontFamily: 'Consolas, monospace',
      fontSize: '26px',
      stroke: '#12273b',
      strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(21);
    this.hudBalls = this.add.text(right - 58, 30, 'BALLS 3', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      letterSpacing: 1,
    }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(21);
    this.pauseText = this.add.text(right - 26, 30, 'Ⅱ', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      padding: { x: 9, y: 4 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(21).setInteractive({ useHandCursor: true });
    this.pauseText.on('pointerdown', () => this.togglePause());

    const { lane } = this.table.launcher;
    this.launchText = this.add.text(lane.left - 44, lane.bottom - 16, 'HOLD LAUNCH', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '9px',
      color: '#08111a',
      padding: { x: 5, y: 3 },
      align: 'center',
    }).setOrigin(0.5).setDepth(6);
    this.messageText = this.add.text(this.table.centerX, this.table.flippers.y - 80, '', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '17px',
      color: '#ffffff',
      stroke: '#080817',
      strokeThickness: 4,
      letterSpacing: 2,
    }).setOrigin(0.5).setAlpha(0).setDepth(9);
  }

  private updateLaunchText(): void {
    const charge = getLaunchCharge(this.launchChargeMs, this.table.launcher);
    const percent = Math.floor(charge * 100);
    if (percent === this.lastLaunchChargePercent) return;
    this.lastLaunchChargePercent = percent;
    this.launchText.setText(charge > 0 ? `POWER ${percent}%` : 'HOLD LAUNCH');
    this.launchText.setBackgroundColor(toCssColor(charge >= 1 ? this.theme.ui.warn : this.theme.ui.accent));
  }

  private createOverlay(): void {
    const cx = this.table.width / 2;
    const cy = 400;
    const text = (y: number, value: string, style: Phaser.Types.GameObjects.Text.TextStyle): Phaser.GameObjects.Text =>
      this.add.text(cx, y, value, style).setOrigin(0.5);
    this.overlayBackdrop = this.add.rectangle(cx, cy, 402, 330, 0x070b17, 0.96);
    this.overlayRule = this.add.rectangle(cx, cy - 162, 126, 2, 0xffffff, 0.95);
    this.overlayAccent = this.add.rectangle(cx, cy - 158, 48, 4, 0xffffff, 1);
    this.overlayTitle = text(cy - 122, 'NEON TILT', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '31px',
      letterSpacing: 4,
    });
    this.overlaySubtitle = text(cy - 84, 'ARCADE PINBALL  /  199X', {
      fontFamily: 'Consolas, monospace',
      fontSize: '11px',
      letterSpacing: 1,
    });
    this.overlayCopy = text(cy - 50, '', { fontFamily: 'Arial, sans-serif', fontSize: '16px' });
    this.themeLabel = text(cy - 10, 'TABLE THEME', {
      fontFamily: 'Consolas, monospace',
      fontSize: '9px',
      letterSpacing: 2,
    });
    const arrowStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '24px',
      padding: { x: 10, y: 2 },
    };
    this.themePrevious = text(cy + 18, '‹', arrowStyle).setX(cx - 80).setInteractive({ useHandCursor: true });
    this.themePrevious.on('pointerdown', () => this.selectTheme(-1));
    this.themeNameText = text(cy + 18, '', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '12px',
      letterSpacing: 1,
    });
    this.themeNext = text(cy + 18, '›', arrowStyle).setX(cx + 80).setInteractive({ useHandCursor: true });
    this.themeNext.on('pointerdown', () => this.selectTheme(1));
    this.overlayButton = text(cy + 74, 'START GAME', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '16px',
      color: '#071018',
      padding: { x: 24, y: 13 },
      letterSpacing: 2,
    }).setInteractive({ useHandCursor: true });
    this.overlayControls = text(cy + 120, '', { fontFamily: 'Consolas, monospace', fontSize: '8px' });
    this.touchControls = text(cy + 138, 'TOUCH: LEFT + RIGHT SIDES TO FLIP', {
      fontFamily: 'Consolas, monospace',
      fontSize: '8px',
    });
    this.overlay = this.add.container(0, 0, [
      this.overlayBackdrop, this.overlayRule, this.overlayAccent, this.overlayTitle, this.overlaySubtitle,
      this.overlayCopy, this.themeLabel, this.themePrevious, this.themeNameText, this.themeNext,
      this.overlayButton, this.overlayControls, this.touchControls,
    ]).setDepth(10);
  }

  private syncUi(): void {
    const phase = this.session.phase;
    this.hudScore.setText(this.session.score.toString().padStart(6, '0'));
    this.hudBalls.setText(`BALLS ${this.session.remainingBalls}`);
    this.pauseText.setVisible(phase === 'ready' || phase === 'playing' || phase === 'paused');
    this.launchText.setVisible(phase === 'ready');
    this.overlay.setVisible(phase === 'start' || phase === 'paused' || phase === 'gameover');
    const showThemeSelector = phase === 'start' || phase === 'paused';
    for (const item of [this.themeLabel, this.themePrevious, this.themeNext, this.themeNameText]) {
      item.setVisible(showThemeSelector);
    }

    const textColor = toCssColor(this.theme.ui.text);
    this.overlayButton.removeAllListeners('pointerdown');
    if (phase === 'paused') {
      this.overlayTitle.setText('PAUSED');
      this.overlaySubtitle.setText('TAKE A BREATHER');
      this.overlayCopy.setText('Your game is waiting.').setColor(textColor).setFontSize('16px');
      this.overlayButton.setText('RESUME').on('pointerdown', () => this.togglePause());
      this.overlayControls.setText('PRESS ESC OR TAP RESUME TO CONTINUE');
      this.touchControls.setVisible(false);
    } else if (phase === 'gameover') {
      this.overlayTitle.setText('GAME OVER');
      this.overlaySubtitle.setText('FINAL SCORE');
      this.overlayCopy.setText(this.session.score.toString().padStart(6, '0')).setColor(textColor).setFontSize('30px');
      this.overlayButton.setText('PLAY AGAIN').on('pointerdown', () => this.startGame());
      this.overlayControls.setText('THREE BALLS  /  ONE MORE RUN?');
      this.touchControls.setVisible(false);
    } else {
      this.overlayTitle.setText('NEON TILT');
      this.overlaySubtitle.setText(`${this.table.name.toUpperCase()}  /  ARCADE PINBALL`);
      this.overlayCopy.setText('Three balls. Make every shot count.').setColor(textColor).setFontSize('16px');
      this.overlayButton.setText('START GAME').on('pointerdown', () => this.startGame());
      this.overlayControls.setText('A / L  FLIPPERS     HOLD / RELEASE SPACE  LAUNCH     ESC  PAUSE');
      this.touchControls.setVisible(true);
    }
  }

  private showMessage(message: string, color: number): void {
    this.messageText.setText(message).setColor(toCssColor(color)).setAlpha(1).setScale(1);
    this.tweens.killTweensOf(this.messageText);
    this.tweens.add({ targets: this.messageText, alpha: 0, scale: 1.18, duration: 900, ease: 'Cubic.easeOut' });
  }

  private spawnBurst(x: number, y: number, color: number): void {
    if (!this.theme.effects.particles) return;
    while (this.activeBursts.length >= 5) this.activeBursts.shift()?.destroy();
    const burst = this.add.container(x, y).setDepth(8);
    this.activeBursts.push(burst);
    for (let i = 0; i < 9; i += 1) {
      const angle = (Math.PI * 2 * i) / 9;
      const particle = this.add.circle(0, 0, i % 3 === 0 ? 3 : 2, color, 1).setBlendMode(Phaser.BlendModes.ADD);
      burst.add(particle);
      this.tweens.add({
        targets: particle,
        x: Math.cos(angle) * Phaser.Math.Between(24, 42),
        y: Math.sin(angle) * Phaser.Math.Between(24, 42),
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(240, 390),
        ease: 'Cubic.easeOut',
      });
    }
    this.time.delayedCall(420, () => {
      this.activeBursts = this.activeBursts.filter((active) => active !== burst);
      burst.destroy();
    });
  }

  private spawnPopup(x: number, y: number, label: string, large: boolean): void {
    while (this.activePopups.length >= 4) this.activePopups.shift()?.destroy();
    const popup = this.add.text(x, y, label, {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: large ? '19px' : '14px',
      color: '#f4fcff',
      stroke: '#07101e',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(9).setShadow(0, 0, this.theme.cabinet.accent, 12, true, true);
    this.activePopups.push(popup);
    this.tweens.add({
      targets: popup,
      y: popup.y - 38,
      alpha: 0,
      scale: 1.16,
      duration: 680,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.activePopups = this.activePopups.filter((active) => active !== popup);
        popup.destroy();
      },
    });
  }

  private shutdown(): void {
    this.inputController.destroy();
    this.tablePhysics.destroy();
    this.tableRenderer.destroy();
  }
}
