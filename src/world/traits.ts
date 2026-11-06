// Each child's little personality: what they love to play, what they pick
// on the playground, how they behave. Shown in the album ("Mój album").
import Phaser from 'phaser';
import type { PlayId } from './playcorner';
import type { EmojiKey } from '../lib/assets';

export type OutsideWish = 'swing' | 'slide' | 'sand';

export type Trait = {
  /** one short sentence for the album */
  about: string;
  /** favourite game in the playroom */
  play: PlayId;
  /** favourite thing on the playground */
  outside: OutsideWish;
  /** walking pace while playing on their own (1 = normal) */
  pace?: number;
  /** how often they get sad (1 = normal) */
  sad?: number;
  /** how often they wake up during the nap (1 = normal) */
  wake?: number;
  /** what Hania hears when the child wakes up (instead of the usual line) */
  wakeText?: string;
  /** what they say when the teacher takes their hand */
  lines: [string, string];
  /** said after their favourite game */
  favLine: string;
};

export const TRAITS: Record<string, Trait> = {
  zosia: {
    about: 'Kocha zwierzęta. Chce być panią weterynarz.',
    play: 'pet', outside: 'swing',
    lines: ['Czy pójdziemy do Ciapka?', 'Miau! Udaję kotka.'],
    favLine: 'Zosia: Ciapek to mój najlepszy przyjaciel!',
  },
  antek: {
    about: 'Uwielbia dinozaury i budowanie.',
    play: 'blocks', outside: 'slide',
    lines: ['Rrrr! Jestem dinozaurem!', 'Zbudujemy coś wysokiego?'],
    favLine: 'Antek: Najwyższa wieża na świecie!',
  },
  ola: {
    about: 'Lubi puzzle. Trochę boi się ciemności.',
    play: 'puzzle', outside: 'swing',
    wake: 3,
    wakeText: 'Ola boi się ciemności i nie może zasnąć. Pogłaszcz ją, żeby było jej raźniej.',
    lines: ['Ciociu, potrzymasz mnie za rękę?', 'Lubię, jak wszystko pasuje.'],
    favLine: 'Ola: Wszystkie kawałki pasują!',
  },
  franek: {
    about: 'Wszędzie go pełno! Kocha piłkę.',
    play: 'ball', outside: 'slide',
    pace: 1.4,
    lines: ['Szybciej, ciociu, szybciej!', 'Gramy w piłkę?'],
    favLine: 'Franek: Gol! Gol! Gol!',
  },
  maja: {
    about: 'Kocha tańczyć i śpiewać.',
    play: 'music', outside: 'swing',
    lines: ['Tra la la! Zaśpiewamy?', 'Umiem się kręcić jak baletnica!'],
    favLine: 'Maja: Tańczymy! Raz, dwa, trzy!',
  },
  stas: {
    about: 'Spokojny. Najbardziej lubi bajki.',
    play: 'books', outside: 'sand',
    pace: 0.75,
    lines: ['Powoli, ciociu, nie spieszmy się.', 'Poczytasz mi bajkę?'],
    favLine: 'Staś: Jeszcze jedną bajkę, proszę!',
  },
  lena: {
    about: 'Nieśmiała. Czasem jest jej smutno, ale lubi rysować.',
    play: 'draw', outside: 'sand',
    sad: 3,
    lines: ['Mogę iść z tobą?', 'Narysuję ci coś ładnego.'],
    favLine: 'Lena: Ten rysunek jest dla ciebie!',
  },
  tymek: {
    about: 'Mały wynalazca. Wszystko by lepił i budował.',
    play: 'clay', outside: 'slide',
    lines: ['Mam pomysł na wynalazek!', 'Polecimy rakietą na księżyc?'],
    favLine: 'Tymek: Ulepiłem całe zoo!',
  },
};

export const trait = (id: string): Trait => TRAITS[id];

export const OUTSIDE_ICON: Record<OutsideWish, EmojiKey> = { swing: 'swing' as EmojiKey, slide: 'slide', sand: 'bucket' };

/** Pick one item, where some are more likely than others. */
export function weighted<T>(items: T[], weight: (t: T) => number): T {
  const total = items.reduce((s, t) => s + weight(t), 0);
  let r = Math.random() * total;
  for (const t of items) {
    r -= weight(t);
    if (r <= 0) return t;
  }
  return Phaser.Utils.Array.GetRandom(items);
}
