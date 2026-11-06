import Phaser from 'phaser';
import { FONT, COLORS, inkHex } from './layout';
import { say, sayHover } from './voice';

/** Big, friendly button. Speaks its label on hover so a young reader can explore. */
export function bigButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  opts: { w?: number; h?: number; color?: number; speak?: string } = {},
) {
  const w = opts.w ?? 420;
  const h = opts.h ?? 130;
  const color = opts.color ?? COLORS.coral;

  const shadow = scene.add.graphics();
  shadow.fillStyle(0x000000, 0.15).fillRoundedRect(-w / 2, -h / 2 + 10, w, h, 40);
  const bg = scene.add.graphics();
  bg.fillStyle(color, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 40);
  bg.lineStyle(6, 0xffffff, 0.9).strokeRoundedRect(-w / 2, -h / 2, w, h, 40);
  const text = scene.add
    .text(0, 0, label, { fontFamily: FONT, fontSize: '56px', fontStyle: '800', color: '#ffffff' })
    .setOrigin(0.5)
    .setShadow(0, 3, inkHex, 0, false, true);

  const c = scene.add.container(x, y, [shadow, bg, text]);
  c.setSize(w, h).setInteractive({ useHandCursor: true });

  c.on('pointerover', () => {
    scene.tweens.add({ targets: c, scale: 1.08, duration: 150, ease: 'Back.out' });
    sayHover(opts.speak ?? label);
  });
  c.on('pointerout', () => scene.tweens.add({ targets: c, scale: 1, duration: 150 }));
  c.on('pointerdown', () => {
    scene.tweens.add({ targets: c, scale: 0.94, duration: 80, yoyo: true, onComplete: onClick });
  });
  return c;
}

export function title(scene: Phaser.Scene, x: number, y: number, txt: string, size = 96) {
  return scene.add
    .text(x, y, txt, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: '800', color: inkHex, align: 'center' })
    .setOrigin(0.5);
}
