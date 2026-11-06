import Phaser from 'phaser';
import { Overlay } from './Overlay';
import { FONT, inkHex } from '../lib/layout';
import { prompt } from '../lib/state';
import { say } from '../lib/voice';
import { sfx } from '../lib/sound';
import { CLIPS, hasClip, playClip, deleteClip, recordClip, type ClipId } from '../lib/clips';

/** For a parent: record short messages the game plays at the right moments. */
export class VoiceScene extends Overlay {
  private rows: Phaser.GameObjects.Container[] = [];

  /** Opened on top of the break menu: closing just returns there (doesn't resume the game). */
  protected close() {
    if (this.closed) return;
    this.closed = true;
    this.scene.stop();
  }

  constructor() {
    super('Voice');
  }

  create() {
    this.background(0xeef6ff);
    this.heading('Głos rodzica', 70, 56);
    this.add.text(800, 140, 'Nagraj krótkie wiadomości (do 4 sekund). Gra odtworzy je rano, przy pochwałach i przed drzemką.', {
      fontFamily: FONT, fontSize: '28px', fontStyle: '700', color: inkHex, align: 'center', wordWrap: { width: 1100 },
    }).setOrigin(0.5);
    this.closeButton(null);
    prompt('Tu mama albo tata mogą nagrać swój głos.');
    this.render();
  }

  private render() {
    this.rows.forEach((r) => r.destroy());
    this.rows = CLIPS.map((c, i) => this.row(c.id, c.name, c.hint, 300 + i * 150));
  }

  private button(x: number, label: string, color: number, fn: () => void) {
    const t = this.add.text(x, 0, label, { fontFamily: FONT, fontSize: '30px', fontStyle: '800', color: '#ffffff', backgroundColor: Phaser.Display.Color.IntegerToColor(color).rgba, padding: { x: 20, y: 10 } })
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    t.on('pointerdown', () => {
      sfx.click();
      fn();
    });
    return t;
  }

  private row(id: ClipId, name: string, hint: string, y: number) {
    const has = hasClip(id);
    const c = this.add.container(0, y);
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1).fillRoundedRect(150, -60, 1300, 120, 30);
    c.add(g);
    c.add(this.add.text(200, -20, name, { fontFamily: FONT, fontSize: '36px', fontStyle: '800', color: inkHex }).setOrigin(0, 0.5));
    c.add(this.add.text(200, 25, hint, { fontFamily: FONT, fontSize: '24px', fontStyle: '700', color: '#7a6b8c' }).setOrigin(0, 0.5));
    const status = this.add.text(870, 0, has ? '✓ nagrane' : '', { fontFamily: FONT, fontSize: '28px', fontStyle: '800', color: '#2e9e4f' }).setOrigin(0.5);
    c.add(status);
    const rec = this.button(1060, '🎙️ Nagraj', 0xff7a6b, async () => {
      rec.disableInteractive();
      status.setText('3...').setColor('#e23b3b');
      say('Nagrywam!');
      await new Promise((r) => setTimeout(r, 900));
      const ok = await recordClip(id, (ms) => status.setText(`● ${Math.ceil(ms / 1000)}`));
      status.setText(ok ? '✓ nagrane' : 'Brak mikrofonu').setColor(ok ? '#2e9e4f' : '#e23b3b');
      if (!ok) say('Nie udało się nagrać. Sprawdź, czy przeglądarka ma dostęp do mikrofonu.');
      this.render();
    });
    c.add(rec);
    if (has) {
      c.add(this.button(1250, '▶', 0x4fa8ff, () => playClip(id)));
      c.add(this.button(1360, '🗑️', 0xa89cb5, () => {
        deleteClip(id);
        this.render();
      }));
    }
    return c;
  }
}
