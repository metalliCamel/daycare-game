import Phaser from 'phaser';
import type { WorldScene, Module } from '../scenes/WorldScene';
import type { Kid } from '../objects/Kid';
import { Walker } from '../objects/Walker';
import { roomX } from '../lib/rooms';
import { prop } from './draw';
import { FONT, inkHex } from '../lib/layout';
import { addStars, prompt, save } from '../lib/state';
import { say } from '../lib/voice';
import { sfx } from '../lib/sound';
import { todaysEvent, eventTitle, stat, befriend, type DayEvent } from './progress';
import type { EmojiKey } from '../lib/assets';

const COSTUMES: { key: EmojiKey; girl: string; boy: string }[] = [
  { key: 'crown', girl: 'Jestem królewną!', boy: 'Jestem królem!' },
  { key: 'tophat', girl: 'Jestem czarodziejką!', boy: 'Jestem magikiem!' },
  { key: 'butterfly', girl: 'Jestem motylkiem! Frr, frr!', boy: 'Jestem motylkiem! Frr, frr!' },
  { key: 'helmet', girl: 'Jestem strażaczką!', boy: 'Jestem strażakiem!' },
  { key: 'gradcap', girl: 'Jestem panią profesor!', boy: 'Jestem profesorem!' },
  { key: 'mask', girl: 'Jestem aktorką!', boy: 'Jestem aktorem!' },
  { key: 'rabbit', girl: 'Jestem zajączkiem! Hop, hop!', boy: 'Jestem zajączkiem! Hop, hop!' },
  { key: 'dino', girl: 'Jestem dinozaurem! Rrrr!', boy: 'Jestem dinozaurem! Rrrr!' },
];

type Q = { q: string; options: { key: string; label: string }[]; correct: number };
const QUIZ: Record<string, { who: EmojiKey; name: string; hello: string; questions: Q[] }> = {
  strazak: {
    who: 'firefighter', name: 'strażak', hello: 'Dzień dobry! Jestem strażakiem. Mam dla was zagadki!',
    questions: [
      { q: 'Czym strażak gasi ogień?', options: [{ key: 'drop', label: 'Wodą' }, { key: 'cake', label: 'Tortem' }, { key: 'teddy', label: 'Misiem' }], correct: 0 },
      { q: 'Pod jaki numer dzwonimy, gdy potrzebujemy pomocy?', options: [{ key: 'phone', label: '7' }, { key: 'phone', label: '112' }, { key: 'phone', label: '100' }], correct: 1 },
      { q: 'Czym jeździ strażak?', options: [{ key: 'train', label: 'Pociągiem' }, { key: 'firetruck', label: 'Wozem strażackim' }, { key: 'rocket', label: 'Rakietą' }], correct: 1 },
    ],
  },
  lekarz: {
    who: 'doctor', name: 'lekarz', hello: 'Cześć dzieci! Jestem lekarzem. Sprawdźmy, co wiecie o zdrowiu!',
    questions: [
      { q: 'Co robimy przed jedzeniem?', options: [{ key: 'soap', label: 'Myjemy ręce' }, { key: 'ball', label: 'Gramy w piłkę' }, { key: 'sleepy', label: 'Idziemy spać' }], correct: 0 },
      { q: 'Co jest najzdrowsze?', options: [{ key: 'candy', label: 'Cukierek' }, { key: 'chocolate', label: 'Czekolada' }, { key: 'apple', label: 'Jabłko' }], correct: 2 },
      { q: 'Czym myjemy zęby?', options: [{ key: 'spoon', label: 'Łyżką' }, { key: 'toothbrush', label: 'Szczoteczką' }, { key: 'crayon', label: 'Kredką' }], correct: 1 },
    ],
  },
  bibliotekarka: {
    who: 'librarian', name: 'pani z biblioteki', hello: 'Dzień dobry! Przyszłam z biblioteki. Lubicie książki?',
    questions: [
      { q: 'Co robimy z książkami?', options: [{ key: 'books', label: 'Czytamy' }, { key: 'pot', label: 'Gotujemy' }, { key: 'ball', label: 'Kopiemy' }], correct: 0 },
      { q: 'Jak traktujemy książki?', options: [{ key: 'heart', label: 'Delikatnie' }, { key: 'knife', label: 'Wycinamy' }, { key: 'drop', label: 'Moczymy' }], correct: 0 },
      { q: 'Kto mieszka w bajce o trzech świnkach?', options: [{ key: 'unicorn', label: 'Jednorożec' }, { key: 'dog', label: 'Wilk' }, { key: 'fish', label: 'Rybka' }], correct: 1 },
    ],
  },
  mikolaj: {
    who: 'santa', name: 'Mikołaj', hello: 'Ho, ho, ho! Byliście grzeczni? Mam dla was prezenty!',
    questions: [
      { q: 'Kto przynosi prezenty w Mikołajki?', options: [{ key: 'santa', label: 'Mikołaj' }, { key: 'rabbit', label: 'Zajączek' }, { key: 'firefighter', label: 'Strażak' }], correct: 0 },
    ],
  },
};

/** Today's surprise: the morning board, costumes and crowns, and the 11:00 activity. */
export class Events implements Module {
  event: DayEvent;
  private kidsDone = new Set<Kid>();
  private guest: Walker | null = null;
  private tree: Phaser.GameObjects.Image | null = null;
  private active: string | null = null;

  constructor(private w: WorldScene) {
    this.event = todaysEvent();
    this.drawBoard();
  }

  /** The chalkboard in the cloakroom says what's special today. */
  private drawBoard() {
    const w = this.w;
    const s = roomX('szatnia');
    const { text, icon } = eventTitle(this.event);
    const g = w.add.graphics().setDepth(-75);
    g.fillStyle(0x8b5a2b, 1).fillRoundedRect(s + 1245, 100, 230, 225, 16);
    g.fillStyle(0x2f4f3f, 1).fillRoundedRect(s + 1257, 112, 206, 201, 10);
    w.add.text(s + 1360, 135, `Dzień ${save.day}`, { fontFamily: FONT, fontSize: '26px', fontStyle: '800', color: '#ffffff' }).setOrigin(0.5).setDepth(-74);
    w.add.image(s + 1360, 200, icon).setDisplaySize(72, 72).setDepth(-74);
    w.add
      .text(s + 1360, 272, text, { fontFamily: FONT, fontSize: '22px', fontStyle: '700', color: '#ffffff', align: 'center', wordWrap: { width: 190 } })
      .setOrigin(0.5).setDepth(-74);
  }

  /** Called when a child arrives in the morning. */
  dress(kid: Kid) {
    const e = this.event;
    if (e.kind === 'costume') {
      const i = save.group.indexOf(kid.def.id);
      kid.setCostume(COSTUMES[(i + save.day) % COSTUMES.length].key);
    }
    if (e.kind === 'birthday' && e.kidId === kid.def.id) kid.setCostume('crown');
  }

  /** Spoken in the morning together with the day's greeting. */
  intro(): string {
    const e = this.event;
    switch (e.kind) {
      case 'birthday': return `Dzisiaj są urodziny! Na podwieczorek zrobimy tort.`;
      case 'costume': return 'Dzisiaj jest dzień przebierańców! Dzieci przyjdą w strojach.';
      case 'newkid': return 'Dzisiaj przyjdzie do nas nowe dziecko. Bądźmy dla niego mili!';
      case 'guest': return `Dzisiaj przyjdzie do nas gość: ${QUIZ[e.guest].name}!`;
      case 'trip': return 'Dzisiaj idziemy na wycieczkę do parku!';
      case 'holiday': return `Dzisiaj jest ${eventTitle(e).text}!`;
      default: return '';
    }
  }

  /** First day: the new child is sad until comforted with the teddy, then hangs up the coat. */
  comforted(kid: Kid) {
    const e = this.event;
    if (e.kind !== 'newkid' || e.kidId !== kid.def.id || save.group.includes(kid.def.id)) return;
    save.group.push(kid.def.id);
    befriend(kid);
    befriend(kid);
    kid.setNeed('coat');
    prompt(`${kid.def.name} już się uśmiecha! Witaj w naszej grupie! Teraz kurtka na wieszak.`);
  }

  isNewKid(kid: Kid) {
    return this.event.kind === 'newkid' && this.event.kidId === kid.def.id && !save.group.includes(kid.def.id);
  }

  hasSpecial() {
    const e = this.event;
    return e.kind === 'costume' || e.kind === 'guest' || e.kind === 'holiday';
  }

  /** The special activity, late morning in the playroom. */
  startSpecial() {
    const w = this.w;
    w.setPhase('special');
    this.kidsDone.clear();
    const p = roomX('sala');
    const kids = w.presentKids;
    kids.forEach((kid, i) => {
      kid.mode = 'busy';
      kid.setNeed(null);
      kid.walkTo(p + 220 + i * 150, 740 + (i % 2) * 20, () => (kid.mode = 'busy'));
    });
    const e = this.event;
    sfx.doorbell();
    if (e.kind === 'costume') {
      this.active = 'parade';
      prompt('Pokaz przebrań! Kliknij każde dziecko, żeby pokazało swój strój.');
    } else if (e.kind === 'guest' || (e.kind === 'holiday' && e.id === 'mikolajki')) {
      this.active = 'guest';
      const key = e.kind === 'guest' ? e.guest : 'mikolaj';
      const info = QUIZ[key];
      this.guest = new Walker(w, p - 100, 650, info.who, 230, 260);
      this.guest.setSize(160, 230).setInteractive(new Phaser.Geom.Rectangle(0, -100, 160, 260), Phaser.Geom.Rectangle.Contains);
      this.guest.input!.cursor = 'pointer';
      this.guest.walkTo(p + 1150, 640);
      this.guest.on('pointerdown', () => w.goThen(p + 1000, 700, () => this.askQuiz(key)));
      prompt(`Przyszedł gość: ${info.name}! Dzieci siadają w sali. Kliknij gościa.`);
    } else if (e.kind === 'holiday' && e.id === 'wigilia') {
      this.active = 'tree';
      this.tree = prop(w, 'xmastree', p + 1050, 720, 300, 700);
      w.clickable(this.tree, () => w.goThen(p + 1000, 780, () => this.decorate('tree')), 'Choinka');
      prompt('Wigilia przedszkolna! Kliknij choinkę i ubierz ją razem z dziećmi.');
    } else if (e.kind === 'holiday' && e.id === 'wielkanoc') {
      this.active = 'eggs';
      this.tree = prop(w, 'easteregg', p + 1050, 720, 140, 700);
      w.clickable(this.tree, () => w.goThen(p + 1000, 780, () => this.decorate('egg')), 'Pisanki');
      prompt('Wielkanoc! Kliknij jajko i ozdabiamy pisanki.');
    } else if (e.kind === 'holiday') {
      this.active = 'card';
      const forWho = e.id === 'mama' ? 'dla mamy' : 'dla babci i dziadka';
      prompt(`${eventTitle(e).text}! Robimy laurkę ${forWho}. Kliknij stolik do rysowania.`);
    }
  }

  /** Craft table during a holiday: the card picture. */
  wantsCard() {
    return this.active === 'card';
  }

  cardDone() {
    if (this.active !== 'card') return;
    this.finish('Piękna laurka! Na pewno się ucieszą.');
  }

  private askQuiz(key: string) {
    const w = this.w;
    const info = QUIZ[key];
    if (this.active !== 'guest') return;
    say(info.hello);
    w.openScene<boolean>('Quiz', { who: info.who, questions: info.questions }, (ok) => {
      if (!ok) return;
      if (key === 'mikolaj') {
        // Presents for everyone
        w.presentKids.forEach((kid, i) => w.time.delayedCall(i * 300, () => {
          w.puff('gift2', kid.x, kid.y - 120, 1, 70);
          kid.cheer();
        }));
        stat('holiday');
      } else {
        stat('guests');
      }
      this.guest?.disableInteractive();
      this.guest?.walkTo(roomX('sala') - 200, 650, () => this.guest?.destroy());
      this.finish(key === 'mikolaj' ? 'Dziękujemy, Mikołaju! Do zobaczenia za rok!' : `Dziękujemy za wizytę! Do widzenia!`);
    });
  }

  private decorate(base: 'tree' | 'egg') {
    const w = this.w;
    const kids = w.presentKids.map((k) => k.def.id);
    const toppings: EmojiKey[] = base === 'tree' ? ['ornament', 'starxmas', 'bell', 'candy', 'ribbon'] : ['flower', 'heart', 'starxmas', 'butterfly', 'ribbon'];
    const orders = base === 'tree'
      ? [{ kidId: kids[0], toppings: ['ornament', 'bell', 'starxmas'] as EmojiKey[] }]
      : kids.slice(0, 3).map((kidId) => ({ kidId, toppings: Phaser.Utils.Array.Shuffle([...toppings]).slice(0, 2) as EmojiKey[] }));
    const dish = { kind: 'topping', id: base, name: base === 'tree' ? 'choinka' : 'pisanki', acc: base === 'tree' ? 'choinkę' : 'pisanki', icon: base === 'tree' ? 'xmastree' : 'easteregg', base, toppings } as const;
    w.openScene<boolean>('Top', { dish, orders }, (ok) => {
      if (!ok) return;
      stat('holiday');
      if (base === 'tree' && this.tree) {
        // Presents appear under the tree
        for (let i = 0; i < 4; i++) prop(w, 'gift2', this.tree.x - 120 + i * 80, 760, 70, 760);
        this.tree.disableInteractive();
      }
      this.finish(base === 'tree' ? 'Choinka ubrana! Wesołych Świąt!' : 'Piękne pisanki! Wesołych Świąt!');
    });
  }

  onKidClick(kid: Kid): boolean {
    if (this.active === 'parade' && kid.present) {
      if (this.kidsDone.has(kid)) {
        say(`${kid.def.name} już ${kid.adj('pokazała', 'pokazał')} swój strój.`);
        return true;
      }
      this.kidsDone.add(kid);
      const c = COSTUMES.find((x) => x.key === kid.costume);
      this.w.tweens.add({ targets: kid.sprite, angle: 360, duration: 600, onComplete: () => kid.sprite.setAngle(0) });
      kid.cheer();
      sfx.giggle();
      say(c ? (kid.def.girl ? c.girl : c.boy) : `${kid.def.name} ma piękny strój!`);
      befriend(kid);
      if (this.kidsDone.size >= this.w.presentKids.length) this.w.time.delayedCall(1500, () => this.finish('Brawo! Wszystkie stroje są piękne!'));
      return true;
    }
    if (this.active && this.w.presentKids.includes(kid)) {
      say(this.active === 'guest' ? 'Kliknij gościa!' : this.active === 'card' ? 'Kliknij stolik do rysowania.' : 'Kliknij ozdobę w sali.');
      return true;
    }
    return false;
  }

  waiting(): string | null {
    return null;
  }

  private finish(text: string) {
    const w = this.w;
    this.active = null;
    addStars(3);
    sfx.cheer();
    prompt(text);
    w.presentKids.forEach((k) => {
      k.mode = 'free';
      k.setNeed(null);
    });
    w.time.delayedCall(1500, () => w.backToFree(11 * 60 + 30));
  }
}
