import Phaser from 'phaser';
import { Overlay } from './Overlay';
import { GAME_W, FONT, inkHex } from '../lib/layout';
import { KIDS } from '../objects/Kid';
import { save, prompt } from '../lib/state';
import { say, sayHover } from '../lib/voice';
import { sfx } from '../lib/sound';
import { SECRETS, STICKERS, hearts } from '../world/progress';

/** "Mój album": the group with friendship hearts and secrets, and collected stickers. */
export class AlbumScene extends Overlay {
  private page!: Phaser.GameObjects.Container;

  constructor() {
    super('Album');
  }

  create() {
    this.background(0xfdf1dc);
    this.closeButton(null);
    this.page = this.add.container(0, 0);
    const tab = (x: number, label: string, fn: () => void) => {
      const b = this.add.text(x, 70, label, { fontFamily: FONT, fontSize: '44px', fontStyle: '800', color: inkHex, backgroundColor: '#ffffff', padding: { x: 24, y: 8 } })
        .setOrigin(0.5).setInteractive({ useHandCursor: true });
      b.on('pointerdown', () => {
        sfx.click();
        fn();
      });
      b.on('pointerover', () => sayHover(label));
      return b;
    };
    tab(GAME_W / 2 - 180, 'Dzieci', () => this.kids());
    tab(GAME_W / 2 + 180, 'Naklejki', () => this.stickers());
    this.kids();
  }

  private kids() {
    this.page.removeAll(true);
    const group = KIDS.filter((k) => save.group.includes(k.id));
    prompt('Twoja grupa. Pomagaj dzieciom, a zdobędziesz serduszka i poznasz ich sekrety.');
    group.forEach((k, i) => {
      const x = 230 + (i % 4) * 340;
      const y = 280 + Math.floor(i / 4) * 300;
      const h = hearts(k.id);
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 1).fillRoundedRect(x - 160, y - 120, 320, 270, 30);
      this.page.add(g);
      this.page.add(this.add.image(x - 80, y - 40, k.key).setDisplaySize(110, 110));
      this.page.add(this.add.text(x + 50, y - 60, k.name, { fontFamily: FONT, fontSize: '36px', fontStyle: '800', color: inkHex }).setOrigin(0.5));
      // 5 hearts, each worth 2 points
      for (let j = 0; j < 5; j++) {
        const full = h >= (j + 1) * 2;
        const half = !full && h >= j * 2 + 1;
        this.page.add(this.add.image(x - 110 + j * 55, y + 40, 'heart').setDisplaySize(44, 44).setAlpha(full ? 1 : half ? 0.55 : 0.15));
      }
      // Two secrets, unlocked at 5 and 10 points
      SECRETS[k.id].forEach((secret, s) => {
        const open = h >= (s + 1) * 5;
        const b = this.add.text(x - 70 + s * 140, y + 105, open ? '💬 Sekret' : '🔒', { fontFamily: FONT, fontSize: '28px', fontStyle: '800', color: open ? '#ff7a6b' : '#a89cb5' })
          .setOrigin(0.5).setInteractive({ useHandCursor: open });
        b.on('pointerdown', () => (open ? say(`${k.name}: ${secret}`) : say(`Pomagaj dziecku, a poznasz sekret ${k.gen}.`)));
        this.page.add(b);
      });
    });
  }

  private stickers() {
    this.page.removeAll(true);
    const got = save.stickers.length;
    prompt(`Masz ${got} z ${STICKERS.length} naklejek!`);
    STICKERS.forEach((st, i) => {
      const x = 200 + (i % 6) * 240;
      const y = 230 + Math.floor(i / 6) * 180;
      const has = save.stickers.includes(st.id);
      this.page.add(this.add.circle(x, y, 62, has ? 0xffe9a8 : 0xe8e2ee).setStrokeStyle(6, has ? 0xffd45c : 0xd0c8da));
      if (has) this.page.add(this.add.image(x, y, st.icon).setDisplaySize(80, 80));
      else this.page.add(this.add.text(x, y, '?', { fontFamily: FONT, fontSize: '56px', fontStyle: '800', color: '#b9aec6' }).setOrigin(0.5));
      const t = this.add.text(x, y + 82, has ? st.name : '???', { fontFamily: FONT, fontSize: '22px', fontStyle: '700', color: inkHex, align: 'center', wordWrap: { width: 220 } }).setOrigin(0.5, 0);
      this.page.add(t);
      const z = this.add.zone(x, y, 130, 130).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => say(has ? st.name : 'Tej naklejki jeszcze nie masz.'));
      this.page.add(z);
    });
  }
}
