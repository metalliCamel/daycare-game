import Phaser from 'phaser';
import type { WorldScene, Module } from '../scenes/WorldScene';
import { roomX } from '../lib/rooms';
import { save, persist, prompt, addStars } from '../lib/state';
import { say, sayHover } from '../lib/voice';
import { sfx } from '../lib/sound';
import { season, stat, unlocked } from './progress';
import type { EmojiKey } from '../lib/assets';

const PLANTS: { key: EmojiKey; name: string; acc: string }[] = [
  { key: 'carrot', name: 'marchewka', acc: 'marchewkę' },
  { key: 'tomato', name: 'pomidor', acc: 'pomidora' },
  { key: 'strawberry', name: 'truskawka', acc: 'truskawkę' },
  { key: 'sunflower', name: 'słonecznik', acc: 'słonecznik' },
];

/** Four garden plots on the playground. Water today → it grows overnight. */
export class Garden implements Module {
  private plots: { c: Phaser.GameObjects.Container; img: Phaser.GameObjects.Image }[] = [];

  constructor(private w: WorldScene) {
    if (!unlocked('garden')) return;
    const d = roomX('dwor');
    const sign = w.add.graphics().setDepth(640);
    sign.fillStyle(0x8b5a2b, 1).fillRect(36, 610, 10, 60);
    sign.fillStyle(0xc68c5c, 1).fillRoundedRect(10, 580, 120, 40, 8);
    w.add.text(70, 600, 'Ogródek', { fontFamily: '"Baloo 2", sans-serif', fontSize: '22px', fontStyle: '800', color: '#ffffff' }).setOrigin(0.5).setDepth(641);
    save.garden.forEach((_, i) => {
      const x = d + 110 + i * 85;
      const y = 700;
      const g = w.add.graphics();
      g.fillStyle(0x8b5a2b, 1).fillRoundedRect(-38, -14, 76, 34, 10);
      g.fillStyle(0x6b4423, 1).fillEllipse(0, 0, 60, 18);
      const img = w.add.image(0, -10, 'seedling').setOrigin(0.5, 0.9);
      const c = w.add.container(x, y, [g, img]).setDepth(y).setSize(84, 110);
      c.setInteractive(new Phaser.Geom.Rectangle(0, -30, 84, 110), Phaser.Geom.Rectangle.Contains);
      c.input!.cursor = 'pointer';
      c.on('pointerdown', () => w.goThen(x + 70, 730, () => this.use(i)));
      c.on('pointerover', () => sayHover(this.describe(i)));
      this.plots.push({ c, img });
      this.render(i);
    });
  }

  private plantOf(i: number) {
    return PLANTS.find((p) => p.key === save.garden[i].plant);
  }

  private describe(i: number) {
    const p = save.garden[i];
    if (season() === 'zima') return 'Zimą ogródek śpi pod śniegiem.';
    if (!p.plant) return 'Pusta grządka. Kliknij, żeby coś posadzić.';
    if (p.stage >= 3) return `${this.plantOf(i)!.name} urosła! Kliknij, żeby zebrać.`.replace('pomidor urosła', 'pomidor urósł').replace('słonecznik urosła', 'słonecznik urósł');
    return p.watered === save.day ? 'Podlane! Jutro trochę urośnie.' : 'Kliknij, żeby podlać.';
  }

  private render(i: number) {
    const p = save.garden[i];
    const img = this.plots[i].img;
    img.setVisible(!!p.plant);
    if (!p.plant) return;
    if (p.stage >= 3) img.setTexture(p.plant).setDisplaySize(70, 70);
    else img.setTexture('seedling').setDisplaySize(26 + p.stage * 20, 26 + p.stage * 20);
  }

  private use(i: number) {
    const w = this.w;
    const p = save.garden[i];
    const { c } = this.plots[i];
    if (season() === 'zima') return say('Zimą ogródek śpi pod śniegiem. Posadzimy wiosną!');
    if (!p.plant) {
      const plant = PLANTS[(save.stats.planted ?? 0) % PLANTS.length];
      save.stats.planted = (save.stats.planted ?? 0) + 1;
      save.garden[i] = { plant: plant.key, stage: 0, watered: save.day };
      sfx.pop();
      w.puff('drop', c.x, c.y - 40, 4, 30);
      prompt(`Posadzone: ${plant.name}! Podlewaj codziennie, a urośnie.`);
    } else if (p.stage >= 3) {
      const plant = this.plantOf(i)!;
      w.puff(plant.key, c.x, c.y - 60, 1, 90);
      save.garden[i] = { plant: null, stage: 0, watered: 0 };
      sfx.cheer();
      stat('harvest');
      addStars(2);
      prompt(`Zbiory! Mamy ${plant.acc}. Możesz posadzić coś nowego.`);
    } else if (p.watered === save.day) {
      say('Już podlane. Jutro trochę urośnie!');
      return;
    } else {
      p.watered = save.day;
      sfx.splash();
      w.puff('drop', c.x, c.y - 40, 6, 30);
      say('Podlane! Rośnij, rośnij!');
    }
    persist();
    this.render(i);
  }

  onKidClick(): boolean {
    return false;
  }

  /** Called when a day ends: watered plants grow one step. */
  static grow(day: number) {
    if (season(day) === 'zima') return;
    save.garden.forEach((p) => {
      if (p.plant && p.watered === day && p.stage < 3) p.stage++;
    });
  }
}
