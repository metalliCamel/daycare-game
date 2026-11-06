import Phaser from 'phaser';
import { Overlay } from './Overlay';
import { FONT, inkHex } from '../lib/layout';
import { prompt } from '../lib/state';
import { say, sayHover } from '../lib/voice';
import { sfx } from '../lib/sound';
import type { EmojiKey } from '../lib/assets';

const BOXES: { id: string; icon: EmojiKey; name: string; holds: string[] }[] = [
  { id: 'blocks', icon: 'blocks', name: 'Klocki i puzzle', holds: ['blocks', 'puzzle'] },
  { id: 'books', icon: 'books', name: 'Książki', holds: ['books'] },
  { id: 'teddy', icon: 'teddy', name: 'Pluszaki', holds: ['teddy', 'dino', 'unicorn'] },
  { id: 'ball', icon: 'ball', name: 'Piłki i auta', holds: ['ball', 'train'] },
];
const NAMES: Record<string, string> = { blocks: 'klocki', puzzle: 'puzzle', books: 'książki', teddy: 'miś', dino: 'dinozaur', unicorn: 'jednorożec', ball: 'piłka', train: 'pociąg' };

/** Tidy-up time: every toy goes into its own box. */
export class SortScene extends Overlay {
  private toys: string[] = [];
  private left = 0;

  constructor() {
    super('Sort');
  }

  init(data: { toys: string[] }) {
    super.init();
    this.toys = data.toys;
    this.left = data.toys.length;
  }

  create() {
    this.background(0xfff3dc);
    this.heading('Sprzątamy zabawki!');
    this.closeButton(false);
    const boxes = BOXES.map((b, i) => {
      const x = 280 + i * 350;
      const g = this.add.graphics();
      g.fillStyle(0xc68c5c, 1).fillRoundedRect(x - 140, 520, 280, 200, 20);
      g.fillStyle(0xa8703f, 1).fillRect(x - 140, 520, 280, 30);
      this.add.image(x, 600, b.icon).setDisplaySize(90, 90).setAlpha(0.9);
      this.add.text(x, 690, b.name, { fontFamily: FONT, fontSize: '28px', fontStyle: '800', color: '#ffffff' }).setOrigin(0.5);
      return { ...b, x };
    });
    this.toys.forEach((key, i) => {
      const x = 200 + (i % 4) * 380 + Phaser.Math.Between(-40, 40);
      const y = 220 + Math.floor(i / 4) * 150 + Phaser.Math.Between(-20, 20);
      const img = this.add.image(x, y, key).setDisplaySize(110, 110).setAngle(Phaser.Math.Between(-25, 25)).setInteractive({ useHandCursor: true, draggable: true });
      this.input.setDraggable(img);
      img.on('pointerover', () => sayHover(NAMES[key] ?? ''));
      img.on('drag', (_p: Phaser.Input.Pointer, dx: number, dy: number) => img.setPosition(dx, dy));
      img.on('dragend', () => {
        const box = boxes.find((b) => Math.abs(img.x - b.x) < 150 && img.y > 480);
        if (!box) return;
        if (!box.holds.includes(key)) {
          sfx.wrong();
          say(`Hmm, ${NAMES[key]} nie pasuje do pudełka: ${box.name.toLowerCase()}.`);
          this.tweens.add({ targets: img, x, y, duration: 300 });
          return;
        }
        img.disableInteractive();
        sfx.pop();
        this.tweens.add({ targets: img, x: box.x, y: 560, scale: 0, duration: 250, onComplete: () => img.destroy() });
        this.left--;
        if (this.left === 0) this.bravo('Porządek! Brawo!', () => this.close(true), 400);
      });
    });
    prompt('Przeciągnij każdą zabawkę do jej pudełka.');
  }
}
