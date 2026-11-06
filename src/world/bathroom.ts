import Phaser from 'phaser';
import type { WorldScene, Module } from '../scenes/WorldScene';
import type { Kid } from '../objects/Kid';
import { roomX } from '../lib/rooms';
import { prop } from './draw';
import { addStars, prompt } from '../lib/state';
import { say } from '../lib/voice';
import { sfx } from '../lib/sound';

type Toilet = { img: Phaser.GameObjects.Image; kid: Kid | null; flushReady: boolean };

/** Toilet → flush → wash hands at the sink. */
export class Bathroom implements Module {
  private toilets: Toilet[] = [];

  constructor(private w: WorldScene) {
    const l = roomX('lazienka');
    [l + 330, l + 650].forEach((x) => {
      const img = prop(w, 'toilet', x, 650, 180);
      const t: Toilet = { img, kid: null, flushReady: false };
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
      w.time.delayedCall(2500, () => {
        t.flushReady = true;
        w.puff('sparkles', t.img.x, t.img.y - 200);
        prompt('Gotowe! Kliknij toaletę, żeby spłukać wodę.');
      });
    }, true);
  }

  private flush(t: Toilet) {
    const w = this.w;
    const kid = t.kid!;
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
            say('Czyste rączki! Brawo!');
          }
        });
      }
    }, true);
  }

  onKidClick(): boolean {
    return false;
  }
}
