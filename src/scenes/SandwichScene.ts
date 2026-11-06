import Phaser from 'phaser';
import { GAME_W, GAME_H, FONT, inkHex } from '../lib/layout';
import { KIDS } from '../objects/Kid';
import { bus, addStars, prompt } from '../lib/state';
import { say } from '../lib/voice';
import type { EmojiKey } from '../lib/assets';

const INGREDIENTS: { key: EmojiKey; name: string }[] = [
  { key: 'bread', name: 'chleb' },
  { key: 'cheese', name: 'ser' },
  { key: 'ham', name: 'szynka' },
  { key: 'tomato', name: 'pomidor' },
  { key: 'cucumber', name: 'ogórek' },
  { key: 'lettuce', name: 'sałata' },
];
const nameOf = (k: EmojiKey) => INGREDIENTS.find((i) => i.key === k)!.name;

const PLATE_X = 760;
const PLATE_Y = 400;

/** Drag ingredients onto the plate in the order shown on the child's card. */
export class SandwichScene extends Phaser.Scene {
  private kidIndex = 0;
  private layer = 0;
  private recipe: EmojiKey[] = [];
  private stack: Phaser.GameObjects.Image[] = [];
  private card!: Phaser.GameObjects.Container;
  private bowls: Map<EmojiKey, Phaser.GameObjects.Container> = new Map();
  private hintTimer?: Phaser.Time.TimerEvent;
  private done: Phaser.GameObjects.Image[] = [];

  constructor() {
    super('Sandwich');
  }

  create() {
    this.kidIndex = 0;
    this.done = [];
    this.bowls.clear();

    // Close-up of the kitchen counter
    const g = this.add.graphics();
    g.fillStyle(0xfff3b0, 1).fillRect(0, 0, GAME_W, GAME_H);
    g.fillStyle(0xf2f2f2, 1).fillRect(0, 260, GAME_W, 40);
    g.fillStyle(0xe8d8b8, 1).fillRect(0, 300, GAME_W, GAME_H - 300);
    g.fillStyle(0xd8c49c, 1);
    for (let x = 0; x < GAME_W; x += 160) g.fillRect(x, 300, 4, GAME_H);

    // Cutting board + plate
    g.fillStyle(0xc68c5c, 1).fillRoundedRect(PLATE_X - 230, PLATE_Y - 90, 460, 210, 40);
    g.fillStyle(0xffffff, 1).fillEllipse(PLATE_X, PLATE_Y + 20, 320, 120);
    g.lineStyle(6, 0xe0e0e0, 1).strokeEllipse(PLATE_X, PLATE_Y + 20, 250, 80);

    // Finished sandwiches go onto the tray on the right
    g.fillStyle(0xb5835a, 1).fillRoundedRect(1180, 300, 360, 230, 30);
    this.add.text(1360, 560, 'Gotowe', { fontFamily: FONT, fontSize: '36px', fontStyle: '800', color: inkHex }).setOrigin(0.5);

    // Ingredient bowls along the bottom
    INGREDIENTS.forEach((ing, i) => {
      const x = 360 + i * 185;
      const y = 660;
      const bowl = this.add.graphics();
      bowl.fillStyle(0xffffff, 1).fillEllipse(0, 20, 150, 70);
      bowl.fillStyle(0x9fd3f5, 1).fillRoundedRect(-75, 20, 150, 50, { tl: 0, tr: 0, bl: 40, br: 40 });
      const icon = this.add.image(0, -15, ing.key).setDisplaySize(105, 105);
      const c = this.add.container(x, y, [bowl, icon]).setSize(160, 160).setInteractive({ useHandCursor: true, draggable: false });
      c.on('pointerover', () => say(ing.name));
      c.on('pointerdown', (p: Phaser.Input.Pointer) => this.grab(ing.key, p));
      this.bowls.set(ing.key, c);
    });

    const back = this.add.text(GAME_W - 80, 190, '✖', { fontSize: '56px', color: inkHex }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.close(false));

    this.nextKid();
  }

  private nextKid() {
    this.stack.forEach((s) => s.destroy());
    this.stack = [];
    this.layer = 0;
    const kid = KIDS[this.kidIndex];
    this.recipe = ['bread', ...kid.sandwich, 'bread'];

    // Order card: the child's face and the layers from bottom to top
    this.card?.destroy();
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 1).fillRoundedRect(-150, -200, 300, 400, 30);
    bg.lineStyle(6, 0xff7a6b, 1).strokeRoundedRect(-150, -200, 300, 400, 30);
    const face = this.add.image(0, -130, kid.key).setDisplaySize(110, 110);
    const name = this.add.text(0, -60, kid.name, { fontFamily: FONT, fontSize: '40px', fontStyle: '800', color: inkHex }).setOrigin(0.5);
    const parts: Phaser.GameObjects.GameObject[] = [bg, face, name];
    [...this.recipe].reverse().forEach((k, i) => {
      parts.push(this.add.image(0, 0 + i * 45, k).setDisplaySize(70, 70).setName(`step-${this.recipe.length - 1 - i}`));
    });
    this.card = this.add.container(190, 370, parts);
    this.refreshCard();

    const who = { zosia: 'Zosi', antek: 'Antka', ola: 'Oli', franek: 'Franka' }[kid.id] ?? kid.name;
    prompt(`Zrób kanapkę dla ${who}. Połóż na talerzu: ${this.recipe.map(nameOf).join(', ')}.`);
    this.armHint();
  }

  private refreshCard() {
    this.recipe.forEach((_, i) => {
      const img = this.card.getByName(`step-${i}`) as Phaser.GameObjects.Image;
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
      if (bowl) this.tweens.add({ targets: bowl, y: bowl.y - 30, duration: 250, yoyo: true, repeat: 3 });
      say(`Teraz ${nameOf(this.recipe[this.layer])}.`);
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
    if (!onPlate) {
      this.tweens.add({ targets: piece, alpha: 0, scale: 0, duration: 200, onComplete: () => piece.destroy() });
      return;
    }
    if (key !== this.recipe[this.layer]) {
      // Gentle "not this one" wobble, then back to the bowl.
      const bowl = this.bowls.get(key)!;
      say(`Hmm, teraz potrzebujemy: ${nameOf(this.recipe[this.layer])}.`);
      this.tweens.add({
        targets: piece, angle: { from: -15, to: 15 }, duration: 80, yoyo: true, repeat: 2,
        onComplete: () => this.tweens.add({ targets: piece, x: bowl.x, y: bowl.y, scale: 0, duration: 350, onComplete: () => piece.destroy() }),
      });
      return;
    }

    // Snap onto the stack. Bread is drawn flatter so it looks like a slice.
    const y = PLATE_Y - this.layer * 34;
    const flat = key === 'bread' ? 0.55 : 0.75;
    this.tweens.add({ targets: piece, x: PLATE_X, y, scaleX: 150 / 256, scaleY: (150 / 256) * flat, duration: 160, ease: 'Back.out' });
    piece.setDepth(10 + this.layer);
    this.stack.push(piece);
    this.layer++;
    say(nameOf(key));
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
        targets: s, x: 1270 + (slot % 2) * 180, y: 370 + Math.floor(slot / 2) * 100, scale: 110 / 256,
        delay: 500, duration: 600, ease: 'Quad.inOut',
        onComplete: () => {
          this.kidIndex++;
          if (this.kidIndex < KIDS.length) this.nextKid();
          else this.allDone();
        },
      });
    });
  }

  private allDone() {
    const t = this.add
      .text(GAME_W / 2, 170, 'Brawo! Wszystkie kanapki gotowe!', { fontFamily: FONT, fontSize: '72px', fontStyle: '800', color: inkHex })
      .setOrigin(0.5).setScale(0);
    this.tweens.add({ targets: t, scale: 1, duration: 400, ease: 'Back.out' });
    this.time.delayedCall(2200, () => this.close(true));
  }

  private close(finished: boolean) {
    this.hintTimer?.remove();
    this.scene.stop();
    bus.emit('minigame-done', finished ? 'Sandwich' : null);
  }
}
