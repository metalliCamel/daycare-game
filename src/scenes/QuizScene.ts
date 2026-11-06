import Phaser from 'phaser';
import { Overlay } from './Overlay';
import { GAME_W } from '../lib/layout';
import { prompt } from '../lib/state';
import { say } from '../lib/voice';
import { sfx } from '../lib/sound';

type Q = { q: string; options: { key: string; label: string }[]; correct: number };

/** A guest asks a few picture questions. Wrong answers just get another try. */
export class QuizScene extends Overlay {
  private who = 'firefighter';
  private questions: Q[] = [];
  private idx = 0;
  private parts: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('Quiz');
  }

  init(data: { who: string; questions: Q[] }) {
    super.init();
    this.who = data.who;
    this.questions = data.questions;
    this.idx = 0;
    this.parts = [];
  }

  create() {
    this.background(0xe9f5ff);
    const g = this.add.image(170, 420, this.who).setDisplaySize(260, 260);
    this.tweens.add({ targets: g, y: 405, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.show();
  }

  private show() {
    this.parts.forEach((p) => p.destroy());
    this.parts = [];
    const q = this.questions[this.idx];
    this.parts.push(this.heading(q.q, 170, 46).setWordWrapWidth(1100));
    prompt(q.q);
    q.options.forEach((o, i) => {
      const x = GAME_W / 2 + 120 + (i - (q.options.length - 1) / 2) * 320;
      const b = this.pictureButton(x, 450, o.key, o.label, () => this.answer(i, b), 0xffffff, 250);
      this.parts.push(b);
    });
  }

  private answer(i: number, btn: Phaser.GameObjects.Container) {
    const q = this.questions[this.idx];
    if (i !== q.correct) {
      sfx.wrong();
      say('Hmm, spróbuj jeszcze raz!');
      this.tweens.add({ targets: btn, angle: { from: -6, to: 6 }, duration: 70, yoyo: true, repeat: 2, onComplete: () => btn.setAngle(0) });
      return;
    }
    sfx.star();
    this.idx++;
    if (this.idx < this.questions.length) {
      say('Brawo! Dobrze!');
      this.time.delayedCall(900, () => this.show());
    } else {
      this.bravo('Brawo! Wszystko dobrze!', () => this.close(true), 640);
    }
  }
}
