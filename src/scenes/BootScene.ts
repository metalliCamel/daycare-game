import Phaser from 'phaser';
import { EMOJI } from '../lib/assets';
import { GAME_W, GAME_H, FONT, inkHex } from '../lib/layout';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    const label = this.add
      .text(GAME_W / 2, GAME_H / 2, 'Ładowanie...', { fontFamily: FONT, fontSize: '64px', fontStyle: '800', color: inkHex })
      .setOrigin(0.5);
    this.load.on('progress', (p: number) => label.setText(`Ładowanie... ${Math.round(p * 100)}%`));

    // Rasterise SVGs at a generous size so they stay crisp when scaled.
    for (const key of EMOJI) {
      this.load.svg(key, `emoji/${key}.svg`, { width: 256, height: 256 });
    }
  }

  create() {
    this.scene.start('Title');
  }
}
