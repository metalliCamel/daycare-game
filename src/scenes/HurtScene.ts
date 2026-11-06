import Phaser from 'phaser';
import { Overlay } from './Overlay';
import { kidDef } from '../objects/Kid';
import { prompt } from '../lib/state';
import { say } from '../lib/voice';
import { sfx } from '../lib/sound';

/** A scraped knee: wash it, put on a plaster, and a kiss to make it better. */
export class HurtScene extends Overlay {
  private kidId = '';

  constructor() {
    super('Hurt');
  }

  init(data: { kidId: string }) {
    super.init();
    this.kidId = data.kidId;
  }

  create() {
    const def = kidDef(this.kidId);
    this.background(0xfff0f5);
    this.heading(`${def.name} ${def.girl ? 'przewróciła' : 'przewrócił'} się. Pomóż!`);
    this.add.image(170, 250, def.key).setDisplaySize(180, 180);
    this.add.circle(260, 190, 20, 0x7fb8ff).setAlpha(0.8); // a tear

    // The knee
    const kx = 760, ky = 430;
    this.add.circle(kx, ky, 210, 0xf2c9a0).setStrokeStyle(8, 0xd9a77c);
    const scrape = this.add.container(kx, ky);
    for (let i = 0; i < 7; i++) scrape.add(this.add.ellipse(Phaser.Math.Between(-60, 60), Phaser.Math.Between(-25, 25), Phaser.Math.Between(30, 60), 14, 0xd94a4a, 0.8));

    // Step 1: wash with the sponge (follows the mouse)
    prompt('Najpierw umyjemy kolanko. Jeździj gąbką po zadrapaniu.');
    const sponge = this.add.image(kx + 300, ky, 'sponge').setDisplaySize(120, 120).setDepth(20);
    this.input.setDefaultCursor('none');
    let dirt = 1;
    let last = { x: 0, y: 0 };
    const onMove = (p: Phaser.Input.Pointer) => {
      sponge.setPosition(p.x, p.y);
      if (Math.abs(p.x - kx) < 130 && Math.abs(p.y - ky) < 90) {
        dirt -= Phaser.Math.Distance.Between(p.x, p.y, last.x, last.y) / 1400;
        scrape.setAlpha(Math.max(0.25, dirt));
        if (dirt <= 0) {
          this.input.off('pointermove', onMove);
          this.input.setDefaultCursor('default');
          sponge.destroy();
          sfx.star();
          say('Czyste! Teraz plasterek.');
          this.plaster(kx, ky);
        }
      }
      last = { x: p.x, y: p.y };
    };
    this.input.on('pointermove', onMove);
    this.events.once('shutdown', () => this.input.setDefaultCursor('default'));
  }

  // Step 2: drag the plaster onto the knee
  private plaster(kx: number, ky: number) {
    prompt('Przeciągnij plaster na kolanko.');
    const pl = this.add.image(1300, 430, 'bandage').setDisplaySize(170, 170).setInteractive({ useHandCursor: true, draggable: true });
    this.input.setDraggable(pl);
    pl.on('drag', (_p: Phaser.Input.Pointer, x: number, y: number) => pl.setPosition(x, y));
    pl.on('dragend', () => {
      if (Phaser.Math.Distance.Between(pl.x, pl.y, kx, ky) < 150) {
        pl.disableInteractive();
        this.tweens.add({ targets: pl, x: kx, y: ky, angle: -20, duration: 200 });
        sfx.pop();
        this.time.delayedCall(500, () => this.kiss(kx, ky));
      } else {
        this.tweens.add({ targets: pl, x: 1300, y: 430, duration: 300 });
      }
    });
  }

  // Step 3: a kiss on the boo-boo
  private kiss(kx: number, ky: number) {
    prompt('Na koniec buziak na zdrowie! Kliknij serduszko.');
    const h = this.pictureButton(1300, 430, 'heart', 'Buziak', () => {
      h.destroy();
      for (let i = 0; i < 6; i++) {
        const im = this.add.image(kx + Phaser.Math.Between(-120, 120), ky, 'heart').setDisplaySize(60, 60);
        this.tweens.add({ targets: im, y: ky - 260, alpha: 0, delay: i * 100, duration: 1000 });
      }
      this.bravo('Już nie boli! Brawo!', () => this.close(true), 700);
    }, 0xffffff, 180);
  }
}
