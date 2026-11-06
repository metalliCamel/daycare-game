import Phaser from 'phaser';
import { Walker } from './Walker';
import { ROOM_W, FLOOR_MIN_Y, FLOOR_MAX_Y, roomIndexAt } from '../lib/rooms';
import type { EmojiKey } from '../lib/assets';
import { FONT, inkHex } from '../lib/layout';

export type Need = 'potty' | 'wash' | 'sad' | 'hungry' | null;

export type KidDef = {
  id: string;
  name: string;
  key: EmojiKey;
  girl: boolean;
  sandwich: EmojiKey[]; // fillings between two slices of bread
};

export const KIDS: KidDef[] = [
  { id: 'zosia', name: 'Zosia', key: 'kid_zosia', girl: true, sandwich: ['cheese', 'tomato'] },
  { id: 'antek', name: 'Antek', key: 'kid_antek', girl: false, sandwich: ['ham', 'lettuce'] },
  { id: 'ola', name: 'Ola', key: 'kid_ola', girl: true, sandwich: ['cheese', 'cucumber'] },
  { id: 'franek', name: 'Franek', key: 'kid_franek', girl: false, sandwich: ['ham', 'cheese'] },
];

const NEED_ICON: Record<Exclude<Need, null>, EmojiKey> = {
  potty: 'toilet',
  wash: 'soap',
  sad: 'cry',
  hungry: 'apple',
};

/**
 * free      – wanders around its room
 * following – holds the teacher's hand
 * busy      – sitting on the potty, at the table, etc. (doesn't move by itself)
 */
export type KidMode = 'free' | 'following' | 'busy';

export class Kid extends Walker {
  def: KidDef;
  need: Need = null;
  mode: KidMode = 'free';
  private bubble: Phaser.GameObjects.Container;
  private bubbleIcon: Phaser.GameObjects.Image;
  private wanderTimer = Phaser.Math.Between(1000, 3000);

  constructor(scene: Phaser.Scene, x: number, y: number, def: KidDef) {
    super(scene, x, y, def.key, 150, 230);
    this.def = def;

    const nameTag = scene.add
      .text(0, 12, def.name, { fontFamily: FONT, fontSize: '28px', fontStyle: '800', color: inkHex })
      .setOrigin(0.5, 0);
    this.add(nameTag);

    // Thought bubble above the head that shows what the child needs.
    const g = scene.add.graphics();
    g.fillStyle(0xffffff, 1).fillCircle(0, 0, 50).fillTriangle(-14, 40, 14, 40, 0, 66);
    g.lineStyle(5, 0x4a3a5c, 0.25).strokeCircle(0, 0, 50);
    this.bubbleIcon = scene.add.image(0, 0, 'toilet').setDisplaySize(70, 70);
    this.bubble = scene.add.container(0, -230, [g, this.bubbleIcon]).setVisible(false);
    this.add(this.bubble);
    scene.tweens.add({ targets: this.bubble, y: -244, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

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

  setNeed(need: Need) {
    this.need = need;
    if (need) {
      this.bubbleIcon.setTexture(NEED_ICON[need]);
      this.bubble.setVisible(true).setScale(0);
      this.scene.tweens.add({ targets: this.bubble, scale: 1, duration: 350, ease: 'Back.out' });
    } else {
      this.bubble.setVisible(false);
    }
  }

  needText(): string {
    const n = this.def.name;
    switch (this.need) {
      case 'potty': return `${n} musi iść do łazienki.`;
      case 'wash': return `${n} musi umyć rączki.`;
      case 'sad': return `${n} jest ${this.adj('smutna', 'smutny')}. Przynieś misia!`;
      case 'hungry': return `${n} jest ${this.adj('głodna', 'głodny')}.`;
      default: return `To jest ${n}.`;
    }
  }

  /** Celebrate: jump + hearts. */
  cheer() {
    this.scene.tweens.add({ targets: this.sprite, y: -50, duration: 180, yoyo: true, repeat: 1, ease: 'Quad.out' });
    for (let i = 0; i < 4; i++) {
      const h = this.scene.add.image(this.x + Phaser.Math.Between(-50, 50), this.y - 150, 'heart').setDisplaySize(50, 50).setDepth(2000);
      this.scene.tweens.add({ targets: h, y: h.y - 140, alpha: 0, delay: i * 120, duration: 900, onComplete: () => h.destroy() });
    }
  }

  update(dt: number, leader?: Walker) {
    this.speed = this.mode === 'following' ? 420 : 230;
    if (this.mode === 'following' && leader) {
      // Stay just behind the teacher, holding her hand.
      const side = leader.sprite.flipX ? -1 : 1;
      const tx = leader.x + side * 95;
      const ty = leader.y + 8;
      if (Math.hypot(tx - this.x, ty - this.y) > 12) this.walkTo(tx, ty);
    } else if (this.mode === 'free' && this.need === 'sad') {
      // Sad kids stand still and wait for a cuddle.
      if (this.moving) this.stop();
    } else if (this.mode === 'free') {
      this.wanderTimer -= dt * 1000;
      if (this.wanderTimer <= 0 && !this.moving) {
        this.wanderTimer = Phaser.Math.Between(2500, 6000);
        const left = this.roomIndex * ROOM_W + 140;
        this.walkTo(
          Phaser.Math.Between(left, left + ROOM_W - 280),
          Phaser.Math.Between(FLOOR_MIN_Y + 20, FLOOR_MAX_Y - 10),
        );
      }
    }
    this.step(dt);
  }
}
