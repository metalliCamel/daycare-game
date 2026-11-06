import Phaser from 'phaser';
import { loadSave, writeSave, type SaveData } from './save';
import { sfx } from './sound';
import { playClip } from './clips';

/** Shared game state + an event bus that the world, HUD and minigames all use. */
export const bus = new Phaser.Events.EventEmitter();

/**
 * The day runs through phases. The clock only ticks during "free" time, so
 * structured activities never feel rushed.
 */
export type Phase = 'dropoff' | 'free' | 'meal' | 'outside' | 'nap' | 'pickup' | 'summary' | 'special';
export type MealStep = 'cooking' | 'serving' | 'eating' | 'cleaning';

export const save: SaveData = loadSave();

export const state = {
  phase: 'dropoff' as Phase,
  minutes: 7 * 60 + 30,
  starsToday: 0,
  meal: { step: 'cooking' as MealStep, name: '', sandwiches: false, drinks: false },
  /** ids of kids currently in the daycare */
  present: [] as string[],
};

export function persist() {
  writeSave(save);
}

export function addStars(n = 1) {
  save.stars += n;
  save.totalStars += n;
  state.starsToday += n;
  sfx.star();
  bus.emit('stars', save.stars);
  persist();
  // A parent's recorded "Brawo!" for the bigger achievements
  if (n >= 3) setTimeout(() => playClip('bravo', 30000), 900);
}

export function spendStars(n: number) {
  if (save.stars < n) return false;
  save.stars -= n;
  bus.emit('stars', save.stars);
  persist();
  return true;
}

/** Show + speak a short instruction at the bottom of the screen. */
export function prompt(text: string) {
  bus.emit('prompt', text);
}
