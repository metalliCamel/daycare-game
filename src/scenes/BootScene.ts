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
    // A little swing icon (there's no emoji for it)
    const g = this.add.graphics();
    g.lineStyle(14, 0xd0504a, 1).lineBetween(40, 230, 70, 30).lineBetween(216, 230, 186, 30).lineBetween(60, 30, 196, 30);
    g.lineStyle(6, 0x6b4a2b, 1).lineBetween(100, 30, 100, 170).lineBetween(156, 30, 156, 170);
    g.fillStyle(0x8b5a2b, 1).fillRoundedRect(84, 165, 88, 16, 5);
    g.generateTexture('swing', 256, 256);
    g.destroy();
    this.scene.start('Title');
  }
}
