import Phaser from 'phaser';
import type { WorldScene, Module, Item } from '../scenes/WorldScene';
import type { Kid } from '../objects/Kid';
import { roomX } from '../lib/rooms';
import { prop } from './draw';
import { addStars, prompt, save, persist, state } from '../lib/state';
import { say } from '../lib/voice';
import { sfx } from '../lib/sound';
import { drawPicture, CARD_PICTURE } from './pictures';
import { stat, befriend } from './progress';
import type { EmojiKey } from '../lib/assets';

const TOYS: EmojiKey[] = ['ball', 'train', 'dino', 'blocks', 'teddy'];

/** Teddy for sad kids, toy fights, and the craft table. */
export class Playroom implements Module {
  private teddy!: Item;
  private fight: { a: Kid; b: Kid; toy: Phaser.GameObjects.Image } | null = null;
  private frames: Phaser.GameObjects.Container[] = [];

  constructor(private w: WorldScene) {
    const p = roomX('sala');

    // Teddy bear on the couch
    const img = prop(w, 'teddy', p + 1250, 600, 100, 660);
    this.teddy = { id: 'teddy', img, home: { x: img.x, y: img.y } };
    w.items.push(this.teddy);
    w.clickable(img, () => this.clickTeddy(), 'Miś');

    // Craft table
    const g = w.add.graphics().setDepth(690);
    g.fillStyle(0xffd45c, 1).fillRoundedRect(p + 480, 640, 360, 30, 10);
    g.fillStyle(0xe0b440, 1).fillRect(p + 500, 670, 24, 90).fillRect(p + 796, 670, 24, 90);
    prop(w, 'palette', p + 560, 650, 90, 691);
    prop(w, 'crayon', p + 680, 650, 70, 691);
    prop(w, 'picture', p + 770, 650, 70, 691);
    const zone = w.add.zone(p + 660, 615, 340, 70).setDepth(692);
    w.clickable(zone, () => w.goThen(p + 660, 780, () => this.useTable()), 'Stolik do rysowania');

    this.renderDrawings();
  }

  // ---------- Teddy ----------

  private clickTeddy() {
    const w = this.w;
    if (w.carrying === this.teddy) return w.dropItem();
    w.goThen(this.teddy.img.x, this.teddy.img.y + 80, () => {
      w.pickUp(this.teddy);
      say('Mam misia!');
    });
  }

  private giveTeddy(kid: Kid) {
    const w = this.w;
    const item = this.teddy;
    w.carrying = null;
    item.img.setInteractive({ useHandCursor: true });
    if (w.holding === kid) w.letGo();
    item.img.setPosition(kid.x + 50, kid.y - 40).setDepth(kid.y + 1);
    kid.setNeed(null);
    kid.cheer();
    sfx.giggle();
    addStars();
    befriend(kid);
    w.today.comforted(kid);
    say(`${kid.def.name} się uśmiecha! Brawo!`);
    w.time.delayedCall(3500, () => {
      if (w.carrying === item) return;
      w.tweens.add({ targets: item.img, x: item.home.x, y: item.home.y, duration: 600, onComplete: () => item.img.setDepth(660) });
    });
  }

  // ---------- Fights ----------

  startFight(free: Kid[]) {
    const w = this.w;
    const [a, b] = Phaser.Utils.Array.Shuffle([...free]).slice(0, 2) as Kid[];
    const p = roomX('sala');
    const x = p + Phaser.Math.Between(300, 1000);
    const y = 760;
    const toyKey = Phaser.Utils.Array.GetRandom(TOYS.filter((t) => t !== 'teddy'));
    const toy = prop(w, toyKey, x, y + 10, 90);
    this.fight = { a, b, toy };
    a.mode = 'busy';
    b.mode = 'busy';
    a.walkTo(x - 110, y, () => (a.mode = 'free'));
    b.walkTo(x + 110, y, () => (b.mode = 'free'));
    a.setNeed('fight');
    b.setNeed('fight');
    sfx.wrong();
    prompt(`${a.def.name} i ${b.def.name} kłócą się o zabawkę! Idź do sali i pomóż.`);
    w.tweens.add({ targets: toy, angle: { from: -10, to: 10 }, duration: 160, yoyo: true, repeat: 8, onComplete: () => toy.setAngle(0) });
  }

  private solveFight() {
    const w = this.w;
    const f = this.fight!;
    w.openScene<number>('Choice', {
      title: `${f.a.def.name} i ${f.b.def.name} chcą tę samą zabawkę. Co zrobisz?`,
      options: [
        { key: 'gift', label: 'Dam drugą zabawkę' },
        { key: 'hourglass', label: 'Po kolei' },
        { key: 'handshake', label: 'Bawcie się razem' },
      ],
    }, (choice) => {
      const say2 = [
        `Teraz każdy ma swoją zabawkę!`,
        `Najpierw ${f.a.def.name}, potem ${f.b.def.name}. Czekamy na swoją kolej!`,
        `Razem jest weselej!`,
      ][choice ?? 2];
      if (choice === 0) {
        const extra = prop(w, Phaser.Utils.Array.GetRandom(TOYS.filter((t) => t !== f.toy.texture.key && t !== 'teddy')), f.b.x + 40, f.b.y + 10, 90);
        w.time.delayedCall(6000, () => w.tweens.add({ targets: extra, alpha: 0, duration: 500, onComplete: () => extra.destroy() }));
      } else if (choice === 1) {
        w.puff('hourglass', f.toy.x, f.toy.y - 120, 1, 90);
      } else {
        w.puff('handshake', f.toy.x, f.toy.y - 150, 1, 100);
      }
      [f.a, f.b].forEach((k) => {
        k.setNeed(null);
        k.mode = 'free';
        k.cheer();
        befriend(k);
      });
      sfx.giggle();
      addStars();
      prompt(say2);
      w.time.delayedCall(6000, () => w.tweens.add({ targets: f.toy, alpha: 0, duration: 500, onComplete: () => f.toy.destroy() }));
      this.fight = null;
    });
  }

  // ---------- Crafts ----------

  /** The craft table: draw alone, draw or model clay with a child, or a holiday card. */
  private useTable() {
    const w = this.w;
    const kid = w.holding;
    if (this.clayKid) return this.clayStep();
    if (w.today.wantsCard()) {
      this.openCraft((drew) => drew && w.today.cardDone(), CARD_PICTURE, true);
      return;
    }
    if (kid && w.play.wantsToDraw(kid)) {
      w.takeHeld();
      kid.mode = 'busy';
      kid.walkTo(roomX('sala') + 560, 720, () => this.openCraft((drew) => {
        if (drew) w.play.finishDrawing(kid);
        else kid.mode = 'free';
      }));
      return;
    }
    if (kid && kid.need === 'play' && kid.wish === 'clay') {
      w.takeHeld();
      kid.mode = 'busy';
      this.clayKid = kid;
      this.clayN = 0;
      kid.walkTo(roomX('sala') + 560, 720, () => prompt('Lepimy z plasteliny! Kliknij stolik trzy razy.'));
      return;
    }
    if (kid?.need === 'play') {
      say(`${kid.def.name} chce czegoś innego. Popatrz na dymek!`);
      return;
    }
    this.openCraft();
  }

  // ---------- Clay ----------
  private clayKid: Kid | null = null;
  private clayN = 0;
  private clayShapes: Phaser.GameObjects.Image[] = [];

  private clayStep() {
    const w = this.w;
    const kid = this.clayKid!;
    if (kid.moving) return;
    const p = roomX('sala');
    const shapes: EmojiKey[] = ['snail', 'cat', 'dog'];
    const names = ['Ślimak!', 'Kotek!', 'Piesek!'];
    const img = prop(w, shapes[this.clayN], p + 600 + this.clayN * 70, 640, 10, 693).setTint(0xffc9a8);
    w.tweens.add({ targets: img, displayWidth: 70, displayHeight: 70, duration: 300, ease: 'Back.out' });
    this.clayShapes.push(img);
    sfx.pop();
    say(names[this.clayN]);
    this.clayN++;
    if (this.clayN >= 3) {
      this.clayKid = null;
      w.play.finishClay(kid);
      w.time.delayedCall(5000, () => {
        this.clayShapes.forEach((c) => w.tweens.add({ targets: c, alpha: 0, duration: 400, onComplete: () => c.destroy() }));
        this.clayShapes = [];
      });
    }
  }

  waiting(kid: Kid): string | null {
    if (this.clayKid === kid) return `${kid.def.name} lepi z plasteliny. Kliknij stolik do rysowania.`;
    return null;
  }

  // ---------- Mess: toys all over the floor ----------
  private mess: Phaser.GameObjects.Image[] = [];

  startMess() {
    const w = this.w;
    if (this.mess.length) return;
    const p = roomX('sala');
    const toys: EmojiKey[] = ['blocks', 'puzzle', 'books', 'teddy', 'dino', 'unicorn', 'train', 'ball'];
    this.mess = toys.map((k) => {
      const img = prop(w, k, p + Phaser.Math.Between(150, 1450), Phaser.Math.Between(650, 760), 70);
      img.setAngle(Phaser.Math.Between(-40, 40));
      w.clickable(img, () => w.goThen(img.x + 80, Math.max(img.y + 30, 700), () => this.tidy()), 'Bałagan');
      return img;
    });
    sfx.wrong();
    prompt('Ojej, ale bałagan w sali! Kliknij zabawki, żeby je posprzątać.');
  }

  private tidy() {
    if (!this.mess.length) return;
    const keys = this.mess.map((m) => m.texture.key);
    this.w.openScene<boolean>('Sort', { toys: keys }, (ok) => {
      if (!ok) return;
      this.mess.forEach((m) => m.destroy());
      this.mess = [];
      stat('tidy');
      addStars();
      prompt('Porządek! Wszystkie zabawki są na swoim miejscu.');
    });
  }

  blocker(): string | null {
    return this.mess.length ? 'w sali jest bałagan. Kliknij zabawki na podłodze i posprzątaj.' : null;
  }

  openCraft(after?: (drew: boolean) => void, picture?: number, anyPhase = false) {
    if (state.phase !== 'free' && !anyPhase) {
      after?.(false);
      return prompt('Porysujemy później, teraz mamy inne zajęcie.');
    }
    const idx = picture ?? save.drawings.length % CARD_PICTURE;
    this.w.openScene<string | null>('Craft', { picture: idx }, (result) => {
      if (!result) {
        after?.(false);
        return;
      }
      save.drawings.push(result);
      if (save.drawings.length > 8) save.drawings.shift();
      persist();
      this.renderDrawings();
      stat('drawings');
      if (picture === undefined) {
        addStars(2);
        prompt('Piękny rysunek! Wisi już na ścianie w sali.');
      }
      after?.(true);
    });
  }

  /** Finished drawings hang in frames on the playroom wall. */
  private renderDrawings() {
    const w = this.w;
    this.frames.forEach((f) => f.destroy());
    const p = roomX('sala');
    this.frames = save.drawings.slice(-8).map((code, i) => {
      const x = p + 540 + (i % 4) * 110;
      const y = 200 + Math.floor(i / 4) * 130;
      const c = w.add.container(x, y).setDepth(-60);
      const g = w.add.graphics();
      g.fillStyle(0xb5835a, 1).fillRect(-48, -53, 96, 106);
      g.fillStyle(0xffffff, 1).fillRect(-40, -45, 80, 90);
      c.add(g);
      const pic = w.add.graphics();
      drawPicture(pic, code, 80 / 400);
      pic.setPosition(-40, -45);
      c.add(pic);
      return c;
    });
  }

  onKidClick(kid: Kid): boolean {
    const w = this.w;
    if (w.carrying?.id === 'teddy' && kid.need === 'sad' && kid.mode !== 'busy') {
      w.goThen(kid.x + 110, kid.y + 5, () => this.giveTeddy(kid));
      return true;
    }
    if (kid.need === 'sad' && !w.carrying && w.holding !== kid) {
      // Gentle reminder of what helps
      say(kid.needText());
    }
    if (kid.need === 'fight' && this.fight && (kid === this.fight.a || kid === this.fight.b)) {
      if (w.holding) w.letGo();
      w.goThen(this.fight.toy.x, this.fight.toy.y + 60, () => this.fight && this.solveFight());
      return true;
    }
    return false;
  }
}
