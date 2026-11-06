import Phaser from 'phaser';
import { GAME_W, GAME_H, FONT, inkHex } from '../lib/layout';
import { bus } from '../lib/state';
import { say } from '../lib/voice';
import { sfx } from '../lib/sound';

/**
 * Base for full-screen minigames and menus opened from the world.
 * Keep content between y≈120 and y≈760: the HUD prompt sits at the bottom.
 */
export class Overlay extends Phaser.Scene {
  protected closed = false;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  init(_data?: object) {
    this.closed = false;
  }

  protected background(color: number) {
    this.add.rectangle(0, 0, GAME_W, GAME_H, color).setOrigin(0);
  }

  protected closeButton(result: unknown = null) {
    const b = this.add.text(GAME_W - 80, 190, '✖', { fontSize: '56px', color: inkHex }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    b.on('pointerdown', () => this.close(result));
    b.on('pointerover', () => say('Zamknij'));
    return b;
  }

  protected heading(text: string, y = 65, size = 48) {
    return this.add.text(GAME_W / 2, y, text, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: '800', color: inkHex, align: 'center' }).setOrigin(0.5);
  }

  protected bravo(text: string, then: () => void, y = 200) {
    sfx.cheer();
    const t = this.add.text(GAME_W / 2, y, text, { fontFamily: FONT, fontSize: '72px', fontStyle: '800', color: inkHex, stroke: '#ffffff', strokeThickness: 12 }).setOrigin(0.5).setScale(0).setDepth(500);
    this.tweens.add({ targets: t, scale: 1, duration: 400, ease: 'Back.out' });
    say(text);
    this.time.delayedCall(2000, then);
  }

  /** A big round picture button. */
  protected pictureButton(x: number, y: number, key: string, label: string, onClick: () => void, color = 0xffffff, size = 200) {
    const g = this.add.graphics();
    g.fillStyle(color, 1).fillRoundedRect(-size / 2, -size / 2, size, size + 50, 36);
    g.lineStyle(6, 0x4a3a5c, 0.2).strokeRoundedRect(-size / 2, -size / 2, size, size + 50, 36);
    const img = this.add.image(0, -10, key).setDisplaySize(size * 0.65, size * 0.65);
    const t = this.add.text(0, size / 2 - 5, label, { fontFamily: FONT, fontSize: '30px', fontStyle: '800', color: inkHex, align: 'center', wordWrap: { width: size - 20 } }).setOrigin(0.5);
    const c = this.add.container(x, y, [g, img, t]).setSize(size, size + 50).setInteractive({ useHandCursor: true });
    c.on('pointerover', () => {
      this.tweens.add({ targets: c, scale: 1.06, duration: 120 });
      say(label);
    });
    c.on('pointerout', () => this.tweens.add({ targets: c, scale: 1, duration: 120 }));
    c.on('pointerdown', () => {
      sfx.click();
      onClick();
    });
    return c;
  }

  protected close(result: unknown) {
    if (this.closed) return;
    this.closed = true;
    this.scene.stop();
    bus.emit('scene-done', result);
  }
}
