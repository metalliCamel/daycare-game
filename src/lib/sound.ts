// Tiny synthesized sound effects and music (Web Audio), so no audio files are needed.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicOn = true;

function ac() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.5, slideTo?: number) {
  const c = ac();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime + start);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + start + dur);
  g.gain.setValueAtTime(0, c.currentTime + start);
  g.gain.linearRampToValueAtTime(vol, c.currentTime + start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + dur);
  o.connect(g).connect(master!);
  o.start(c.currentTime + start);
  o.stop(c.currentTime + start + dur + 0.05);
}

function noise(start: number, dur: number, vol = 0.3, from = 2000, to = 300) {
  const c = ac();
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(from, c.currentTime + start);
  f.frequency.exponentialRampToValueAtTime(to, c.currentTime + start + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(vol, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + dur);
  src.connect(f).connect(g).connect(master!);
  src.start(c.currentTime + start);
}

export const sfx = {
  star() { tone(880, 0, 0.12, 'triangle', 0.4); tone(1320, 0.08, 0.25, 'triangle', 0.4); },
  pop() { tone(500, 0, 0.08, 'sine', 0.5, 1200); },
  click() { tone(700, 0, 0.05, 'square', 0.15); },
  wrong() { tone(300, 0, 0.15, 'triangle', 0.3, 220); },
  flush() { noise(0, 1.2, 0.5, 3000, 200); tone(200, 0.1, 0.8, 'sine', 0.15, 80); },
  splash() { noise(0, 0.35, 0.4, 4000, 800); },
  wipe() { noise(0, 0.15, 0.2, 1500, 1200); },
  chop() { tone(160, 0, 0.06, 'square', 0.3, 90); noise(0, 0.05, 0.3, 5000, 3000); },
  whoosh() { noise(0, 0.5, 0.35, 600, 3000); },
  boing() { tone(220, 0, 0.35, 'sine', 0.45, 660); },
  doorbell() { tone(784, 0, 0.5, 'sine', 0.4); tone(622, 0.35, 0.7, 'sine', 0.4); },
  phone() { for (let i = 0; i < 6; i++) tone(i % 2 ? 1300 : 1100, i * 0.08, 0.07, 'square', 0.12); },
  giggle() { [900, 1100, 950, 1200, 1000].forEach((f, i) => tone(f, i * 0.07, 0.07, 'sine', 0.25)); },
  cheer() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.25, 'triangle', 0.3)); },
  thermo() { tone(2000, 0, 0.1, 'square', 0.15); tone(2000, 0.18, 0.1, 'square', 0.15); },
  pour() { noise(0, 0.25, 0.12, 2500, 1800); },
  /** A cheerful birthday tune */
  stoLat() {
    const n = [67, 67, 64, 67, 67, 64, 67, 69, 67, 65, 64, 62, 0, 65, 65, 62, 65, 65, 62, 65, 67, 65, 64, 62, 60];
    n.forEach((m, i) => m && tone(440 * Math.pow(2, (m - 69) / 12), i * 0.22, 0.3, 'triangle', 0.3));
  },
  sad() { tone(440, 0, 0.3, 'sine', 0.25, 330); },
};

// ---- Music: a gentle looping melody, and a lullaby for nap time ----

const DAY_TUNE = [67, 64, 64, 65, 62, 62, 60, 62, 64, 65, 67, 67, 67, 0, 67, 64, 64, 65, 62, 62, 60, 64, 67, 67, 60, 0];
const LULLABY = [64, 64, 67, 0, 64, 64, 67, 0, 64, 67, 72, 71, 69, 69, 67, 0, 62, 64, 65, 62, 62, 64, 65, 0];
let timer: number | null = null;
let current: number[] | null = null;

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

function playLoop(notes: number[], beat: number, vol: number) {
  stopMusic();
  current = notes;
  let i = 0;
  const step = () => {
    if (!musicOn || current !== notes) return;
    const n = notes[i % notes.length];
    if (n) tone(midi(n), 0, beat * 1.6, 'triangle', vol);
    if (i % 4 === 0 && n) tone(midi(n - 12), 0, beat * 3, 'sine', vol * 0.6);
    i++;
    timer = window.setTimeout(step, beat * 1000);
  };
  step();
}

export function playDayMusic() { if (musicOn) playLoop(DAY_TUNE, 0.32, 0.05); }
export function playLullaby() { if (musicOn) playLoop(LULLABY, 0.6, 0.09); }
export function stopMusic() {
  if (timer) clearTimeout(timer);
  timer = null;
  current = null;
}
export function setMusic(on: boolean) {
  musicOn = on;
  if (!on) stopMusic();
}
export function isMusicOn() { return musicOn; }

/** Browsers only allow audio after a user gesture. */
export function unlockAudio() { ac(); }
