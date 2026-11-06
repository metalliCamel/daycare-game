import Phaser from 'phaser';
import { GAME_W, GAME_H, COLORS, FONT, inkHex } from '../lib/layout';
import { bigButton, title } from '../lib/ui';
import { say } from '../lib/voice';
import { save, persist } from '../lib/state';
import { unlockAudio, setMusic, sfx } from '../lib/sound';

const TEACHERS = ['teacher_1', 'teacher_2', 'teacher_3', 'teacher_4', 'teacher_5', 'teacher_6'];

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const g = this.add.graphics();
    g.fillStyle(COLORS.sky, 1).fillRect(0, 0, GAME_W, GAME_H * 0.7);
    g.fillStyle(COLORS.mint, 1).fillRect(0, GAME_H * 0.7, GAME_W, GAME_H * 0.3);

    const sun = this.add.circle(1430, 120, 70, COLORS.sun);
    this.tweens.add({ targets: sun, scale: 1.08, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    [[200, 120], [650, 70]].forEach(([x, y], i) => {
      const cloud = this.add.container(x, y, [
        this.add.circle(0, 0, 45, 0xffffff),
        this.add.circle(50, -15, 55, 0xffffff),
        this.add.circle(105, 0, 42, 0xffffff),
      ]);
      this.tweens.add({ targets: cloud, x: x + 80, duration: 6000 + i * 1500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    });

    // The daycare building with kids at the windows
    const bx = 1000, by = 300, bw = 460, bh = 330;
    g.fillStyle(COLORS.peach, 1).fillRect(bx, by, bw, bh);
    g.fillStyle(COLORS.coral, 1).fillTriangle(bx - 40, by, bx + bw + 40, by, bx + bw / 2, by - 170);
    g.fillStyle(0xffffff, 1).fillRoundedRect(bx + 50, by + 50, 130, 110, 14).fillRoundedRect(bx + 280, by + 50, 130, 110, 14);
    g.fillStyle(COLORS.ink, 1).fillRoundedRect(bx + 180, by + 180, 100, 150, { tl: 50, tr: 50, bl: 0, br: 0 });
    ['kid_zosia', 'kid_antek'].forEach((k, i) => {
      const kid = this.add.image(bx + 115 + i * 230, by + 115, k).setDisplaySize(100, 100);
      this.tweens.add({ targets: kid, y: kid.y - 10, duration: 600 + i * 200, yoyo: true, repeat: -1 });
    });

    title(this, 480, 210, 'Przedszkole\nHani', 120);
    if (save.day > 1) {
      this.add.text(480, 370, `Dzień ${save.day}  ·  ⭐ ${save.stars}`, { fontFamily: FONT, fontSize: '44px', fontStyle: '800', color: inkHex }).setOrigin(0.5);
    }

    // Choose how the teacher looks
    this.add.text(480, 450, 'Wybierz panią:', { fontFamily: FONT, fontSize: '38px', fontStyle: '800', color: inkHex }).setOrigin(0.5);
    const rings: Phaser.GameObjects.Arc[] = [];
    TEACHERS.forEach((key, i) => {
      const x = 480 + (i - 2.5) * 115;
      const ring = this.add.circle(x, 540, 52, 0xffffff, 1).setStrokeStyle(8, 0xff7a6b, key === save.teacher ? 1 : 0);
      rings.push(ring);
      const img = this.add.image(x, 540, key).setDisplaySize(90, 90).setInteractive({ useHandCursor: true });
      img.on('pointerover', () => this.tweens.add({ targets: img, scale: img.scale * 1.1, duration: 100, yoyo: true }));
      img.on('pointerdown', () => {
        save.teacher = key;
        persist();
        sfx.pop();
        rings.forEach((r, k) => r.setStrokeStyle(8, 0xff7a6b, k === i ? 1 : 0));
        say('To ty!');
      });
    });

    bigButton(this, 480, 700, 'Graj!', () => {
      unlockAudio();
      setMusic(save.music);
      this.scene.start('World');
      this.scene.launch('Hud');
    }, { speak: 'Graj!' });

    // Browsers only allow sound after the first click, so greet on first input.
    this.input.once('pointerdown', () => {
      unlockAudio();
      say('Cześć Haniu! Dzisiaj jesteś panią w przedszkolu.');
    });
  }
}
