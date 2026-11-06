import Phaser from 'phaser';
import type { WorldScene } from '../scenes/WorldScene';
import { roomX, type RoomId } from '../lib/rooms';
import { prop } from './draw';
import { save } from '../lib/state';
import type { EmojiKey } from '../lib/assets';

export type DecorItem = { id: string; key: EmojiKey; name: string; price: number; room: RoomId; x: number; y: number; size: number; wall?: boolean };

/** Things Hania can buy with stars. Each has a fixed spot in a room. */
export const SHOP: DecorItem[] = [
  { id: 'plant1', key: 'plant', name: 'Kwiatek', price: 15, room: 'sala', x: 960, y: 650, size: 160 },
  { id: 'balloon', key: 'balloon', name: 'Balonik', price: 15, room: 'jadalnia', x: 140, y: 420, size: 120, wall: true },
  { id: 'rainbow', key: 'rainbow', name: 'Tęcza', price: 25, room: 'sypialnia', x: 300, y: 300, size: 200, wall: true },
  { id: 'train', key: 'train', name: 'Pociąg', price: 30, room: 'sala', x: 1000, y: 860, size: 120 },
  { id: 'lamp', key: 'lamp', name: 'Lampka', price: 30, room: 'sypialnia', x: 1050, y: 420, size: 100, wall: true },
  { id: 'dino', key: 'dino', name: 'Dinozaur', price: 40, room: 'sala', x: 200, y: 860, size: 150 },
  { id: 'fish', key: 'fish', name: 'Akwarium', price: 50, room: 'szatnia', x: 1450, y: 470, size: 110, wall: true },
  { id: 'unicorn', key: 'unicorn', name: 'Jednorożec', price: 50, room: 'sypialnia', x: 1500, y: 860, size: 150 },
  { id: 'piano', key: 'piano', name: 'Pianinko', price: 60, room: 'sala', x: 1500, y: 560, size: 150, wall: true },
  { id: 'rocket', key: 'rocket', name: 'Rakieta', price: 80, room: 'dwor', x: 1540, y: 700, size: 160 },
];

export class Decor {
  private placed = new Map<string, Phaser.GameObjects.GameObject>();

  constructor(private w: WorldScene) {
    save.decor.forEach((id) => this.place(id, false));
    w.listen('decor-bought', (id: string) => this.place(id, true));
  }

  private place(id: string, animate: boolean) {
    const item = SHOP.find((s) => s.id === id);
    if (!item || this.placed.has(id)) return;
    const x = roomX(item.room) + item.x;
    const w = this.w;
    let obj: Phaser.GameObjects.GameObject;
    if (item.id === 'fish') {
      // Draw a little tank around the fish
      const c = w.add.container(x, item.y - 60).setDepth(-50);
      const g = w.add.graphics();
      g.fillStyle(0xbfe6ff, 0.9).fillRoundedRect(-90, -60, 180, 120, 14);
      g.lineStyle(6, 0xffffff, 1).strokeRoundedRect(-90, -60, 180, 120, 14);
      g.fillStyle(0xb5835a, 1).fillRect(-100, 60, 200, 14);
      const fish = w.add.image(0, 0, 'fish').setDisplaySize(item.size * 0.7, item.size * 0.7);
      c.add([g, fish]);
      w.tweens.add({ targets: fish, x: 40, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.inOut', onYoyo: () => fish.setFlipX(!fish.flipX), onRepeat: () => fish.setFlipX(!fish.flipX) });
      obj = c;
    } else {
      const img = prop(w, item.key, x, item.y, item.size, item.wall ? -50 : item.y);
      if (item.id === 'balloon') w.tweens.add({ targets: img, y: img.y - 15, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      obj = img;
    }
    if (animate && 'setScale' in obj) {
      const o = obj as unknown as Phaser.GameObjects.Components.Transform;
      const sx = o.scaleX, sy = o.scaleY;
      o.setScale(0);
      w.tweens.add({ targets: obj, scaleX: sx, scaleY: sy, duration: 500, ease: 'Back.out' });
    }
    this.placed.set(id, obj);
  }
}
