import Phaser from 'phaser';
import type { WorldScene, Module } from '../scenes/WorldScene';
import type { Kid } from '../objects/Kid';
import { roomX } from '../lib/rooms';
import { save, persist, prompt, addStars } from '../lib/state';
import { say, sayHover } from '../lib/voice';
import { sfx } from '../lib/sound';
import { stat } from './progress';

/** Chomik Ciapek lives in the cloakroom: food, water, a clean cage, and cuddles. */
export class Pet implements Module {
  private cage: Phaser.GameObjects.Container | null = null;
  private bubble: Phaser.GameObjects.Container | null = null;
  private hamster: Phaser.GameObjects.Image | null = null;
  private visitKid: Kid | null = null;

  constructor(private w: WorldScene) {
    if (save.pet.has) this.build();
  }

  /** The hamster arrives (first time on level 4). */
  arrive() {
    if (save.pet.has) return;
    save.pet = { has: true, fed: 0, water: 0, cleaned: save.day };
    persist();
    this.build();
  }

  needsCare() {
    const p = save.pet;
    return p.has && (p.fed !== save.day || p.water !== save.day || p.cleaned <= save.day - 2);
  }

  private build() {
    const w = this.w;
    const s = roomX('szatnia');
    const x = s + 1360;
    const y = 470;
    const g = w.add.graphics();
    // Little cabinet
    g.fillStyle(0xc68c5c, 1).fillRoundedRect(-120, 0, 240, 100, 10);
    g.lineStyle(4, 0x8b5a2b, 1).strokeRoundedRect(-100, 14, 95, 72, 8).strokeRoundedRect(5, 14, 95, 72, 8);
    // Cage
    g.fillStyle(0xfff3dc, 1).fillRect(-105, -120, 210, 120);
    g.fillStyle(0xf3d98b, 1).fillRect(-105, -22, 210, 22);
    g.lineStyle(3, 0x8f9ba3, 1);
    for (let i = -105; i <= 105; i += 15) g.lineBetween(i, -120, i, 0);
    g.lineStyle(6, 0x8f9ba3, 1).strokeRect(-105, -120, 210, 120);
    g.lineStyle(5, 0xd0504a, 1).strokeCircle(60, -60, 34);
    this.hamster = w.add.image(-35, -40, 'hamster').setDisplaySize(80, 80);
    w.tweens.add({ targets: this.hamster, x: 20, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.inOut', onYoyo: () => this.hamster?.setFlipX(true), onRepeat: () => this.hamster?.setFlipX(false) });
    const label = w.add.text(0, 60, 'Chomik Ciapek', { fontFamily: '"Baloo 2", sans-serif', fontSize: '22px', fontStyle: '800', color: '#4a3a5c' }).setOrigin(0.5);
    this.cage = w.add.container(x, y, [g, this.hamster, label]).setDepth(-55).setSize(240, 240);
    this.cage.setInteractive(new Phaser.Geom.Rectangle(0, 0, 240, 240), Phaser.Geom.Rectangle.Contains);
    this.cage.input!.cursor = 'pointer';
    this.cage.on('pointerover', () => sayHover(this.needsCare() ? 'Chomik Ciapek potrzebuje opieki!' : 'Chomik Ciapek'));
    this.cage.on('pointerdown', () => w.goThen(x - 40, 700, () => this.use()));

    // A small bubble when the hamster needs something
    const bg = w.add.graphics();
    bg.fillStyle(0xffffff, 1).fillCircle(0, 0, 36).fillTriangle(-10, 28, 10, 28, 0, 46);
    const icon = w.add.image(0, 0, 'seeds').setDisplaySize(46, 46);
    this.bubble = w.add.container(x - 150, y - 90, [bg, icon]).setDepth(-54);
    w.tweens.add({ targets: this.bubble, y: y - 100, duration: 700, yoyo: true, repeat: -1 });
  }

  private use() {
    const w = this.w;
    const kid = w.holding;
    // A child who asked to visit the hamster
    if (kid && kid.need === 'play' && kid.wish === 'pet') {
      w.takeHeld();
      kid.mode = 'busy';
      this.visitKid = kid;
      kid.walkTo(roomX('szatnia') + 1220, 690, () => {
        w.puff('heart', this.cage!.x, this.cage!.y - 140, 3, 50);
        sfx.giggle();
        this.visitKid = null;
        w.play.finishPet(kid);
      });
      return;
    }
    w.openScene<boolean>('Pet', {}, (cared) => {
      if (!cared) return;
      stat('petCare');
      addStars();
      prompt('Chomik Ciapek jest szczęśliwy!');
    });
  }

  waiting(kid: Kid): string | null {
    return this.visitKid === kid ? `${kid.def.name} odwiedza chomika.` : null;
  }

  update() {
    this.bubble?.setVisible(this.needsCare());
    if (this.needsCare() && this.bubble) {
      const p = save.pet;
      const icon = this.bubble.list[1] as Phaser.GameObjects.Image;
      icon.setTexture(p.fed !== save.day ? 'seeds' : p.water !== save.day ? 'drop' : 'broom');
    }
  }

  /** Remind once in a while (not blocking). */
  remind() {
    if (this.needsCare()) say('Chomik Ciapek czeka w szatni. Nakarm go i daj mu wody!');
  }
}
