import Phaser from 'phaser';
import type { WorldScene, Module, Item } from '../scenes/WorldScene';
import type { Kid } from '../objects/Kid';
import { roomX } from '../lib/rooms';
import { prop, DINING_SEATS } from './draw';
import { state, addStars, prompt } from '../lib/state';
import { say } from '../lib/voice';
import { sfx } from '../lib/sound';
import type { EmojiKey } from '../lib/assets';
import { dishFor, DISHES, type Dish } from './menu';
import { sayHover } from '../lib/voice';
import { save } from '../lib/state';
import { stat, befriend, unlocked } from './progress';

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
  private dish: Dish = DISHES.kanapki;
  private birthdayKid: string | null = null;
  private station!: Phaser.GameObjects.Image;

  constructor(private w: WorldScene) {
    const k = roomX('kuchnia');
    // The counter shows what's cooking today; click it to start cooking
    this.station = prop(w, 'bread', k + 420, 470, 120, 615);
    prop(w, 'knife', k + 560, 470, 80, 615);
    prop(w, 'pan', k + 900, 470, 120, 615);
    w.clickable(this.station, () => w.goThen(k + 520, 700, () => this.openKitchen('Food')));
    this.station.on('pointerover', () => sayHover(state.phase === 'meal' ? `Gotujemy: ${this.dish.name}` : 'Blat kuchenny'));
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
    this.dish = dishFor(name, save.day);
    const ev = w.today.event;
    this.birthdayKid = ev.kind === 'birthday' && name === 'Podwieczorek' ? ev.kidId : null;
    if (this.birthdayKid) this.dish = DISHES.tort;
    this.station.setTexture(this.dish.icon).setDisplaySize(120, 120);
    this.seated = w.presentKids;
    this.orders = this.seated.map((kid) => ({
      kidId: kid.def.id,
      fillings: Phaser.Utils.Array.Shuffle([...kid.def.likes]).slice(0, 2) as EmojiKey[],
    }));
    sfx.doorbell();
    prompt(`Czas na ${name.toLowerCase()}! Dzisiaj ${this.dish.name}. Dzieci idą do jadalni. Przygotuj ${this.dish.acc} na blacie w kuchni i nalej ${this.drink.name}.`);
    this.arrived = 0;
    this.seated.forEach((kid, i) => {
      kid.setNeed('hungry');
      kid.mode = 'busy';
      kid.walkTo(this.seats[i].x, this.seats[i].y, () => this.arrived++, true);
    });
  }

  private openKitchen(which: 'Food' | 'Pour') {
    const m = state.meal;
    if (state.phase !== 'meal' || m.step !== 'cooking') {
      prompt(state.phase === 'meal' ? 'Jedzenie jest już gotowe!' : 'Teraz nie jest pora jedzenia. Pobaw się z dziećmi!');
      return;
    }
    if (which === 'Food' && m.sandwiches) return prompt(`Jedzenie jest gotowe! Teraz nalej ${this.drink.name} przy dzbanku.`);
    if (which === 'Pour' && m.drinks) return prompt(`Picie jest gotowe! Teraz ${this.dish.name} na blacie.`);
    const kids = this.seated.map((k) => k.def.id);
    if (which === 'Pour') {
      this.w.openScene<boolean>('Pour', { kids, drink: this.drink }, (done) => done && this.cooked('Pour'));
      return;
    }
    const d = this.dish;
    const [key, data] =
      d.kind === 'sandwich' ? ['Sandwich', { orders: this.orders }]
      : d.kind === 'pot' ? ['Pot', { dish: d, kids }]
      : this.birthdayKid
        ? ['Top', { dish: d, orders: [{ kidId: kids.includes(this.birthdayKid) ? this.birthdayKid : kids[0], toppings: Phaser.Utils.Array.Shuffle([...d.toppings]).slice(0, 3) }] }]
        : ['Top', { dish: d, orders: kids.map((kidId) => ({ kidId, toppings: Phaser.Utils.Array.Shuffle([...d.toppings]).slice(0, 2) })) }];
    this.w.openScene<boolean>(key, data, (done) => done && this.cooked('Food'));
  }

  private cooked(which: 'Food' | 'Pour') {
    const w = this.w;
    const m = state.meal;
    if (which === 'Food') m.sandwiches = true;
    if (which === 'Pour') m.drinks = true;
    if (!(m.sandwiches && m.drinks)) {
      prompt(which === 'Food' ? `Super! Teraz nalej ${this.drink.name} przy dzbanku.` : `Picie gotowe! Teraz przygotuj ${this.dish.acc} na blacie.`);
      return;
    }
    m.step = 'serving';
    const k = roomX('kuchnia');
    const tray = prop(w, 'plate', k + 620, 470, 130, 616);
    tray.setData('topping', w.add.image(0, 0, this.dish.icon).setDisplaySize(80, 80));
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
    if (this.birthdayKid) {
      const b = this.seated.find((k) => k.def.id === this.birthdayKid);
      prompt(`Sto lat, sto lat! Wszystkiego najlepszego${b ? ', ' + b.def.name : ''}!`);
      sfx.stoLat();
      if (b) {
        b.cheer();
        w.puff('party', b.x, b.y - 150, 6, 60);
        befriend(b);
      }
      save.birthdays++;
      stat('birthdays');
    } else prompt(`Smacznego! Dzisiaj ${this.dish.name}.`);
    const plates: Phaser.GameObjects.Image[] = [];
    this.seated.forEach((_, i) => {
      const seat = this.seats[i];
      const plate = w.add.image(seat.x - 15, 572, this.dish.icon).setDisplaySize(62, 62).setDepth(660).setScale(0);
      const cup = w.add.image(seat.x + 35, 562, this.drink.key).setDisplaySize(40, 40).setDepth(660);
      w.tweens.add({ targets: plate, scale: 62 / 256, duration: 300, delay: i * 120, ease: 'Back.out' });
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
      w.time.delayedCall(900, () => this.afterMeal());
    });
  }

  private afterMeal() {
    const w = this.w;
    state.meal.step = 'cleaning';
    const sala = roomX('sala');
    this.seated.forEach((kid, i) => {
      kid.walkTo(sala + 220 + i * 150, 700 + (i % 2) * 60, () => {
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
        if (this.crumbs.length === 0) {
          addStars(3);
          say('Czysto! Brawo!');
          stat('meals');
          stat(`dish_${this.dish.id}`);
          if (state.meal.name === 'Obiad' && unlocked('teeth')) {
            // After lunch everyone brushes their teeth
            this.seated.filter((k) => k.present).forEach((k) => k.setNeed('teeth'));
            w.time.delayedCall(1200, () => prompt('Po obiedzie myjemy ząbki! Idź do łazienki i kliknij umywalkę.'));
          }
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
