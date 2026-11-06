import Phaser from 'phaser';
import { drawBuilding, prop } from '../world/draw';
import { ROOM_W, WORLD_W, roomX, roomIndexAt, FLOOR_MIN_Y } from '../lib/rooms';
import { Walker } from '../objects/Walker';
import { Kid, KIDS, type Need } from '../objects/Kid';
import { bus, state, addStars, prompt } from '../lib/state';
import { say } from '../lib/voice';

type Item = { id: 'teddy' | 'tray'; img: Phaser.GameObjects.Image; home: { x: number; y: number } };

const SCHEDULE: { at: number; kind: 'meal' | 'say'; name: string; text: string }[] = [
  { at: 9 * 60, kind: 'meal', name: 'Śniadanie', text: 'Czas na śniadanie! Dzieci idą do jadalni. Zrób kanapki w kuchni.' },
  { at: 10 * 60 + 30, kind: 'say', name: 'Zabawa', text: 'Czas na zabawę!' },
  { at: 13 * 60, kind: 'meal', name: 'Podwieczorek', text: 'Czas na podwieczorek! Dzieci idą do jadalni. Zrób kanapki w kuchni.' },
  { at: 15 * 60 + 30, kind: 'say', name: 'Zabawa', text: 'Rodzice niedługo przyjdą.' },
];
const DAY_END = 16 * 60;
const CLOCK_SPEED = 1.5; // game minutes per real second

export class WorldScene extends Phaser.Scene {
  teacher!: Walker;
  kids: Kid[] = [];
  holding: Kid | null = null;
  carrying: Item | null = null;
  items: Item[] = [];
  private keys!: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd', Phaser.Input.Keyboard.Key>;
  private roomIdx = -1;
  private needTimer = 15000;
  private nextSchedule = 0;
  private toilets: { img: Phaser.GameObjects.Image; kid: Kid | null; flushReady: boolean }[] = [];
  private crumbs: Phaser.GameObjects.Container[] = [];
  private plates: Phaser.GameObjects.Image[] = [];
  private seats: { x: number; y: number }[] = [];

  constructor() {
    super('World');
  }

  create() {
    this.kids = [];
    this.items = [];
    this.toilets = [];
    this.crumbs = [];
    this.plates = [];
    this.holding = null;
    this.carrying = null;

    drawBuilding(this);
    this.cameras.main.setBounds(0, 0, WORLD_W, 900);

    const sala = roomX('sala');
    this.teacher = new Walker(this, sala + 300, 760, 'teacher', 210, 540);
    this.teacher.setInteractive(new Phaser.Geom.Rectangle(-80, -200, 160, 210), Phaser.Geom.Rectangle.Contains);
    this.teacher.on('pointerdown', () => this.letGo());
    this.cameras.main.startFollow(this.teacher, true, 0.08, 0);

    KIDS.forEach((def, i) => {
      const kid = new Kid(this, sala + 500 + i * 220, 680 + (i % 2) * 90, def);
      kid.on('pointerdown', () => this.clickKid(kid));
      kid.on('pointerover', () => say(kid.needText()));
      this.kids.push(kid);
    });

    this.buildStations();

    // Clicking empty floor walks there.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: unknown[]) => {
      if (over.length > 0) return;
      if (p.worldY < FLOOR_MIN_Y - 120) return; // clicks on the wall do nothing
      this.teacher.walkTo(p.worldX, p.worldY);
    });

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('up,down,left,right,w,a,s,d') as typeof this.keys;

    bus.on('goto', this.onGoto, this);
    bus.on('minigame-done', this.onMinigameDone, this);
    this.events.once('shutdown', () => {
      bus.off('goto', this.onGoto, this);
      bus.off('minigame-done', this.onMinigameDone, this);
    });

    this.time.delayedCall(600, () => prompt('Dzień dobry! Dzieci bawią się w sali. Kliknij, żeby chodzić.'));
  }

  // ---------- Stations & items ----------

  private clickable(img: Phaser.GameObjects.Image, onClick: () => void, hover?: string) {
    img.setInteractive({ useHandCursor: true });
    img.on('pointerdown', onClick);
    img.on('pointerover', () => {
      img.setTint(0xfff0b0);
      if (hover) say(hover);
    });
    img.on('pointerout', () => img.clearTint());
    return img;
  }

  private buildStations() {
    // Teddy bear on the couch
    const p = roomX('sala');
    const teddy = prop(this, 'teddy', p + 1250, 600, 100, 660);
    const teddyItem: Item = { id: 'teddy', img: teddy, home: { x: teddy.x, y: teddy.y } };
    this.items.push(teddyItem);
    this.clickable(teddy, () => this.clickItem(teddyItem), 'Miś');

    // Toilets
    const l = roomX('lazienka');
    [l + 330, l + 650].forEach((x) => {
      const img = prop(this, 'toilet', x, 650, 180);
      const t = { img, kid: null as Kid | null, flushReady: false };
      this.toilets.push(t);
      this.clickable(img, () => this.teacher.walkTo(x + 130, 700, () => this.useToilet(t)), 'Toaleta');
    });

    // Sink
    const sink = this.add.zone(l + 1070, 440, 240, 160).setInteractive({ useHandCursor: true });
    sink.on('pointerdown', () => this.teacher.walkTo(l + 1180, 700, () => this.useSink()));
    sink.on('pointerover', () => say('Umywalka'));
    prop(this, 'soap', l + 1150, 440, 60, -50);

    // Kitchen counter (sandwiches) and drinks table
    const k = roomX('kuchnia');
    const breadImg = prop(this, 'bread', k + 420, 470, 120, 615);
    prop(this, 'cheese', k + 560, 470, 90, 615);
    prop(this, 'tomato', k + 670, 470, 80, 615);
    prop(this, 'pan', k + 900, 470, 120, 615);
    this.clickable(breadImg, () => this.teacher.walkTo(k + 520, 700, () => this.openKitchen('Sandwich')), 'Robimy kanapki');
    const pot = prop(this, 'teapot', k + 1185, 480, 120, 615);
    this.clickable(pot, () => this.teacher.walkTo(k + 1185, 700, () => this.openKitchen('Pour')), 'Nalewamy picie');

    // Dining seats (behind the table)
    const j = roomX('jadalnia');
    this.seats = [0, 1, 2, 3].map((i) => ({ x: j + 520 + i * 190, y: 600 }));
    const tableHit = this.add.zone(j + 800, 600, 760, 120).setDepth(651).setInteractive({ useHandCursor: true });
    tableHit.on('pointerdown', () => this.teacher.walkTo(Phaser.Math.Clamp(this.teacher.x, j + 450, j + 1150), 690, () => this.useTable()));
  }

  private clickItem(item: Item) {
    if (this.carrying === item) {
      this.dropItem();
      return;
    }
    this.teacher.walkTo(item.img.x, item.img.y + 80, () => {
      if (this.carrying) this.dropItem();
      this.carrying = item;
      say(item.id === 'teddy' ? 'Mam misia!' : 'Mam tacę!');
    });
  }

  private dropItem() {
    const item = this.carrying;
    if (!item) return;
    this.carrying = null;
    if (item.id === 'tray') {
      // The tray can only go on the table, so it goes back to the counter.
      this.tweens.add({ targets: item.img, x: item.home.x, y: item.home.y, duration: 400 });
      prompt('Tacę trzeba zanieść do jadalni i kliknąć stół.');
    } else {
      item.img.setPosition(this.teacher.x + 60, this.teacher.y).setDepth(this.teacher.y);
    }
  }

  // ---------- Kids ----------

  private clickKid(kid: Kid) {
    if (this.holding === kid) {
      this.letGo();
      return;
    }
    if (kid.mode === 'busy') {
      say(kid.needText());
      return;
    }
    // Give the teddy to a sad child
    if (this.carrying?.id === 'teddy' && kid.need === 'sad') {
      this.teacher.walkTo(kid.x + 110, kid.y + 5, () => this.giveTeddy(kid));
      return;
    }
    this.teacher.walkTo(kid.x + 110, kid.y + 5, () => {
      if (kid.mode === 'busy') return;
      if (this.holding) this.letGo();
      this.holding = kid;
      kid.mode = 'following';
      kid.stop();
      say(kid.need ? kid.needText() : `${kid.def.name}, chodź ze mną!`);
    });
  }

  private letGo() {
    if (!this.holding) {
      if (this.carrying) this.dropItem();
      return;
    }
    this.holding.mode = 'free';
    this.holding.stop();
    this.holding = null;
  }

  private giveTeddy(kid: Kid) {
    const item = this.carrying!;
    this.carrying = null;
    item.img.setPosition(kid.x + 50, kid.y - 40).setDepth(kid.y + 1);
    kid.setNeed(null);
    kid.cheer();
    addStars();
    say(`${kid.def.name} się uśmiecha! Brawo!`);
    // The teddy goes back to the couch after a cuddle.
    this.time.delayedCall(3500, () => {
      if (this.carrying === item) return;
      this.tweens.add({ targets: item.img, x: item.home.x, y: item.home.y, duration: 600, onComplete: () => item.img.setDepth(660) });
    });
  }

  private randomNeed() {
    if (state.meal.phase !== 'none') return;
    if (this.kids.filter((k) => k.need).length >= 2) return;
    const free = this.kids.filter((k) => !k.need && k.mode !== 'busy');
    if (!free.length) return;
    const kid = Phaser.Utils.Array.GetRandom(free);
    const need: Need = Math.random() < 0.6 ? 'potty' : 'sad';
    kid.setNeed(need);
    prompt(kid.needText());
  }

  // ---------- Bathroom ----------

  private useToilet(t: (typeof this.toilets)[number]) {
    if (t.flushReady && t.kid) {
      this.flush(t);
      return;
    }
    if (t.kid) {
      prompt('Poczekaj chwilkę...');
      return;
    }
    const kid = this.holding;
    if (!kid) {
      prompt('Przyprowadź tu dziecko, które musi iść do toalety.');
      return;
    }
    if (kid.need !== 'potty') {
      say(`${kid.def.name} nie musi teraz siusiu.`);
      return;
    }
    this.letGo();
    kid.mode = 'busy';
    t.kid = kid;
    kid.walkTo(t.img.x, 625, () => {
      kid.setNeed(null);
      kid.setDepth(t.img.depth + 1);
      this.time.delayedCall(2500, () => {
        t.flushReady = true;
        const s = this.add.image(t.img.x, t.img.y - 200, 'sparkles').setDisplaySize(80, 80).setDepth(2000);
        this.tweens.add({ targets: s, alpha: 0, y: s.y - 60, duration: 900, onComplete: () => s.destroy() });
        prompt('Gotowe! Kliknij toaletę, żeby spłukać wodę.');
      });
    }, true);
  }

  private flush(t: (typeof this.toilets)[number]) {
    const kid = t.kid!;
    t.kid = null;
    t.flushReady = false;
    for (let i = 0; i < 6; i++) {
      const d = this.add.image(t.img.x + Phaser.Math.Between(-40, 40), t.img.y - 80, 'drop').setDisplaySize(40, 40).setDepth(2000);
      this.tweens.add({ targets: d, y: d.y - 120, alpha: 0, angle: 180, delay: i * 70, duration: 700, onComplete: () => d.destroy() });
    }
    this.tweens.add({ targets: t.img, angle: { from: -3, to: 3 }, duration: 80, yoyo: true, repeat: 3, onComplete: () => t.img.setAngle(0) });
    kid.mode = 'free';
    kid.walkTo(t.img.x + 120, 720);
    kid.setNeed('wash');
    prompt(`Teraz ${kid.def.name} musi umyć rączki przy umywalce.`);
  }

  private useSink() {
    const kid = this.holding;
    if (!kid) {
      prompt('Przyprowadź dziecko do umywalki.');
      return;
    }
    if (kid.need !== 'wash') {
      say('Rączki są już czyste!');
      return;
    }
    this.letGo();
    kid.mode = 'busy';
    const l = roomX('lazienka');
    kid.walkTo(l + 1070, 640, () => {
      prompt('Kliknij wszystkie bańki mydlane!');
      let left = 6;
      for (let i = 0; i < 6; i++) {
        const bub = this.add
          .circle(kid.x + Phaser.Math.Between(-90, 90), kid.y - Phaser.Math.Between(40, 170), Phaser.Math.Between(26, 40), 0xdff4ff, 0.85)
          .setStrokeStyle(4, 0xffffff)
          .setDepth(3000)
          .setInteractive({ useHandCursor: true });
        this.tweens.add({ targets: bub, y: bub.y - 15, duration: 800 + i * 90, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        bub.on('pointerdown', () => {
          bub.disableInteractive();
          this.tweens.add({ targets: bub, scale: 1.6, alpha: 0, duration: 200, onComplete: () => bub.destroy() });
          left--;
          if (left === 0) {
            kid.setNeed(null);
            kid.mode = 'free';
            kid.cheer();
            addStars();
            say(`Czyste rączki! Brawo!`);
          }
        });
      }
    }, true);
  }

  // ---------- Meals ----------

  private startMeal(name: string, text: string) {
    state.meal = { phase: 'cooking', name, sandwiches: false, drinks: false };
    if (this.holding) this.letGo();
    prompt(text);
    this.kids.forEach((kid, i) => {
      // A sad child gets cheered up by the food anyway.
      kid.setNeed('hungry');
      kid.mode = 'busy';
      kid.walkTo(this.seats[i].x, this.seats[i].y, null, true);
    });
  }

  private openKitchen(which: 'Sandwich' | 'Pour') {
    const m = state.meal;
    if (m.phase !== 'cooking') {
      prompt(m.phase === 'none' ? 'Teraz nie jest pora jedzenia. Pobaw się z dziećmi!' : 'Jedzenie jest już gotowe!');
      return;
    }
    if (which === 'Sandwich' && m.sandwiches) return prompt('Kanapki są gotowe! Teraz picie.');
    if (which === 'Pour' && m.drinks) return prompt('Picie jest gotowe! Teraz kanapki.');
    this.teacher.stop();
    this.scene.pause();
    bus.emit('minigame', true);
    this.scene.launch(which);
  }

  private onMinigameDone(which: 'Sandwich' | 'Pour' | null) {
    this.scene.resume();
    bus.emit('minigame', false);
    if (!which) return;
    const m = state.meal;
    if (which === 'Sandwich') m.sandwiches = true;
    if (which === 'Pour') m.drinks = true;
    if (m.sandwiches && m.drinks) {
      m.phase = 'serving';
      const k = roomX('kuchnia');
      const tray = prop(this, 'plate', k + 620, 470, 130, 616);
      const s = this.add.image(0, 0, 'sandwich').setDisplaySize(80, 80);
      tray.setData('topping', s);
      const item: Item = { id: 'tray', img: tray, home: { x: tray.x, y: tray.y } };
      this.items.push(item);
      this.clickable(tray, () => this.clickItem(item), 'Taca z jedzeniem');
      prompt('Wszystko gotowe! Weź tacę i zanieś ją do jadalni.');
    } else {
      prompt(which === 'Sandwich' ? 'Super kanapki! Teraz nalej picie przy dzbanku.' : 'Picie gotowe! Teraz zrób kanapki na blacie.');
    }
  }

  private useTable() {
    const m = state.meal;
    if (m.phase === 'serving' && this.carrying?.id === 'tray') {
      const item = this.carrying;
      this.carrying = null;
      item.img.getData('topping')?.destroy();
      item.img.destroy();
      this.items = this.items.filter((i) => i !== item);
      this.serve();
    } else if (m.phase === 'serving') {
      prompt('Przynieś tacę z kuchni.');
    } else if (m.phase === 'cooking') {
      prompt('Dzieci czekają. Idź do kuchni i przygotuj jedzenie.');
    }
  }

  private serve() {
    state.meal.phase = 'eating';
    prompt('Smacznego!');
    this.plates = [];
    this.seats.forEach((seat, i) => {
      const plate = this.add.image(seat.x, 572, 'sandwich').setDisplaySize(80, 80).setDepth(660).setScale(0);
      const cup = this.add.image(seat.x + 60, 562, 'milk').setDisplaySize(55, 55).setDepth(660);
      this.tweens.add({ targets: plate, scale: 80 / 256, duration: 300, delay: i * 150, ease: 'Back.out' });
      this.plates.push(plate, cup);
    });
    // Kids eat, then leave crumbs behind.
    this.time.delayedCall(1200, () => {
      this.plates.forEach((p, i) => this.tweens.add({ targets: p, scale: 0, duration: 2200, delay: i * 120, ease: 'Quad.in' }));
    });
    this.time.delayedCall(4000, () => {
      this.plates.forEach((p) => p.destroy());
      this.plates = [];
      this.kids.forEach((kid) => {
        kid.setNeed(null);
        kid.cheer();
        addStars();
      });
      this.time.delayedCall(900, () => this.afterMeal());
    });
  }

  private afterMeal() {
    state.meal.phase = 'cleaning';
    const sala = roomX('sala');
    this.kids.forEach((kid, i) => {
      kid.walkTo(sala + 400 + i * 230, 700 + (i % 2) * 80, () => (kid.mode = 'free'));
    });
    const j = roomX('jadalnia');
    const spots = [
      { x: j + 560, y: 575 }, { x: j + 800, y: 580 }, { x: j + 1040, y: 575 },
      { x: j + 650, y: 700 }, { x: j + 980, y: 720 },
    ];
    spots.forEach((s) => {
      const c = this.add.container(s.x, s.y).setDepth(s.y < 620 ? 661 : 5);
      for (let i = 0; i < 6; i++) c.add(this.add.circle(Phaser.Math.Between(-38, 38), Phaser.Math.Between(-10, 10), Phaser.Math.Between(7, 12), 0xb8732e));
      c.setSize(110, 60).setInteractive({ useHandCursor: true });
      c.on('pointerdown', () => this.teacher.walkTo(s.x + 60, Math.max(s.y + 100, 690), () => this.wipe(c)));
      this.crumbs.push(c);
    });
    prompt('Mniam! Teraz posprzątaj okruszki. Kliknij każdy bałagan.');
  }

  private wipe(c: Phaser.GameObjects.Container) {
    if (!c.active) return;
    c.disableInteractive();
    const sponge = this.add.image(c.x - 40, c.y - 10, 'sponge').setDisplaySize(80, 80).setDepth(3000);
    this.tweens.add({
      targets: sponge, x: c.x + 40, duration: 140, yoyo: true, repeat: 3,
      onComplete: () => {
        sponge.destroy();
        this.tweens.add({ targets: c, alpha: 0, duration: 250, onComplete: () => c.destroy() });
        this.crumbs = this.crumbs.filter((x) => x !== c);
        addStars();
        if (this.crumbs.length === 0) {
          state.meal.phase = 'none';
          say('Czysto! Brawo!');
        }
      },
    });
  }

  // ---------- Navigation ----------

  private onGoto(idx: number) {
    this.teacher.walkTo(idx * ROOM_W + ROOM_W / 2, this.teacher.y);
  }

  // ---------- Loop ----------

  update(_t: number, deltaMs: number) {
    const dt = Math.min(deltaMs / 1000, 0.1);
    const k = this.keys;
    const dx = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
    const dy = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
    this.teacher.nudge(dx, dy, dt);
    this.teacher.step(dt);

    for (const kid of this.kids) kid.update(dt, this.teacher);

    if (this.carrying) {
      const img = this.carrying.img;
      img.setPosition(this.teacher.x + (this.teacher.sprite.flipX ? 70 : -70), this.teacher.y - 120 + this.teacher.sprite.y);
      img.setDepth(this.teacher.depth + 1);
      const top = img.getData('topping') as Phaser.GameObjects.Image | undefined;
      top?.setPosition(img.x, img.y - 70).setDepth(img.depth + 1);
    } else {
      for (const it of this.items) {
        const top = it.img.getData('topping') as Phaser.GameObjects.Image | undefined;
        top?.setPosition(it.img.x, it.img.y - 70).setDepth(it.img.depth + 1);
      }
    }

    // Room change → banner + voice
    const r = roomIndexAt(this.teacher.x);
    if (r !== this.roomIdx) {
      this.roomIdx = r;
      bus.emit('room', r);
    }

    // Which rooms have a child that needs help (for the HUD map)
    bus.emit('needs', [...new Set(this.kids.filter((k) => k.need).map((k) => k.roomIndex))]);

    // Random needs between meals
    this.needTimer -= deltaMs;
    if (this.needTimer <= 0) {
      this.needTimer = Phaser.Math.Between(20000, 35000);
      this.randomNeed();
    }

    // Gentle clock: stands still during meals so there's never a rush.
    if (state.meal.phase === 'none') {
      state.minutes += dt * CLOCK_SPEED;
      const ev = SCHEDULE[this.nextSchedule];
      if (ev && state.minutes >= ev.at && this.kids.every((k) => k.mode !== 'busy')) {
        this.nextSchedule++;
        if (ev.kind === 'meal') this.startMeal(ev.name, ev.text);
        else prompt(ev.text);
      }
      if (state.minutes >= DAY_END) this.endDay();
      bus.emit('clock', state.minutes);
    }
  }

  private endDay() {
    state.minutes = 8 * 60;
    state.day++;
    this.nextSchedule = 0;
    prompt(`Koniec dnia! Masz już ${state.stars} gwiazdek. Zaczynamy dzień numer ${state.day}!`);
  }
}
