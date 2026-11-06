import Phaser from 'phaser';
import { Overlay } from './Overlay';
import { save, persist, prompt } from '../lib/state';
import { say } from '../lib/voice';
import { sfx } from '../lib/sound';

/** Caring for Chomik Ciapek: food, water, a clean cage, then a cuddle. */
export class PetScene extends Overlay {
  private hamster!: Phaser.GameObjects.Image;
  private tasks: ('food' | 'water' | 'clean')[] = [];
  private didSomething = false;

  constructor() {
    super('Pet');
  }

  create() {
    this.didSomething = false;
    const p = save.pet;
    this.tasks = [];
    if (p.fed !== save.day) this.tasks.push('food');
    if (p.water !== save.day) this.tasks.push('water');
    if (p.cleaned <= save.day - 2) this.tasks.push('clean');

    this.background(0xfff3dc);
    this.heading('Chomik Ciapek');
    this.closeButton(() => this.didSomething);
    const g = this.add.graphics();
    g.fillStyle(0xfffaf0, 1).fillRect(330, 170, 940, 520);
    g.fillStyle(0xf3d98b, 1).fillRect(330, 600, 940, 90);
    g.lineStyle(5, 0x8f9ba3, 1);
    for (let x = 330; x <= 1270; x += 40) g.lineBetween(x, 170, x, 690);
    g.lineStyle(10, 0x8f9ba3, 1).strokeRect(330, 170, 940, 520);
    g.lineStyle(10, 0xd0504a, 1).strokeCircle(1100, 470, 110);
    this.hamster = this.add.image(760, 560, 'hamster').setDisplaySize(200, 200);
    this.tweens.add({ targets: this.hamster, y: 545, duration: 600, yoyo: true, repeat: -1 });
    this.next();
  }

  private next() {
    const t = this.tasks.shift();
    if (t === 'food') return this.food();
    if (t === 'water') return this.water();
    if (t === 'clean') return this.clean();
    this.cuddle();
  }

  private done(kind: 'fed' | 'water' | 'cleaned') {
    save.pet[kind] = save.day;
    persist();
    this.didSomething = true;
    sfx.star();
    this.time.delayedCall(700, () => this.next());
  }

  private food() {
    prompt('Ciapek jest głodny. Przeciągnij ziarenka do miseczki.');
    const bowl = this.add.ellipse(520, 640, 160, 50, 0x9fd3f5).setStrokeStyle(5, 0x7fb8d8);
    const seeds = this.add.image(1400, 300, 'seeds').setDisplaySize(130, 130).setInteractive({ useHandCursor: true, draggable: true });
    this.input.setDraggable(seeds);
    seeds.on('drag', (_p: Phaser.Input.Pointer, x: number, y: number) => seeds.setPosition(x, y));
    seeds.on('dragend', () => {
      if (Phaser.Math.Distance.Between(seeds.x, seeds.y, bowl.x, bowl.y) < 140) {
        seeds.destroy();
        for (let i = 0; i < 8; i++) this.add.circle(bowl.x + Phaser.Math.Between(-55, 55), bowl.y - 5 + Phaser.Math.Between(-8, 6), 7, 0xc9a26b);
        this.tweens.add({ targets: this.hamster, x: 600, duration: 600 });
        say('Mniam! Ciapek je ziarenka.');
        this.done('fed');
      } else this.tweens.add({ targets: seeds, x: 1400, y: 300, duration: 300 });
    });
  }

  private water() {
    prompt('Teraz woda. Klikaj butelkę, żeby ją napełnić.');
    const bottle = this.add.rectangle(420, 330, 70, 200, 0xffffff, 0.6).setStrokeStyle(5, 0x7fb8d8).setInteractive({ useHandCursor: true });
    const fill = this.add.rectangle(420, 425, 60, 0, 0x7fb8ff).setOrigin(0.5, 1);
    let level = 0;
    bottle.on('pointerdown', () => {
      level++;
      fill.setSize(60, level * 45);
      sfx.pour();
      if (level >= 4) {
        bottle.disableInteractive();
        say('Pełna butelka! Ciapek pije.');
        this.done('water');
      }
    });
  }

  private clean() {
    prompt('Klatka jest brudna. Jeździj miotełką po bałaganie.');
    const piles = [0, 1, 2].map((i) => this.add.ellipse(460 + i * 220, 650, 120, 34, 0x8b6a4a, 0.9));
    const broom = this.add.image(0, 0, 'broom').setDisplaySize(130, 130).setDepth(30);
    this.input.setDefaultCursor('none');
    let last = { x: 0, y: 0 };
    const onMove = (p: Phaser.Input.Pointer) => {
      broom.setPosition(p.x, p.y);
      const d = Phaser.Math.Distance.Between(p.x, p.y, last.x, last.y);
      last = { x: p.x, y: p.y };
      for (const pile of piles) {
        if (pile.alpha > 0 && Math.abs(p.x - pile.x) < 80 && Math.abs(p.y - pile.y) < 60) pile.setAlpha(Math.max(0, pile.alpha - d / 500));
      }
      if (piles.every((pl) => pl.alpha <= 0.02)) {
        this.input.off('pointermove', onMove);
        this.input.setDefaultCursor('default');
        broom.destroy();
        say('Czysto! Ciapek ma porządek.');
        this.done('cleaned');
      }
    };
    this.input.on('pointermove', onMove);
    this.events.once('shutdown', () => this.input.setDefaultCursor('default'));
  }

  private cuddle() {
    prompt('Pogłaszcz Ciapka! Kliknij go trzy razy.');
    let n = 0;
    this.hamster.setInteractive({ useHandCursor: true });
    this.hamster.on('pointerdown', () => {
      n++;
      sfx.giggle();
      const h = this.add.image(this.hamster.x + Phaser.Math.Between(-60, 60), this.hamster.y - 80, 'heart').setDisplaySize(50, 50);
      this.tweens.add({ targets: h, y: h.y - 120, alpha: 0, duration: 900 });
      if (n === 3) {
        this.hamster.disableInteractive();
        this.didSomething = true;
        this.bravo('Ciapek cię lubi!', () => this.close(this.didSomething), 140);
      }
    });
  }
}
