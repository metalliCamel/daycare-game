import Phaser from 'phaser';
import type { WorldScene, Module, Item } from '../scenes/WorldScene';
import type { Kid } from '../objects/Kid';
import { roomX } from '../lib/rooms';
import { prop, DINING_SEATS } from './draw';
import { state, addStars, prompt } from '../lib/state';
import { say } from '../lib/voice';
import { sfx } from '../lib/sound';
import type { EmojiKey } from '../lib/assets';

export type Order = { kidId: string; fillings: EmojiKey[] };
export type Drink = { key: EmojiKey; name: string; color: number };

const DRINKS: Record<string, Drink> = {
  Śniadanie: { key: 'milk', name: 'mleko', color: 0xfffdf6 },
  Obiad: { key: 'water', name: 'wodę', color: 0xbfe9ff },
  Podwieczorek: { key: 'juice', name: 'sok', color: 0xffb347 },
};

/** Kitchen (sandwiches + drinks), dining table, crumbs. */
export class Meals implements Module {
  private seats: { x: number; y: number }[];
  private crumbs: Phaser.GameObjects.Container[] = [];
  private orders: Order[] = [];
  private drink: Drink = DRINKS['Śniadanie'];
  private seated: Kid[] = [];
  private arrived = 0;

  constructor(private w: WorldScene) {
    const k = roomX('kuchnia');
    const bread = prop(w, 'bread', k + 420, 470, 120, 615);
    prop(w, 'cheese', k + 560, 470, 90, 615);
    prop(w, 'knife', k + 680, 470, 80, 615);
    prop(w, 'pan', k + 900, 470, 120, 615);
    w.clickable(bread, () => w.goThen(k + 520, 700, () => this.openKitchen('Sandwich')), 'Robimy kanapki');
    const pot = prop(w, 'teapot', k + 1185, 480, 120, 615);
    w.clickable(pot, () => w.goThen(k + 1185, 700, () => this.openKitchen('Pour')), 'Nalewamy picie');

    const j = roomX('jadalnia');
    this.seats = DINING_SEATS.map((x) => ({ x: j + x, y: 600 }));
    const table = w.add.zone(j + 800, 600, 1020, 120).setDepth(651);
    w.clickable(table, () => w.goThen(Phaser.Math.Clamp(w.teacher.x, j + 330, j + 1270), 690, () => this.useTable()), 'Stół');
  }

  start(name: string) {
    const w = this.w;
    w.setPhase('meal');
    state.meal = { step: 'cooking', name, sandwiches: false, drinks: false };
    this.drink = DRINKS[name] ?? DRINKS['Śniadanie'];
    this.seated = w.presentKids;
    this.orders = this.seated.map((kid) => ({
      kidId: kid.def.id,
      fillings: Phaser.Utils.Array.Shuffle([...kid.def.likes]).slice(0, 2) as EmojiKey[],
    }));
    sfx.doorbell();
    prompt(`Czas na ${name.toLowerCase()}! Dzieci idą do jadalni. Zrób kanapki i nalej ${this.drink.name} w kuchni.`);
    this.arrived = 0;
    this.seated.forEach((kid, i) => {
      kid.setNeed('hungry');
      kid.mode = 'busy';
      kid.walkTo(this.seats[i].x, this.seats[i].y, () => this.arrived++, true);
    });
  }

  private openKitchen(which: 'Sandwich' | 'Pour') {
    const m = state.meal;
    if (state.phase !== 'meal' || m.step !== 'cooking') {
      prompt(state.phase === 'meal' ? 'Jedzenie jest już gotowe!' : 'Teraz nie jest pora jedzenia. Pobaw się z dziećmi!');
      return;
    }
    if (which === 'Sandwich' && m.sandwiches) return prompt(`Kanapki są gotowe! Teraz nalej ${this.drink.name} przy dzbanku.`);
    if (which === 'Pour' && m.drinks) return prompt('Picie jest gotowe! Teraz kanapki na blacie.');
    const data = which === 'Sandwich' ? { orders: this.orders } : { kids: this.seated.map((k) => k.def.id), drink: this.drink };
    this.w.openScene<boolean>(which, data, (done) => done && this.cooked(which));
  }

  private cooked(which: 'Sandwich' | 'Pour') {
    const w = this.w;
    const m = state.meal;
    if (which === 'Sandwich') m.sandwiches = true;
    if (which === 'Pour') m.drinks = true;
    if (!(m.sandwiches && m.drinks)) {
      prompt(which === 'Sandwich' ? `Super kanapki! Teraz nalej ${this.drink.name} przy dzbanku.` : 'Picie gotowe! Teraz zrób kanapki na blacie.');
      return;
    }
    m.step = 'serving';
    const k = roomX('kuchnia');
    const tray = prop(w, 'plate', k + 620, 470, 130, 616);
    tray.setData('topping', w.add.image(0, 0, 'sandwich').setDisplaySize(80, 80));
    const item: Item = { id: 'tray', img: tray, home: { x: tray.x, y: tray.y } };
    w.items.push(item);
    w.clickable(tray, () => {
      if (w.carrying === item) return w.dropItem();
      w.goThen(tray.x, 700, () => w.pickUp(item));
    }, 'Taca z jedzeniem');
    prompt('Wszystko gotowe! Kliknij tacę i zanieś ją do jadalni.');
  }

  private useTable() {
    const w = this.w;
    const m = state.meal;
    if (state.phase !== 'meal') return;
    if (m.step === 'serving' && w.carrying?.id === 'tray' && this.arrived < this.seated.length) {
      prompt('Poczekaj chwilkę, dzieci jeszcze siadają do stołu.');
    } else if (m.step === 'serving' && w.carrying?.id === 'tray') {
      const item = w.carrying;
      w.carrying = null;
      (item.img.getData('topping') as Phaser.GameObjects.Image)?.destroy();
      item.img.destroy();
      w.items = w.items.filter((i) => i !== item);
      this.serve();
    } else if (m.step === 'serving') {
      prompt('Przynieś tacę z kuchni.');
    } else if (m.step === 'cooking') {
      prompt('Dzieci czekają. Idź do kuchni i przygotuj jedzenie.');
    }
  }

  private serve() {
    const w = this.w;
    state.meal.step = 'eating';
    prompt('Smacznego!');
    const plates: Phaser.GameObjects.Image[] = [];
    this.seated.forEach((_, i) => {
      const seat = this.seats[i];
      const plate = w.add.image(seat.x - 20, 572, 'sandwich').setDisplaySize(75, 75).setDepth(660).setScale(0);
      const cup = w.add.image(seat.x + 45, 562, this.drink.key).setDisplaySize(50, 50).setDepth(660);
      w.tweens.add({ targets: plate, scale: 75 / 256, duration: 300, delay: i * 120, ease: 'Back.out' });
      plates.push(plate, cup);
    });
    w.time.delayedCall(1200, () => {
      plates.forEach((p, i) => w.tweens.add({ targets: p, scale: 0, duration: 2200, delay: i * 80, ease: 'Quad.in' }));
    });
    w.time.delayedCall(4000, () => {
      plates.forEach((p) => p.destroy());
      sfx.giggle();
      this.seated.forEach((kid) => {
        kid.setNeed(null);
        kid.cheer();
      });
      addStars(this.seated.length);
      w.time.delayedCall(900, () => this.afterMeal());
    });
  }

  private afterMeal() {
    const w = this.w;
    state.meal.step = 'cleaning';
    const sala = roomX('sala');
    this.seated.forEach((kid, i) => {
      kid.walkTo(sala + 300 + i * 180, 700 + (i % 2) * 80, () => {
        kid.mode = 'free';
        kid.homeRoom = null;
      });
    });
    const j = roomX('jadalnia');
    const spots = [
      { x: j + 420, y: 575 }, { x: j + 800, y: 580 }, { x: j + 1180, y: 575 },
      { x: j + 600, y: 700 }, { x: j + 1000, y: 720 },
    ];
    this.crumbs = spots.map((s) => {
      const c = w.add.container(s.x, s.y).setDepth(s.y < 620 ? 661 : 5);
      for (let i = 0; i < 6; i++) c.add(w.add.circle(Phaser.Math.Between(-38, 38), Phaser.Math.Between(-10, 10), Phaser.Math.Between(7, 12), 0xb8732e));
      c.setSize(110, 60).setInteractive({ useHandCursor: true });
      c.on('pointerdown', () => w.goThen(s.x + 60, Math.max(s.y + 100, 690), () => this.wipe(c)));
      return c;
    });
    prompt('Mniam! Teraz posprzątaj okruszki. Kliknij każdy bałagan.');
  }

  private wipe(c: Phaser.GameObjects.Container) {
    const w = this.w;
    if (!c.active || !c.input?.enabled) return;
    c.disableInteractive();
    const sponge = w.add.image(c.x - 40, c.y - 10, 'sponge').setDisplaySize(80, 80).setDepth(3000);
    sfx.wipe();
    w.tweens.add({
      targets: sponge, x: c.x + 40, duration: 140, yoyo: true, repeat: 3,
      onRepeat: () => sfx.wipe(),
      onComplete: () => {
        sponge.destroy();
        w.tweens.add({ targets: c, alpha: 0, duration: 250, onComplete: () => c.destroy() });
        this.crumbs = this.crumbs.filter((x) => x !== c);
        addStars();
        if (this.crumbs.length === 0) {
          say('Czysto! Brawo!');
          const next = { Śniadanie: 9 * 60 + 30, Obiad: 12 * 60 + 30, Podwieczorek: 15 * 60 } as Record<string, number>;
          w.backToFree(next[state.meal.name]);
        }
      },
    });
  }

  onKidClick(): boolean {
    return false;
  }
}
