/** Polish plural: 1 gwiazdka, 2–4 gwiazdki, 5+ gwiazdek (12–14 → gwiazdek). */
export function plural(n: number, one: string, few: string, many: string) {
  if (n === 1) return one;
  const d = n % 10;
  const t = n % 100;
  return d >= 2 && d <= 4 && !(t >= 12 && t <= 14) ? few : many;
}

export const stars = (n: number) => `${n} ${plural(n, 'gwiazdka', 'gwiazdki', 'gwiazdek')}`;
