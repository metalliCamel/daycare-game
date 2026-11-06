import Phaser from 'phaser';
import type { WorldScene, Module } from '../scenes/WorldScene';
import { Walker } from '../objects/Walker';
import { KIDS, type Kid } from '../objects/Kid';
import { roomX, roomIndexAt } from '../lib/rooms';
import { FONT, inkHex } from '../lib/layout';
import { state, save, addStars, prompt, persist } from '../lib/state';
import { say, sayHover } from '../lib/voice';
import { sfx } from '../lib/sound';

type Visit = { parent: Walker; kid: Kid; slot: number; mode: 'dropoff' | 'pickup' | 'sick' };

const SLOTS = [200, 420];

/** Morning arrivals with a health check, coats on hooks, and afternoon pickup. */
export class Cloakroom implements Module {
  private s = roomX('szatnia');
  private hooks: { x: number; kidId: string; coat: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Container }[] = [];
  private visits: Visit[] = [];
  private queue: string[] = [];
  private feverKid: string | null = null;
  private phaseMode: 'dropoff' | 'pickup' | null = null;
  private spawnTimer = 0;
  /** every parent on screen (arriving, waiting or leaving) */
  private walkers: Walker[] = [];

  constructor(private w: WorldScene) {
    const s = this.s;
    KIDS.forEach((def, i) => {
      const x = s + 270 + i * 165;
      // Name sign with the child's face above each hook
      const g = w.add.graphics().setDepth(-70);
      g.fillStyle(0xffffff, 1).fillRoundedRect(x - 50, 130, 100, 100, 20);
      g.fillStyle(0x8b6a4a, 1).fillCircle(x, 262, 10);
      w.add.image(x, 172, def.key).setDisplaySize(70, 70).setDepth(-69);
      w.add.text(x, 214, def.name, { fontFamily: FONT, fontSize: '20px', fontStyle: '800', color: inkHex }).setOrigin(0.5).setDepth(-69);
      const coat = w.add.image(x, 340, 'coat').setDisplaySize(130, 130).setDepth(-68);
      // Glowing frame + bouncing arrow, shown when the teacher brings this child
      const ring = w.add.graphics();
      ring.lineStyle(10, 0xffd45c, 1).strokeRoundedRect(-62, -52, 124, 124, 26);
      const arrow = w.add.text(0, -95, '⬇', { fontSize: '64px', color: '#ff7a6b' }).setOrigin(0.5);
      const glow = w.add.container(x, 182, [ring, arrow]).setDepth(-65).setVisible(false);
      w.tweens.add({ targets: arrow, y: -75, duration: 400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      w.tweens.add({ targets: ring, alpha: 0.4, duration: 500, yoyo: true, repeat: -1 });
      const zone = w.add.zone(x, 330, 150, 380).setDepth(-60);
      w.clickable(zone, () => w.goThen(x, 690, () => this.useHook(def.id)), `Wieszak: ${def.name}`);
      this.hooks.push({ x, kidId: def.id, coat, glow });
    });
  }

  private hook(id: string) {
    return this.hooks.find((h) => h.kidId === id)!;
  }

  waitingRooms(): number[] {
    return this.visits.length ? [roomIndexAt(this.s + 300)] : [];
  }

  // ---------- Morning ----------

  startDropoff() {
    this.phaseMode = 'dropoff';
    this.queue = Phaser.Utils.Array.Shuffle(KIDS.map((k) => k.id));
    this.feverKid = Math.random() < 0.3 ? Phaser.Utils.Array.GetRandom(this.queue) : null;
    this.hooks.forEach((h) => h.coat.setVisible(false));
    this.spawnTimer = 1500;
    prompt(`Dzień ${save.day}. Dzień dobry! Dzieci przychodzą do przedszkola. Przywitaj je w szatni.`);
  }

  // ---------- Afternoon ----------

  startPickup() {
    this.w.setPhase('pickup');
    this.phaseMode = 'pickup';
    this.queue = Phaser.Utils.Array.Shuffle(this.w.presentKids.map((k) => k.def.id));
    this.spawnTimer = 2500;
    sfx.doorbell();
    prompt('Rodzice przychodzą po dzieci! Ubierz każde dziecko w kurtkę przy wieszaku i zaprowadź do rodzica.');
  }

  /** A parent comes to collect a sick child during the day. */
  callParent(kid: Kid) {
    sfx.phone();
    kid.setNeed('home');
    prompt(`Dzwonimy po rodzica. Niedługo ${kid.def.parentLabel.toLowerCase()} przyjdzie po ${kid.def.acc}.`);
    this.w.time.delayedCall(6000, () => {
      if (kid.present) this.arrive(kid, 'sick');
    });
  }

  private freeSlot() {
    return [0, 1].find((i) => !this.visits.some((v) => v.slot === i));
  }

  private arrive(kid: Kid, mode: Visit['mode']) {
    const w = this.w;
    const slot = this.freeSlot() ?? 0;
    const x = this.s + SLOTS[slot];
    const parent = new Walker(w, this.s - 160, 760, kid.def.parent, 220, 260);
    this.walkers.push(parent);
    const tag = w.add.text(0, 12, kid.def.parentLabel, { fontFamily: FONT, fontSize: '26px', fontStyle: '800', color: inkHex }).setOrigin(0.5, 0);
    parent.add(tag);
    if (mode !== 'dropoff') {
      // Bubble with the child's face: "I'm here for...".
      const g = w.add.graphics();
      g.fillStyle(0xffffff, 1).fillCircle(0, -260, 50).fillTriangle(-14, -220, 14, -220, 0, -195);
      const face = w.add.image(0, -260, kid.def.key).setDisplaySize(70, 70);
      parent.add([g, face]);
    }
    parent.setSize(160, 230);
    parent.setInteractive(new Phaser.Geom.Rectangle(0, -100, 160, 260), Phaser.Geom.Rectangle.Contains);
    parent.input!.cursor = 'pointer';
    const v: Visit = { parent, kid, slot, mode };
    parent.on('pointerdown', () => w.goThen(parent.x + 150, parent.y, () => this.clickParent(v)));
    parent.on('pointerover', () => sayHover(kid.def.parentLabel));
    this.visits.push(v);
    sfx.doorbell();
    parent.walkTo(x, 760);

    if (mode === 'dropoff') {
      kid.setPresent(true);
      kid.setPosition(this.s - 240, 780);
      kid.mode = 'busy';
      kid.setWearing(['coat']);
      kid.walkTo(x + 100, 780, () => kid.setNeed('check'));
      prompt(`${kid.def.parentLabel} przyprowadza ${kid.def.acc}. Kliknij dziecko, żeby się przywitać.`);
    } else {
      kid.setNeed('home');
      const came = kid.def.parentFem ? 'przyszła' : 'przyszedł';
      prompt(`${kid.def.parentLabel} ${came} po ${kid.def.acc}. Najpierw kurtka z wieszaka, potem do rodzica!`);
    }
  }

  private leave(v: Visit, withKid: boolean) {
    const w = this.w;
    this.visits = this.visits.filter((x) => x !== v);
    v.parent.disableInteractive();
    w.puff('wave', v.parent.x, v.parent.y - 230, 1, 80);
    v.parent.walkTo(this.s - 300, 760, () => {
      this.walkers = this.walkers.filter((p) => p !== v.parent);
      v.parent.destroy();
    });
    if (withKid) {
      const kid = v.kid;
      if (w.holding === kid) w.takeHeld();
      kid.mode = 'busy';
      kid.setNeed(null);
      kid.walkTo(this.s - 380, 790, () => kid.setPresent(false));
      state.present = state.present.filter((id) => id !== kid.def.id);
    }
  }

  // ---------- Interactions ----------

  onKidClick(kid: Kid): boolean {
    const w = this.w;
    if (kid.need === 'check') {
      const v = this.visits.find((x) => x.kid === kid);
      w.goThen(kid.x + 110, kid.y, () => this.healthCheck(kid, v ?? null, this.feverKid === kid.def.id));
      return true;
    }
    if (kid.need === 'sick') {
      w.goThen(kid.x + 110, kid.y + 5, () => this.healthCheck(kid, null, true));
      return true;
    }
    return false;
  }

  private healthCheck(kid: Kid, v: Visit | null, fever: boolean) {
    const w = this.w;
    kid.stop();
    w.openScene<'healthy' | 'home'>('Health', { kidId: kid.def.id, fever }, (result) => {
      if (result === 'home') {
        if (v) {
          // Morning: the parent is still here and takes the child home.
          prompt(`${kid.def.name} ma gorączkę. ${kid.def.parentLabel} zabiera ${kid.adj('ją', 'go')} do domu. Zdrowiej szybko!`);
          this.leave(v, true);
          addStars();
          this.checkDropoffDone();
        } else {
          this.callParent(kid);
          addStars();
        }
        return;
      }
      // Healthy: say hello, parent waves goodbye, coat goes on the hook
      kid.setNeed('coat');
      kid.mode = 'free';
      kid.homeRoom = roomIndexAt(this.s + 300);
      state.present.push(kid.def.id);
      addStars();
      sfx.giggle();
      prompt(`Dzień dobry! Teraz kliknij ${kid.def.acc}, a potem świecący wieszak z ${kid.adj('jej', 'jego')} buzią.`);
      if (v) this.leave(v, false);
    });
  }

  private useHook(id: string) {
    const w = this.w;
    const h = this.hook(id);
    const kid = w.holding;
    const owner = KIDS.find((k) => k.id === id)!;
    if (!kid) {
      say(`Wieszak: ${owner.name}`);
      return;
    }
    if (kid.def.id !== id) {
      sfx.wrong();
      say(`To wieszak ${owner.gen}. Znajdź wieszak z buzią ${kid.def.gen}.`);
      return;
    }
    if (kid.need === 'coat') {
      // Morning: coat off onto the hook, slippers on
      kid.setWearing([]);
      h.coat.setVisible(true).setScale(0);
      w.tweens.add({ targets: h.coat, scale: 130 / 256, duration: 300, ease: 'Back.out' });
      w.puff('slippers', kid.x, kid.y - 40, 2, 50);
      sfx.whoosh();
      kid.setNeed(null);
      kid.homeRoom = null;
      w.takeHeld();
      kid.mode = 'busy';
      const sala = roomX('sala');
      kid.walkTo(sala + Phaser.Math.Between(250, 1100), Phaser.Math.Between(660, 820), () => (kid.mode = 'free'));
      addStars();
      say(`Kurtka wisi! ${kid.def.name} idzie się bawić.`);
      this.checkDropoffDone();
      return;
    }
    if (kid.need === 'home') {
      // Going home: coat back on
      if (kid.wearing.includes('coat')) return say('Kurtka jest już ubrana. Teraz do rodzica!');
      h.coat.setVisible(false);
      kid.setWearing(['coat']);
      sfx.whoosh();
      say('Kurtka ubrana! Teraz zaprowadź do rodzica.');
      return;
    }
    say(`${kid.def.name} nie potrzebuje teraz kurtki.`);
  }

  private clickParent(v: Visit) {
    const w = this.w;
    if (v.mode === 'dropoff') {
      say(`${v.kid.def.parentLabel}: Dzień dobry!`);
      return;
    }
    const kid = w.holding;
    if (!kid) return say(`${v.kid.def.parentLabel} czeka na ${v.kid.def.acc}.`);
    if (kid !== v.kid) {
      sfx.wrong();
      return say(`To nie to dziecko. ${v.kid.def.parentLabel} czeka na ${v.kid.def.acc}.`);
    }
    if (!kid.wearing.includes('coat')) return say('Najpierw kurtka z wieszaka!');
    kid.cheer();
    sfx.cheer();
    addStars();
    say(`Do widzenia, ${kid.def.name}!`);
    this.leave(v, true);
    if (this.phaseMode === 'pickup' && this.queue.length === 0 && this.visits.length === 0) {
      w.time.delayedCall(2500, () => this.endDay());
    }
  }

  private checkDropoffDone() {
    if (this.phaseMode !== 'dropoff') return;
    if (this.queue.length || this.visits.length) return;
    const waiting = this.w.presentKids.some((k) => k.need === 'coat' || k.need === 'check');
    if (waiting) return;
    this.phaseMode = null;
    this.w.backToFree(8 * 60);
    prompt('Wszystkie dzieci są już w przedszkolu! Czas na zabawę. O dziewiątej śniadanie.');
  }

  private endDay() {
    const w = this.w;
    this.phaseMode = null;
    w.setPhase('summary');
    w.openScene<'next'>('Summary', { day: save.day, stars: state.starsToday, total: save.stars }, () => {
      save.day++;
      persist();
      w.scene.restart();
    });
  }

  update(dt: number) {
    for (const p of [...this.walkers]) p.step(dt);
    // Light up the hook of the child the teacher is holding, when they need it
    const held = this.w.holding;
    const needsHook = held && (held.need === 'coat' || (held.need === 'home' && !held.wearing.includes('coat')));
    for (const h of this.hooks) h.glow.setVisible(!!needsHook && h.kidId === held!.def.id);
    if (!this.phaseMode || !this.queue.length) return;
    // Up to two families at the door at once
    this.spawnTimer -= dt * 1000;
    if (this.spawnTimer > 0 || this.visits.length >= 2) return;
    this.spawnTimer = this.phaseMode === 'dropoff' ? 5000 : 4000;
    const id = this.queue.shift()!;
    const kid = this.w.kids.find((k) => k.def.id === id)!;
    if (this.phaseMode === 'pickup' && !kid.present) return;
    this.arrive(kid, this.phaseMode);
  }
}
