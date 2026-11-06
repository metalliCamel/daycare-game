import Phaser from 'phaser';
import type { WorldScene, Module } from '../scenes/WorldScene';
import type { Kid } from '../objects/Kid';
import { roomX } from '../lib/rooms';
import { prop } from './draw';
import { addStars, prompt } from '../lib/state';
import { say, sayHover } from '../lib/voice';
import { sfx } from '../lib/sound';
import type { EmojiKey } from '../lib/assets';

export type PlayId = 'blocks' | 'puzzle' | 'ball' | 'books' | 'draw';

export const PLAY: Record<PlayId, { name: string; acc: string; icon: EmojiKey }> = {
  blocks: { name: 'klocki', acc: 'klocki', icon: 'blocks' },
  puzzle: { name: 'puzzle', acc: 'puzzle', icon: 'puzzle' },
  ball: { name: 'piłka', acc: 'piłkę', icon: 'ball' },
  books: { name: 'książeczka', acc: 'książeczkę', icon: 'books' },
  draw: { name: 'rysowanie', acc: 'rysowanie', icon: 'palette' },
};

const BOOK_PAGES: { key: EmojiKey; text: string }[] = [
  { key: 'fish', text: 'To jest rybka. Plum, plum!' },
  { key: 'dino', text: 'A to dinozaur. Rrrr!' },
  { key: 'unicorn', text: 'To jest jednorożec.' },
  { key: 'train', text: 'Ciuch, ciuch, jedzie pociąg!' },
  { key: 'rocket', text: 'Rakieta leci do gwiazd!' },
  { key: 'teddy', text: 'Miś idzie spać. Dobranoc, misiu!' },
];
const BLOCK_COLORS = [0xff5d5d, 0xffd45c, 0x4fa8ff, 0x6bd66b, 0x9b6bff];

type Spot = { id: PlayId; x: number; y: number; kidX: number; kidY: number; busy: Kid | null; obj: Phaser.GameObjects.Image | Phaser.GameObjects.Zone };

/** Kids in the playroom ask for different games; Hania brings them and plays along. */
export class PlayCorner implements Module {
  private spots = new Map<PlayId, Spot>();
  private tower: Phaser.GameObjects.Rectangle[] = [];
  private pieces: Phaser.GameObjects.Image[] = [];
  private page = 0;
  private bookPic: Phaser.GameObjects.Container | null = null;
  private throws = 0;

  constructor(private w: WorldScene) {
    const p = roomX('sala');
    const add = (id: PlayId, obj: Spot['obj'], x: number, y: number, kidX: number, kidY: number, hover: string) => {
      const spot: Spot = { id, x, y, kidX, kidY, busy: null, obj };
      this.spots.set(id, spot);
      w.clickable(obj, () => w.goThen(kidX + 130, Math.max(kidY + 20, 700), () => this.use(spot)), hover);
    };
    add('blocks', prop(w, 'blocks', p + 1420, 760, 110), p + 1420, 760, p + 1300, 720, 'Klocki');
    add('puzzle', prop(w, 'puzzle', p + 1060, 770, 95), p + 1060, 770, p + 960, 720, 'Puzzle');
    add('ball', prop(w, 'ball', p + 200, 760, 85), p + 200, 760, p + 330, 720, 'Piłka');
    add('books', w.add.zone(p + 300, 250, 320, 180).setDepth(-40), p + 300, 300, p + 300, 680, 'Książeczki');
    // Drawing uses the craft table owned by the playroom; this zone just routes kids there
    this.spots.set('draw', { id: 'draw', x: p + 660, y: 640, kidX: p + 600, kidY: 760, busy: null, obj: w.add.zone(0, 0, 1, 1) });
  }

  /** Pick a free child and ask for a game nobody else is playing. */
  ask(kid: Kid) {
    const taken = new Set(this.w.presentKids.filter((k) => k.need === 'play').map((k) => k.wish));
    const options = (Object.keys(PLAY) as PlayId[]).filter((id) => !taken.has(id) && !this.spots.get(id)!.busy);
    if (!options.length) return false;
    const id = Phaser.Utils.Array.GetRandom(options);
    kid.wish = id;
    kid.setNeed('play', PLAY[id].icon);
    prompt(kid.needText());
    return true;
  }

  /** Called by the craft table when a child who wants to draw is brought there. */
  wantsToDraw(kid: Kid | null) {
    return !!kid && kid.need === 'play' && kid.wish === 'draw';
  }

  finishDrawing(kid: Kid) {
    this.done(kid, 'Piękny rysunek!');
  }

  private use(spot: Spot) {
    const w = this.w;
    const kid = w.holding;
    if (spot.busy) {
      this.step(spot);
      return;
    }
    if (!kid) {
      sayHover(`${PLAY[spot.id].name.charAt(0).toUpperCase()}${PLAY[spot.id].name.slice(1)}. Przyprowadź dziecko, które chce się tym bawić.`);
      return;
    }
    if (kid.need === 'play' && kid.wish !== spot.id) {
      sfx.wrong();
      say(`${kid.def.name} chce czegoś innego. Popatrz na dymek!`);
      return;
    }
    w.takeHeld();
    kid.mode = 'busy';
    spot.busy = kid;
    kid.walkTo(spot.kidX, spot.kidY, () => this.begin(spot, kid));
  }

  private begin(spot: Spot, kid: Kid) {
    const w = this.w;
    switch (spot.id) {
      case 'blocks':
        this.tower.forEach((b) => b.destroy());
        this.tower = [];
        prompt('Budujemy wieżę! Kliknij klocki pięć razy.');
        break;
      case 'puzzle': {
        this.pieces.forEach((pc) => pc.destroy());
        const colors = [0xff9f9f, 0x9fd3ff, 0xfff09f, 0xa8f0a8];
        this.pieces = colors.map((c) => {
          const pc = w.add.image(spot.x + Phaser.Math.Between(-220, 220), spot.y - Phaser.Math.Between(30, 180), 'puzzle')
            .setDisplaySize(80, 80).setTint(c).setDepth(2900).setInteractive({ useHandCursor: true });
          w.tweens.add({ targets: pc, angle: { from: -15, to: 15 }, duration: 600, yoyo: true, repeat: -1 });
          pc.on('pointerdown', () => this.placePiece(spot, pc));
          return pc;
        });
        prompt('Ułóż puzzle! Kliknij każdy kawałek.');
        break;
      }
      case 'ball':
        this.throws = 0;
        prompt(`Rzucamy piłkę! Kliknij piłkę trzy razy, żeby rzucić ją do ${kid.def.gen}.`);
        break;
      case 'books':
        this.page = 0;
        prompt('Czytamy książeczkę! Klikaj półkę z książkami, żeby przewracać strony.');
        this.step(spot);
        break;
      default:
        break;
    }
  }

  /** One click on a station while a child is playing there. */
  private step(spot: Spot) {
    const w = this.w;
    const kid = spot.busy;
    if (!kid || kid.mode !== 'busy') return;
    switch (spot.id) {
      case 'blocks': {
        if (this.tower.length >= 5) return;
        const i = this.tower.length;
        const b = w.add.rectangle(spot.x - 60, spot.y - 30 - i * 44, 80, 40, BLOCK_COLORS[i]).setStrokeStyle(4, 0x4a3a5c, 0.6).setDepth(2900);
        b.setScale(0);
        w.tweens.add({ targets: b, scale: 1, duration: 200, ease: 'Back.out' });
        this.tower.push(b);
        sfx.pop();
        if (this.tower.length === 5) {
          say('Ale wysoka wieża!');
          w.time.delayedCall(600, () => {
            this.done(kid, 'Brawo! Wieża stoi!');
            // ...and then it tumbles down, to everyone's delight
            w.time.delayedCall(2500, () => {
              sfx.giggle();
              this.tower.forEach((t, k) => w.tweens.add({
                targets: t, y: spot.y - 20, x: t.x + Phaser.Math.Between(-90, 90), angle: Phaser.Math.Between(-90, 90),
                delay: k * 60, duration: 400, ease: 'Bounce.out',
              }));
              w.time.delayedCall(3500, () => {
                this.tower.forEach((t) => w.tweens.add({ targets: t, alpha: 0, duration: 400, onComplete: () => t.destroy() }));
                this.tower = [];
              });
            });
          });
        }
        break;
      }
      case 'ball': {
        this.throws++;
        const ball = spot.obj as Phaser.GameObjects.Image;
        const home = { x: spot.x, y: spot.y };
        sfx.boing();
        w.tweens.add({
          targets: ball, x: kid.x, y: kid.y - 90, duration: 350, ease: 'Sine.out', yoyo: true,
          onYoyo: () => sfx.boing(),
          onComplete: () => ball.setPosition(home.x, home.y),
        });
        say(['Hop!', 'Łap!', 'Super rzut!'][this.throws - 1] ?? 'Hop!');
        if (this.throws >= 3) w.time.delayedCall(800, () => this.done(kid, 'Świetnie się bawiliście!'));
        break;
      }
      case 'books': {
        if (this.page >= 3) return;
        const pg = BOOK_PAGES[(Phaser.Math.Between(0, BOOK_PAGES.length - 1) + this.page) % BOOK_PAGES.length];
        this.page++;
        this.bookPic?.destroy();
        const g = w.add.graphics();
        g.fillStyle(0xffffff, 1).fillRoundedRect(-110, -90, 220, 180, 20);
        g.lineStyle(6, 0xb5835a, 1).strokeRoundedRect(-110, -90, 220, 180, 20).lineBetween(0, -90, 0, 90);
        const img = w.add.image(0, 0, pg.key).setDisplaySize(140, 140);
        this.bookPic = w.add.container(kid.x, kid.y - 300, [g, img]).setDepth(2950).setScale(0);
        w.tweens.add({ targets: this.bookPic, scale: 1, duration: 300, ease: 'Back.out' });
        sfx.whoosh();
        say(pg.text);
        if (this.page >= 3) {
          w.time.delayedCall(2500, () => {
            this.bookPic?.destroy();
            this.bookPic = null;
            this.done(kid, 'Koniec bajki! Pięknie czytałaś.');
          });
        }
        break;
      }
      default:
        break;
    }
  }

  private placePiece(spot: Spot, pc: Phaser.GameObjects.Image) {
    const w = this.w;
    const kid = spot.busy;
    if (!kid) return;
    pc.disableInteractive();
    w.tweens.killTweensOf(pc);
    const i = this.pieces.filter((p) => !p.input?.enabled).length - 1;
    sfx.pop();
    w.tweens.add({ targets: pc, x: spot.x - 40 + (i % 2) * 80, y: spot.y - 140 + Math.floor(i / 2) * 80, angle: 0, duration: 300 });
    if (this.pieces.every((p) => !p.input?.enabled)) {
      w.time.delayedCall(500, () => {
        this.done(kid, 'Puzzle ułożone!');
        w.time.delayedCall(2500, () => {
          this.pieces.forEach((p) => w.tweens.add({ targets: p, alpha: 0, duration: 400, onComplete: () => p.destroy() }));
          this.pieces = [];
        });
      });
    }
  }

  private done(kid: Kid, text: string) {
    for (const s of this.spots.values()) if (s.busy === kid) s.busy = null;
    kid.setNeed(null);
    kid.mode = 'free';
    kid.cheer();
    sfx.giggle();
    addStars();
    say(text);
  }

  waiting(kid: Kid): string | null {
    for (const sp of this.spots.values()) {
      if (sp.busy === kid && sp.id !== 'draw') return `${kid.def.name} czeka przy zabawce: ${PLAY[sp.id].name}. Kliknij zabawkę, żeby się pobawić.`;
    }
    return null;
  }

  onKidClick(kid: Kid): boolean {
    // Clicking a child who is playing = keep playing with them
    for (const s of this.spots.values()) {
      if (s.busy === kid && s.id !== 'draw') {
        this.step(s);
        return true;
      }
    }
    return false;
  }
}
