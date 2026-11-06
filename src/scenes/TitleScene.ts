import Phaser from 'phaser';
import { GAME_W, GAME_H, COLORS } from '../lib/layout';
import { bigButton, title } from '../lib/ui';
import { say } from '../lib/voice';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const g = this.add.graphics();

    // Sky and grass
    g.fillStyle(COLORS.sky, 1).fillRect(0, 0, GAME_W, GAME_H * 0.7);
    g.fillStyle(COLORS.mint, 1).fillRect(0, GAME_H * 0.7, GAME_W, GAME_H * 0.3);

    // Sun
    const sun = this.add.circle(1380, 150, 80, COLORS.sun);
    this.tweens.add({ targets: sun, scale: 1.08, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // Placeholder daycare building (replaced by illustrated assets in Phase 1)
    const bx = 1000, by = 330, bw = 460, bh = 320;
    g.fillStyle(COLORS.peach, 1).fillRect(bx, by, bw, bh);
    g.fillStyle(COLORS.coral, 1).fillTriangle(bx - 40, by, bx + bw + 40, by, bx + bw / 2, by - 170);
    g.fillStyle(0xffffff, 1).fillRoundedRect(bx + 60, by + 60, 110, 90, 12).fillRoundedRect(bx + 290, by + 60, 110, 90, 12);
    g.fillStyle(COLORS.ink, 1).fillRoundedRect(bx + 180, by + 170, 100, 150, { tl: 50, tr: 50, bl: 0, br: 0 });

    // Clouds drifting
    [[200, 140], [650, 90]].forEach(([x, y], i) => {
      const cloud = this.add.container(x, y, [
        this.add.circle(0, 0, 45, 0xffffff),
        this.add.circle(50, -15, 55, 0xffffff),
        this.add.circle(105, 0, 42, 0xffffff),
      ]);
      this.tweens.add({ targets: cloud, x: x + 80, duration: 6000 + i * 1500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    });

    title(this, 480, 330, 'Przedszkole\nHani', 130);

    bigButton(this, 480, 640, 'Graj!', () => {
      this.scene.start('World');
      this.scene.launch('Hud');
    }, { speak: 'Graj!' });

    // Browsers only allow speech after the first click, so greet on first input.
    this.input.once('pointerdown', () => say('Cześć Haniu! Dzisiaj jesteś panią w przedszkolu.'));
  }
}
