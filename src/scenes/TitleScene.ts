import Phaser from 'phaser';
import { GAME_W, GAME_H, COLORS, FONT, inkHex } from '../lib/layout';
import { bigButton, title } from '../lib/ui';
import { say, sayHover } from '../lib/voice';
import { save, persist } from '../lib/state';
import { listSlots, loadSlot, deleteSlot, SLOT_COUNT, type SaveData } from '../lib/save';
import { unlockAudio, setMusic, sfx } from '../lib/sound';
import { stars } from '../lib/plural';
import { auntieIns, auntieVoc } from '../lib/names';

const TEACHERS = ['teacher_1', 'teacher_2', 'teacher_3', 'teacher_4', 'teacher_5', 'teacher_6'];

/** Start screen: new game / load game → choose a save slot → name and look of the teacher. */
export class TitleScene extends Phaser.Scene {
  private ui!: Phaser.GameObjects.Container;
  private building!: Phaser.GameObjects.Container;
  private nameInput: Phaser.GameObjects.DOMElement | null = null;

  constructor() {
    super('Title');
  }

  create() {
    const g = this.add.graphics();
    g.fillStyle(COLORS.sky, 1).fillRect(0, 0, GAME_W, GAME_H * 0.7);
    g.fillStyle(COLORS.mint, 1).fillRect(0, GAME_H * 0.7, GAME_W, GAME_H * 0.3);
    const sun = this.add.circle(1430, 120, 70, COLORS.sun);
    this.tweens.add({ targets: sun, scale: 1.08, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    [[200, 120], [650, 70]].forEach(([x, y], i) => {
      const cloud = this.add.container(x, y, [
        this.add.circle(0, 0, 45, 0xffffff),
        this.add.circle(50, -15, 55, 0xffffff),
        this.add.circle(105, 0, 42, 0xffffff),
      ]);
      this.tweens.add({ targets: cloud, x: x + 80, duration: 6000 + i * 1500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    });

    // The daycare building with kids at the windows
    const b = this.add.graphics();
    const bx = 1000, by = 300, bw = 460, bh = 330;
    b.fillStyle(COLORS.peach, 1).fillRect(bx, by, bw, bh);
    b.fillStyle(COLORS.coral, 1).fillTriangle(bx - 40, by, bx + bw + 40, by, bx + bw / 2, by - 170);
    b.fillStyle(0xffffff, 1).fillRoundedRect(bx + 50, by + 50, 130, 110, 14).fillRoundedRect(bx + 280, by + 50, 130, 110, 14);
    b.fillStyle(COLORS.ink, 1).fillRoundedRect(bx + 180, by + 180, 100, 150, { tl: 50, tr: 50, bl: 0, br: 0 });
    const kids = ['kid_zosia', 'kid_antek'].map((k, i) => {
      const kid = this.add.image(bx + 115 + i * 230, by + 115, k).setDisplaySize(100, 100);
      this.tweens.add({ targets: kid, y: kid.y - 10, duration: 600 + i * 200, yoyo: true, repeat: -1 });
      return kid;
    });
    this.building = this.add.container(0, 0, [b, ...kids]);

    this.ui = this.add.container(0, 0);
    this.input.once('pointerdown', () => {
      unlockAudio();
      say('Cześć Haniu! Zagrajmy w przedszkole.');
    });
    this.showMain();
  }

  private clear() {
    this.ui.removeAll(true);
    this.nameInput?.destroy();
    this.nameInput = null;
  }

  private back(to: () => void) {
    const b = bigButton(this, 110, 90, '⬅', to, { w: 150, h: 100, color: COLORS.ink, speak: 'Wróć' });
    this.ui.add(b);
  }

  // ---------- Main menu ----------

  private showMain() {
    this.clear();
    this.building.setVisible(true);
    this.ui.add(title(this, 480, 210, 'Przedszkole\nHani', 120));
    const hasSaves = listSlots().some(Boolean);
    if (hasSaves) {
      this.ui.add(bigButton(this, 480, 470, 'Wczytaj grę', () => this.showSlots('load'), { w: 520, color: COLORS.mint, speak: 'Wczytaj grę' }));
      this.ui.add(bigButton(this, 480, 640, 'Nowa gra', () => this.showSlots('new'), { w: 520, speak: 'Nowa gra' }));
    } else {
      this.ui.add(bigButton(this, 480, 560, 'Nowa gra', () => this.showSlots('new'), { w: 520, speak: 'Nowa gra' }));
    }
  }

  // ---------- Save slots ----------

  private showSlots(mode: 'new' | 'load') {
    this.clear();
    this.building.setVisible(false);
    this.back(() => this.showMain());
    this.ui.add(title(this, GAME_W / 2, 110, mode === 'new' ? 'Gdzie zapisać nową grę?' : 'Którą grę wczytać?', 64));
    const slots = listSlots();
    for (let i = 0; i < SLOT_COUNT; i++) {
      const data = slots[i];
      const x = GAME_W / 2 + (i - 1) * 440;
      const card = this.slotCard(x, 450, i, data, mode);
      this.ui.add(card);
      if (data) this.ui.add(this.deleteButton(x, 450 + 260, i, mode));
    }
    say(mode === 'new' ? 'Wybierz miejsce na nową grę.' : 'Wybierz grę.');
  }

  private slotCard(x: number, y: number, i: number, data: SaveData | null, mode: 'new' | 'load') {
    const w = 380, h = 420;
    const disabled = mode === 'load' && !data;
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.12).fillRoundedRect(-w / 2, -h / 2 + 10, w, h, 40);
    g.fillStyle(disabled ? 0xeeeeee : 0xffffff, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 40);
    g.lineStyle(6, 0xff7a6b, disabled ? 0.2 : 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 40);
    const parts: Phaser.GameObjects.GameObject[] = [g];
    parts.push(this.add.text(0, -h / 2 + 45, `Gra ${i + 1}`, { fontFamily: FONT, fontSize: '40px', fontStyle: '800', color: inkHex }).setOrigin(0.5));
    let speak = `Gra ${i + 1}. Puste miejsce.`;
    if (data) {
      const name = data.teacherName ? `Ciocia ${data.teacherName}` : 'Ciocia';
      parts.push(this.add.image(0, -40, data.teacher).setDisplaySize(150, 150));
      parts.push(this.add.text(0, 65, name, { fontFamily: FONT, fontSize: '36px', fontStyle: '800', color: inkHex }).setOrigin(0.5));
      parts.push(this.add.text(0, 115, `Dzień ${data.day}  ·  ⭐ ${data.stars}`, { fontFamily: FONT, fontSize: '32px', fontStyle: '700', color: inkHex }).setOrigin(0.5));
      speak = `${name}. Dzień ${data.day}. ${stars(data.stars)}.`;
    } else {
      parts.push(this.add.text(0, 20, 'Puste\nmiejsce', { fontFamily: FONT, fontSize: '40px', fontStyle: '700', color: '#a89cb5', align: 'center' }).setOrigin(0.5));
    }
    const c = this.add.container(x, y, parts).setSize(w, h);
    if (disabled) return c;
    c.setInteractive({ useHandCursor: true });
    c.on('pointerover', () => {
      this.tweens.add({ targets: c, scale: 1.04, duration: 120 });
      sayHover(speak);
    });
    c.on('pointerout', () => this.tweens.add({ targets: c, scale: 1, duration: 120 }));

    let confirm = false;
    c.on('pointerdown', () => {
      sfx.click();
      if (mode === 'load') {
        loadSlot(i, save);
        this.startGame();
        return;
      }
      if (data && !confirm) {
        // Overwriting needs a second click, so a saved game isn't lost by accident
        confirm = true;
        const warn = this.add.text(0, h / 2 - 50, 'Kliknij jeszcze raz,\nżeby zacząć od nowa', { fontFamily: FONT, fontSize: '26px', fontStyle: '800', color: '#e23b3b', align: 'center' }).setOrigin(0.5);
        c.add(warn);
        say('Tu jest już zapisana gra. Kliknij jeszcze raz, żeby zacząć od nowa.');
        return;
      }
      loadSlot(i, save, true);
      this.showSetup();
    });
    return c;
  }

  /** Trash button under a saved game. Needs a second click to really delete. */
  private deleteButton(x: number, y: number, i: number, mode: 'new' | 'load') {
    const bg = this.add.graphics();
    const label = this.add.text(0, 0, '🗑️ Usuń', { fontFamily: FONT, fontSize: '32px', fontStyle: '800', color: inkHex }).setOrigin(0.5);
    const draw = (danger: boolean) => {
      bg.clear();
      bg.fillStyle(danger ? 0xff5d5d : 0xffffff, 1).fillRoundedRect(-120, -34, 240, 68, 34);
      bg.lineStyle(4, danger ? 0xffffff : 0x4a3a5c, danger ? 1 : 0.25).strokeRoundedRect(-120, -34, 240, 68, 34);
      label.setText(danger ? 'Na pewno?' : '🗑️ Usuń').setColor(danger ? '#ffffff' : inkHex);
    };
    draw(false);
    const c = this.add.container(x, y, [bg, label]).setSize(240, 68).setInteractive({ useHandCursor: true });
    let armed = false;
    let timer: Phaser.Time.TimerEvent | null = null;
    c.on('pointerover', () => sayHover(armed ? 'Kliknij jeszcze raz, żeby usunąć.' : `Usuń grę ${i + 1}`));
    c.on('pointerdown', () => {
      if (!armed) {
        armed = true;
        draw(true);
        sfx.wrong();
        say(`Czy na pewno usunąć grę ${i + 1}? Kliknij jeszcze raz.`);
        // Change of mind: the button calms down again after a few seconds
        timer = this.time.delayedCall(4000, () => {
          armed = false;
          draw(false);
        });
        return;
      }
      timer?.remove();
      deleteSlot(i);
      sfx.whoosh();
      say(`Gra ${i + 1} usunięta.`);
      if (mode === 'load' && !listSlots().some(Boolean)) this.showMain();
      else this.showSlots(mode);
    });
    return c;
  }

  // ---------- New game: name + look ----------

  private showSetup() {
    this.clear();
    this.building.setVisible(true);
    this.back(() => this.showSlots('new'));
    this.ui.add(title(this, 480, 150, 'Jak masz na imię,\nciociu?', 64));
    say('Jak masz na imię, ciociu? Wpisz swoje imię.');

    // A real text box (HTML) so the name can be typed on the keyboard
    const input = this.add.dom(560, 300).createFromHTML(
      `<input type="text" maxlength="14" placeholder="np. Patrycja" value="${save.teacherName.replace(/"/g, '')}"
        style="width:400px;font:800 44px 'Baloo 2','Comic Sans MS',sans-serif;color:${inkHex};text-align:center;
        padding:14px 20px;border:6px solid #ff7a6b;border-radius:40px;outline:none;background:#fff;">`,
    );
    this.nameInput = input;
    const box = input.node.querySelector('input') as HTMLInputElement;
    this.ui.add(this.add.text(220, 300, 'Ciocia', { fontFamily: FONT, fontSize: '48px', fontStyle: '800', color: inkHex }).setOrigin(0.5));
    setTimeout(() => box.focus(), 50);
    box.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') this.finishSetup(box);
    });

    // Choose how the teacher looks
    this.ui.add(this.add.text(480, 430, 'Wybierz wygląd:', { fontFamily: FONT, fontSize: '38px', fontStyle: '800', color: inkHex }).setOrigin(0.5));
    const rings: Phaser.GameObjects.Arc[] = [];
    TEACHERS.forEach((key, i) => {
      const x = 480 + (i - 2.5) * 115;
      const ring = this.add.circle(x, 520, 52, 0xffffff, 1).setStrokeStyle(8, 0xff7a6b, key === save.teacher ? 1 : 0);
      rings.push(ring);
      const img = this.add.image(x, 520, key).setDisplaySize(90, 90).setInteractive({ useHandCursor: true });
      img.on('pointerdown', () => {
        save.teacher = key;
        sfx.pop();
        rings.forEach((r, k) => r.setStrokeStyle(8, 0xff7a6b, k === i ? 1 : 0));
        say('To ty!');
      });
      this.ui.add([ring, img]);
    });

    this.ui.add(bigButton(this, 480, 700, 'Graj!', () => this.finishSetup(box), { speak: 'Graj!' }));
  }

  private finishSetup(box: HTMLInputElement) {
    const raw = box.value.trim().replace(/\s+/g, ' ');
    save.teacherName = raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : '';
    persist();
    this.startGame();
  }

  private startGame() {
    unlockAudio();
    setMusic(save.music);
    this.clear();
    say(`Dzisiaj jesteś ${auntieIns()}! Witaj w przedszkolu, ${auntieVoc()}!`);
    this.scene.start('World');
    this.scene.launch('Hud');
  }
}
