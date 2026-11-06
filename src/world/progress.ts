import { save, persist, bus } from '../lib/state';
import { sfx } from '../lib/sound';
import { KIDS, kidDef, type Kid } from '../objects/Kid';
import type { EmojiKey } from '../lib/assets';

// ---------------------------------------------------------------------------
// Gradual unlocks: a new game starts simple and opens up over the first days.
// ---------------------------------------------------------------------------

export type Feature = 'outside' | 'garden' | 'nap' | 'snack' | 'trouble' | 'teeth' | 'events' | 'pet';

const UNLOCK: Record<Feature, number> = {
  outside: 2, garden: 2, nap: 3, snack: 3, trouble: 3, teeth: 3, pet: 4, events: 4,
};

export const unlocked = (f: Feature) => save.level >= UNLOCK[f];

/** What opens up on a given level, for the "Nowość!" announcement. */
export const NEWS: Record<number, string> = {
  2: 'Nowość! Dzisiaj pierwszy raz wychodzimy na plac zabaw, a w ogródku możemy coś posadzić.',
  3: 'Nowość! Od dzisiaj po obiedzie jest drzemka i mycie zębów, a po południu podwieczorek.',
  4: 'Nowość! W szatni zamieszkał chomik. Od dzisiaj zdarzają się też niespodzianki!',
};

// ---------------------------------------------------------------------------
// Seasons: start from the real season, then change every five days.
// ---------------------------------------------------------------------------

export type Season = 'wiosna' | 'lato' | 'jesien' | 'zima';
const SEASONS: Season[] = ['wiosna', 'lato', 'jesien', 'zima'];
export const SEASON_NAME: Record<Season, string> = { wiosna: 'wiosna', lato: 'lato', jesien: 'jesień', zima: 'zima' };

export const season = (day = save.day): Season => SEASONS[(save.seasonStart + Math.floor((day - 1) / 5)) % 4];
export const dayInSeason = (day = save.day) => ((day - 1) % 5) + 1;

// ---------------------------------------------------------------------------
// Today's special event.
// ---------------------------------------------------------------------------

export type DayEvent =
  | { kind: 'normal' }
  | { kind: 'birthday'; kidId: string }
  | { kind: 'costume' }
  | { kind: 'newkid'; kidId: string }
  | { kind: 'guest'; guest: 'strazak' | 'lekarz' | 'bibliotekarka' }
  | { kind: 'trip' }
  | { kind: 'holiday'; id: 'mikolajki' | 'wigilia' | 'babcia' | 'wielkanoc' | 'mama' };

const NEW_KIDS: Record<number, string> = { 5: 'lena', 8: 'tymek' };

export function todaysEvent(): DayEvent {
  const lvl = save.level;
  // New kids join the group on fixed days
  const joining = Object.entries(NEW_KIDS).find(([l, id]) => Number(l) === lvl && !save.group.includes(id));
  if (joining) return { kind: 'newkid', kidId: joining[1] };
  if (!unlocked('events')) return { kind: 'normal' };

  const s = season();
  const d = dayInSeason();
  if (s === 'zima' && d === 1) return { kind: 'holiday', id: 'mikolajki' };
  if (s === 'zima' && d === 3) return { kind: 'holiday', id: 'wigilia' };
  if (s === 'zima' && d === 5) return { kind: 'holiday', id: 'babcia' };
  if (s === 'wiosna' && d === 2) return { kind: 'holiday', id: 'wielkanoc' };
  if (s === 'wiosna' && d === 4) return { kind: 'holiday', id: 'mama' };

  const guests = ['strazak', 'lekarz', 'bibliotekarka'] as const;
  switch (lvl % 5) {
    case 0: {
      const kids = save.group;
      return { kind: 'birthday', kidId: kids[save.birthdays % kids.length] };
    }
    case 1: return { kind: 'costume' };
    case 2: return { kind: 'guest', guest: guests[Math.floor(lvl / 5) % guests.length] };
    case 3: return s === 'zima' ? { kind: 'costume' } : { kind: 'trip' };
    default: return { kind: 'normal' };
  }
}

export const HOLIDAY: Record<string, { name: string; icon: EmojiKey }> = {
  mikolajki: { name: 'Mikołajki', icon: 'santa' },
  wigilia: { name: 'Wigilia przedszkolna', icon: 'xmastree' },
  babcia: { name: 'Dzień Babci i Dziadka', icon: 'heart' },
  wielkanoc: { name: 'Wielkanoc', icon: 'easteregg' },
  mama: { name: 'Dzień Mamy', icon: 'tulip' },
};

export function eventTitle(e: DayEvent): { text: string; icon: EmojiKey } {
  switch (e.kind) {
    case 'birthday': return { text: `Urodziny: ${kidDef(e.kidId).name}!`, icon: 'cake' };
    case 'costume': return { text: 'Dzień przebierańców', icon: 'mask' };
    case 'newkid': return { text: `Nowe dziecko: ${kidDef(e.kidId).name}`, icon: kidDef(e.kidId).key };
    case 'guest': return { text: { strazak: 'Wizyta strażaka', lekarz: 'Wizyta lekarza', bibliotekarka: 'Wizyta bibliotekarki' }[e.guest], icon: { strazak: 'firefighter', lekarz: 'doctor', bibliotekarka: 'librarian' }[e.guest] as EmojiKey };
    case 'trip': return { text: 'Wycieczka do parku', icon: 'duck' };
    case 'holiday': return { text: HOLIDAY[e.id].name, icon: HOLIDAY[e.id].icon };
    default: return { text: 'Zwykły dzień', icon: 'sun' };
  }
}

// ---------------------------------------------------------------------------
// Friendship hearts and secrets.
// ---------------------------------------------------------------------------

export const SECRETS: Record<string, [string, string]> = {
  zosia: ['Mam w domu kotka. Nazywa się Mruczek!', 'Jak dorosnę, będę panią weterynarz.'],
  antek: ['Umiem już jeździć na rowerze bez kółek!', 'Mój ulubiony kolor to zielony, jak dinozaury.'],
  ola: ['Moja babcia piecze najlepsze szarlotki.', 'Boję się burzy, ale przy tobie się nie boję.'],
  franek: ['Mam młodszą siostrzyczkę. Jest malutka!', 'Chcę zostać strażakiem i ratować kotki z drzew.'],
  maja: ['Lubię tańczyć do muzyki z radia.', 'Zbieram kolorowe kamyki. Mam ich sto!'],
  stas: ['Dziadek uczy mnie łowić ryby.', 'Ty jesteś moją ulubioną ciocią!'],
  lena: ['Na początku było mi smutno, ale teraz lubię przedszkole.', 'Narysowałam dla ciebie serduszko w domu.'],
  tymek: ['Mam psa, który umie podawać łapę.', 'Kiedyś polecę rakietą na księżyc!'],
};

export const hearts = (id: string) => save.friends[id] ?? 0;

/** Helping a child makes you better friends (max 10 hearts). */
export function befriend(kid: Kid | string) {
  const id = typeof kid === 'string' ? kid : kid.def.id;
  const before = hearts(id);
  if (before >= 10) return;
  save.friends[id] = before + 1;
  persist();
  if (before + 1 === 5 || before + 1 === 10) {
    bus.emit('toast', { icon: 'heart', text: `${kidDef(id).name} ma nowy sekret dla ciebie! Zobacz w albumie.` });
  }
  if (KIDS.every((k) => !save.group.includes(k.id) || hearts(k.id) >= 5)) stat('allFriends', 0);
}

// ---------------------------------------------------------------------------
// Sticker album: counters → stickers.
// ---------------------------------------------------------------------------

export type Sticker = { id: string; icon: EmojiKey; name: string; check: () => boolean };
const n = (k: string) => save.stats[k] ?? 0;

export const STICKERS: Sticker[] = [
  { id: 'day1', icon: 'sun', name: 'Pierwszy dzień', check: () => n('days') >= 1 },
  { id: 'day10', icon: 'star', name: '10 dni w przedszkolu', check: () => n('days') >= 10 },
  { id: 'sandwich', icon: 'sandwich', name: 'Mistrzyni kanapek', check: () => n('dish_kanapki') >= 2 },
  { id: 'soup', icon: 'pot', name: 'Pyszna zupa', check: () => n('dish_pomidorowa') + n('dish_jarzynowa') >= 1 },
  { id: 'cupcake', icon: 'cupcake', name: 'Babeczki', check: () => n('dish_babeczki') >= 1 },
  { id: 'cake', icon: 'cake', name: 'Urodzinowy tort', check: () => n('birthdays') >= 1 },
  { id: 'tables', icon: 'sponge', name: '10 czystych stołów', check: () => n('meals') >= 10 },
  { id: 'harvest', icon: 'carrot', name: 'Pierwsze zbiory', check: () => n('harvest') >= 1 },
  { id: 'pet', icon: 'hamster', name: 'Opiekunka chomika', check: () => n('petCare') >= 5 },
  { id: 'trip', icon: 'duck', name: 'Wycieczka', check: () => n('trips') >= 1 },
  { id: 'guest', icon: 'firefighter', name: 'Mieliśmy gościa', check: () => n('guests') >= 1 },
  { id: 'plaster', icon: 'bandage', name: 'Pierwsza pomoc', check: () => n('plasters') >= 1 },
  { id: 'teeth', icon: 'tooth', name: 'Czyste ząbki', check: () => n('teeth') >= 3 },
  { id: 'tidy', icon: 'box', name: 'Porządek w sali', check: () => n('tidy') >= 1 },
  { id: 'music', icon: 'drum', name: 'Mała orkiestra', check: () => n('music') >= 1 },
  { id: 'art', icon: 'palette', name: 'Artystka', check: () => n('drawings') >= 5 },
  { id: 'friends', icon: 'heart2', name: 'Wszyscy to przyjaciele', check: () => n('allFriends') >= 1 },
  { id: 'xmas', icon: 'xmastree', name: 'Święta', check: () => n('holiday') >= 1 },
];

/** Count something (and unlock stickers). Pass 0 to just mark it happened. */
export function stat(key: string, by = 1) {
  save.stats[key] = Math.max(n(key) + by, by === 0 ? 1 : 0);
  for (const st of STICKERS) {
    if (!save.stickers.includes(st.id) && st.check()) {
      save.stickers.push(st.id);
      sfx.cheer();
      bus.emit('toast', { icon: st.icon, text: `Nowa naklejka: ${st.name}!` });
    }
  }
  persist();
}
