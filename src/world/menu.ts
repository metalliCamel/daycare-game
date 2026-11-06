import type { EmojiKey } from '../lib/assets';

/**
 * What's cooked for each meal. Dishes alternate day by day so every meal
 * feels different.
 *
 * - sandwich: cut + build sandwiches from order cards (SandwichScene)
 * - pot:      cut vegetables/fruit, put them in the pot/bowl, stir, serve (PotScene)
 * - topping:  a base (porridge, cupcake) decorated per child's wish (TopScene)
 */
export type Dish =
  | { kind: 'sandwich'; id: string; name: string; acc: string; icon: EmojiKey }
  | {
      kind: 'pot';
      id: string;
      name: string;
      acc: string;
      icon: EmojiKey;
      cut: EmojiKey[];
      add: EmojiKey[];
      wrong: EmojiKey[];
      color: number;
      vessel: 'pot' | 'bowl';
    }
  | { kind: 'topping'; id: string; name: string; acc: string; icon: EmojiKey; base: 'porridge' | 'cupcake' | 'cake' | 'tree' | 'egg'; toppings: EmojiKey[] };

export const DISHES: Record<string, Dish> = {
  kanapki: { kind: 'sandwich', id: 'kanapki', name: 'kanapki', acc: 'kanapki', icon: 'sandwich' },
  owsianka: {
    kind: 'topping', id: 'owsianka', name: 'owsianka', acc: 'owsiankę', icon: 'bowl', base: 'porridge',
    toppings: ['banana', 'strawberry', 'blueberries', 'honey', 'apple'],
  },
  pomidorowa: {
    kind: 'pot', id: 'pomidorowa', name: 'zupa pomidorowa', acc: 'zupę pomidorową', icon: 'pot',
    cut: ['tomato', 'carrot'], add: ['tomato', 'carrot', 'pasta'], wrong: ['cupcake', 'banana'], color: 0xe8553a, vessel: 'pot',
  },
  jarzynowa: {
    kind: 'pot', id: 'jarzynowa', name: 'zupa jarzynowa', acc: 'zupę jarzynową', icon: 'pot',
    cut: ['potato', 'carrot'], add: ['potato', 'carrot', 'peas', 'onion'], wrong: ['chocolate', 'strawberry'], color: 0xe9c46a, vessel: 'pot',
  },
  babeczki: {
    kind: 'topping', id: 'babeczki', name: 'babeczki', acc: 'babeczki', icon: 'cupcake', base: 'cupcake',
    toppings: ['strawberry', 'chocolate', 'candy', 'blueberries', 'banana'],
  },
  tort: {
    kind: 'topping', id: 'tort', name: 'tort urodzinowy', acc: 'tort urodzinowy', icon: 'cake', base: 'cake',
    toppings: ['strawberry', 'chocolate', 'candy', 'blueberries', 'banana'],
  },
  owoce: {
    kind: 'pot', id: 'owoce', name: 'sałatka owocowa', acc: 'sałatkę owocową', icon: 'fruitsalad',
    cut: ['apple', 'banana', 'kiwi'], add: ['apple', 'banana', 'kiwi', 'grapes'], wrong: ['onion', 'potato'], color: 0xfff1c2, vessel: 'bowl',
  },
};

/** Ingredient names (nominative + accusative) for prompts. */
export const FOOD_NAMES: Partial<Record<EmojiKey, [string, string]>> = {
  tomato: ['pomidor', 'pomidora'], carrot: ['marchewka', 'marchewkę'], pasta: ['makaron', 'makaron'],
  potato: ['ziemniak', 'ziemniaka'], peas: ['groszek', 'groszek'], onion: ['cebula', 'cebulę'],
  apple: ['jabłko', 'jabłko'], banana: ['banan', 'banana'], kiwi: ['kiwi', 'kiwi'], grapes: ['winogrona', 'winogrona'],
  strawberry: ['truskawka', 'truskawkę'], blueberries: ['borówki', 'borówki'], honey: ['miód', 'miód'],
  chocolate: ['czekolada', 'czekoladę'], candy: ['cukierek', 'cukierka'], cupcake: ['babeczka', 'babeczkę'],
  ornament: ['bombka', 'bombkę'], starxmas: ['gwiazdka', 'gwiazdkę'], bell: ['dzwoneczek', 'dzwoneczek'], ribbon: ['kokardka', 'kokardkę'],
  flower: ['kwiatek', 'kwiatek'], heart: ['serduszko', 'serduszko'], butterfly: ['motylek', 'motylka'],
};

/** Breakfast / lunch / snack, alternating between two dishes each day. */
export function dishFor(meal: string, day: number): Dish {
  const odd = day % 2 === 1;
  if (meal === 'Śniadanie') return DISHES[odd ? 'kanapki' : 'owsianka'];
  if (meal === 'Obiad') return DISHES[odd ? 'pomidorowa' : 'jarzynowa'];
  return DISHES[odd ? 'babeczki' : 'owoce'];
}
