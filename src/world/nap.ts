import Phaser from 'phaser';
import type { WorldScene, Module } from '../scenes/WorldScene';
import type { Kid } from '../objects/Kid';
import { roomX } from '../lib/rooms';
import { prop } from './draw';
import { addStars, prompt } from '../lib/state';
import { say } from '../lib/voice';
import { sfx, playLullaby, playDayMusic } from '../lib/sound';

type Bed = { x: number; kid: Kid | null; blanket: Phaser.GameObjects.Graphics; tucked: boolean; inBed: boolean };
type Step = 'walk' | 'tuck' | 'light' | 'music' | 'sleep' | null;

const BED_Y = 760;

/** Tuck everyone in, lights off, lullaby, and calm kids who wake up. */
export class Nap implements Module {
  private b = roomX('sypialnia');
  private beds: Bed[] = [];
  private step: Step = null;
  private dark: Phaser.GameObjects.Rectangle;
  private zzz: Phaser.Time.TimerEvent | null = null;
  private wakeTimer: Phaser.Time.TimerEvent | null = null;
  private sleepLeft = 0;
  private pats = new Map<Kid, number>();

  constructor(private w: WorldScene) {
    const b = this.b;
    for (let i = 0; i < 6; i++) {
      const x = b + 150 + i * 225;
      prop(w, 'bed', x, BED_Y, 220, BED_Y - 40);
      const blanket = w.add.graphics().setDepth(BED_Y + 5).setVisible(false);
      blanket.fillStyle([0xff9fb2, 0x9fd3f5, 0xffd45c, 0x8fd9b6, 0xc7a8ff, 0xffb38a][i], 1);
      blanket.fillRoundedRect(x - 70, BED_Y - 82, 165, 56, 20);
      blanket.lineStyle(4, 0xffffff, 0.8).strokeRoundedRect(x - 70, BED_Y - 82, 165, 56, 20);
      this.beds.push({ x, kid: null, blanket, tucked: false, inBed: false });
    }
    // Light switch and music box on the wall / shelf
    const sw = prop(w, 'lightbulb', b + 1480, 360, 80, -50);
    w.clickable(sw, () => w.goThen(b + 1450, 680, () => this.useLight()), 'Światło');
    const music = prop(w, 'musicbox', b + 1380, 470, 80, -50);
    w.add.graphics().setDepth(-51).fillStyle(0xb5835a, 1).fillRect(b + 1320, 470, 200, 16);
    w.clickable(music, () => w.goThen(b + 1380, 680, () => this.useMusic()), 'Kołysanka');

    this.dark = w.add.rectangle(b, 0, 1600, 900, 0x1a1640, 0).setOrigin(0).setDepth(2400);
  }

  start() {
    const w = this.w;
    w.setPhase('nap');
    this.step = 'walk';
    sfx.doorbell();
    prompt('Czas na drzemkę! Dzieci idą do sypialni. Przykryj każde dziecko kołderką.');
    let arrived = 0;
    const kids = w.presentKids;
    this.beds.forEach((bed) => {
      bed.kid = null;
      bed.tucked = false;
      bed.inBed = false;
      bed.blanket.setVisible(false);
    });
    kids.forEach((kid, i) => {
      const bed = this.beds[i];
      bed.kid = kid;
      kid.mode = 'busy';
      kid.walkTo(bed.x - 25, BED_Y - 48, () => {
        kid.fixedDepth = BED_Y;
        kid.sprite.setScale(kid.sprite.scaleX * 0.85);
        bed.inBed = true;
        arrived++;
        if (arrived === kids.length) this.step = 'tuck';
      }, true);
    });
  }

  onKidClick(kid: Kid): boolean {
    const w = this.w;
    const bed = this.beds.find((b) => b.kid === kid);
    if (!bed || !this.step) return false;
    if (this.step === 'tuck' || this.step === 'walk') {
      if (bed.tucked) {
        say(`${kid.def.name} jest już ${kid.adj('przykryta', 'przykryty')}.`);
        return true;
      }
      if (!bed.inBed) {
        say(`${kid.def.name} jeszcze idzie do łóżka.`);
        return true;
      }
      w.goThen(bed.x + 120, 800, () => {
        if (bed.tucked) return;
        bed.tucked = true;
        bed.blanket.setVisible(true).setAlpha(0);
        w.tweens.add({ targets: bed.blanket, alpha: 1, duration: 300 });
        sfx.whoosh();
        say('Dobranoc!');
        if (this.beds.filter((b) => b.kid).every((b) => b.tucked)) {
          this.step = 'light';
          prompt('Wszyscy przykryci! Teraz zgaś światło. Kliknij żarówkę na ścianie.');
        }
      });
      return true;
    }
    if (this.step === 'sleep' && kid.need === 'awake') {
      w.goThen(bed.x + 120, 800, () => {
        const n = (this.pats.get(kid) ?? 0) + 1;
        this.pats.set(kid, n);
        w.puff('heart', kid.x, kid.y - 120, 1, 50);
        sfx.pop();
        if (n >= 3) {
          kid.setNeed(null);
          this.pats.delete(kid);
          say('Ciii... śpij słodko.');
        } else say('Ciii...');
      });
      return true;
    }
    say(`${kid.def.name} śpi. Ciii!`);
    return true;
  }

  private useLight() {
    if (this.step !== 'light') {
      say(this.step === 'tuck' || this.step === 'walk' ? 'Najpierw przykryj wszystkie dzieci.' : 'Światło');
      return;
    }
    this.step = 'music';
    sfx.click();
    this.w.tweens.add({ targets: this.dark, fillAlpha: 0.45, duration: 600 });
    prompt('Ciemno! Teraz włącz kołysankę. Kliknij pozytywkę na półce.');
  }

  private useMusic() {
    const w = this.w;
    if (this.step !== 'music') {
      say(this.step === 'light' ? 'Najpierw zgaś światło.' : 'Kołysanka');
      return;
    }
    this.step = 'sleep';
    playLullaby();
    prompt('Dzieci zasypiają... Jeśli ktoś się obudzi, kliknij go trzy razy, żeby pogłaskać.');
    this.zzz = w.time.addEvent({
      delay: 900, loop: true,
      callback: () => {
        const sleeping = this.beds.filter((b) => b.kid && b.kid.need !== 'awake');
        if (!sleeping.length) return;
        const bed = Phaser.Utils.Array.GetRandom(sleeping);
        const z = w.add.image(bed.x - 10, BED_Y - 170, 'zzz').setDisplaySize(50, 50).setDepth(2500);
        w.tweens.add({ targets: z, y: z.y - 90, x: z.x + 30, alpha: 0, duration: 1800, onComplete: () => z.destroy() });
      },
    });
    this.sleepLeft = 2;
    this.scheduleWake();
  }

  private scheduleWake() {
    const w = this.w;
    this.wakeTimer = w.time.delayedCall(Phaser.Math.Between(5000, 8000), () => {
      const asleep = this.beds.filter((b) => b.kid && b.kid.need !== 'awake').map((b) => b.kid!) as Kid[];
      if (this.sleepLeft > 0 && asleep.length) {
        this.sleepLeft--;
        const kid = Phaser.Utils.Array.GetRandom(asleep);
        kid.setNeed('awake');
        sfx.sad();
        prompt(kid.needText());
        this.scheduleWake();
      } else {
        this.waitForAllAsleep();
      }
    });
  }

  private waitForAllAsleep() {
    const w = this.w;
    if (this.beds.some((b) => b.kid?.need === 'awake')) {
      w.time.delayedCall(1500, () => this.waitForAllAsleep());
      return;
    }
    w.time.delayedCall(6000, () => this.wakeUp());
  }

  private wakeUp() {
    const w = this.w;
    this.zzz?.remove();
    this.wakeTimer?.remove();
    this.step = null;
    playDayMusic();
    w.tweens.add({ targets: this.dark, fillAlpha: 0, duration: 800 });
    sfx.cheer();
    prompt('Pobudka! Wszyscy się wyspali. Brawo!');
    const sala = roomX('sala');
    this.beds.forEach((bed, i) => {
      const kid = bed.kid;
      bed.blanket.setVisible(false);
      bed.tucked = false;
      bed.kid = null;
      if (!kid) return;
      kid.sprite.setScale(kid.sprite.scaleX / 0.85);
      kid.fixedDepth = null;
      kid.setNeed(null);
      kid.walkTo(bed.x, 800, () => kid.walkTo(sala + 250 + i * 170, 690 + (i % 2) * 100, () => (kid.mode = 'free')));
    });
    addStars(3);
    w.time.delayedCall(3000, () => w.backToFree(14 * 60));
  }
}
