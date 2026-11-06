// Reads instructions aloud in Polish using the browser's built-in speech.
// On Windows this is usually the "Paulina" voice. Later we can swap in
// recorded audio files with the same say() call.

let plVoice: SpeechSynthesisVoice | null = null;

function pickVoice() {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  plVoice =
    voices.find((v) => v.lang.toLowerCase().startsWith('pl') && /female|paulina|zofia|ewa/i.test(v.name)) ??
    voices.find((v) => v.lang.toLowerCase().startsWith('pl')) ??
    null;
}

if ('speechSynthesis' in window) {
  pickVoice();
  window.speechSynthesis.onvoiceschanged = pickVoice;
}

export function say(text: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'pl-PL';
  if (plVoice) u.voice = plVoice;
  u.rate = 0.9;
  u.pitch = 1.1;
  window.speechSynthesis.speak(u);
}
