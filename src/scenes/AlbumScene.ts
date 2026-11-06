import Phaser from 'phaser';
import { Overlay } from './Overlay';
import { GAME_W, FONT, inkHex } from '../lib/layout';
import { KIDS } from '../objects/Kid';
import { save, prompt } from '../lib/state';
import { say, sayHover } from '../lib/voice';
import { sfx } from '../lib/sound';
import { SECRETS, STICKERS, hearts } from '../world/progress';
import { trait, OUTSIDE_ICON } from '../world/traits';
import { PLAY } from '../world/playcorner';
import { FOOD_NAMES } from '../world/menu';
import type { EmojiKey } from '../lib/assets';

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
    prompt('Twoja grupa. Kliknij buzię, żeby poznać dziecko. Pomagaj dzieciom, a zdobędziesz serduszka i sekrety.');
    group.forEach((k, i) => {
      const x = 230 + (i % 4) * 380 - (i % 4) * 33;
      const y = 160 + Math.floor(i / 4) * 320;
      const h = hearts(k.id);
      const t = trait(k.id);
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 1).fillRoundedRect(x - 165, y - 50, 330, 300, 30);
      this.page.add(g);
      const face = this.add.image(x - 85, y + 25, k.key).setDisplaySize(100, 100).setInteractive({ useHandCursor: true });
      face.on('pointerdown', () => say(`${k.name}. ${t.about}`));
      this.page.add(face);
      this.page.add(this.add.text(x + 45, y + 5, k.name, { fontFamily: FONT, fontSize: '34px', fontStyle: '800', color: inkHex }).setOrigin(0.5));
      // 5 hearts, each worth 2 points
      for (let j = 0; j < 5; j++) {
        const full = h >= (j + 1) * 2;
        const half = !full && h >= j * 2 + 1;
        this.page.add(this.add.image(x - 5 + j * 34, y + 55, 'heart').setDisplaySize(30, 30).setAlpha(full ? 1 : half ? 0.55 : 0.15));
      }
      // Personality
      this.page.add(this.add.text(x, y + 112, t.about, { fontFamily: FONT, fontSize: '21px', fontStyle: '700', color: '#6b5a7e', align: 'center', wordWrap: { width: 300 } }).setOrigin(0.5));
      // What they like: favourite game, playground thing, two favourite foods
      this.page.add(this.add.text(x - 145, y + 168, 'Lubi:', { fontFamily: FONT, fontSize: '22px', fontStyle: '800', color: inkHex }).setOrigin(0, 0.5));
      const likes: { key: EmojiKey; name: string }[] = [
        { key: PLAY[t.play].icon, name: PLAY[t.play].name },
        { key: OUTSIDE_ICON[t.outside], name: { swing: 'huśtawka', slide: 'zjeżdżalnia', sand: 'piaskownica' }[t.outside] },
        ...k.likes.slice(0, 2).map((f) => ({ key: f, name: FOOD_NAMES[f]?.[0] ?? ({ cheese: 'ser', ham: 'szynka', lettuce: 'sałata', egg: 'jajko', cucumber: 'ogórek' } as Record<string, string>)[f] ?? '' })),
      ];
      likes.forEach((l, j) => {
        const ic = this.add.image(x - 55 + j * 58, y + 168, l.key).setDisplaySize(48, 48).setInteractive({ useHandCursor: true });
        ic.on('pointerdown', () => say(`${k.name} lubi: ${l.name}.`));
        ic.on('pointerover', () => sayHover(l.name));
        this.page.add(ic);
      });
      // Two secrets, unlocked at 5 and 10 points
      SECRETS[k.id].forEach((secret, s) => {
        const open = h >= (s + 1) * 5;
        const b = this.add.text(x - 70 + s * 140, y + 222, open ? '💬 Sekret' : '🔒', { fontFamily: FONT, fontSize: '26px', fontStyle: '800', color: open ? '#ff7a6b' : '#a89cb5' })
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
