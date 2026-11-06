import { Overlay } from './Overlay';
import { GAME_W, FONT, inkHex } from '../lib/layout';
import { bigButton } from '../lib/ui';
import Phaser from 'phaser';
import { save, persist, prompt, bus } from '../lib/state';
import { SHOP } from '../world/decor';
import { say } from '../lib/voice';
import { auntie } from '../lib/names';
import { stars } from '../lib/plural';

/** In-game menu: save and go back to the start screen, or keep playing. */
export class PauseScene extends Overlay {
  constructor() {
    super('Pause');
  }

  create() {
    this.background(0xfde9c9);
    this.heading('Przerwa', 170, 84);
    this.add.image(GAME_W / 2, 330, save.teacher).setDisplaySize(160, 160);
    this.add
      .text(GAME_W / 2, 450, `${auntie()}  ·  Dzień ${save.day}  ·  ⭐ ${save.stars}`, { fontFamily: FONT, fontSize: '40px', fontStyle: '800', color: inkHex })
      .setOrigin(0.5);
    prompt(`Gra jest zapisana: dzień ${save.day}, ${stars(save.stars)}. Po wczytaniu zaczniemy ten dzień od rana.`);
    // Wardrobe: outfits bought in the shop
    const owned = SHOP.filter((it) => it.outfit && save.outfits.includes(it.id));
    if (owned.length) {
      this.add.text(GAME_W / 2, 505, 'Szafa cioci:', { fontFamily: FONT, fontSize: '30px', fontStyle: '800', color: inkHex }).setOrigin(0.5);
      const opts = [null, ...owned];
      const rings: Phaser.GameObjects.Arc[] = [];
      opts.forEach((it, i) => {
        const x = GAME_W / 2 + (i - (opts.length - 1) / 2) * 95;
        const on = (it?.id ?? null) === save.outfit;
        const r = this.add.circle(x, 560, 38, 0xffffff).setStrokeStyle(6, 0xff7a6b, on ? 1 : 0);
        rings.push(r);
        const icon = it ? this.add.image(x, 560, it.key).setDisplaySize(52, 52) : this.add.text(x, 560, '✖', { fontSize: '30px', color: inkHex }).setOrigin(0.5);
        icon.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
          save.outfit = it?.id ?? null;
          persist();
          bus.emit('outfit');
          rings.forEach((rr, k) => rr.setStrokeStyle(6, 0xff7a6b, k === i ? 1 : 0));
          say(it ? it.name : 'Bez dodatków');
        });
      });
    }

    bigButton(this, GAME_W / 2 + 560, 330, '🎙️', () => this.scene.launch('Voice'), { w: 140, h: 110, color: 0x9fd3f5, speak: 'Nagraj głos rodzica' });

    bigButton(this, GAME_W / 2 - 300, 680, 'Graj dalej', () => this.close(null), { w: 500, color: 0x8fd9b6, speak: 'Graj dalej' });
    bigButton(this, GAME_W / 2 + 300, 680, 'Zapisz i wyjdź', () => {
      persist();
      this.close('quit');
    }, { w: 500, speak: 'Zapisz i wyjdź' });
  }
}
