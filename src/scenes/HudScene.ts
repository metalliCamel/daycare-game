import Phaser from 'phaser';
import { GAME_W, GAME_H, FONT, inkHex } from '../lib/layout';
import { ROOMS } from '../lib/rooms';
import { bus, state, save, persist } from '../lib/state';
import { setMusic, isMusicOn, playDayMusic, sfx } from '../lib/sound';
import { say, sayHover } from '../lib/voice';

function clockText(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.floor(min % 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

export class HudScene extends Phaser.Scene {
  private stars!: Phaser.GameObjects.Text;
  private clock!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Container;
  private bannerText!: Phaser.GameObjects.Text;
  private promptBox!: Phaser.GameObjects.Container;
  private promptText!: Phaser.GameObjects.Text;
  private lastPrompt = '';
  private map!: Phaser.GameObjects.Container;
  private shopBtn!: { g: Phaser.GameObjects.Graphics; t: Phaser.GameObjects.Text; z: Phaser.GameObjects.Zone };
  private musicBtn!: { g: Phaser.GameObjects.Graphics; t: Phaser.GameObjects.Text; z: Phaser.GameObjects.Zone };
  private mapButtons: { bg: Phaser.GameObjects.Graphics; dot: Phaser.GameObjects.Arc; x: number }[] = [];

  constructor() {
    super('Hud');
  }

  create() {
    // Stars (top-left)
    const sb = this.add.graphics();
    sb.fillStyle(0xffffff, 0.92).fillRoundedRect(20, 20, 220, 90, 40);
    this.add.image(75, 65, 'star').setDisplaySize(70, 70);
    this.stars = this.add.text(125, 65, `${save.stars}`, { fontFamily: FONT, fontSize: '56px', fontStyle: '800', color: inkHex }).setOrigin(0, 0.5);

    // Shop and music buttons next to the stars
    const mkBtn = (x: number, label: string, speak: string, onClick: () => void) => {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 0.92).fillCircle(x, 65, 45);
      const t = this.add.text(x, 65, label, { fontSize: '46px' }).setOrigin(0.5);
      const z = this.add.zone(x, 65, 90, 90).setInteractive({ useHandCursor: true });
      z.on('pointerover', () => sayHover(speak));
      z.on('pointerdown', () => {
        sfx.click();
        onClick();
      });
      return { g, t, z };
    };
    this.shopBtn = mkBtn(300, '🛍️', 'Sklepik', () => bus.emit('open-shop'));
    const music = (this.musicBtn = mkBtn(400, isMusicOn() ? '🎵' : '🔇', 'Muzyka', () => {
      const on = !isMusicOn();
      setMusic(on);
      save.music = on;
      persist();
      music.t.setText(on ? '🎵' : '🔇');
      if (on) playDayMusic();
    }));

    // Clock (top-right)
    const cb = this.add.graphics();
    cb.fillStyle(0xffffff, 0.92).fillRoundedRect(GAME_W - 240, 20, 220, 90, 40);
    this.clock = this.add.text(GAME_W - 130, 65, clockText(state.minutes), { fontFamily: FONT, fontSize: '56px', fontStyle: '800', color: inkHex }).setOrigin(0.5);
    const clockHit = this.add.zone(GAME_W - 130, 65, 220, 90).setInteractive({ useHandCursor: true });
    clockHit.on('pointerdown', () => say(`Jest godzina ${clockText(state.minutes).replace(':', ' ')}.`));

    // Room banner (fades in when entering a room)
    const bg = this.add.graphics();
    bg.fillStyle(0x4a3a5c, 0.85).fillRoundedRect(-260, -55, 520, 110, 55);
    this.bannerText = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '60px', fontStyle: '800', color: '#ffffff' }).setOrigin(0.5);
    this.banner = this.add.container(GAME_W / 2, 200, [bg, this.bannerText]).setAlpha(0);

    // Prompt bubble (bottom) — click to hear it again
    const pb = this.add.graphics();
    pb.fillStyle(0xffffff, 0.95).fillRoundedRect(-500, -50, 1000, 100, 40);
    pb.lineStyle(5, 0xff7a6b, 1).strokeRoundedRect(-500, -50, 1000, 100, 40);
    const speaker = this.add.text(-450, 0, '🔊', { fontSize: '44px' }).setOrigin(0.5);
    this.promptText = this.add
      .text(-400, 0, '', { fontFamily: FONT, fontSize: '34px', fontStyle: '700', color: inkHex, wordWrap: { width: 880 } })
      .setOrigin(0, 0.5);
    this.promptBox = this.add.container(530, GAME_H - 70, [pb, speaker, this.promptText]).setAlpha(0);
    this.promptBox.setSize(1000, 100).setInteractive({ useHandCursor: true });
    this.promptBox.on('pointerdown', () => say(this.lastPrompt));

    // Room map (bottom-right): click a room to walk there
    const n = ROOMS.length;
    const size = 64;
    const mx = GAME_W - 30 - n * (size + 8);
    const my = GAME_H - 160;
    this.map = this.add.container(0, 0);
    const panel = this.add.graphics();
    this.map.add(panel);
    panel.fillStyle(0xffffff, 0.85).fillRoundedRect(mx - 14, my - 14, n * (size + 8) + 20, size + 28, 24);
    ROOMS.forEach((room, i) => {
      const x = mx + i * (size + 8);
      const b = this.add.graphics();
      const icon = this.add.image(x + size / 2, my + size / 2, room.icon).setDisplaySize(48, 48);
      const dot = this.add.circle(x + size - 6, my + 6, 12, 0xff4d4d).setStrokeStyle(3, 0xffffff).setVisible(false);
      this.tweens.add({ targets: dot, scale: 1.3, duration: 500, yoyo: true, repeat: -1 });
      const hit = this.add.zone(x + size / 2, my + size / 2, size, size).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => bus.emit('goto', i));
      hit.on('pointerover', () => sayHover(room.speak));
      this.mapButtons.push({ bg: b, dot, x });
      this.map.add([b, icon, dot, hit]);
    });
    this.drawMap(-1);

    const onStars = (s: number) => {
      this.stars.setText(`${s}`);
      this.tweens.add({ targets: this.stars, scale: 1.3, duration: 120, yoyo: true });
    };
    const onClock = (m: number) => this.clock.setText(clockText(m));
    const onRoom = (i: number) => {
      this.drawMap(i);
      this.bannerText.setText(ROOMS[i].name);
      this.tweens.killTweensOf(this.banner);
      this.banner.setAlpha(1);
      this.tweens.add({ targets: this.banner, alpha: 0, delay: 1300, duration: 500 });
    };
    const onNeeds = (rooms: number[]) => this.mapButtons.forEach((b, i) => b.dot.setVisible(rooms.includes(i)));
    const onPrompt = (t: string) => {
      this.lastPrompt = t;
      this.promptText.setText(t);
      this.tweens.killTweensOf(this.promptBox);
      this.promptBox.setAlpha(1).setScale(0.95);
      this.tweens.add({ targets: this.promptBox, scale: 1, duration: 200, ease: 'Back.out' });
      this.tweens.add({ targets: this.promptBox, alpha: 0, delay: 9000, duration: 600 });
      say(t);
    };

    const onMinigame = (on: boolean) => {
      this.map.setVisible(!on);
      for (const b of [this.shopBtn, this.musicBtn]) {
        b.g.setVisible(!on);
        b.t.setVisible(!on);
        if (b.z.input) b.z.input.enabled = !on;
      }
    };
    bus.on('minigame', onMinigame);
    bus.on('stars', onStars);
    bus.on('clock', onClock);
    bus.on('room', onRoom);
    bus.on('needs', onNeeds);
    bus.on('prompt', onPrompt);
    this.events.once('shutdown', () => {
      bus.off('minigame', onMinigame);
      bus.off('stars', onStars);
      bus.off('clock', onClock);
      bus.off('room', onRoom);
      bus.off('needs', onNeeds);
      bus.off('prompt', onPrompt);
    });
  }

  private drawMap(current: number) {
    const size = 64;
    const my = GAME_H - 160;
    this.mapButtons.forEach((b, i) => {
      b.bg.clear();
      b.bg.fillStyle(i === current ? 0xffd45c : ROOMS[i].wall, 1).fillRoundedRect(b.x, my, size, size, 16);
      if (i === current) b.bg.lineStyle(4, 0x4a3a5c, 1).strokeRoundedRect(b.x, my, size, size, 16);
    });
  }
}
