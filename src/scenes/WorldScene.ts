import Phaser from 'phaser';
import { drawBuilding } from '../world/draw';
import { ROOM_W, WORLD_W, roomX, roomIndexAt, FLOOR_MIN_Y } from '../lib/rooms';
import { Walker } from '../objects/Walker';
import { Kid, KIDS } from '../objects/Kid';
import { bus, state, save, prompt, type Phase } from '../lib/state';
import { say, sayHover } from '../lib/voice';
import { sfx, playDayMusic } from '../lib/sound';
import type { EmojiKey } from '../lib/assets';
import { Bathroom } from '../world/bathroom';
import { Playroom } from '../world/playroom';
import { Meals } from '../world/meals';
import { Cloakroom } from '../world/cloakroom';
import { Outside } from '../world/outside';
import { Nap } from '../world/nap';
import { Decor } from '../world/decor';
import { PlayCorner } from '../world/playcorner';

export type Item = { id: 'teddy' | 'tray'; img: Phaser.GameObjects.Image; home: { x: number; y: number } };

/** Something in a room that reacts to clicks on kids, and/or ticks every frame. */
export interface Module {
  onKidClick?(kid: Kid): boolean;
  update?(dt: number): void;
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
  private modules: Module[] = [];

  private keys!: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd', Phaser.Input.Keyboard.Key>;
  private roomIdx = -1;
  private needTimer = 15000;
  private nextSchedule = 0;
  private sceneDone: ((result: unknown) => void) | null = null;
  private busHandlers: [string, (...a: never[]) => void][] = [];
  sickToday = false;
  private nagTimer = 0;

  private schedule: { at: number; run: () => void }[] = [];

  constructor() {
    super('World');
  }

  create() {
    this.kids = [];
    this.items = [];
    this.holding = null;
    this.carrying = null;
    this.roomIdx = -1;
    this.nextSchedule = 0;
    this.sickToday = false;
    this.busHandlers = [];
    state.starsToday = 0;
    state.present = [];

    drawBuilding(this);
    this.cameras.main.setBounds(0, 0, WORLD_W, 900);

    const s = roomX('szatnia');
    this.teacher = new Walker(this, s + 700, 760, save.teacher, 210, 540);
    this.teacher.setInteractive(new Phaser.Geom.Rectangle(-50, -190, 100, 170), Phaser.Geom.Rectangle.Contains);
    this.teacher.on('pointerdown', (p: Phaser.Input.Pointer) => {
      // Kids always win over the teacher when both are under the pointer.
      const kid = this.input.hitTestPointer(p).find((o): o is Kid => o instanceof Kid && !!o.input?.enabled);
      if (kid) this.clickKid(kid);
      else this.letGo();
    });
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

    this.decor = new Decor(this);
    this.bathroom = new Bathroom(this);
    this.playroom = new Playroom(this);
    this.meals = new Meals(this);
    this.cloak = new Cloakroom(this);
    this.outside = new Outside(this);
    this.nap = new Nap(this);
    this.play = new PlayCorner(this);
    this.modules = [this.cloak, this.outside, this.nap, this.play, this.playroom, this.meals, this.bathroom];

    this.schedule = [
      { at: 9 * 60, run: () => this.meals.start('Śniadanie') },
      { at: 10 * 60, run: () => this.outside.start() },
      { at: 12 * 60, run: () => this.meals.start('Obiad') },
      { at: 13 * 60, run: () => this.nap.start() },
      { at: 14 * 60 + 30, run: () => this.meals.start('Podwieczorek') },
      { at: 15 * 60 + 30, run: () => this.cloak.startPickup() },
    ];

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
    this.listen('open-shop', () => {
      if (this.scene.isPaused()) return;
      this.openScene('Shop', {}, () => prompt('Wracamy do pracy!'));
    });
    this.events.once('shutdown', () => this.busHandlers.forEach(([e, h]) => bus.off(e, h)));

    playDayMusic();
    this.setPhase('dropoff');
    state.minutes = 7 * 60 + 30;
    bus.emit('clock', state.minutes);
    this.cloak.startDropoff();
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
      say(kid.need ? kid.needText() : `${kid.def.name}, chodź ze mną!`);
      this.hintLetGo();
    });
  }

  private letGoHinted = false;
  /** The first time, explain how to let go of a child's hand. */
  private hintLetGo() {
    if (this.letGoHinted) return;
    this.letGoHinted = true;
    this.time.delayedCall(2500, () => prompt('Żeby puścić rączkę dziecka, kliknij panią.'));
  }

  private randomNeed() {
    if (state.phase !== 'free') return;
    const kids = this.presentKids;
    if (kids.filter((k) => k.need).length >= 2) return;
    const free = kids.filter((k) => !k.need && k.mode === 'free');
    if (!free.length) return;
    const r = Math.random();
    const kid = Phaser.Utils.Array.GetRandom(free);
    if (r < 0.08 && !this.sickToday && kids.length > 3) {
      this.sickToday = true;
      kid.setNeed('sick');
      sfx.sad();
      prompt(`${kid.def.name} źle się czuje. Kliknij, żeby zmierzyć temperaturę.`);
    } else if (r < 0.25 && free.length >= 2) {
      this.playroom.startFight(free);
    } else if (r < 0.4) {
      kid.setNeed('sad');
      sfx.sad();
      prompt(kid.needText());
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
    const rooms = new Set(this.presentKids.filter((kid) => kid.need).map((kid) => kid.roomIndex));
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
    const allSettled = this.presentKids.every((kid) => kid.mode !== 'busy' && !kid.need);
    if (ev && state.minutes >= ev.at) {
      if (allSettled) {
        this.nextSchedule++;
        this.nagTimer = 0;
        if (this.holding) this.letGo();
        ev.run();
      } else {
        // Waiting for a child who needs help — remind gently now and then.
        this.nagTimer -= deltaMs;
        if (this.nagTimer <= 0) {
          this.nagTimer = 15000;
          const kid = this.presentKids.find((c) => c.need);
          if (kid) prompt(`Zaraz następne zajęcie, ale najpierw pomóż: ${kid.needText()}`);
        }
      }
    } else {
      state.minutes += dt * CLOCK_SPEED;
    }
    bus.emit('clock', state.minutes);
  }
}
