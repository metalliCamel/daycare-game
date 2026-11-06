import Phaser from 'phaser';
import type { WorldScene, Module } from '../scenes/WorldScene';
import type { Kid } from '../objects/Kid';
import { roomX } from '../lib/rooms';
import { prop } from './draw';
import { addStars, prompt } from '../lib/state';
import { say, sayHover } from '../lib/voice';
import { sfx } from '../lib/sound';
import { stat, befriend } from './progress';

type Toilet = {
  img: Phaser.GameObjects.Image;
  kid: Kid | null;
  flushReady: boolean;
  /** progress ring while the child is on the toilet, then the flush button */
  ui: Phaser.GameObjects.Container | null;
};

const POTTY_MS = 3500;

/** Toilet → flush → wash hands at the sink. */
export class Bathroom implements Module {
  private toilets: Toilet[] = [];

  constructor(private w: WorldScene) {
    const l = roomX('lazienka');
    [l + 330, l + 650].forEach((x) => {
      const img = prop(w, 'toilet', x, 650, 180);
      const t: Toilet = { img, kid: null, flushReady: false, ui: null };
      this.toilets.push(t);
      w.clickable(img, () => w.goThen(x + 130, 700, () => this.useToilet(t)), 'Toaleta');
    });
    const sink = w.add.zone(l + 1070, 440, 240, 160);
    w.clickable(sink, () => w.goThen(l + 1180, 700, () => this.useSink()), 'Umywalka');
    prop(w, 'soap', l + 1150, 440, 60, -50);
  }

  private useToilet(t: Toilet) {
    const w = this.w;
    if (t.flushReady && t.kid) return this.flush(t);
    if (t.kid) return prompt('Poczekaj chwilkę...');
    const kid = w.holding;
    if (!kid) return prompt('Przyprowadź tu dziecko, które musi iść do toalety.');
    if (kid.need !== 'potty') return say(`${kid.def.name} nie musi teraz siusiu.`);
    w.takeHeld();
    kid.mode = 'busy';
    t.kid = kid;
    kid.walkTo(t.img.x, 625, () => {
      kid.setNeed(null);
      kid.fixedDepth = t.img.depth + 1;
      prompt(`${kid.def.name} siedzi na toalecie. Poczekaj, aż kółko się zapełni.`);
      this.showProgress(t, () => {
        t.flushReady = true;
        w.puff('sparkles', t.img.x, t.img.y - 200);
        this.showFlushButton(t);
        prompt('Gotowe! Kliknij niebieski przycisk, żeby spłukać wodę.');
      });
    }, true);
  }

  /** A ring above the toilet that fills up while the child is busy. */
  private showProgress(t: Toilet, done: () => void) {
    const w = this.w;
    const x = t.img.x;
    const y = t.img.y - 250;
    const bg = w.add.circle(0, 0, 52, 0xffffff, 0.95).setStrokeStyle(5, 0x4a3a5c, 0.2);
    const ring = w.add.graphics();
    const icon = w.add.image(0, 0, 'toiletpaper').setDisplaySize(56, 56);
    t.ui = w.add.container(x, y, [bg, ring, icon]).setDepth(3000);
    const p = { v: 0 };
    w.tweens.add({
      targets: p, v: 1, duration: POTTY_MS,
      onUpdate: () => {
        ring.clear();
        ring.lineStyle(12, 0x6bd66b, 1);
        ring.beginPath();
        ring.arc(0, 0, 44, -Math.PI / 2, -Math.PI / 2 + p.v * Math.PI * 2, false);
        ring.strokePath();
      },
      onComplete: () => {
        t.ui?.destroy();
        t.ui = null;
        done();
      },
    });
    w.tweens.add({ targets: icon, angle: { from: -8, to: 8 }, duration: 400, yoyo: true, repeat: -1 });
  }

  /** Big flush button above the toilet — never hidden behind the child. */
  private showFlushButton(t: Toilet) {
    const w = this.w;
    const bg = w.add.circle(0, 0, 58, 0x4fa8ff).setStrokeStyle(6, 0xffffff);
    const icon = w.add.image(0, -4, 'drop').setDisplaySize(64, 64);
    const btn = w.add.container(t.img.x, t.img.y - 250, [bg, icon]).setDepth(3000).setSize(130, 130);
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => sayHover('Spłucz wodę'));
    btn.on('pointerdown', () => w.goThen(t.img.x + 130, 700, () => this.flush(t)));
    w.tweens.add({ targets: btn, scale: 1.12, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    t.ui = btn;
  }

  private flush(t: Toilet) {
    const w = this.w;
    if (!t.kid || !t.flushReady) return;
    t.ui?.destroy();
    t.ui = null;
    const kid = t.kid;
    t.kid = null;
    t.flushReady = false;
    sfx.flush();
    w.puff('drop', t.img.x, t.img.y - 80, 6, 40);
    w.tweens.add({ targets: t.img, angle: { from: -3, to: 3 }, duration: 80, yoyo: true, repeat: 3, onComplete: () => t.img.setAngle(0) });
    kid.mode = 'free';
    kid.fixedDepth = null;
    kid.walkTo(t.img.x + 120, 720);
    kid.setNeed('wash');
    prompt(`Teraz ${kid.def.name} musi umyć rączki przy umywalce.`);
  }

  private useSink() {
    const w = this.w;
    const kid = w.holding;
    const brushing = w.presentKids.filter((k) => k.need === 'teeth');
    if (!kid && brushing.length) {
      w.openScene<boolean>('Teeth', { kids: brushing.map((k) => k.def.id) }, (ok) => {
        if (!ok) return;
        brushing.forEach((k) => k.setNeed(null));
        stat('teeth');
        addStars();
        prompt('Wszystkie ząbki czyste i błyszczące!');
      });
      return;
    }
    if (!kid) return prompt('Przyprowadź dziecko do umywalki.');
    if (kid.need !== 'wash') return say('Rączki są już czyste!');
    w.takeHeld();
    kid.mode = 'busy';
    const l = roomX('lazienka');
    kid.walkTo(l + 1070, 640, () => {
      prompt('Kliknij wszystkie bańki mydlane!');
      let left = 6;
      for (let i = 0; i < 6; i++) {
        const bub = w.add
          .circle(kid.x + Phaser.Math.Between(-90, 90), kid.y - Phaser.Math.Between(40, 170), Phaser.Math.Between(26, 40), 0xdff4ff, 0.85)
          .setStrokeStyle(4, 0xffffff)
          .setDepth(3000)
          .setInteractive({ useHandCursor: true });
        w.tweens.add({ targets: bub, y: bub.y - 15, duration: 800 + i * 90, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        bub.on('pointerdown', () => {
          bub.disableInteractive();
          sfx.pop();
          w.tweens.add({ targets: bub, scale: 1.6, alpha: 0, duration: 200, onComplete: () => bub.destroy() });
          left--;
          if (left === 0) {
            kid.setNeed(null);
            kid.mode = 'free';
            kid.cheer();
            sfx.giggle();
            addStars();
            befriend(kid);
            say('Czyste rączki! Brawo!');
          }
        });
      }
    }, true);
  }

  waiting(kid: Kid): string | null {
    const t = this.toilets.find((x) => x.kid === kid);
    if (t) return t.flushReady ? `${kid.def.name} czeka w łazience. Kliknij niebieski przycisk i spłucz wodę!` : `${kid.def.name} jest w toalecie, zaraz skończy.`;
    if (kid.need === 'wash') return `${kid.def.name} myje rączki. Kliknij bańki mydlane w łazience.`;
    return null;
  }

  onKidClick(kid: Kid): boolean {
    // Clicking the child sitting on the toilet works too
    const t = this.toilets.find((x) => x.kid === kid);
    if (!t) return false;
    if (t.flushReady) this.w.goThen(t.img.x + 130, 700, () => this.flush(t));
    else say('Poczekaj chwilkę, aż kółko się zapełni.');
    return true;
  }
}
