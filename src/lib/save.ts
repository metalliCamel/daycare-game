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
  /** kid ids that belong to the group (it grows over the first days) */
  group: string[];
  /** unlock level: features open up gradually (1 = first day of a new game) */
  level: number;
  /** season index of day 1 (0 wiosna, 1 lato, 2 jesień, 3 zima) */
  seasonStart: number;
  garden: { plant: string | null; stage: number; watered: number }[];
  pet: { has: boolean; fed: number; water: number; cleaned: number };
  friends: Record<string, number>;
  stats: Record<string, number>;
  stickers: string[];
  decorPos: Record<string, { x: number; y: number }>;
  outfits: string[];
  outfit: string | null;
  birthdays: number;
  /** where to pick the day up again (saved during free time), or null = start in the morning */
  resume: Resume | null;
};

export type Resume = {
  day: number;
  minutes: number;
  /** time of the last schedule entry that already happened (-1 = none) */
  done: number;
  present: string[];
  starsToday: number;
  sick: boolean;
  mess: boolean;
};

export const SLOT_COUNT = 3;
const KEY = 'przedszkole-hani-slots-v1';
const OLD_KEY = 'przedszkole-hani-v1';

const realSeason = () => {
  const m = new Date().getMonth() + 1;
  return m >= 3 && m <= 5 ? 0 : m >= 6 && m <= 8 ? 1 : m >= 9 && m <= 11 ? 2 : 3;
};

export const DEFAULTS: SaveData = {
  stars: 0, totalStars: 0, day: 1, teacher: 'teacher_1', teacherName: '', decor: [], drawings: [], music: true, savedAt: 0,
  group: ['zosia', 'antek', 'ola', 'franek'],
  level: 1,
  seasonStart: realSeason(),
  garden: [0, 1, 2, 3].map(() => ({ plant: null, stage: 0, watered: 0 })),
  pet: { has: false, fed: 0, water: 0, cleaned: 0 },
  friends: {},
  stats: {},
  stickers: [],
  decorPos: {},
  outfits: [],
  outfit: null,
  birthdays: 0,
  resume: null,
};

/** Saves from before gradual unlocks keep everything they already had. */
function upgrade(d: Partial<SaveData>): SaveData {
  const out = { ...DEFAULTS, ...JSON.parse(JSON.stringify(d)) } as SaveData;
  if (!d.group) {
    out.group = ['zosia', 'antek', 'ola', 'franek', 'maja', 'stas'];
    out.level = Math.max(4, (d.day ?? 1) + 3);
    out.pet = { has: true, fed: 0, water: 0, cleaned: 0 };
  }
  if (!d.garden) out.garden = DEFAULTS.garden.map((g) => ({ ...g }));
  return out;
}

type Store = { slots: (SaveData | null)[]; current: number };

function read(): Store {
  const empty: Store = { slots: Array(SLOT_COUNT).fill(null), current: 0 };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Store;
      s.slots = Array.from({ length: SLOT_COUNT }, (_, i) => (s.slots?.[i] ? upgrade(s.slots[i]!) : null));
      return s;
    }
    // First run with slots: move the old single save into slot 1
    const old = localStorage.getItem(OLD_KEY);
    if (old) {
      empty.slots[0] = { ...upgrade(JSON.parse(old)), savedAt: Date.now() };
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
  const data = fresh || !s.slots[index] ? { ...JSON.parse(JSON.stringify(DEFAULTS)), seasonStart: realSeason(), music: target.music } : s.slots[index]!;
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
  return s.slots[s.current] ? upgrade(s.slots[s.current]!) : JSON.parse(JSON.stringify(DEFAULTS));
}

/** Kept for older callers. */
export function writeSave(data: SaveData) {
  writeSlot(data);
}
