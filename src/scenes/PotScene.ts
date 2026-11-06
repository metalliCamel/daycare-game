import Phaser from 'phaser';
import { Overlay } from './Overlay';
import { GAME_W, GAME_H, FONT, inkHex } from '../lib/layout';
import { kidDef } from '../objects/Kid';
import { addStars, prompt } from '../lib/state';
import { say, sayHover } from '../lib/voice';
import { sfx } from '../lib/sound';
import { cutSequence } from './cutting';
import { FOOD_NAMES, type Dish } from '../world/menu';
import type { EmojiKey } from '../lib/assets';

type PotDish = Extract<Dish, { kind: 'pot' }>;

const POT_X = 760;
const POT_Y = 380;
const nom = (k: EmojiKey) => FOOD_NAMES[k]?.[0] ?? '';
const acc = (k: EmojiKey) => FOOD_NAMES[k]?.[1] ?? '';

/** Soup or fruit salad: cut → put in → stir → serve into bowls. */
export class PotScene extends Overlay {
  private dish!: PotDish;
  private kids: string[] = [];
  private added = new Set<EmojiKey>();
  private liquid: Phaser.GameObjects.Ellipse | null = null;
  private floating: Phaser.GameObjects.Image[] = [];
  private bowls: Phaser.GameObjects.Container[] = [];
  private pantry: Phaser.GameObjects.Container[] = [];

  constructor() {
    super('Pot');
  }

  init(data: { dish: PotDish; kids: string[] }) {
    super.init();
    this.dish = data.dish;
    this.kids = data.kids;
    this.added.clear();
    this.liquid = null;
    this.floating = [];
    this.bowls = [];
    this.pantry = [];
  }

  create() {
    const g = this.add.graphics();
    g.fillStyle(0xfff3b0, 1).fillRect(0, 0, GAME_W, GAME_H);
    g.fillStyle(0xf2f2f2, 1).fillRect(0, 260, GAME_W, 40);
    g.fillStyle(0xe8d8b8, 1).fillRect(0, 300, GAME_W, GAME_H - 300);
    this.add.text(GAME_W / 2, 65, `Robimy: ${this.dish.name}`, { fontFamily: FONT, fontSize: '48px', fontStyle: '800', color: inkHex }).setOrigin(0.5);
    this.closeButton(false);
    cutSequence(this, this.dish.cut, POT_X, POT_Y + 40, () => this.showPot());
  }

  // ---------- Put ingredients in ----------

  private showPot() {
    const d = this.dish;
    const g = this.add.graphics();
    if (d.vessel === 'pot') {
      // Stove + pot
      g.fillStyle(0x4a3a5c, 1).fillRoundedRect(POT_X - 220, POT_Y + 140, 440, 40, 10);
      g.fillStyle(0xb8c4cc, 1).fillRoundedRect(POT_X - 180, POT_Y - 60, 360, 210, { tl: 10, tr: 10, bl: 60, br: 60 });
      g.fillStyle(0x8f9ba3, 1).fillRect(POT_X - 230, POT_Y - 40, 50, 20).fillRect(POT_X + 180, POT_Y - 40, 50, 20);
      g.fillStyle(0xd7dee2, 1).fillRoundedRect(POT_X - 195, POT_Y - 75, 390, 30, 15);
    } else {
      g.fillStyle(0xffffff, 1).fillEllipse(POT_X, POT_Y + 40, 420, 240);
      g.lineStyle(8, 0x9fd3f5, 1).strokeEllipse(POT_X, POT_Y + 40, 420, 240);
    }
    this.liquid = this.add.ellipse(POT_X, POT_Y - 55 + (d.vessel === 'bowl' ? 60 : 0), 340, 60, d.color, 0).setDepth(2);

    // Recipe card: what goes in
    const card = this.add.graphics();
    card.fillStyle(0xffffff, 1).fillRoundedRect(40, 160, 260, 120 + d.add.length * 90, 30);
    card.lineStyle(6, 0xff7a6b, 1).strokeRoundedRect(40, 160, 260, 120 + d.add.length * 90, 30);
    this.add.text(170, 205, 'Przepis', { fontFamily: FONT, fontSize: '36px', fontStyle: '800', color: inkHex }).setOrigin(0.5);
    const ticks = new Map<EmojiKey, Phaser.GameObjects.Text>();
    d.add.forEach((k, i) => {
      this.add.image(130, 280 + i * 90, k).setDisplaySize(75, 75);
      ticks.set(k, this.add.text(220, 280 + i * 90, '', { fontSize: '48px', color: '#2e9e4f' }).setOrigin(0.5));
    });

    // Ingredient bowls (the right ones plus a couple that don't belong)
    const all = Phaser.Utils.Array.Shuffle([...d.add, ...d.wrong]) as EmojiKey[];
    all.forEach((k, i) => {
      const x = 430 + i * (720 / Math.max(1, all.length - 1));
      const y = 680;
      const bowl = this.add.graphics();
      bowl.fillStyle(0xffffff, 1).fillEllipse(0, 20, 140, 66);
      bowl.fillStyle(0x9fd3f5, 1).fillRoundedRect(-70, 20, 140, 48, { tl: 0, tr: 0, bl: 38, br: 38 });
      const icon = this.add.image(0, -15, k).setDisplaySize(100, 100);
      const c = this.add.container(x, y, [bowl, icon]).setSize(150, 160).setInteractive({ useHandCursor: true });
      c.on('pointerover', () => sayHover(nom(k)));
      c.on('pointerdown', (p: Phaser.Input.Pointer) => this.grab(k, p, c, ticks));
      this.pantry.push(c);
    });
    prompt(`Wrzuć do ${d.vessel === 'pot' ? 'garnka' : 'miski'} wszystko z przepisu: ${d.add.map(acc).join(', ')}.`);
  }

  private grab(key: EmojiKey, p: Phaser.Input.Pointer, from: Phaser.GameObjects.Container, ticks: Map<EmojiKey, Phaser.GameObjects.Text>) {
    if (this.added.size === this.dish.add.length) return;
    const piece = this.add.image(p.x, p.y, key).setDisplaySize(110, 110).setDepth(100);
    const move = (q: Phaser.Input.Pointer) => piece.setPosition(q.x, q.y);
    const up = () => {
      this.input.off('pointermove', move);
      this.input.off('pointerup', up);
      const inPot = Math.abs(piece.x - POT_X) < 220 && Math.abs(piece.y - POT_Y) < 180;
      if (!inPot) return void this.tweens.add({ targets: piece, scale: 0, duration: 200, onComplete: () => piece.destroy() });
      if (!this.dish.add.includes(key)) {
        sfx.wrong();
        say(`Hmm, ${nom(key)} do tego nie pasuje!`);
        this.tweens.add({ targets: piece, x: from.x, y: from.y, scale: 0, duration: 400, onComplete: () => piece.destroy() });
        return;
      }
      if (this.added.has(key)) {
        say(`${nom(key).charAt(0).toUpperCase() + nom(key).slice(1)} już jest. Coś innego!`);
        this.tweens.add({ targets: piece, x: from.x, y: from.y, scale: 0, duration: 400, onComplete: () => piece.destroy() });
        return;
      }
      this.added.add(key);
      ticks.get(key)?.setText('✓');
      sfx.splash();
      say(nom(key));
      this.liquid!.setFillStyle(this.dish.color, Math.min(1, 0.35 + this.added.size * 0.2));
      this.tweens.add({
        targets: piece, x: POT_X + Phaser.Math.Between(-110, 110), y: this.liquid!.y, scale: 0.18, duration: 300,
        onComplete: () => this.floating.push(piece.setDepth(3)),
      });
      if (this.added.size === this.dish.add.length) this.time.delayedCall(700, () => this.stir());
    };
    this.input.on('pointermove', move);
    this.input.on('pointerup', up);
  }

  // ---------- Stir ----------

  private stir() {
    addStars();
    // Ingredients are all in — put the bowls away to make room for serving
    this.pantry.forEach((c) => this.tweens.add({ targets: c, alpha: 0, y: c.y + 60, duration: 300, onComplete: () => c.destroy() }));
    prompt('Teraz wymieszaj! Kręć myszką kółka nad ' + (this.dish.vessel === 'pot' ? 'garnkiem.' : 'miską.'));
    const spoon = this.add.image(POT_X, POT_Y, 'spoon').setDisplaySize(140, 140).setDepth(50).setAngle(-30);
    const ringBg = this.add.circle(POT_X + 300, POT_Y - 140, 50, 0xffffff).setStrokeStyle(4, 0x4a3a5c, 0.2);
    const ring = this.add.graphics().setDepth(51);
    let total = 0;
    let lastAng: number | null = null;
    let steam = 0;
    const goal = Math.PI * 2 * 3; // three full circles
    const onMove = (p: Phaser.Input.Pointer) => {
      const near = Math.abs(p.x - POT_X) < 260 && Math.abs(p.y - POT_Y) < 200;
      if (!near) {
        lastAng = null;
        return;
      }
      spoon.setPosition(p.x, p.y);
      const ang = Math.atan2(p.y - this.liquid!.y, p.x - POT_X);
      if (lastAng !== null) {
        let d = ang - lastAng;
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        total += Math.abs(d);
      }
      lastAng = ang;
      // Ingredients swirl around as you stir
      this.floating.forEach((f, i) => {
        const a = total * 0.8 + (i * Math.PI * 2) / this.floating.length;
        f.setPosition(POT_X + Math.cos(a) * 120, this.liquid!.y + Math.sin(a) * 18);
      });
      const v = Math.min(1, total / goal);
      ring.clear().lineStyle(12, 0x6bd66b, 1).beginPath().arc(ringBg.x, ringBg.y, 40, -Math.PI / 2, -Math.PI / 2 + v * Math.PI * 2).strokePath();
      if (this.dish.vessel === 'pot' && performance.now() - steam > 350) {
        steam = performance.now();
        const s = this.add.circle(POT_X + Phaser.Math.Between(-120, 120), POT_Y - 90, Phaser.Math.Between(14, 24), 0xffffff, 0.8);
        this.tweens.add({ targets: s, y: s.y - 140, alpha: 0, scale: 2, duration: 1200, onComplete: () => s.destroy() });
      }
      if (total >= goal) {
        this.input.off('pointermove', onMove);
        spoon.destroy();
        ring.destroy();
        ringBg.destroy();
        sfx.cheer();
        say(this.dish.vessel === 'pot' ? 'Zupa gotowa! Pachnie pysznie.' : 'Sałatka wymieszana!');
        this.time.delayedCall(1000, () => this.serve());
      }
    };
    this.input.on('pointermove', onMove);
  }

  // ---------- Serve ----------

  private serve() {
    addStars();
    prompt('Nałóż każdemu dziecku! Kliknij każdą miseczkę.');
    const n = this.kids.length;
    let filled = 0;
    this.kids.forEach((id, i) => {
      const x = GAME_W / 2 + (i - (n - 1) / 2) * 190 + 60;
      const y = 650;
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 1).fillEllipse(0, 0, 150, 50);
      g.fillStyle(0x9fd3f5, 1).fillRoundedRect(-75, 0, 150, 50, { tl: 0, tr: 0, bl: 40, br: 40 });
      const food = this.add.ellipse(0, 0, 130, 36, this.dish.color).setVisible(false);
      const face = this.add.image(0, 95, kidDef(id).key).setDisplaySize(60, 60);
      const c = this.add.container(x, y, [g, food, face]).setSize(160, 120).setInteractive({ useHandCursor: true });
      this.bowls.push(c);
      c.on('pointerdown', () => {
        if (food.visible) return;
        const ladle = this.add.image(POT_X, POT_Y - 40, 'spoon').setDisplaySize(110, 110).setDepth(60);
        this.tweens.add({
          targets: ladle, x, y: y - 60, duration: 350, ease: 'Sine.inOut',
          onComplete: () => {
            ladle.destroy();
            food.setVisible(true).setScale(0);
            this.tweens.add({ targets: food, scale: 1, duration: 200 });
            sfx.pop();
            filled++;
            if (filled === n) this.bravo(`Smacznego! ${this.dish.name.charAt(0).toUpperCase() + this.dish.name.slice(1)} gotowa.`, () => this.close(true), 200);
          },
        });
      });
    });
  }
}
