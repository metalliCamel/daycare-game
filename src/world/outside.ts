import Phaser from 'phaser';
import type { WorldScene, Module } from '../scenes/WorldScene';
import type { Kid } from '../objects/Kid';
import { roomX, roomIndexAt } from '../lib/rooms';
import { prop } from './draw';
import { state, addStars, prompt } from '../lib/state';
import { say } from '../lib/voice';
import { sfx } from '../lib/sound';
import type { EmojiKey } from '../lib/assets';

export type Weather = 'sun' | 'rain' | 'cold';
export const WEATHER: Record<Weather, { name: string; icon: EmojiKey; wear: EmojiKey[] }> = {
  sun: { name: 'słońce', icon: 'sun', wear: ['cap', 'sunglasses'] },
  rain: { name: 'deszcz', icon: 'cloud_rain', wear: ['umbrella', 'boots'] },
  cold: { name: 'zimno', icon: 'snowflake', wear: ['scarf', 'gloves'] },
};

const NUMBERS = ['jeden', 'dwa', 'trzy', 'cztery', 'pięć', 'sześć', 'siedem', 'osiem'];
const WISHES: { id: 'swing' | 'slide' | 'sand'; icon: EmojiKey }[] = [
  { id: 'swing', icon: 'swing' as EmojiKey },
  { id: 'slide', icon: 'slide' },
  { id: 'sand', icon: 'bucket' },
];

type Step = 'dress' | 'play' | 'count' | null;

/** Getting dressed for the weather, playground fun, and counting everyone back in. */
export class Outside implements Module {
  private step: Step = null;
  private weather: Weather = 'sun';
  private counted = 0;
  private d = roomX('dwor');
  private seat!: Phaser.GameObjects.Container;
  private swingAngle = 0;
  private swingAmp = 0.05;
  private swingT = 0;
  private swingKid: Kid | null = null;
  private pushes = 0;
  private castle: Phaser.GameObjects.Image | null = null;
  private sandKid: Kid | null = null;
  private sandClicks = 0;
  private busySlide = false;
  private ring!: Phaser.GameObjects.Arc;
  private weatherFx: Phaser.Time.TimerEvent | null = null;
  private countTimer: Phaser.Time.TimerEvent | null = null;

  constructor(private w: WorldScene) {
    const d = this.d;

    // Sandbox
    const g = w.add.graphics().setDepth(700);
    g.fillStyle(0xb5835a, 1).fillRoundedRect(d + 400, 735, 260, 110, 16);
    g.fillStyle(0xf3d98b, 1).fillRoundedRect(d + 412, 745, 236, 90, 12);
    prop(w, 'bucket', d + 620, 790, 70, 701);
    const sand = w.add.zone(d + 530, 790, 260, 130).setDepth(702);
    w.clickable(sand, () => w.goThen(d + 700, 790, () => this.useSand()), 'Piaskownica');

    // Slide
    const slide = prop(w, 'slide', d + 900, 720, 280);
    w.clickable(slide, () => w.goThen(d + 760, 740, () => this.useSlide()), 'Zjeżdżalnia');

    // Swing: frame + hanging seat that swings around the top bar
    const f = w.add.graphics().setDepth(640);
    f.lineStyle(16, 0xd0504a, 1);
    f.lineBetween(d + 1130, 700, d + 1170, 400).lineBetween(d + 1210, 700, d + 1170, 400);
    f.lineBetween(d + 1430, 700, d + 1390, 400).lineBetween(d + 1350, 700, d + 1390, 400);
    f.lineStyle(18, 0x9b3a35, 1).lineBetween(d + 1160, 400, d + 1400, 400);
    const ropes = w.add.graphics();
    ropes.lineStyle(6, 0x6b4a2b, 1).lineBetween(-45, 0, -45, 220).lineBetween(45, 0, 45, 220);
    ropes.fillStyle(0x8b5a2b, 1).fillRoundedRect(-65, 215, 130, 18, 6);
    this.seat = w.add.container(d + 1280, 400, [ropes]).setDepth(641);
    this.ring = w.add.circle(d + 1280, 700, 60, 0x6bd66b, 0).setStrokeStyle(8, 0x6bd66b, 0).setDepth(642);
    const swingZone = w.add.zone(d + 1280, 560, 330, 340).setDepth(643);
    w.clickable(swingZone, () => w.goThen(d + 1280, 800, () => this.useSwing()), 'Huśtawka');
  }

  start() {
    const w = this.w;
    w.setPhase('outside');
    this.step = 'dress';
    this.weather = Phaser.Utils.Array.GetRandom(['sun', 'rain', 'cold'] as Weather[]);
    const info = WEATHER[this.weather];
    sfx.doorbell();
    prompt(`Idziemy na dwór! Dzisiaj jest ${info.name}. Dzieci idą do szatni. Kliknij dziecko, żeby je ubrać.`);
    const s = roomX('szatnia');
    w.presentKids.forEach((kid, i) => {
      kid.mode = 'busy';
      kid.walkTo(s + 250 + i * 170, 700 + (i % 2) * 90, () => {
        kid.setNeed('dress', info.icon);
        kid.mode = 'free';
        kid.homeRoom = roomIndexAt(s + 300);
      });
    });
  }

  private openDress() {
    const w = this.w;
    const kids = w.presentKids;
    w.openScene<boolean>('Dress', { kids: kids.map((k) => k.def.id), weather: this.weather }, (ok) => {
      if (!ok) return;
      this.step = 'play';
      this.startWeatherFx();
      prompt('Wszyscy ubrani! Idziemy na plac zabaw. Każde dziecko chce się pobawić czymś innym.');
      kids.forEach((kid, i) => {
        kid.setWearing(WEATHER[this.weather].wear);
        kid.mode = 'busy';
        kid.setNeed(null);
        const wish = WISHES[i % WISHES.length];
        kid.walkTo(this.d + 300 + i * 150, 680 + (i % 2) * 100, () => {
          kid.wish = wish.id;
          kid.setNeed('wish', wish.icon);
          kid.mode = 'free';
          kid.homeRoom = 0;
        });
        kid.wish = wish.id;
      });
    });
  }

  private startWeatherFx() {
    const w = this.w;
    this.weatherFx?.remove();
    if (this.weather === 'sun') return;
    this.weatherFx = w.time.addEvent({
      delay: this.weather === 'rain' ? 60 : 140,
      loop: true,
      callback: () => {
        const x = this.d + Phaser.Math.Between(0, 1600);
        const drop = this.weather === 'rain'
          ? w.add.rectangle(x, -20, 4, 30, 0x7fb8ff, 0.8)
          : w.add.circle(x, -20, Phaser.Math.Between(5, 9), 0xffffff, 0.95);
        drop.setDepth(2500);
        w.tweens.add({
          targets: drop,
          y: Phaser.Math.Between(600, 880),
          x: this.weather === 'cold' ? x + Phaser.Math.Between(-60, 60) : x - 30,
          duration: this.weather === 'rain' ? 700 : 3000,
          onComplete: () => drop.destroy(),
        });
      },
    });
  }

  // ---------- Playground ----------

  private wishDone(kid: Kid) {
    kid.setNeed(null);
    kid.cheer();
    sfx.giggle();
    addStars();
    if (this.w.presentKids.every((k) => k.need !== 'wish')) {
      this.countTimer = this.w.time.delayedCall(5000, () => this.startCount());
    }
  }

  private needKid(id: 'swing' | 'slide' | 'sand', name: string): Kid | null {
    const kid = this.w.holding;
    if (this.step !== 'play') {
      say(name);
      return null;
    }
    if (!kid) {
      prompt(`Przyprowadź dziecko, które chce: ${name}.`);
      return null;
    }
    if (kid.need === 'wish' && kid.wish !== id) {
      say(`${kid.def.name} chce czegoś innego. Popatrz na dymek!`);
      return null;
    }
    return kid;
  }

  private useSlide() {
    const w = this.w;
    if (this.busySlide) return;
    const kid = this.needKid('slide', 'zjeżdżalnia');
    if (!kid) return;
    w.takeHeld();
    kid.mode = 'busy';
    this.busySlide = true;
    const d = this.d;
    kid.walkTo(d + 790, 720, () => {
      w.tweens.chain({
        targets: kid,
        tweens: [
          { x: d + 820, y: 520, duration: 900, ease: 'Sine.inOut' },
          { x: d + 1000, y: 730, duration: 650, ease: 'Quad.in', onStart: () => sfx.whoosh() },
        ],
        onComplete: () => {
          this.busySlide = false;
          kid.mode = 'free';
          if (kid.need === 'wish') this.wishDone(kid);
          else kid.cheer();
          say('Hura!');
        },
      });
    }, true);
  }

  private useSand() {
    const w = this.w;
    if (this.sandKid) {
      // Build the castle
      this.sandClicks++;
      sfx.pop();
      w.puff('sparkles', this.d + 530, 760, 1, 50);
      if (!this.castle) this.castle = prop(w, 'sandcastle', this.d + 540, 800, 40, 703);
      this.castle.setDisplaySize(40 + this.sandClicks * 35, 40 + this.sandClicks * 35);
      if (this.sandClicks >= 3) {
        const kid = this.sandKid;
        this.sandKid = null;
        kid.mode = 'free';
        say('Piękny zamek!');
        if (kid.need === 'wish') this.wishDone(kid);
      }
      return;
    }
    const kid = this.needKid('sand', 'piaskownica');
    if (!kid) return;
    w.takeHeld();
    kid.mode = 'busy';
    this.sandKid = kid;
    this.sandClicks = 0;
    this.castle?.destroy();
    this.castle = null;
    kid.walkTo(this.d + 470, 770, () => prompt('Kliknij piaskownicę trzy razy, żeby zbudować zamek!'), true);
  }

  private useSwing() {
    const w = this.w;
    if (this.swingKid) {
      // Push when the swing is back near you (left end of the swing)
      const inWindow = this.swingAngle > this.swingAmp * 0.55;
      if (inWindow) {
        this.pushes++;
        this.swingAmp = Math.min(0.7, this.swingAmp + 0.15);
        sfx.boing();
        if (this.pushes >= 3) {
          const kid = this.swingKid;
          w.time.delayedCall(2500, () => {
            this.swingKid = null;
            kid.mode = 'free';
            kid.walkTo(this.d + 1100, 780);
            say('Ale wysoko! Super!');
            if (kid.need === 'wish') this.wishDone(kid);
          });
        } else say(['Mocniej!', 'Jeszcze raz!'][this.pushes - 1] ?? 'Hop!');
      } else {
        say('Poczekaj, aż huśtawka wróci do ciebie!');
      }
      return;
    }
    const kid = this.needKid('swing', 'huśtawka');
    if (!kid) return;
    w.takeHeld();
    kid.mode = 'busy';
    this.swingKid = kid;
    this.pushes = 0;
    this.swingAmp = 0.12;
    prompt('Kliknij huśtawkę, kiedy świeci się zielone kółko!');
  }

  // ---------- Head count ----------

  private startCount() {
    this.step = 'count';
    this.counted = 0;
    this.w.presentKids.forEach((k) => k.setBadge(null));
    prompt('Wracamy do środka! Policz dzieci. Kliknij każde dziecko po kolei.');
  }

  onKidClick(kid: Kid): boolean {
    const w = this.w;
    if (kid.need === 'dress' && this.step === 'dress') {
      w.goThen(kid.x + 110, kid.y, () => this.openDress());
      return true;
    }
    if (this.step === 'count') {
      if (!kid.counted) {
        kid.counted = true;
        this.counted++;
        kid.setBadge(String(this.counted));
        sfx.pop();
        say(NUMBERS[this.counted - 1] ?? String(this.counted));
        if (this.counted === w.presentKids.length) w.time.delayedCall(900, () => this.finish());
      } else say(`${kid.def.name} jest już ${kid.adj('policzona', 'policzony')}.`);
      return true;
    }
    return false;
  }

  private finish() {
    const w = this.w;
    this.step = null;
    this.weatherFx?.remove();
    this.weatherFx = null;
    addStars(2);
    sfx.cheer();
    prompt(`Jest nas ${w.presentKids.length}! Wszystkie dzieci są. Wracamy do przedszkola.`);
    const s = roomX('szatnia');
    const sala = roomX('sala');
    w.presentKids.forEach((kid, i) => {
      kid.counted = false;
      kid.setBadge(null);
      kid.mode = 'busy';
      kid.homeRoom = null;
      kid.walkTo(s + 300 + i * 150, 740, () => {
        kid.setWearing([]);
        sfx.whoosh();
        kid.walkTo(sala + 250 + i * 170, 680 + (i % 2) * 100, () => (kid.mode = 'free'));
      });
    });
    this.castle?.destroy();
    this.castle = null;
    w.time.delayedCall(4000, () => w.backToFree(11 * 60));
  }

  update(dt: number) {
    // Swing physics (simple pendulum look)
    this.swingT += dt * 2.6;
    if (!this.swingKid) this.swingAmp = Math.max(0.03, this.swingAmp - dt * 0.05);
    this.swingAngle = Math.sin(this.swingT) * this.swingAmp;
    this.seat.setRotation(this.swingAngle);
    const sx = this.seat.x - Math.sin(this.swingAngle) * 225;
    const sy = this.seat.y + Math.cos(this.swingAngle) * 225;
    if (this.swingKid) {
      this.swingKid.setPosition(sx, sy + 30).setDepth(640.5);
      const on = this.swingAngle > this.swingAmp * 0.55;
      this.ring.setPosition(sx, sy).setStrokeStyle(8, 0x6bd66b, on ? 1 : 0.15);
    } else {
      this.ring.setStrokeStyle(8, 0x6bd66b, 0);
    }
    if (state.phase !== 'outside' && this.step) this.step = null;
  }
}
