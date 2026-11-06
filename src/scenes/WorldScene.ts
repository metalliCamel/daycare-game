import Phaser from 'phaser';
import { drawBuilding } from '../world/draw';
import { ROOM_W, WORLD_W, roomX, roomIndexAt, FLOOR_MIN_Y } from '../lib/rooms';
import { Walker } from '../objects/Walker';
import { Kid, KIDS } from '../objects/Kid';
import { bus, state, save, prompt, persist, type Phase } from '../lib/state';
import { say, sayHover } from '../lib/voice';
import { sfx, playDayMusic, stopMusic } from '../lib/sound';
import type { EmojiKey } from '../lib/assets';
import { auntie } from '../lib/names';
import { FONT, inkHex } from '../lib/layout';
import { Bathroom } from '../world/bathroom';
import { Playroom } from '../world/playroom';
import { Meals } from '../world/meals';
import { Cloakroom } from '../world/cloakroom';
import { Outside } from '../world/outside';
import { Nap } from '../world/nap';
import { Decor, SHOP, OUTFIT_SPOT } from '../world/decor';
import { PlayCorner } from '../world/playcorner';
import { Events } from '../world/events';
import { SeasonLook } from '../world/season';
import { Garden } from '../world/garden';
import { Pet } from '../world/pet';
import { unlocked } from '../world/progress';
import { playClip } from '../lib/clips';
import { trait, weighted } from '../world/traits';

export type Item = { id: 'teddy' | 'tray'; img: Phaser.GameObjects.Image; home: { x: number; y: number } };

/** Something in a room that reacts to clicks on kids, and/or ticks every frame. */
export interface Module {
  onKidClick?(kid: Kid): boolean;
  update?(dt: number): void;
  /** If this module is keeping a child busy, say what Hania should do. */
  waiting?(kid: Kid): string | null;
  /** Something (not a child) that must be dealt with before the next activity. */
  blocker?(): string | null;
}

const CLOCK_SPEED = 1.5; // game minutes per real second (free time only)

export class WorldScene extends Phaser.Scene {
  teacher!: Walker;
  kids: Kid[] = [];
  holding: Kid | null = null;
  carrying: Item | null = null;
  items: Item[] = [];

  bathroom!: Bathroom;
  playroom!: Playroom;
  meals!: Meals;
  cloak!: Cloakroom;
  outside!: Outside;
  nap!: Nap;
  decor!: Decor;
  play!: PlayCorner;
  today!: Events;
  garden!: Garden;
  pet!: Pet;
  private modules: Module[] = [];

  private keys!: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd', Phaser.Input.Keyboard.Key>;
  private roomIdx = -1;
  private needTimer = 15000;
  private nextSchedule = 0;
  private sceneDone: ((result: unknown) => void) | null = null;
  private busHandlers: [string, (...a: never[]) => void][] = [];
  sickToday = false;
  private messToday = false;
  private nagTimer = 0;

  private schedule: { at: number; run: () => void }[] = [];

  constructor() {
    super('World');
  }

  create() {
    this.kids = [];
    this.items = [];
    this.holding = null;
    this.shownHeld = null;
    bus.emit('holding', null);
    this.carrying = null;
    this.roomIdx = -1;
    this.nextSchedule = 0;
    this.sickToday = false;
    this.messToday = false;
    this.busHandlers = [];
    state.starsToday = 0;
    state.present = [];

    drawBuilding(this);
    this.cameras.main.setBounds(0, 0, WORLD_W, 900);

    const s = roomX('szatnia');
    this.teacher = new Walker(this, s + 700, 760, save.teacher, 210, 540);
    this.teacher.setInteractive(new Phaser.Geom.Rectangle(-50, -190, 100, 170), Phaser.Geom.Rectangle.Contains);
    this.teacher.add(
      this.add.text(0, 12, auntie(), { fontFamily: FONT, fontSize: '30px', fontStyle: '800', color: '#ffffff', stroke: inkHex, strokeThickness: 8 }).setOrigin(0.5, 0),
    );
    this.teacher.on('pointerdown', (p: Phaser.Input.Pointer) => {
      // Kids always win over the teacher when both are under the pointer.
      const kid = this.input.hitTestPointer(p).find((o): o is Kid => o instanceof Kid && !!o.input?.enabled);
      if (kid) this.clickKid(kid);
      else this.letGo();
    });
    this.dressTeacher();
    this.cameras.main.startFollow(this.teacher, true, 0.08, 0);
    this.cameras.main.centerOnX(this.teacher.x);

    KIDS.forEach((def) => {
      const kid = new Kid(this, -500, 700, def);
      kid.setPresent(false);
      kid.on('pointerdown', () => this.clickKid(kid));
      kid.on('pointerover', () => {
        if (kid.need) sayHover(kid.needText());
      });
      this.kids.push(kid);
    });

    this.today = new Events(this);
    new SeasonLook(this);
    this.decor = new Decor(this);
    this.bathroom = new Bathroom(this);
    this.playroom = new Playroom(this);
    this.meals = new Meals(this);
    this.cloak = new Cloakroom(this);
    this.outside = new Outside(this);
    this.nap = new Nap(this);
    this.play = new PlayCorner(this);
    this.garden = new Garden(this);
    this.pet = new Pet(this);
    if (unlocked('pet') && !save.pet.has) this.pet.arrive();
    this.modules = [this.today, this.cloak, this.outside, this.nap, this.play, this.playroom, this.meals, this.bathroom, this.garden, this.pet];

    // The day's plan grows with the unlock level (a new game starts simple)
    this.schedule = [
      { at: 9 * 60, run: () => this.meals.start('Śniadanie') },
      ...(unlocked('outside') ? [{ at: 10 * 60, run: () => this.outside.start() }] : []),
      ...(this.today.hasSpecial() ? [{ at: 11 * 60 + 5, run: () => this.today.startSpecial() }] : []),
      { at: 12 * 60, run: () => this.meals.start('Obiad') },
      ...(unlocked('nap') ? [{ at: 13 * 60, run: () => this.nap.start() }] : []),
      ...(unlocked('snack') ? [{ at: 14 * 60 + 30, run: () => this.meals.start('Podwieczorek') }] : []),
      { at: 15 * 60 + 30, run: () => this.cloak.startPickup() },
    ];
    this.time.delayedCall(1200, () => playClip('hello'));

    // Clicking empty floor walks there.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: unknown[]) => {
      if (over.length > 0) return;
      if (p.worldY < FLOOR_MIN_Y - 120) return; // clicks on the wall do nothing
      this.teacher.walkTo(p.worldX, p.worldY);
    });

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('up,down,left,right,w,a,s,d') as typeof this.keys;

    this.listen('goto', (idx: number) => this.teacher.walkTo(idx * ROOM_W + ROOM_W / 2, this.teacher.y));
    this.listen('scene-done', (result: unknown) => {
      this.scene.resume();
      bus.emit('minigame', false);
      const cb = this.sceneDone;
      this.sceneDone = null;
      cb?.(result);
    });
    this.listen('open-menu', () => {
      if (this.scene.isPaused()) return;
      this.checkpoint();
      this.openScene<'quit' | null>('Pause', {}, (r) => {
        if (r !== 'quit') return;
        stopMusic();
        this.scene.stop('Hud');
        this.scene.start('Title');
      });
    });
    this.listen('outfit', () => this.dressTeacher());
    this.listen('decor-bought', () => this.dressTeacher());
    this.listen('open-album', () => {
      if (this.scene.isPaused()) return;
      this.openScene('Album', {}, () => undefined);
    });
    this.listen('let-go', () => {
      if (this.scene.isPaused() || !this.holding) return;
      this.letGo();
    });
    this.listen('open-shop', () => {
      if (this.scene.isPaused()) return;
      this.openScene('Shop', {}, () => prompt('Wracamy do pracy!'));
    });
    this.events.once('shutdown', () => this.busHandlers.forEach(([e, h]) => bus.off(e, h)));

    playDayMusic();
    this.lastDoneAt = -1;
    this.lastCheckpoint = 0;
    const r = save.resume;
    if (r && r.day === save.day) {
      this.resumeDay(r);
      return;
    }
    save.resume = null;
    this.setPhase('dropoff');
    state.minutes = 7 * 60 + 30;
    bus.emit('clock', state.minutes);
    this.cloak.startDropoff();
  }

  // ---------- Saving in the middle of the day ----------

  private lastDoneAt = -1;
  private lastCheckpoint = 0;

  /** Remember the day so far, so a saved game continues from here (free time only). */
  checkpoint() {
    if (state.phase !== 'free') return;
    save.resume = {
      day: save.day,
      minutes: Math.floor(state.minutes),
      done: this.lastDoneAt,
      present: [...state.present],
      starsToday: state.starsToday,
      sick: this.sickToday,
      mess: this.messToday,
    };
    this.lastCheckpoint = state.minutes;
    persist();
  }

  /** Continue a saved day: kids already here, coats on the hooks, free time. */
  private resumeDay(r: NonNullable<typeof save.resume>) {
    state.minutes = r.minutes;
    state.starsToday = r.starsToday;
    this.sickToday = r.sick;
    this.messToday = r.mess;
    this.lastDoneAt = r.done;
    this.nextSchedule = this.schedule.findIndex((e) => e.at > r.done);
    if (this.nextSchedule < 0) this.nextSchedule = this.schedule.length;
    const sala = roomX('sala');
    state.present = r.present.filter((id) => this.kids.some((k) => k.def.id === id));
    for (const id of state.present) {
      const kid = this.kids.find((k) => k.def.id === id)!;
      kid.setPresent(true);
      kid.setPosition(sala + Phaser.Math.Between(250, 1100), Phaser.Math.Between(660, 820));
      kid.mode = 'free';
      kid.setWearing([]);
      this.today.dress(kid);
      // A new child who wasn't comforted yet is still a bit sad
      if (this.today.isNewKid(kid)) {
        kid.setNeed('sad');
        kid.homeRoom = roomIndexAt(roomX('szatnia') + 300);
        kid.setPosition(roomX('szatnia') + 600, 760);
      }
    }
    this.cloak.resume(state.present);
    this.teacher.setPosition(sala + 700, 760);
    this.cameras.main.centerOnX(this.teacher.x);
    this.backToFree();
    const h = Math.floor(r.minutes / 60);
    const m = r.minutes % 60;
    prompt(`Wracamy do przedszkola! Jest ${h}:${m < 10 ? '0' : ''}${m}. Dzieci bawią się w sali.`);
  }

  private outfitImg: Phaser.GameObjects.Image | null = null;
  /** The teacher's outfit accessory (hat, glasses...) bought in the shop. */
  dressTeacher() {
    this.outfitImg?.destroy();
    this.outfitImg = null;
    const id = save.outfit;
    const item = id ? SHOP.find((s) => s.id === id) : null;
    if (!item) return;
    const [x, y, size] = OUTFIT_SPOT[item.id] ?? [0, -180, 70];
    this.outfitImg = this.add.image(x, y, item.key).setDisplaySize(size, size);
    this.teacher.add(this.outfitImg);
  }

  /** bus.on that is removed automatically when the scene restarts. */
  listen(event: string, handler: (...args: never[]) => void) {
    bus.on(event, handler);
    this.busHandlers.push([event, handler]);
  }

  // ---------- Helpers used by modules ----------

  get presentKids() {
    return this.kids.filter((k) => k.present);
  }

  setPhase(p: Phase) {
    state.phase = p;
    bus.emit('phase', p);
  }

  /** End a structured activity and go back to free play. */
  backToFree(minutes?: number) {
    if (minutes !== undefined) state.minutes = Math.max(state.minutes, minutes);
    this.setPhase('free');
    this.needTimer = Phaser.Math.Between(12000, 20000);
    bus.emit('clock', state.minutes);
    this.checkpoint();
  }

  clickable<T extends Phaser.GameObjects.Image | Phaser.GameObjects.Zone>(obj: T, onClick: () => void, hover?: string): T {
    obj.setInteractive({ useHandCursor: true });
    obj.on('pointerdown', onClick);
    obj.on('pointerover', () => {
      if (obj instanceof Phaser.GameObjects.Image) obj.setTint(0xfff0b0);
      if (hover) sayHover(hover);
    });
    obj.on('pointerout', () => {
      if (obj instanceof Phaser.GameObjects.Image) obj.clearTint();
    });
    return obj;
  }

  /** Walk to (x, y) and then do something. */
  goThen(x: number, y: number, then: () => void) {
    this.teacher.walkTo(x, y, then);
  }

  /** Open a minigame / overlay scene; `onDone` gets whatever the scene reports. */
  openScene<R>(key: string, data: object, onDone: (result: R) => void) {
    this.teacher.stop();
    this.sceneDone = onDone as (r: unknown) => void;
    this.scene.pause();
    bus.emit('minigame', true);
    this.scene.launch(key, data);
  }

  hold(kid: Kid) {
    if (this.holding && this.holding !== kid) this.letGo();
    this.holding = kid;
    kid.mode = 'following';
    kid.stop();
  }

  letGo() {
    if (!this.holding) {
      if (this.carrying) this.dropItem();
      return;
    }
    this.holding.mode = 'free';
    this.holding.stop();
    this.holding = null;
  }

  /** Take the held kid out of the teacher's hand without making them free. */
  takeHeld(): Kid | null {
    const k = this.holding;
    if (!k) return null;
    this.holding = null;
    k.stop();
    return k;
  }

  pickUp(item: Item) {
    if (this.carrying) this.dropItem();
    this.carrying = item;
    // While carried, clicks go to whatever is underneath (e.g. the sad child).
    item.img.disableInteractive();
    sfx.pop();
  }

  dropItem() {
    const item = this.carrying;
    if (!item) return;
    this.carrying = null;
    item.img.setInteractive({ useHandCursor: true });
    if (item.id === 'tray') {
      // The tray can only go on the table, so it goes back to the counter.
      this.tweens.add({ targets: item.img, x: item.home.x, y: item.home.y, duration: 400 });
      prompt('Tacę trzeba zanieść do jadalni i kliknąć stół.');
    } else {
      item.img.setPosition(this.teacher.x + 60, this.teacher.y).setDepth(this.teacher.y);
    }
  }

  /** Little floating icons for feedback (sparkles, drops, hearts...). */
  puff(key: EmojiKey, x: number, y: number, n = 1, size = 60) {
    for (let i = 0; i < n; i++) {
      const im = this.add.image(x + Phaser.Math.Between(-40, 40), y, key).setDisplaySize(size, size).setDepth(3000);
      this.tweens.add({ targets: im, y: y - 120, alpha: 0, delay: i * 90, duration: 900, onComplete: () => im.destroy() });
    }
  }

  // ---------- Kids ----------

  clickKid(kid: Kid) {
    if (!kid.present) return;
    for (const m of this.modules) if (m.onKidClick?.(kid)) return;

    if (this.holding === kid) {
      this.letGo();
      return;
    }
    if (kid.mode === 'busy') {
      say(kid.needText());
      return;
    }
    this.teacher.walkTo(kid.x + 110, kid.y + 5, () => {
      if (kid.mode === 'busy' || !kid.present) return;
      this.hold(kid);
      const line = Phaser.Utils.Array.GetRandom(trait(kid.def.id)?.lines ?? [`${kid.def.name}, chodź ze mną!`]);
      say(kid.need ? kid.needText() : `${kid.def.name}: ${line}`);
      this.hintLetGo();
    });
  }

  /** What a busy child is waiting for (toilet flush, a game...), if anything. */
  waitingText(kid: Kid): string | null {
    if (kid.mode !== 'busy') return null;
    for (const m of this.modules) {
      const t = m.waiting?.(kid);
      if (t) return t;
    }
    return null;
  }

  private stuckMs = new Map<Kid, number>();
  /**
   * Safety net: a child who is "busy" but standing still, with nothing to do
   * and no module waiting on them, goes back to free play so the day can go on.
   */
  private releaseStuck(deltaMs: number) {
    for (const kid of this.presentKids) {
      const stuck = kid.mode === 'busy' && !kid.moving && !this.waitingText(kid) && !kid.need;
      const t = stuck ? (this.stuckMs.get(kid) ?? 0) + deltaMs : 0;
      this.stuckMs.set(kid, t);
      if (t > 8000) {
        kid.mode = 'free';
        kid.fixedDepth = null;
        this.stuckMs.set(kid, 0);
      }
    }
  }

  private shownHeld: Kid | null = null;
  private letGoHinted = false;
  /** The first time, explain how to let go of a child's hand. */
  private hintLetGo() {
    if (this.letGoHinted) return;
    this.letGoHinted = true;
    this.time.delayedCall(2500, () => prompt('Żeby puścić rączkę dziecka, kliknij ciocię albo przycisk „Puść” na górze.'));
  }

  private randomNeed() {
    if (state.phase !== 'free') return;
    const kids = this.presentKids;
    if (kids.filter((k) => k.need).length >= 2) return;
    const free = kids.filter((k) => !k.need && k.mode === 'free');
    if (!free.length) return;
    const trouble = unlocked('trouble');
    const r = trouble ? Math.random() : 0.4 + Math.random() * 0.6;
    const kid = Phaser.Utils.Array.GetRandom(free);
    if (trouble && r < 0.06 && !this.messToday) {
      this.messToday = true;
      this.playroom.startMess();
      return;
    }
    if (this.pet.needsCare() && Math.random() < 0.3) this.pet.remind();
    if (r < 0.08 && !this.sickToday && kids.length > 3) {
      this.sickToday = true;
      kid.setNeed('sick');
      sfx.sad();
      prompt(`${kid.def.name} źle się czuje. Kliknij, żeby zmierzyć temperaturę.`);
    } else if (r < 0.25 && free.length >= 2) {
      this.playroom.startFight(free);
    } else if (r < 0.4) {
      // Shy kids get sad more often
      const sadKid = weighted(free, (k) => trait(k.def.id)?.sad ?? 1);
      sadKid.setNeed('sad');
      sfx.sad();
      prompt(sadKid.needText());
    } else if (r < 0.75) {
      // Most often: a child wants to play something
      if (!this.play.ask(kid)) {
        kid.setNeed('potty');
        prompt(kid.needText());
      }
    } else {
      kid.setNeed('potty');
      prompt(kid.needText());
    }
  }

  // ---------- Loop ----------

  update(_t: number, deltaMs: number) {
    const dt = Math.min(deltaMs / 1000, 0.1);
    const k = this.keys;
    const dx = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
    const dy = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
    this.teacher.nudge(dx, dy, dt);
    this.teacher.step(dt);

    for (const kid of this.kids) {
      kid.update(dt, this.teacher);
      // While holding a child's hand, kids (including that child, who walks
      // right beside the teacher) don't catch clicks — so the toy, toilet or
      // hook behind them can be clicked. Click the teacher to let go.
      if (kid.present && kid.input) kid.input.enabled = !this.holding;
    }
    for (const m of this.modules) m.update?.(dt);
    if (this.holding !== this.shownHeld) {
      this.shownHeld = this.holding;
      bus.emit('holding', this.holding ? { key: this.holding.def.key, name: this.holding.def.name } : null);
    }

    if (this.carrying) {
      const img = this.carrying.img;
      img.setPosition(this.teacher.x + (this.teacher.sprite.flipX ? 70 : -70), this.teacher.y - 120 + this.teacher.sprite.y);
      img.setDepth(this.teacher.depth + 1);
    }
    for (const it of this.items) {
      const top = it.img.getData('topping') as Phaser.GameObjects.Image | undefined;
      top?.setPosition(it.img.x, it.img.y - 70).setDepth(it.img.depth + 1);
    }

    // Room change → banner + voice
    const r = roomIndexAt(this.teacher.x);
    if (r !== this.roomIdx) {
      this.roomIdx = r;
      bus.emit('room', r);
    }

    // Which rooms have a child (or parent) that needs attention, for the HUD map
    const rooms = new Set(this.presentKids.filter((kid) => kid.need || this.waitingText(kid)).map((kid) => kid.roomIndex));
    for (const ri of this.cloak.waitingRooms()) rooms.add(ri);
    bus.emit('needs', [...rooms]);

    if (state.phase !== 'free') return;

    // Random needs during free time
    this.needTimer -= deltaMs;
    if (this.needTimer <= 0) {
      this.needTimer = Phaser.Math.Between(18000, 30000);
      this.randomNeed();
    }

    // Gentle clock: only runs during free time, and waits for kids who need help.
    const ev = this.schedule[this.nextSchedule];
    const blocker = this.modules.map((m) => m.blocker?.()).find(Boolean) ?? null;
    const allSettled = !blocker && this.presentKids.every((kid) => kid.mode !== 'busy' && !kid.need);
    if (ev && state.minutes >= ev.at) {
      if (allSettled) {
        this.lastDoneAt = ev.at;
        this.nextSchedule++;
        this.nagTimer = 0;
        if (this.holding) this.letGo();
        ev.run();
      } else {
        // Waiting for a child who needs help — remind gently now and then.
        this.nagTimer -= deltaMs;
        if (this.nagTimer <= 0) {
          this.nagTimer = 15000;
          const busy = this.presentKids.find((c) => this.waitingText(c));
          const needy = this.presentKids.find((c) => c.need);
          if (blocker) prompt(`Zaraz następne zajęcie, ale najpierw: ${blocker}`);
          else if (busy) prompt(`Zaraz następne zajęcie, ale najpierw: ${this.waitingText(busy)}`);
          else if (needy) prompt(`Zaraz następne zajęcie, ale najpierw pomóż: ${needy.needText()}`);
        }
        this.releaseStuck(deltaMs);
      }
    } else {
      state.minutes += dt * CLOCK_SPEED;
      // Save every 10 game minutes of free time
      if (state.minutes - this.lastCheckpoint >= 10) this.checkpoint();
    }
    bus.emit('clock', state.minutes);
  }
}
