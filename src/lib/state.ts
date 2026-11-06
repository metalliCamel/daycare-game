import Phaser from 'phaser';

/** Shared game state + an event bus that the world, HUD and minigames all use. */
export const bus = new Phaser.Events.EventEmitter();

export type MealPhase = 'none' | 'cooking' | 'serving' | 'eating' | 'cleaning';

export const state = {
  stars: 0,
  minutes: 8 * 60, // game clock, starts 8:00
  day: 1,
  meal: {
    phase: 'none' as MealPhase,
    name: '',
    sandwiches: false,
    drinks: false,
  },
};

export function addStars(n = 1) {
  state.stars += n;
  bus.emit('stars', state.stars);
}

/** Show + speak a short instruction at the bottom of the screen. */
export function prompt(text: string) {
  bus.emit('prompt', text);
}
