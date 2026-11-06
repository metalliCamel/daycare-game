import Phaser from 'phaser';
import { Overlay } from './Overlay';
import { GAME_W } from '../lib/layout';
import { kidDef } from '../objects/Kid';
import { prompt } from '../lib/state';
import { say } from '../lib/voice';
import { sfx, tone } from '../lib/sound';

const PADS = [
  { key: 'drum', name: 'bęben', note: 196, color: 0xff7a6b },
  { key: 'guitar', name: 'gitara', note: 262, color: 0xffd45c },
  { key: 'trumpet', name: 'trąbka', note: 330, color: 0x8fd9b6 },
  { key: 'piano', name: 'pianinko', note: 392, color: 0x9fd3f5 },
];

/** Listen, then play the same tune back (a gentle "Simon says"). */
export class MusicScene extends Overlay {
  private kidId = '';
  private seq: number[] = [];
  private pos = 0;
  private round = 0;
  private listening = false;
  private pads: Phaser.GameObjects.Container[] = [];

  constructor() {
    super('Music');
  }

  init(data: { kidId: string }) {
    super.init();
    this.kidId = data.kidId;
    this.round = 0;
    this.pads = [];
  }

  create() {
    this.background(0xf3e8ff);
    this.heading(`Gramy z: ${kidDef(this.kidId).name}`);
    this.add.image(160, 250, kidDef(this.kidId).key).setDisplaySize(170, 170);
    this.closeButton(false);
    PADS.forEach((p, i) => {
      const x = GAME_W / 2 + (i - 1.5) * 300 + 60;
      const c = this.pictureButton(x, 470, p.key, p.name, () => this.hit(i), p.color, 240);
      this.pads.push(c);
    });
    this.time.delayedCall(800, () => this.newRound());
  }

  private flash(i: number) {
    const c = this.pads[i];
    tone(PADS[i].note, 0, 0.45, 'triangle', 0.4);
    this.tweens.add({ targets: c, scale: 1.18, duration: 180, yoyo: true });
  }

  private newRound() {
    const len = 3 + this.round;
    this.seq = Array.from({ length: len }, () => Phaser.Math.Between(0, PADS.length - 1));
    this.play();
  }

  private play() {
    this.listening = false;
    this.pos = 0;
    prompt('Posłuchaj melodii...');
    this.seq.forEach((i, k) => this.time.delayedCall(700 * k, () => this.flash(i)));
    this.time.delayedCall(700 * this.seq.length + 200, () => {
      this.listening = true;
      prompt('Teraz ty! Zagraj to samo po kolei.');
    });
  }

  private hit(i: number) {
    this.flash(i);
    if (!this.listening) return;
    if (i !== this.seq[this.pos]) {
      sfx.wrong();
      say('Prawie! Posłuchaj jeszcze raz.');
      this.listening = false;
      this.time.delayedCall(1000, () => this.play());
      return;
    }
    this.pos++;
    if (this.pos === this.seq.length) {
      this.listening = false;
      this.round++;
      if (this.round >= 2) this.bravo('Ale koncert! Brawo!', () => this.close(true), 220);
      else {
        sfx.star();
        say('Super! Teraz trochę dłuższa melodia.');
        this.time.delayedCall(1500, () => this.newRound());
      }
    }
  }
}
