import Phaser from 'phaser';
import './styles/main.css';
import { ENGINE_CONFIG, RESOLVER_CONFIG } from './physics/PhysicsConfig';
import { HUD_HEIGHT, TableScene } from './game/scenes/TableScene';
import { TABLE } from './table';

const width = TABLE.width;
const height = TABLE.height + HUD_HEIGHT;

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width,
  height,
  backgroundColor: '#080817',
  antialias: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width,
    height,
  },
  input: {
    activePointers: 3,
  },
  physics: {
    default: 'matter',
    matter: {
      ...ENGINE_CONFIG,
      ...RESOLVER_CONFIG,
      gravity: { ...ENGINE_CONFIG.gravity },
      // TablePhysics steps the engine itself with fixed sub-steps.
      autoUpdate: false,
      debug: false,
    },
  },
  scene: [TableScene],
});
