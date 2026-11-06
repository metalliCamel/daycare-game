import Phaser from 'phaser';
import { Overlay } from './Overlay';
import { GAME_W, GAME_H, FONT, inkHex } from '../lib/layout';
import { kidDef } from '../objects/Kid';
import { addStars, prompt } from '../lib/state';
import { say, sayHover } from '../lib/voice';
import { sfx } from '../lib/sound';
import type { EmojiKey } from '../lib/assets';
import type { Order } from '../world/meals';

const INGREDIENTS: { key: EmojiKey; name: string; acc: string }[] = [
  { key: 'bread', name: 'chleb', acc: 'chleb' },
  { key: 'cheese', name: 'ser', acc: 'ser' },
  { key: 'ham', name: 'szynka', acc: 'szynkę' },
  { key: 'egg', name: 'jajko', acc: 'jajko' },
  { key: 'tomato', name: 'pomidor', acc: 'pomidora' },
  { key: 'cucumber', name: 'ogórek', acc: 'ogórka' },
  { key: 'lettuce', name: 'sałata', acc: 'sałatę' },
];
const ing = (k: EmojiKey) => INGREDIENTS.find((i) => i.key === k)!;
const CUTTABLE: EmojiKey[] = ['tomato', 'cucumber', 'egg'];

const PLATE_X = 760;
const PLATE_Y = 400;

/** First cut the vegetables, then build each child's sandwich from their order card. */
export class SandwichScene extends Overlay {
  private orders: Order[] = [];
  private orderIdx = 0;
  private layer = 0;
  private recipe: EmojiKey[] = [];
  private stack: Phaser.GameObjects.Image[] = [];
  private card?: Phaser.GameObjects.Container;
  private bowls = new Map<EmojiKey, Phaser.GameObjects.Container>();
  private hintTimer?: Phaser.Time.TimerEvent;
  private done: Phaser.GameObjects.Image[] = [];
  private cutQueue: EmojiKey[] = [];
  private cutLayer?: Phaser.GameObjects.Container;

  constructor() {
    super('Sandwich');
  }

  init(data: { orders: Order[] }) {
    super.init();
    this.orders = data.orders;
    this.orderIdx = 0;
    this.done = [];
    this.bowls.clear();
    this.card = undefined;
  }

  create() {
    // Close-up of the kitchen counter
    const g = this.add.graphics();
    g.fillStyle(0xfff3b0, 1).fillRect(0, 0, GAME_W, GAME_H);
    g.fillStyle(0xf2f2f2, 1).fillRect(0, 260, GAME_W, 40);
    g.fillStyle(0xe8d8b8, 1).fillRect(0, 300, GAME_W, GAME_H - 300);
    g.fillStyle(0xd8c49c, 1);
    for (let x = 0; x < GAME_W; x += 160) g.fillRect(x, 300, 4, GAME_H);
    g.fillStyle(0xc68c5c, 1).fillRoundedRect(PLATE_X - 230, PLATE_Y - 90, 460, 210, 40);

    // Finished sandwiches go onto the tray on the right
    g.fillStyle(0xb5835a, 1).fillRoundedRect(1180, 300, 380, 260, 30);
    this.add.text(1370, 590, 'Gotowe', { fontFamily: FONT, fontSize: '36px', fontStyle: '800', color: inkHex }).setOrigin(0.5);
    this.closeButton(false);

    const needed = new Set(this.orders.flatMap((o) => o.fillings));
    this.cutQueue = CUTTABLE.filter((k) => needed.has(k));
    if (this.cutQueue.length) this.nextCut();
    else this.startBuilding();
  }

  // ---------- Cutting ----------

  private nextCut() {
    this.cutLayer?.destroy();
    const key = this.cutQueue.shift();
    if (!key) return this.startBuilding();
    const c = this.add.container(PLATE_X, PLATE_Y);
    this.cutLayer = c;
    const veg = this.add.image(0, 0, key).setDisplaySize(330, 330);
    c.add(veg);
    const lines = [-75, 0, 75].map((dx) => {
      const l = this.add.graphics();
      l.lineStyle(6, 0x4a3a5c, 0.7);
      for (let y = -130; y < 130; y += 26) l.lineBetween(dx, y, dx, y + 13);
      c.add(l);
      return { dx, cut: false, g: l };
    });
    const knife = this.add.image(0, 0, 'knife').setDisplaySize(150, 150).setVisible(false).setDepth(200);
    prompt(`Pokrój ${ing(key).acc}! Przytrzymaj przycisk i przeciągnij nożem w dół po kreskach.`);

    let lastX: number | null = null;
    const onMove = (p: Phaser.Input.Pointer) => {
      knife.setPosition(p.x + 40, p.y - 40).setVisible(true);
      if (!p.isDown) {
        lastX = null;
        return;
      }
      const lx = p.x - PLATE_X;
      const ly = p.y - PLATE_Y;
      if (Math.abs(ly) < 170) {
        for (const line of lines) {
          // A cut counts when the knife passes over the line (or moves along it)
          const crossed = lastX !== null && (lastX - line.dx) * (lx - line.dx) <= 0;
          const along = Math.abs(lx - line.dx) < 22 && p.velocity.y > 2;
          if (!line.cut && (crossed || along)) {
            line.cut = true;
            sfx.chop();
            line.g.clear();
            line.g.fillStyle(0xc68c5c, 1).fillRect(line.dx - 5, -170, 10, 340);
            this.tweens.add({ targets: c, x: PLATE_X + Phaser.Math.Between(-6, 6), duration: 50, yoyo: true });
          }
        }
      }
      lastX = lx;
      if (lines.every((l) => l.cut)) {
        this.input.off('pointermove', onMove);
        knife.destroy();
        this.slices(key, c);
      }
    };
    this.input.on('pointermove', onMove);
  }

  private slices(key: EmojiKey, c: Phaser.GameObjects.Container) {
    c.removeAll(true);
    addStars();
    say({ tomato: 'Pomidor pokrojony!', cucumber: 'Ogórek pokrojony!', egg: 'Jajko pokrojone!' }[key as string] ?? 'Pokrojone!');
    for (let i = 0; i < 4; i++) {
      const s = this.add.image(0, 0, key).setDisplaySize(170, 170).setScale(0.3, 0.6).setAngle(-10);
      c.add(s);
      this.tweens.add({ targets: s, x: -150 + i * 100, duration: 400, ease: 'Back.out' });
    }
    this.time.delayedCall(1300, () => this.nextCut());
  }

  // ---------- Building ----------

  private startBuilding() {
    this.cutLayer?.destroy();
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1).fillEllipse(PLATE_X, PLATE_Y + 20, 320, 120);
    g.lineStyle(6, 0xe0e0e0, 1).strokeEllipse(PLATE_X, PLATE_Y + 20, 250, 80);

    INGREDIENTS.forEach((it, i) => {
      const x = 300 + i * 165;
      const y = 670;
      const bowl = this.add.graphics();
      bowl.fillStyle(0xffffff, 1).fillEllipse(0, 20, 140, 66);
      bowl.fillStyle(0x9fd3f5, 1).fillRoundedRect(-70, 20, 140, 48, { tl: 0, tr: 0, bl: 38, br: 38 });
      const icon = this.add.image(0, -15, it.key).setDisplaySize(100, 100);
      const c = this.add.container(x, y, [bowl, icon]).setSize(150, 160).setInteractive({ useHandCursor: true });
      c.on('pointerover', () => sayHover(it.name));
      c.on('pointerdown', (p: Phaser.Input.Pointer) => this.grab(it.key, p));
      this.bowls.set(it.key, c);
    });
    this.nextOrder();
  }

  private nextOrder() {
    this.stack.forEach((s) => s.destroy());
    this.stack = [];
    this.layer = 0;
    const order = this.orders[this.orderIdx];
    const kid = kidDef(order.kidId);
    this.recipe = ['bread', ...order.fillings, 'bread'];

    // Order card: the child's face and the layers from bottom to top
    this.card?.destroy();
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 1).fillRoundedRect(-150, -200, 300, 400, 30);
    bg.lineStyle(6, 0xff7a6b, 1).strokeRoundedRect(-150, -200, 300, 400, 30);
    const face = this.add.image(0, -130, kid.key).setDisplaySize(110, 110);
    const name = this.add.text(0, -60, kid.name, { fontFamily: FONT, fontSize: '40px', fontStyle: '800', color: inkHex }).setOrigin(0.5);
    const parts: Phaser.GameObjects.GameObject[] = [bg, face, name];
    [...this.recipe].reverse().forEach((k, i) => {
      parts.push(this.add.image(0, i * 45, k).setDisplaySize(70, 70).setName(`step-${this.recipe.length - 1 - i}`));
    });
    this.card = this.add.container(190, 370, parts);
    this.refreshCard();

    prompt(`Kanapka dla ${kid.gen}. Połóż na talerzu: ${this.recipe.map((k) => ing(k).acc).join(', ')}.`);
    this.armHint();
  }

  private refreshCard() {
    this.recipe.forEach((_, i) => {
      const img = this.card!.getByName(`step-${i}`) as Phaser.GameObjects.Image;
      if (!img) return;
      img.setAlpha(i < this.layer ? 0.25 : 1);
      this.tweens.killTweensOf(img);
      img.setScale(70 / 256);
      if (i === this.layer) this.tweens.add({ targets: img, scale: 85 / 256, duration: 400, yoyo: true, repeat: -1 });
    });
  }

  private armHint() {
    this.hintTimer?.remove();
    this.hintTimer = this.time.delayedCall(6000, () => {
      const bowl = this.bowls.get(this.recipe[this.layer]);
      if (bowl) this.tweens.add({ targets: bowl, y: 640, duration: 250, yoyo: true, repeat: 3, onComplete: () => bowl.setY(670) });
      say(`Teraz ${ing(this.recipe[this.layer]).acc}.`);
      this.armHint();
    });
  }

  private grab(key: EmojiKey, p: Phaser.Input.Pointer) {
    const piece = this.add.image(p.x, p.y, key).setDisplaySize(130, 130).setDepth(100);
    const move = (q: Phaser.Input.Pointer) => piece.setPosition(q.x, q.y);
    const up = () => {
      this.input.off('pointermove', move);
      this.input.off('pointerup', up);
      this.drop(piece, key);
    };
    this.input.on('pointermove', move);
    this.input.on('pointerup', up);
  }

  private drop(piece: Phaser.GameObjects.Image, key: EmojiKey) {
    const onPlate = Phaser.Math.Distance.Between(piece.x, piece.y, PLATE_X, PLATE_Y) < 220;
    if (!onPlate || this.layer >= this.recipe.length) {
      this.tweens.add({ targets: piece, alpha: 0, scale: 0, duration: 200, onComplete: () => piece.destroy() });
      return;
    }
    if (key !== this.recipe[this.layer]) {
      const bowl = this.bowls.get(key)!;
      sfx.wrong();
      say(`Hmm, teraz potrzebujemy: ${ing(this.recipe[this.layer]).name}.`);
      this.tweens.add({
        targets: piece, angle: { from: -15, to: 15 }, duration: 80, yoyo: true, repeat: 2,
        onComplete: () => this.tweens.add({ targets: piece, x: bowl.x, y: bowl.y, scale: 0, duration: 350, onComplete: () => piece.destroy() }),
      });
      return;
    }
    const y = PLATE_Y - this.layer * 34;
    const flat = key === 'bread' ? 0.55 : 0.75;
    this.tweens.add({ targets: piece, x: PLATE_X, y, scaleX: 150 / 256, scaleY: (150 / 256) * flat, duration: 160, ease: 'Back.out' });
    piece.setDepth(10 + this.layer);
    this.stack.push(piece);
    this.layer++;
    sfx.pop();
    say(ing(key).name);
    this.refreshCard();
    this.armHint();
    if (this.layer === this.recipe.length) this.finishSandwich();
  }

  private finishSandwich() {
    this.hintTimer?.remove();
    addStars();
    const parts = this.stack;
    this.stack = [];
    this.time.delayedCall(400, () => {
      parts.forEach((p) => this.tweens.add({ targets: p, scale: 0, duration: 250, onComplete: () => p.destroy() }));
      const s = this.add.image(PLATE_X, PLATE_Y - 40, 'sandwich').setDisplaySize(170, 170).setDepth(50);
      const slot = this.done.length;
      this.done.push(s);
      say('Pyszna kanapka!');
      this.tweens.add({
        targets: s, x: 1250 + (slot % 3) * 120, y: 370 + Math.floor(slot / 3) * 110, scale: 100 / 256,
        delay: 500, duration: 600, ease: 'Quad.inOut',
        onComplete: () => {
          this.orderIdx++;
          if (this.orderIdx < this.orders.length) this.nextOrder();
          else this.bravo('Wszystkie kanapki gotowe!', () => this.close(true), 170);
        },
      });
    });
  }

  protected close(result: unknown) {
    this.hintTimer?.remove();
    super.close(result);
  }
}
