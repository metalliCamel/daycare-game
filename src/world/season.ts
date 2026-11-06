import Phaser from 'phaser';
import type { WorldScene, Module } from '../scenes/WorldScene';
import { roomX, ROOM_W, WALL_H } from '../lib/rooms';
import { prop } from './draw';
import { season, type Season } from './progress';

/** Seasonal look of the playground: snow, falling leaves, spring flowers, summer sun. */
export class SeasonLook implements Module {
  readonly season: Season = season();

  constructor(private w: WorldScene) {
    const d = roomX('dwor');
    const tree = w.children.list.find((o) => o instanceof Phaser.GameObjects.Image && o.texture.key === 'tree') as Phaser.GameObjects.Image | undefined;
    switch (this.season) {
      case 'zima': {
        const snow = w.add.graphics().setDepth(-95);
        snow.fillStyle(0xf4f8ff, 1).fillRect(d, WALL_H, ROOM_W - 140, 900 - WALL_H);
        snow.fillStyle(0xffffff, 1);
        for (let x = d; x < d + ROOM_W - 140; x += 90) snow.fillEllipse(x + 45, WALL_H + 4, 110, 26);
        tree?.setTint(0xd9ecff);
        this.fall(0xffffff, 200);
        break;
      }
      case 'jesien':
        tree?.setTint(0xffa040);
        w.time.addEvent({
          delay: 500, loop: true,
          callback: () => {
            const leaf = w.add.image(d + Phaser.Math.Between(60, 460), 320, Math.random() < 0.5 ? 'leaf' : 'maple').setDisplaySize(40, 40).setDepth(2400);
            w.tweens.add({ targets: leaf, y: Phaser.Math.Between(620, 760), x: leaf.x + Phaser.Math.Between(-120, 120), angle: 360, duration: 4000, onComplete: () => leaf.destroy() });
          },
        });
        break;
      case 'wiosna':
        for (let i = 0; i < 9; i++) prop(w, i % 3 === 0 ? 'flower' : 'tulip', d + 700 + i * 90, 620 + (i % 2) * 20, 45, 600);
        break;
      case 'lato':
        for (let i = 0; i < 4; i++) prop(w, 'sunflower', d + 1080 + i * 110, 610, 80, 600);
        prop(w, 'butterfly', d + 680, 520, 50, 600);
        break;
    }
  }

  private fall(color: number, delay: number) {
    const w = this.w;
    const d = roomX('dwor');
    w.time.addEvent({
      delay, loop: true,
      callback: () => {
        const f = w.add.circle(d + Phaser.Math.Between(0, ROOM_W - 140), -10, Phaser.Math.Between(4, 8), color, 0.95).setDepth(2400);
        w.tweens.add({ targets: f, y: Phaser.Math.Between(600, 880), x: f.x + Phaser.Math.Between(-60, 60), duration: 3500, onComplete: () => f.destroy() });
      },
    });
  }

  onKidClick(): boolean {
    return false;
  }
}
