// Progress saved in the browser (localStorage), in three save slots.
// Everything is optional: the game works fine if storage is blocked.

export type SaveData = {
  stars: number; // spendable balance
  totalStars: number;
  day: number;
  teacher: string; // emoji key
  teacherName: string; // "Patrycja" → shown as "Ciocia Patrycja"
  decor: string[]; // bought decoration ids
  drawings: string[]; // finished craft pictures (hung on the playroom wall)
  music: boolean;
  savedAt: number;
};

export const SLOT_COUNT = 3;
const KEY = 'przedszkole-hani-slots-v1';
const OLD_KEY = 'przedszkole-hani-v1';

export const DEFAULTS: SaveData = {
  stars: 0, totalStars: 0, day: 1, teacher: 'teacher_1', teacherName: '', decor: [], drawings: [], music: true, savedAt: 0,
};

type Store = { slots: (SaveData | null)[]; current: number };

function read(): Store {
  const empty: Store = { slots: Array(SLOT_COUNT).fill(null), current: 0 };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Store;
      s.slots = Array.from({ length: SLOT_COUNT }, (_, i) => (s.slots?.[i] ? { ...DEFAULTS, ...s.slots[i] } : null));
      return s;
    }
    // First run with slots: move the old single save into slot 1
    const old = localStorage.getItem(OLD_KEY);
    if (old) {
      empty.slots[0] = { ...DEFAULTS, ...JSON.parse(old), savedAt: Date.now() };
      localStorage.removeItem(OLD_KEY);
      write(empty);
    }
  } catch {
    /* storage unavailable */
  }
  return empty;
}

function write(s: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable */
  }
}

export function listSlots(): (SaveData | null)[] {
  return read().slots;
}

export function currentSlot(): number {
  return read().current;
}

/** Load a slot (or a fresh game) into `target`. */
export function loadSlot(index: number, target: SaveData, fresh = false) {
  const s = read();
  s.current = index;
  const data = fresh || !s.slots[index] ? { ...DEFAULTS, music: target.music } : s.slots[index]!;
  Object.assign(target, JSON.parse(JSON.stringify(data)));
  if (fresh) s.slots[index] = { ...target, savedAt: Date.now() };
  write(s);
}

export function writeSlot(data: SaveData) {
  const s = read();
  s.slots[s.current] = { ...data, savedAt: Date.now() };
  write(s);
}

export function deleteSlot(index: number) {
  const s = read();
  s.slots[index] = null;
  write(s);
}

/** Used at startup: the most recently played slot, or defaults. */
export function loadSave(): SaveData {
  const s = read();
  return { ...DEFAULTS, ...(s.slots[s.current] ?? {}) };
}

/** Kept for older callers. */
export function writeSave(data: SaveData) {
  writeSlot(data);
}
