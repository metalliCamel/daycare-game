import Phaser from 'phaser';
import { Walker } from './Walker';
import { TRAITS } from '../world/traits';
import { ROOM_W, FLOOR_MIN_Y, FLOOR_MAX_Y, roomIndexAt } from '../lib/rooms';
import type { EmojiKey } from '../lib/assets';
import { FONT, inkHex } from '../lib/layout';

export type Need = 'check' | 'potty' | 'wash' | 'sad' | 'hungry' | 'sick' | 'fight' | 'coat' | 'dress' | 'wish' | 'awake' | 'home' | 'play' | 'hurt' | 'teeth' | null;

export type KidDef = {
  id: string;
  name: string;
  /** genitive: "dla Zosi", "mama Antka" */
  gen: string;
  /** accusative: "czeka na Zosię", "przyprowadza Antka" */
  acc: string;
  parentFem: boolean;
  key: EmojiKey;
  parent: EmojiKey;
  parentLabel: string;
  girl: boolean;
  /** favourite fillings; each meal picks two */
  likes: EmojiKey[];
};

export const KIDS: KidDef[] = [
  { id: 'zosia', name: 'Zosia', gen: 'Zosi', acc: 'Zosię', parentFem: true, key: 'kid_zosia', parent: 'parent_zosia', parentLabel: 'Mama Zosi', girl: true, likes: ['cheese', 'tomato', 'lettuce'] },
  { id: 'antek', name: 'Antek', gen: 'Antka', acc: 'Antka', parentFem: false, key: 'kid_antek', parent: 'parent_antek', parentLabel: 'Tata Antka', girl: false, likes: ['ham', 'lettuce', 'egg'] },
  { id: 'ola', name: 'Ola', gen: 'Oli', acc: 'Olę', parentFem: true, key: 'kid_ola', parent: 'parent_ola', parentLabel: 'Babcia Oli', girl: true, likes: ['cheese', 'cucumber', 'egg'] },
  { id: 'franek', name: 'Franek', gen: 'Franka', acc: 'Franka', parentFem: false, key: 'kid_franek', parent: 'parent_franek', parentLabel: 'Tata Franka', girl: false, likes: ['ham', 'cheese', 'tomato'] },
  { id: 'maja', name: 'Maja', gen: 'Mai', acc: 'Maję', parentFem: true, key: 'kid_maja', parent: 'parent_maja', parentLabel: 'Mama Mai', girl: true, likes: ['egg', 'tomato', 'cucumber'] },
  { id: 'lena', name: 'Lena', gen: 'Leny', acc: 'Lenę', parentFem: true, key: 'kid_lena', parent: 'parent_lena', parentLabel: 'Mama Leny', girl: true, likes: ['cheese', 'tomato', 'egg'] },
  { id: 'tymek', name: 'Tymek', gen: 'Tymka', acc: 'Tymka', parentFem: false, key: 'kid_tymek', parent: 'parent_tymek', parentLabel: 'Tata Tymka', girl: false, likes: ['ham', 'egg', 'lettuce'] },
  { id: 'stas', name: 'Staś', gen: 'Stasia', acc: 'Stasia', parentFem: false, key: 'kid_stas', parent: 'parent_stas', parentLabel: 'Dziadek Stasia', girl: false, likes: ['ham', 'cucumber', 'lettuce'] },
];

export const kidDef = (id: string) => KIDS.find((k) => k.id === id)!;

const NEED_ICON: Record<Exclude<Need, null>, EmojiKey> = {
  check: 'thermometer',
  potty: 'toilet',
  wash: 'soap',
  sad: 'cry',
  hungry: 'apple',
  sick: 'sick',
  fight: 'angry',
  coat: 'coat',
  dress: 'coat',
  wish: 'swing' as EmojiKey,
  awake: 'cry',
  home: 'car',
  play: 'blocks',
  hurt: 'bandage',
  teeth: 'toothbrush',
};

/**
 * free      – wanders around its room
 * following – holds the teacher's hand
 * busy      – doing something (potty, table, bed...) and doesn't move by itself
 */
export type KidMode = 'free' | 'following' | 'busy';

export class Kid extends Walker {
  def: KidDef;
  need: Need = null;
  mode: KidMode = 'free';
  present = false;
  /** already counted during the playground head count */
  counted = false;
  /** extra info for the current need, e.g. which playground thing they want */
  wish: string | null = null;
  private bubble: Phaser.GameObjects.Container;
  private bubbleIcon: Phaser.GameObjects.Image;
  private badge: Phaser.GameObjects.Text;
  private gear: Phaser.GameObjects.Container;
  /** clothes currently worn (coat, cap, boots...) */
  wearing: EmojiKey[] = [];
  nameTag: Phaser.GameObjects.Text;
  private wanderTimer = Phaser.Math.Between(1000, 3000);
  /** keep wandering inside this room index (null = the room it's in) */
  homeRoom: number | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, def: KidDef) {
    super(scene, x, y, def.key, 150, 230);
    this.def = def;

    this.nameTag = scene.add
      .text(0, 12, def.name, { fontFamily: FONT, fontSize: '28px', fontStyle: '800', color: inkHex })
      .setOrigin(0.5, 0);
    this.add(this.nameTag);

    // Thought bubble above the head that shows what the child needs.
    const g = scene.add.graphics();
    g.fillStyle(0xffffff, 1).fillCircle(0, 0, 50).fillTriangle(-14, 40, 14, 40, 0, 66);
    g.lineStyle(5, 0x4a3a5c, 0.25).strokeCircle(0, 0, 50);
    this.bubbleIcon = scene.add.image(0, 0, 'toilet').setDisplaySize(70, 70);
    this.bubble = scene.add.container(0, -230, [g, this.bubbleIcon]).setVisible(false);
    this.add(this.bubble);
    scene.tweens.add({ targets: this.bubble, y: -244, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // Clothes the child is wearing, shown as little icons on the body
    this.gear = scene.add.container(0, 0);
    this.add(this.gear);

    // Small number shown above the head during the head count
    this.badge = scene.add
      .text(0, -150, '', { fontFamily: FONT, fontSize: '56px', fontStyle: '800', color: '#ffffff', stroke: inkHex, strokeThickness: 10 })
      .setOrigin(0.5)
      .setVisible(false);
    this.add(this.badge);

    // Container hit areas are measured from the container's top-left corner
    // (x + width/2, y + height/2), so shift the box to sit over the child.
    // It covers the body, name tag and the need bubble, to be easy to hit.
    const W = 150, H = 190;
    this.setSize(W, H);
    this.setInteractive(new Phaser.Geom.Rectangle(-100 + W / 2, -280 + H / 2, 200, 330), Phaser.Geom.Rectangle.Contains);
    this.input!.cursor = 'pointer';
  }

  get roomIndex() {
    return roomIndexAt(this.x);
  }

  /** "Zosia jest smutna" vs "Antek jest smutny". */
  adj(fem: string, masc: string) {
    return this.def.girl ? fem : masc;
  }

  setNeed(need: Need, icon?: EmojiKey) {
    this.need = need;
    if (need) {
      this.bubbleIcon.setTexture(icon ?? NEED_ICON[need]);
      this.bubble.setVisible(true).setScale(0);
      this.scene.tweens.add({ targets: this.bubble, scale: 1, duration: 350, ease: 'Back.out' });
    } else {
      this.bubble.setVisible(false);
      this.wish = null;
    }
  }

  setWearing(keys: EmojiKey[]) {
    this.wearing = [...keys];
    this.gear.removeAll(true);
    const spots: Record<string, [number, number, number]> = {
      coat: [0, -28, 85], umbrella: [45, -175, 100], scarf: [0, -50, 55], gloves: [55, -35, 45],
      cap: [0, -150, 80], sunglasses: [0, -98, 58], boots: [0, -5, 55],
    };
    keys.forEach((k, i) => {
      const [x, y, size] = spots[k] ?? [40, -80 - i * 20, 60];
      this.gear.add(this.scene.add.image(x, y, k).setDisplaySize(size, size));
    });
  }

  private costumeImg: Phaser.GameObjects.Image | null = null;
  costume: EmojiKey | null = null;
  /** A hat for the whole day: costume day, or a crown on your birthday. */
  setCostume(key: EmojiKey | null) {
    this.costume = key;
    this.costumeImg?.destroy();
    this.costumeImg = null;
    if (key) {
      this.costumeImg = this.scene.add.image(0, -158, key).setDisplaySize(82, 82);
      this.add(this.costumeImg);
    }
  }

  setBadge(text: string | null) {
    this.badge.setText(text ?? '').setVisible(!!text);
    if (text) {
      this.badge.setScale(0);
      this.scene.tweens.add({ targets: this.badge, scale: 1, duration: 250, ease: 'Back.out' });
    }
  }

  needText(): string {
    const n = this.def.name;
    switch (this.need) {
      case 'check': return `${this.adj('Przyszła', 'Przyszedł')} ${n}! Kliknij, żeby się przywitać.`;
      case 'potty': return `${n} musi iść do łazienki.`;
      case 'wash': return `${n} musi umyć rączki.`;
      case 'sad': return `${n} jest ${this.adj('smutna', 'smutny')}. Przynieś misia!`;
      case 'hungry': return `${n} jest ${this.adj('głodna', 'głodny')}.`;
      case 'sick': return `${n} źle się czuje. Kliknij, żeby zmierzyć temperaturę.`;
      case 'fight': return `${n} kłóci się o zabawkę.`;
      case 'coat': return `${n} musi zdjąć kurtkę. Kliknij ${this.adj('ją', 'go')}, a potem wieszak z ${this.adj('jej', 'jego')} buzią.`;
      case 'dress': return `${n} musi się ubrać na dwór.`;
      case 'wish': return `${n} chce się bawić: ${this.wishName()}. Zaprowadź tam!`;
      case 'play': return `${n} chce się bawić: ${this.playName()}. Kliknij ${this.adj('ją', 'go')} i zaprowadź do zabawy!${this.wish === 'clay' || this.wish === 'draw' ? ' To jest na stoliku do rysowania w sali.' : this.wish === 'pet' ? ' Chomik mieszka w szatni.' : ''}`;
      case 'hurt': return `${n} ${this.adj('przewróciła', 'przewrócił')} się! Kliknij, żeby nakleić plaster.`;
      case 'teeth': return `${n} musi umyć ząbki. Zaprowadź ${this.adj('ją', 'go')} do umywalki w łazience.`;
      case 'awake': return `${n} nie może zasnąć. Kliknij, żeby pogłaskać.`;
      case 'home': return this.wearing.includes('coat') ? `Kurtka ubrana! Teraz kliknij: ${this.def.parentLabel}.` : `${this.def.parentLabel} czeka na ${this.def.acc}. Kliknij ${this.adj('ją', 'go')}, a potem wieszak z ${this.adj('jej', 'jego')} buzią.`;
      default: return `To jest ${n}.`;
    }
  }

  private playName() {
    return { blocks: 'klocki', puzzle: 'puzzle', ball: 'piłka', books: 'książeczka', draw: 'rysowanie', music: 'muzyka', clay: 'plastelina', pet: 'chomik' }[this.wish ?? ''] ?? 'zabawa';
  }

  private wishName() {
    return { swing: 'huśtawka', slide: 'zjeżdżalnia', sand: 'piaskownica' }[this.wish ?? ''] ?? 'zabawa';
  }

  /** Celebrate: jump + hearts. */
  cheer() {
    this.scene.tweens.add({ targets: this.sprite, y: -50, duration: 180, yoyo: true, repeat: 1, ease: 'Quad.out' });
    for (let i = 0; i < 4; i++) {
      const h = this.scene.add.image(this.x + Phaser.Math.Between(-50, 50), this.y - 150, 'heart').setDisplaySize(50, 50).setDepth(2000);
      this.scene.tweens.add({ targets: h, y: h.y - 140, alpha: 0, delay: i * 120, duration: 900, onComplete: () => h.destroy() });
    }
  }

  /** Hide/show the child (absent today, gone home...). */
  setPresent(on: boolean) {
    this.present = on;
    this.setVisible(on).setActive(on);
    if (on) this.setInteractive();
    else this.disableInteractive();
    if (!on) {
      this.mode = 'busy';
      this.stop();
      this.setNeed(null);
      this.setBadge(null);
      this.setWearing([]);
      this.setCostume(null);
      this.homeRoom = null;
    }
  }

  update(dt: number, leader?: Walker) {
    if (!this.present) return;
    this.speed = this.mode === 'following' ? 420 : this.mode === 'busy' ? 330 : 230 * (TRAITS[this.def.id]?.pace ?? 1);
    if (this.mode === 'following' && leader) {
      // Stay just behind the teacher, holding her hand.
      const side = leader.sprite.flipX ? -1 : 1;
      const tx = leader.x + side * 95;
      const ty = leader.y + 8;
      if (Math.hypot(tx - this.x, ty - this.y) > 12) this.walkTo(tx, ty);
    } else if (this.mode === 'free' && (this.need === 'sad' || this.need === 'sick' || this.need === 'fight' || this.need === 'play' || this.need === 'hurt')) {
      // Upset or poorly kids stand still and wait for help.
      if (this.moving) this.stop();
    } else if (this.mode === 'free') {
      this.wanderTimer -= dt * 1000;
      if (this.wanderTimer <= 0 && !this.moving) {
        this.wanderTimer = Phaser.Math.Between(2500, 6000);
        const room = this.homeRoom ?? this.roomIndex;
        const left = room * ROOM_W + 140;
        this.walkTo(
          Phaser.Math.Between(left, left + ROOM_W - 280),
          Phaser.Math.Between(FLOOR_MIN_Y + 20, FLOOR_MAX_Y - 10),
        );
      }
    }
    this.step(dt);
  }
}
