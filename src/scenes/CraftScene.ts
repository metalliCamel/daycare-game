import Phaser from 'phaser';
import { Overlay } from './Overlay';
import { PICTURES, PALETTE, fillRegion, regionContains, encodeDrawing } from '../world/pictures';
import { prompt } from '../lib/state';
import { say, sayHover } from '../lib/voice';
import { sfx } from '../lib/sound';

const COLOR_NAMES = ['czerwony', 'pomarańczowy', 'żółty', 'zielony', 'niebieski', 'fioletowy', 'różowy', 'brązowy', 'biały'];
const S = 1.35; // picture scale
const OX = 560, OY = 150;

/** Coloring book: pick a crayon, click a shape to fill it. */
export class CraftScene extends Overlay {
  private pic = 0;
  private colors: number[] = [];
  private painted = new Set<number>();
  private g!: Phaser.GameObjects.Graphics;
  private current = PALETTE[0];
  private swatches: Phaser.GameObjects.Arc[] = [];

  constructor() {
    super('Craft');
  }

  init(data: { picture: number }) {
    super.init();
    this.pic = data.picture;
  }

  create() {
    const pic = PICTURES[this.pic];
    this.colors = pic.regions.map(() => 0xffffff);
    this.painted.clear();
    this.background(0xfff7e6);
    this.heading(`Pokoloruj obrazek: ${pic.name}`);
    this.closeButton(null);

    this.add.rectangle(OX - 12, OY - 12, 400 * S + 24, 400 * S + 24, 0xffffff).setOrigin(0).setStrokeStyle(6, 0xb5835a);
    this.g = this.add.graphics().setPosition(OX, OY);
    this.redraw();

    const hit = this.add.zone(OX, OY, 400 * S, 400 * S).setOrigin(0).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const x = (p.x - OX) / S;
      const y = (p.y - OY) / S;
      // Topmost region first (drawn last)
      for (let i = pic.regions.length - 1; i >= 0; i--) {
        if (regionContains(pic.regions[i], x, y)) {
          this.colors[i] = this.current;
          this.painted.add(i);
          sfx.pop();
          this.redraw();
          this.checkDone();
          return;
        }
      }
    });

    // Crayon palette on the left, in two columns
    PALETTE.forEach((c, i) => {
      const x = 200 + (i % 2) * 120;
      const y = 200 + Math.floor(i / 2) * 120;
      const sw = this.add.circle(x, y, 48, c).setStrokeStyle(6, 0x4a3a5c, 0.25).setInteractive({ useHandCursor: true });
      sw.on('pointerdown', () => this.pick(i));
      sw.on('pointerover', () => sayHover(COLOR_NAMES[i]));
      this.swatches.push(sw);
    });
    this.pick(0);

    // Finish button (enabled once a few shapes are colored)
    this.pictureButton(1350, 520, 'picture', 'Gotowe!', () => this.finish(), 0xd8f5d8, 200);
    prompt('Wybierz kredkę po lewej i klikaj w obrazek, żeby kolorować.');
  }

  private pick(i: number) {
    this.current = PALETTE[i];
    this.swatches.forEach((s, k) => s.setStrokeStyle(k === i ? 10 : 6, 0x4a3a5c, k === i ? 1 : 0.25).setScale(k === i ? 1.15 : 1));
  }

  private redraw() {
    this.g.clear();
    PICTURES[this.pic].regions.forEach((r, i) => fillRegion(this.g, r, this.colors[i], S));
  }

  private checkDone() {
    if (this.painted.size === PICTURES[this.pic].regions.length) say('Wszystko pokolorowane! Kliknij Gotowe.');
  }

  private finish() {
    if (this.painted.size < 3) {
      say('Pokoloruj jeszcze kilka kształtów.');
      return;
    }
    this.bravo('Piękny rysunek!', () => this.close(encodeDrawing(this.pic, this.colors)), 120);
  }
}
