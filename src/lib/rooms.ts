import Phaser from 'phaser';
import type { EmojiKey } from './assets';

export const ROOM_W = 1600;
export const WALL_H = 560; // wall from y=0 to here, floor below
export const FLOOR_MIN_Y = 620;
export const FLOOR_MAX_Y = 850;

export type RoomId = 'dwor' | 'szatnia' | 'sala' | 'jadalnia' | 'kuchnia' | 'lazienka' | 'sypialnia';

export type Room = {
  id: RoomId;
  name: string;
  speak: string;
  icon: EmojiKey;
  wall: number;
  floor: number;
};

// Left to right through the building. The playground is outside, on the left.
export const ROOMS: Room[] = [
  { id: 'dwor', name: 'Plac zabaw', speak: 'Plac zabaw', icon: 'tree', wall: 0x9fd3f5, floor: 0x8fd9b6 },
  { id: 'szatnia', name: 'Szatnia', speak: 'Szatnia', icon: 'coat', wall: 0xffe4a3, floor: 0xd9a066 },
  { id: 'sala', name: 'Sala zabaw', speak: 'Sala zabaw', icon: 'blocks', wall: 0xffd0c2, floor: 0xc9a27e },
  { id: 'jadalnia', name: 'Jadalnia', speak: 'Jadalnia', icon: 'plate', wall: 0xd6efc7, floor: 0xd0b48c },
  { id: 'kuchnia', name: 'Kuchnia', speak: 'Kuchnia', icon: 'pan', wall: 0xfff3b0, floor: 0xe8e0d0 },
  { id: 'lazienka', name: 'Łazienka', speak: 'Łazienka', icon: 'toilet', wall: 0xc9ecf5, floor: 0xb8d8e0 },
  { id: 'sypialnia', name: 'Sypialnia', speak: 'Sypialnia', icon: 'bed', wall: 0xd9d0f5, floor: 0xa99bc9 },
];

export const WORLD_W = ROOMS.length * ROOM_W;

export function roomIndexAt(x: number) {
  return Phaser.Math.Clamp(Math.floor(x / ROOM_W), 0, ROOMS.length - 1);
}

export function roomX(id: RoomId) {
  return ROOMS.findIndex((r) => r.id === id) * ROOM_W;
}

