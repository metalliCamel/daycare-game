// Progress saved in the browser (localStorage). Everything is optional: the
// game works fine if storage is blocked.

export type SaveData = {
  stars: number; // spendable balance
  totalStars: number;
  day: number;
  teacher: string; // emoji key
  decor: string[]; // bought decoration ids
  drawings: string[]; // ids of finished craft pictures (hung on the playroom wall)
  music: boolean;
};

const KEY = 'przedszkole-hani-v1';

const DEFAULTS: SaveData = { stars: 0, totalStars: 0, day: 1, teacher: 'teacher_1', decor: [], drawings: [], music: true };

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* storage unavailable */
  }
  return { ...DEFAULTS };
}

export function writeSave(data: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable */
  }
}
