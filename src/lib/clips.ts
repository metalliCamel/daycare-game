// Short voice clips recorded by a parent ("Dzień dobry!", "Brawo!", "Dobranoc"),
// played at the right moments in addition to the built-in voice.
// Stored as data URLs in localStorage (a few seconds each is small).

export type ClipId = 'hello' | 'bravo' | 'night';
export const CLIPS: { id: ClipId; name: string; hint: string }[] = [
  { id: 'hello', name: 'Powitanie rano', hint: 'np. „Dzień dobry, kochanie! Miłego dnia w przedszkolu!”' },
  { id: 'bravo', name: 'Pochwała', hint: 'np. „Brawo, świetnie ci idzie!”' },
  { id: 'night', name: 'Na drzemkę', hint: 'np. „Śpijcie słodko, dzieciaczki”' },
];

const KEY = 'przedszkole-hani-voice';
const MAX_MS = 4000;

function all(): Partial<Record<ClipId, string>> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

export const hasClip = (id: ClipId) => !!all()[id];

export function deleteClip(id: ClipId) {
  const a = all();
  delete a[id];
  try {
    localStorage.setItem(KEY, JSON.stringify(a));
  } catch {
    /* storage unavailable */
  }
}

let lastPlayed = 0;
/** Play a clip if one was recorded. `minGapMs` avoids repeating too often. */
export function playClip(id: ClipId, minGapMs = 0) {
  const url = all()[id];
  if (!url) return false;
  const now = performance.now();
  if (minGapMs && now - lastPlayed < minGapMs) return false;
  lastPlayed = now;
  window.speechSynthesis?.cancel();
  void new Audio(url).play().catch(() => undefined);
  return true;
}

/** Record up to four seconds from the microphone. Resolves when saved. */
export async function recordClip(id: ClipId, onTick?: (msLeft: number) => void): Promise<boolean> {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return false;
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    return false;
  }
  const rec = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => chunks.push(e.data);
  const done = new Promise<void>((res) => (rec.onstop = () => res()));
  rec.start();
  const start = performance.now();
  const tick = window.setInterval(() => onTick?.(Math.max(0, MAX_MS - (performance.now() - start))), 100);
  await new Promise((r) => setTimeout(r, MAX_MS));
  rec.stop();
  await done;
  clearInterval(tick);
  stream.getTracks().forEach((t) => t.stop());
  const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
  const url = await new Promise<string>((res) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result));
    fr.readAsDataURL(blob);
  });
  const a = all();
  a[id] = url;
  try {
    localStorage.setItem(KEY, JSON.stringify(a));
  } catch {
    return false;
  }
  return true;
}
