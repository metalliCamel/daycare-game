import Phaser from 'phaser';
import { ROOMS, ROOM_W, WALL_H, type RoomId } from '../lib/rooms';
import type { EmojiKey } from '../lib/assets';

const H = 900;

function darken(c: number, f = 0.85) {
  const col = Phaser.Display.Color.IntegerToColor(c);
  return Phaser.Display.Color.GetColor(col.red * f, col.green * f, col.blue * f);
}

/** Place a decorative emoji standing on the floor (origin at its base). */
export function prop(scene: Phaser.Scene, key: EmojiKey, x: number, y: number, size: number, depth = y) {
  return scene.add.image(x, y, key).setOrigin(0.5, 0.92).setDisplaySize(size, size).setDepth(depth);
}

/** Paints walls, floors, doorways and fixed furniture for every room. */
export function drawBuilding(scene: Phaser.Scene) {
  const g = scene.add.graphics().setDepth(-100);

  ROOMS.forEach((room, i) => {
    const x0 = i * ROOM_W;
    g.fillStyle(room.wall, 1).fillRect(x0, 0, ROOM_W, WALL_H);
    g.fillStyle(room.floor, 1).fillRect(x0, WALL_H, ROOM_W, H - WALL_H);

    if (room.id !== 'dwor') {
      // Floorboards / tiles
      g.lineStyle(3, darken(room.floor, 0.9), 1);
      const tile = room.id === 'lazienka' || room.id === 'kuchnia' ? 110 : 0;
      if (tile) {
        for (let x = x0; x < x0 + ROOM_W; x += tile) g.lineBetween(x, WALL_H, x, H);
        for (let y = WALL_H; y < H; y += tile / 2) g.lineBetween(x0, y, x0 + ROOM_W, y);
      } else {
        for (let y = WALL_H + 50; y < H; y += 60) g.lineBetween(x0, y, x0 + ROOM_W, y);
      }
      // Skirting board
      g.fillStyle(0xffffff, 0.8).fillRect(x0, WALL_H - 18, ROOM_W, 18);
      // Wallpaper stripes
      g.fillStyle(darken(room.wall, 0.96), 1);
      for (let x = x0 + 40; x < x0 + ROOM_W; x += 120) g.fillRect(x, 0, 40, WALL_H - 18);
    }

    // Doorway on the left wall of every room except the first
    if (i > 0) {
      g.fillStyle(0xffffff, 1).fillRect(x0 - 120, 180, 240, WALL_H - 180);
      g.fillStyle(darken(room.wall, 0.7), 1).fillRoundedRect(x0 - 95, 205, 190, WALL_H - 205, { tl: 90, tr: 90, bl: 0, br: 0 });
    }
  });

  decorate(scene, g);
}

function x0(id: RoomId) {
  return ROOMS.findIndex((r) => r.id === id) * ROOM_W;
}

function windowAt(g: Phaser.GameObjects.Graphics, x: number, y: number, w = 220, h = 170, night = false) {
  g.fillStyle(0xffffff, 1).fillRoundedRect(x - 12, y - 12, w + 24, h + 24, 18);
  g.fillStyle(night ? 0x3b3f7a : 0xbfe6ff, 1).fillRoundedRect(x, y, w, h, 10);
  g.lineStyle(8, 0xffffff, 1).lineBetween(x + w / 2, y, x + w / 2, y + h).lineBetween(x, y + h / 2, x + w, y + h / 2);
}

function decorate(scene: Phaser.Scene, g: Phaser.GameObjects.Graphics) {
  // Playground (outside)
  const d = x0('dwor');
  scene.add.circle(d + 200, 170, 75, 0xffd45c).setDepth(-95);
  g.fillStyle(0xffffff, 1).fillCircle(d + 600, 160, 45).fillCircle(d + 650, 140, 55).fillCircle(d + 705, 160, 42);
  g.fillStyle(0xffffff, 1).fillCircle(d + 1100, 230, 40).fillCircle(d + 1145, 210, 50).fillCircle(d + 1195, 230, 38);
  // Fence
  g.fillStyle(0xffffff, 1);
  for (let x = d + 20; x < d + ROOM_W - 140; x += 70) g.fillRoundedRect(x, 450, 30, 130, 10);
  g.fillRect(d, 480, ROOM_W - 140, 18).fillRect(d, 540, ROOM_W - 140, 18);
  prop(scene, 'tree', d + 260, 640, 360);
  prop(scene, 'slide', d + 800, 700, 280);
  prop(scene, 'ball', d + 520, 800, 80);
  prop(scene, 'bucket', d + 1150, 830, 90);

  // Cloakroom
  const s = x0('szatnia');
  g.fillStyle(0xb5835a, 1).fillRect(s + 220, 250, 900, 26);
  ['coat', 'coat', 'coat', 'coat'].forEach((k, i) => prop(scene, k as EmojiKey, s + 330 + i * 220, 440, 150, -80));
  g.fillStyle(0xc68c5c, 1).fillRoundedRect(s + 220, 500, 900, 60, 14);
  prop(scene, 'plant', s + 1380, 640, 200);
  windowAt(g, s + 1260, 220);

  // Playroom
  const p = x0('sala');
  g.fillStyle(0xb5835a, 1).fillRect(p + 150, 300, 300, 20).fillRect(p + 150, 180, 300, 20);
  prop(scene, 'books', p + 230, 305, 110, -80);
  prop(scene, 'books', p + 370, 305, 110, -80);
  prop(scene, 'palette', p + 300, 185, 100, -80);
  prop(scene, 'picture', p + 760, 380, 180, -80);
  windowAt(g, p + 980, 200);
  prop(scene, 'couch', p + 1250, 650, 300);
  prop(scene, 'blocks', p + 560, 820, 110);
  prop(scene, 'puzzle', p + 900, 790, 100);
  prop(scene, 'ball', p + 360, 760, 80);

  // Dining room: table is drawn in front of seated kids (depth 650)
  const j = x0('jadalnia');
  windowAt(g, j + 200, 200);
  windowAt(g, j + 1180, 200);
  const t = scene.add.graphics().setDepth(650);
  t.fillStyle(0xe7a96b, 1).fillRoundedRect(j + 420, 560, 760, 40, 12);
  t.fillStyle(0xcf8f52, 1).fillRect(j + 440, 600, 720, 30);
  t.fillStyle(0xb5835a, 1).fillRect(j + 470, 630, 30, 120).fillRect(j + 1100, 630, 30, 120);
  for (let i = 0; i < 4; i++) prop(scene, 'chair', j + 520 + i * 190, 610, 170, 560);

  // Kitchen: counter with cabinets, fridge
  const k = x0('kuchnia');
  windowAt(g, k + 520, 160, 260, 160);
  const c = scene.add.graphics().setDepth(610);
  c.fillStyle(0xf2f2f2, 1).fillRect(k + 220, 455, 820, 28);
  c.fillStyle(0x8fd9b6, 1).fillRect(k + 230, 483, 800, 137);
  c.lineStyle(4, 0x6dbb98, 1);
  for (let x = k + 230; x < k + 1030; x += 200) c.strokeRoundedRect(x + 10, 495, 180, 112, 10);
  g.fillStyle(0xffffff, 1).fillRoundedRect(k + 1300, 170, 230, 450, 24);
  g.lineStyle(5, 0xd0d0d0, 1).lineBetween(k + 1300, 330, k + 1530, 330);
  g.fillStyle(0xd0d0d0, 1).fillRoundedRect(k + 1320, 230, 14, 70, 6).fillRoundedRect(k + 1320, 360, 14, 90, 6);
  // small side table for the drinks
  g.fillStyle(0xe7a96b, 1).fillRoundedRect(k + 1100, 470, 170, 24, 8).fillRect(k + 1175, 494, 20, 126);

  // Bathroom
  const l = x0('lazienka');
  prop(scene, 'shower', l + 1400, 380, 180, -80);
  prop(scene, 'toiletpaper', l + 500, 420, 80, -80);
  g.fillStyle(0xffffff, 1).fillRoundedRect(l + 960, 430, 220, 60, { tl: 0, tr: 0, bl: 40, br: 40 });
  g.fillStyle(0xffffff, 1).fillRect(l + 1050, 490, 40, 70);
  // Tap
  g.fillStyle(0xb8c4cc, 1).fillRoundedRect(l + 1058, 395, 24, 45, 6).fillRoundedRect(l + 1030, 390, 80, 18, 9);
  g.fillStyle(0xff7a6b, 1).fillCircle(l + 1070, 385, 12);
  g.fillStyle(0xdff4ff, 1).fillRoundedRect(l + 980, 240, 180, 150, 20);
  g.lineStyle(6, 0xffffff, 1).strokeRoundedRect(l + 980, 240, 180, 150, 20);

  // Bedroom
  const b = x0('sypialnia');
  windowAt(g, b + 1100, 180, 240, 180, true);
  scene.add.circle(b + 1160, 240, 30, 0xfff3b0).setDepth(-80);
  for (let i = 0; i < 4; i++) prop(scene, 'bed', b + 260 + i * 260, 760, 240);
  prop(scene, 'plant', b + 1450, 650, 180);
}
