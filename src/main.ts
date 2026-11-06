import Phaser from 'phaser';
import { GAME_W, GAME_H } from './lib/layout';
import { TitleScene } from './scenes/TitleScene';
import { MenuScene } from './scenes/MenuScene';

const start = () =>
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#fdf1dc',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_W,
      height: GAME_H,
    },
    scene: [TitleScene, MenuScene],
  });

// Wait for the rounded font so Phaser text doesn't render in a fallback face.
document.fonts.load('700 48px "Baloo 2"').finally(start);
