import Phaser from 'phaser';
import { GAME_W, COLORS, FONT, inkHex } from '../lib/layout';
import { bigButton, title } from '../lib/ui';
import { say } from '../lib/voice';

type Activity = { emoji: string; label: string; speak: string; color: number; ready: boolean };

// The parts of a daycare day. Each becomes a minigame in later phases.
const ACTIVITIES: Activity[] = [
  { emoji: '👋', label: 'Powitanie', speak: 'Powitanie dzieci', color: COLORS.sun, ready: false },
  { emoji: '🌡️', label: 'Zdrowie', speak: 'Czy dzieci są zdrowe?', color: COLORS.sky, ready: false },
  { emoji: '🥪', label: 'Kuchnia', speak: 'Kuchnia. Robimy jedzenie!', color: COLORS.coral, ready: false },
  { emoji: '🧽', label: 'Sprzątanie', speak: 'Sprzątanie', color: COLORS.mint, ready: false },
  { emoji: '🎨', label: 'Zabawy', speak: 'Zabawy i zadania', color: COLORS.peach, ready: false },
  { emoji: '🛝', label: 'Na dworze', speak: 'Idziemy na dwór', color: COLORS.mint, ready: false },
  { emoji: '😴', label: 'Drzemka', speak: 'Czas na drzemkę', color: COLORS.sky, ready: false },
  { emoji: '🚗', label: 'Do domu', speak: 'Rodzice odbierają dzieci', color: COLORS.sun, ready: false },
];

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    title(this, GAME_W / 2, 90, 'Co dziś robimy?', 80);
    say('Co dziś robimy?');

    const cols = 4, tw = 320, th = 280, gap = 40;
    const startX = GAME_W / 2 - ((cols - 1) * (tw + gap)) / 2;

    ACTIVITIES.forEach((a, i) => {
      const x = startX + (i % cols) * (tw + gap);
      const y = 320 + Math.floor(i / cols) * (th + gap);

      const bg = this.add.graphics();
      bg.fillStyle(a.color, 1).fillRoundedRect(-tw / 2, -th / 2, tw, th, 36);
      const icon = this.add.text(0, -40, a.emoji, { fontSize: '110px' }).setOrigin(0.5);
      const label = this.add
        .text(0, 85, a.label, { fontFamily: FONT, fontSize: '44px', fontStyle: '800', color: inkHex })
        .setOrigin(0.5);
      const tile = this.add.container(x, y, [bg, icon, label]).setSize(tw, th).setInteractive({ useHandCursor: true });

      if (!a.ready) {
        const lock = this.add.text(tw / 2 - 40, -th / 2 + 40, '🔒', { fontSize: '40px' }).setOrigin(0.5);
        tile.add(lock);
      }

      tile.on('pointerover', () => {
        this.tweens.add({ targets: tile, scale: 1.06, duration: 150, ease: 'Back.out' });
        say(a.speak);
      });
      tile.on('pointerout', () => this.tweens.add({ targets: tile, scale: 1, duration: 150 }));
      tile.on('pointerdown', () => {
        if (!a.ready) {
          this.tweens.add({ targets: tile, angle: { from: -4, to: 4 }, duration: 70, yoyo: true, repeat: 2, onComplete: () => tile.setAngle(0) });
          say('Już wkrótce!');
        }
      });
    });

    bigButton(this, 110, 90, '⬅', () => this.scene.start('Title'), { w: 160, h: 100, color: COLORS.ink, speak: 'Wróć' });
  }
}
