import Phaser from 'phaser';
import { GAME_W, GAME_H } from './lib/layout';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { WorldScene } from './scenes/WorldScene';
import { SandwichScene } from './scenes/SandwichScene';
import { PourScene } from './scenes/PourScene';
import { HudScene } from './scenes/HudScene';

const start = () => {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#fdf1dc',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_W,
      height: GAME_H,
    },
    // Order = draw order. The HUD is last so prompts show above the minigames.
    scene: [BootScene, TitleScene, WorldScene, SandwichScene, PourScene, HudScene],
  });
  // Handy for debugging from the browser console.
  (window as unknown as { game: Phaser.Game }).game = game;
};

// Wait for the rounded font so Phaser text doesn't render in a fallback face.
document.fonts.load('700 48px "Baloo 2"').finally(start);
