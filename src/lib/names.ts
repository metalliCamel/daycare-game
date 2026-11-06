import { save } from './state';

/** "Patrycja" → "Patrycjo", "Zosia" → "Zosiu", "Ola" → "Olu" (vocative, for female names). */
export function vocative(name: string) {
  if (/[nszc]ia$/i.test(name) || /dzia$/i.test(name)) return name.slice(0, -1) + 'u';
  if (/la$/i.test(name)) return name.slice(0, -1) + 'u';
  if (/a$/i.test(name)) return name.slice(0, -1) + 'o';
  return name;
}

/** "Patrycja" → "Patrycją" (instrumental: "jesteś ciocią Patrycją"). */
export function instrumental(name: string) {
  return /a$/i.test(name) ? name.slice(0, -1) + 'ą' : name;
}

export const auntie = () => (save.teacherName ? `Ciocia ${save.teacherName}` : 'Ciocia');
/** "ciociu Patrycjo" */
export const auntieVoc = () => (save.teacherName ? `ciociu ${vocative(save.teacherName)}` : 'ciociu');
/** "ciocią Patrycją" */
export const auntieIns = () => (save.teacherName ? `ciocią ${instrumental(save.teacherName)}` : 'ciocią');
