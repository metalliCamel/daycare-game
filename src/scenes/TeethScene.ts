import Phaser from 'phaser';
import { Overlay } from './Overlay';
import { kidDef } from '../objects/Kid';
import { prompt } from '../lib/state';
import { say } from '../lib/voice';
import { sfx } from '../lib/sound';

/** After lunch: brush each child's teeth until they shine. */
export class TeethScene extends Overlay {
  private kids: string[] = [];
  private idx = 0;
  private layer!: Phaser.GameObjects.Container;
  private brush!: Phaser.GameObjects.Image;
  private spots: Phaser.GameObjects.Arc[] = [];

  constructor() {
    super('Teeth');
  }

  init(data: { kids: string[] }) {
    super.init();
    this.kids = data.kids;
    this.idx = 0;
  }

  create() {
    this.background(0xdff4ff);
    this.heading('Myjemy ząbki!');
    this.layer = this.add.container(0, 0);
    this.brush = this.add.image(0, 0, 'toothbrush').setDisplaySize(150, 150).setDepth(50).setAngle(-30);
    this.input.setDefaultCursor('none');
    this.events.once('shutdown', () => this.input.setDefaultCursor('default'));
    let last = { x: 0, y: 0 };
    let tick = 0;
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      this.brush.setPosition(p.x + 40, p.y - 30);
      const moved = Phaser.Math.Distance.Between(p.x, p.y, last.x, last.y);
      last = { x: p.x, y: p.y };
      for (const s of this.spots) {
        if (!s.active || s.alpha <= 0) continue;
        if (Phaser.Math.Distance.Between(p.x, p.y, s.x, s.y) < 55) {
          s.setAlpha(Math.max(0, s.alpha - moved / 250));
          if (performance.now() - tick > 150) {
            tick = performance.now();
            sfx.wipe();
            const b = this.add.circle(s.x + Phaser.Math.Between(-30, 30), s.y + Phaser.Math.Between(-20, 20), Phaser.Math.Between(6, 12), 0xffffff, 0.9);
            this.layer.add(b);
            this.tweens.add({ targets: b, y: b.y - 40, alpha: 0, duration: 600, onComplete: () => b.destroy() });
          }
        }
      }
      if (this.spots.length && this.spots.every((s) => s.alpha <= 0.02)) this.nextKid();
    });
    this.showKid();
  }

  private showKid() {
    this.layer.removeAll(true);
    this.spots = [];
    const def = kidDef(this.kids[this.idx]);
    this.layer.add(this.add.image(800, 300, def.key).setDisplaySize(280, 280));
    // Big smile with teeth
    const g = this.add.graphics();
    g.fillStyle(0xd94a6a, 1).fillRoundedRect(560, 470, 480, 200, 90);
    g.fillStyle(0xffffff, 1);
    for (let i = 0; i < 6; i++) g.fillRoundedRect(600 + i * 68, 490, 60, 70, 14).fillRoundedRect(600 + i * 68, 590, 60, 60, 14);
    this.layer.add(g);
    for (let i = 0; i < 4; i++) {
      const s = this.add.circle(630 + i * 110, i % 2 ? 620 : 525, 26, 0xc9b26b, 0.95);
      this.spots.push(s);
      this.layer.add(s);
    }
    prompt(`Ząbki ${def.gen}. Szoruj szczoteczką, aż wszystkie plamki znikną.`);
  }

  private nextKid() {
    this.spots = [];
    sfx.star();
    say('Błyszczą!');
    this.idx++;
    if (this.idx < this.kids.length) this.time.delayedCall(700, () => this.showKid());
    else this.bravo('Wszystkie ząbki czyste!', () => this.close(true), 160);
  }
}
