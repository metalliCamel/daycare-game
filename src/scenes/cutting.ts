import Phaser from 'phaser';
import { addStars, prompt } from '../lib/state';
import { say } from '../lib/voice';
import { sfx } from '../lib/sound';
import type { EmojiKey } from '../lib/assets';

/** Polish names for cutting: "Pokrój marchewkę!", "Marchewka pokrojona!". */
export const CUT_NAMES: Partial<Record<EmojiKey, { acc: string; done: string }>> = {
  tomato: { acc: 'pomidora', done: 'Pomidor pokrojony!' },
  cucumber: { acc: 'ogórka', done: 'Ogórek pokrojony!' },
  egg: { acc: 'jajko', done: 'Jajko pokrojone!' },
  carrot: { acc: 'marchewkę', done: 'Marchewka pokrojona!' },
  potato: { acc: 'ziemniaka', done: 'Ziemniak pokrojony!' },
  onion: { acc: 'cebulę', done: 'Cebula pokrojona!' },
  pepper: { acc: 'paprykę', done: 'Papryka pokrojona!' },
  apple: { acc: 'jabłko', done: 'Jabłko pokrojone!' },
  banana: { acc: 'banana', done: 'Banan pokrojony!' },
  pear: { acc: 'gruszkę', done: 'Gruszka pokrojona!' },
  kiwi: { acc: 'kiwi', done: 'Kiwi pokrojone!' },
  orange: { acc: 'pomarańczę', done: 'Pomarańcza pokrojona!' },
  strawberry: { acc: 'truskawkę', done: 'Truskawka pokrojona!' },
};

/**
 * Cut each item on a board at (x, y): drag the knife down across three dashed
 * lines. Calls onDone when everything is cut.
 */
export function cutSequence(scene: Phaser.Scene, keys: EmojiKey[], x: number, y: number, onDone: () => void) {
  const queue = [...keys];
  const board = scene.add.graphics();
  board.fillStyle(0xc68c5c, 1).fillRoundedRect(x - 230, y - 90, 460, 210, 40);
  let layer: Phaser.GameObjects.Container | null = null;

  const next = () => {
    layer?.destroy();
    const key = queue.shift();
    if (!key) {
      board.destroy();
      onDone();
      return;
    }
    const c = scene.add.container(x, y);
    layer = c;
    c.add(scene.add.image(0, 0, key).setDisplaySize(330, 330));
    const lines = [-75, 0, 75].map((dx) => {
      const l = scene.add.graphics();
      l.lineStyle(6, 0x4a3a5c, 0.7);
      for (let ly = -130; ly < 130; ly += 26) l.lineBetween(dx, ly, dx, ly + 13);
      c.add(l);
      return { dx, cut: false, g: l };
    });
    const knife = scene.add.image(0, 0, 'knife').setDisplaySize(150, 150).setVisible(false).setDepth(200);
    prompt(`Pokrój ${CUT_NAMES[key]?.acc ?? 'to'}! Przytrzymaj przycisk i przeciągnij nożem w dół po kreskach.`);

    let lastX: number | null = null;
    const onMove = (p: Phaser.Input.Pointer) => {
      knife.setPosition(p.x + 40, p.y - 40).setVisible(true);
      if (!p.isDown) {
        lastX = null;
        return;
      }
      const lx = p.x - x;
      const ly = p.y - y;
      if (Math.abs(ly) < 170) {
        for (const line of lines) {
          const crossed = lastX !== null && (lastX - line.dx) * (lx - line.dx) <= 0;
          const along = Math.abs(lx - line.dx) < 22 && p.velocity.y > 2;
          if (!line.cut && (crossed || along)) {
            line.cut = true;
            sfx.chop();
            line.g.clear();
            line.g.fillStyle(0xc68c5c, 1).fillRect(line.dx - 5, -170, 10, 340);
            scene.tweens.add({ targets: c, x: x + Phaser.Math.Between(-6, 6), duration: 50, yoyo: true });
          }
        }
      }
      lastX = lx;
      if (lines.every((l) => l.cut)) {
        scene.input.off('pointermove', onMove);
        knife.destroy();
        c.removeAll(true);
        sfx.star();
        say(CUT_NAMES[key]?.done ?? 'Pokrojone!');
        for (let i = 0; i < 4; i++) {
          const s = scene.add.image(0, 0, key).setDisplaySize(170, 170).setScale(0.3, 0.6).setAngle(-10);
          c.add(s);
          scene.tweens.add({ targets: s, x: -150 + i * 100, duration: 400, ease: 'Back.out' });
        }
        scene.time.delayedCall(1300, next);
      }
    };
    scene.input.on('pointermove', onMove);
  };
  next();
}
