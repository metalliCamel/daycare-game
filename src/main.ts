import Phaser from 'phaser';
import { GAME_W, GAME_H } from './lib/layout';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { WorldScene } from './scenes/WorldScene';
import { SandwichScene } from './scenes/SandwichScene';
import { PourScene } from './scenes/PourScene';
import { HudScene } from './scenes/HudScene';
import { HealthScene } from './scenes/HealthScene';
import { DressScene } from './scenes/DressScene';
import { ChoiceScene } from './scenes/ChoiceScene';
import { CraftScene } from './scenes/CraftScene';
import { ShopScene } from './scenes/ShopScene';
import { SummaryScene } from './scenes/SummaryScene';
import { PotScene } from './scenes/PotScene';
import { TopScene } from './scenes/TopScene';
import { PauseScene } from './scenes/PauseScene';
import { save, state } from './lib/state';

const start = () => {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    dom: { createContainer: true }, // for the name text box on the start screen
    backgroundColor: '#fdf1dc',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_W,
      height: GAME_H,
    },
    // Order = draw order. The HUD is last so prompts show above the minigames.
    scene: [
      BootScene, TitleScene, WorldScene,
      SandwichScene, PotScene, TopScene, PourScene, HealthScene, DressScene, ChoiceScene, CraftScene, ShopScene, SummaryScene, PauseScene,
      HudScene,
    ],
  });
  // Handy for debugging from the browser console.
  Object.assign(window as object, { game, save, state });
};

// Wait for the rounded font so Phaser text doesn't render in a fallback face.
document.fonts.load('700 48px "Baloo 2"').finally(start);
