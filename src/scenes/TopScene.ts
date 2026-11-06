import Phaser from 'phaser';
import { Overlay } from './Overlay';
import { GAME_W, GAME_H, FONT, inkHex } from '../lib/layout';
import { kidDef } from '../objects/Kid';
import { addStars, prompt } from '../lib/state';
import { say, sayHover } from '../lib/voice';
import { sfx } from '../lib/sound';
import { FOOD_NAMES, type Dish } from '../world/menu';
import type { EmojiKey } from '../lib/assets';

type TopDish = Extract<Dish, { kind: 'topping' }>;
export type TopOrder = { kidId: string; toppings: EmojiKey[] };

const CX = 760;
const CY = 400;
const nom = (k: EmojiKey) => FOOD_NAMES[k]?.[0] ?? '';
const acc = (k: EmojiKey) => FOOD_NAMES[k]?.[1] ?? '';

/** Porridge or cupcakes: each child wants two particular toppings. */
export class TopScene extends Overlay {
  private dish!: TopDish;
  private orders: TopOrder[] = [];
  private idx = 0;
  private placed: EmojiKey[] = [];
  private item: Phaser.GameObjects.Container | null = null;
  private card: Phaser.GameObjects.Container | null = null;
  private done: Phaser.GameObjects.Container[] = [];

  constructor() {
    super('Top');
  }

  init(data: { dish: TopDish; orders: TopOrder[] }) {
    super.init();
    this.dish = data.dish;
    this.orders = data.orders;
    this.idx = 0;
    this.done = [];
    this.item = null;
    this.card = null;
  }

  create() {
    const g = this.add.graphics();
    g.fillStyle(0xfff3b0, 1).fillRect(0, 0, GAME_W, GAME_H);
    g.fillStyle(0xf2f2f2, 1).fillRect(0, 260, GAME_W, 40);
    g.fillStyle(0xe8d8b8, 1).fillRect(0, 300, GAME_W, GAME_H - 300);
    g.fillStyle(0xb5835a, 1).fillRoundedRect(1180, 300, 380, 260, 30);
    this.add.text(1370, 590, 'Gotowe', { fontFamily: FONT, fontSize: '36px', fontStyle: '800', color: inkHex }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 65, `Robimy: ${this.dish.name}`, { fontFamily: FONT, fontSize: '48px', fontStyle: '800', color: inkHex }).setOrigin(0.5);
    this.closeButton(false);

    this.dish.toppings.forEach((k, i) => {
      const x = 380 + i * 175;
      const y = 680;
      const bowl = this.add.graphics();
      bowl.fillStyle(0xffffff, 1).fillEllipse(0, 20, 140, 66);
      bowl.fillStyle(0xffc9a8, 1).fillRoundedRect(-70, 20, 140, 48, { tl: 0, tr: 0, bl: 38, br: 38 });
      const icon = this.add.image(0, -15, k).setDisplaySize(100, 100);
      const c = this.add.container(x, y, [bowl, icon]).setSize(150, 160).setInteractive({ useHandCursor: true });
      c.on('pointerover', () => sayHover(nom(k)));
      c.on('pointerdown', (p: Phaser.Input.Pointer) => this.grab(k, p, c));
    });
    this.nextOrder();
  }

  private makeBase() {
    const parts: Phaser.GameObjects.GameObject[] = [];
    const big: Record<string, EmojiKey> = { cupcake: 'cupcake', cake: 'cake', tree: 'xmastree', egg: 'easteregg' };
    if (this.dish.base !== 'porridge') {
      parts.push(this.add.image(0, 0, big[this.dish.base]).setDisplaySize(this.dish.base === 'egg' ? 230 : 300, this.dish.base === 'egg' ? 230 : 300));
      return this.add.container(CX, CY, parts);
    }
    if (this.dish.base === 'porridge') {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 1).fillEllipse(0, 0, 300, 90);
      g.fillStyle(0x9fd3f5, 1).fillRoundedRect(-150, 0, 300, 110, { tl: 0, tr: 0, bl: 90, br: 90 });
      g.fillStyle(0xf1dfb8, 1).fillEllipse(0, 0, 270, 70);
      parts.push(g);
    } else {
      parts.push(this.add.image(0, 0, 'cupcake').setDisplaySize(280, 280));
    }
    return this.add.container(CX, CY, parts);
  }

  private nextOrder() {
    this.placed = [];
    this.item?.destroy();
    this.item = this.makeBase();
    const o = this.orders[this.idx];
    const kid = kidDef(o.kidId);
    this.card?.destroy();
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 1).fillRoundedRect(-150, -170, 300, 340, 30);
    bg.lineStyle(6, 0xff7a6b, 1).strokeRoundedRect(-150, -170, 300, 340, 30);
    const face = this.add.image(0, -100, kid.key).setDisplaySize(110, 110);
    const name = this.add.text(0, -30, kid.name, { fontFamily: FONT, fontSize: '40px', fontStyle: '800', color: inkHex }).setOrigin(0.5);
    const tops = o.toppings.map((k, i) => this.add.image(-60 + i * 120, 70, k).setDisplaySize(90, 90).setName(`t-${k}`));
    this.card = this.add.container(190, 400, [bg, face, name, ...tops]);
    const what = { porridge: 'Owsianka', cupcake: 'Babeczka', cake: 'Tort', tree: 'Choinka', egg: 'Pisanka' }[this.dish.base];
    prompt(`${what} dla ${kid.gen}. ${kid.girl ? 'Ona' : 'On'} chce: ${o.toppings.map(acc).join(' i ')}.`);
  }

  private grab(key: EmojiKey, p: Phaser.Input.Pointer, from: Phaser.GameObjects.Container) {
    const piece = this.add.image(p.x, p.y, key).setDisplaySize(100, 100).setDepth(100);
    const move = (q: Phaser.Input.Pointer) => piece.setPosition(q.x, q.y);
    const up = () => {
      this.input.off('pointermove', move);
      this.input.off('pointerup', up);
      const on = Phaser.Math.Distance.Between(piece.x, piece.y, CX, CY) < 200;
      const o = this.orders[this.idx];
      if (!on || !this.item) return void this.tweens.add({ targets: piece, scale: 0, duration: 200, onComplete: () => piece.destroy() });
      if (!o.toppings.includes(key) || this.placed.includes(key)) {
        sfx.wrong();
        const kid = kidDef(o.kidId);
        say(`Hmm, ${kid.name} ${kid.girl ? 'chciała' : 'chciał'}: ${o.toppings.filter((t) => !this.placed.includes(t)).map(acc).join(' i ')}.`);
        this.tweens.add({ targets: piece, x: from.x, y: from.y, scale: 0, duration: 400, onComplete: () => piece.destroy() });
        return;
      }
      this.placed.push(key);
      (this.card?.getByName(`t-${key}`) as Phaser.GameObjects.Image | null)?.setAlpha(0.3);
      sfx.pop();
      say(nom(key));
      // Place a few pieces on top so it looks decorated
      piece.destroy();
      const top = { porridge: -5, cupcake: -70, cake: -60, tree: 0, egg: 0 }[this.dish.base];
      const spread = this.dish.base === 'tree' ? 70 : 80;
      for (let i = 0; i < 3; i++) {
        const ty = this.dish.base === 'tree' || this.dish.base === 'egg' ? Phaser.Math.Between(-80, 80) : top + Phaser.Math.Between(-18, 12);
        const t = this.add.image(Phaser.Math.Between(-spread, spread) * (this.dish.base === 'tree' ? (1 - (ty + 80) / 320) + 0.3 : 1), ty, key).setDisplaySize(60, 60).setAngle(Phaser.Math.Between(-30, 30));
        t.setScale(0);
        this.tweens.add({ targets: t, scaleX: 60 / 256, scaleY: 60 / 256, duration: 200, delay: i * 80, ease: 'Back.out' });
        this.item.add(t);
      }
      if (this.placed.length === o.toppings.length) this.finishItem();
    };
    this.input.on('pointermove', move);
    this.input.on('pointerup', up);
  }

  /** Birthday cake: put in six candles and light them. Tree: put the star on top. */
  private candles(item: Phaser.GameObjects.Container) {
    if (this.dish.base === 'tree') {
      prompt('Na koniec gwiazda na czubek! Kliknij choinkę.');
      const hit = this.add.zone(CX, CY, 300, 320).setInteractive({ useHandCursor: true });
      hit.once('pointerdown', () => {
        hit.destroy();
        const st = this.add.image(0, -150, 'starxmas').setDisplaySize(90, 90).setScale(0);
        item.add(st);
        this.tweens.add({ targets: st, scaleX: 90 / 256, scaleY: 90 / 256, angle: 360, duration: 500, ease: 'Back.out' });
        sfx.cheer();
        this.bravo('Choinka gotowa!', () => this.close(true), 170);
      });
      return;
    }
    const total = 6;
    const placed: Phaser.GameObjects.Image[] = [];
    prompt(`Teraz świeczki! Kliknij tort ${total} razy.`);
    const hit = this.add.zone(CX, CY, 320, 300).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => {
      if (placed.length >= total) return;
      const i = placed.length;
      const c = this.add.image(-100 + i * 40, -150, 'candle').setDisplaySize(60, 60);
      item.add(c);
      placed.push(c);
      sfx.pop();
      say(['jeden', 'dwa', 'trzy', 'cztery', 'pięć', 'sześć'][i]);
      if (placed.length === total) {
        hit.destroy();
        prompt('Zapal świeczki! Kliknij każdą świeczkę.');
        let lit = 0;
        placed.forEach((c2) => {
          const z = this.add.zone(CX + c2.x, CY + c2.y, 46, 70).setInteractive({ useHandCursor: true });
          z.once('pointerdown', () => {
            z.destroy();
            const f = this.add.ellipse(c2.x, c2.y - 38, 14, 24, 0xffa53a);
            item.add(f);
            this.tweens.add({ targets: f, scaleY: 1.3, duration: 150, yoyo: true, repeat: -1 });
            sfx.click();
            lit++;
            if (lit === total) this.bravo('Tort gotowy! Sto lat!', () => this.close(true), 170);
          });
        });
      }
    });
  }

  private finishItem() {
    sfx.star();
    const item = this.item!;
    this.item = null;
    this.time.delayedCall(700, () => {
      const slot = this.done.length;
      this.done.push(item);
      say({ porridge: 'Pyszna owsianka!', cupcake: 'Piękna babeczka!', cake: 'Piękny tort!', tree: 'Śliczna choinka!', egg: 'Piękna pisanka!' }[this.dish.base]);
      if (this.dish.base === 'cake' || this.dish.base === 'tree') {
        // The cake/tree stays in the middle for the next step
        this.candles(item);
        return;
      }
      this.tweens.add({
        targets: item, x: 1235 + (slot % 4) * 92, y: 360 + Math.floor(slot / 4) * 100, scale: 0.28, duration: 600, ease: 'Quad.inOut',
        onComplete: () => {
          this.idx++;
          if (this.idx < this.orders.length) this.nextOrder();
          else this.bravo({ porridge: 'Owsianki gotowe!', cupcake: 'Babeczki gotowe!', cake: 'Tort gotowy!', tree: 'Choinka gotowa!', egg: 'Pisanki gotowe!' }[this.dish.base], () => this.close(true), 170);
        },
      });
    });
  }
}
