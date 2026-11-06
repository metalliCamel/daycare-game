import Phaser from 'phaser';
import { GAME_W, GAME_H, FONT, inkHex } from '../lib/layout';
import { KIDS } from '../objects/Kid';
import { bus, addStars, prompt } from '../lib/state';
import { say } from '../lib/voice';

const CUP_W = 150;
const CUP_H = 220;
const CUP_Y = 600; // bottom of the cups
const LINE = 0.8; // target fill level
const GOOD_MIN = 0.65;

/** Hold the mouse button (or space) to pour milk. Stop at the line! */
export class PourScene extends Phaser.Scene {
  private cup = 0;
  private fill = 0;
  private pouring = false;
  private locked = false;
  private cupX: number[] = [];
  private fills: Phaser.GameObjects.Graphics[] = [];
  private jug!: Phaser.GameObjects.Image;
  private stream!: Phaser.GameObjects.Rectangle;
  private space!: Phaser.Input.Keyboard.Key;

  constructor() {
    super('Pour');
  }

  create() {
    this.cup = 0;
    this.fill = 0;
    this.locked = false;
    this.fills = [];

    const g = this.add.graphics();
    g.fillStyle(0xfff3b0, 1).fillRect(0, 0, GAME_W, GAME_H);
    g.fillStyle(0xe7a96b, 1).fillRect(0, CUP_Y, GAME_W, 40);
    g.fillStyle(0xcf8f52, 1).fillRect(0, CUP_Y + 40, GAME_W, GAME_H - CUP_Y - 40);

    this.cupX = KIDS.map((_, i) => 380 + i * 280);
    KIDS.forEach((kid, i) => {
      const x = this.cupX[i];
      const f = this.add.graphics();
      this.fills.push(f);
      const glass = this.add.graphics();
      glass.fillStyle(0xbfe6ff, 0.45).fillRoundedRect(x - CUP_W / 2, CUP_Y - CUP_H, CUP_W, CUP_H, { tl: 6, tr: 6, bl: 30, br: 30 });
      glass.lineStyle(6, 0x7fb8d8, 1).strokeRoundedRect(x - CUP_W / 2, CUP_Y - CUP_H, CUP_W, CUP_H, { tl: 6, tr: 6, bl: 30, br: 30 });
      // Dashed "fill to here" line
      glass.lineStyle(5, 0xff7a6b, 1);
      const ly = CUP_Y - CUP_H * LINE;
      for (let lx = x - CUP_W / 2 + 8; lx < x + CUP_W / 2 - 8; lx += 24) glass.lineBetween(lx, ly, lx + 12, ly);
      this.add.image(x, CUP_Y + 90, kid.key).setDisplaySize(90, 90);
    });

    this.stream = this.add.rectangle(0, 0, 18, 10, 0xffffff).setOrigin(0.5, 0).setVisible(false);
    this.jug = this.add.image(0, 210, 'teapot').setDisplaySize(200, 200).setDepth(10);
    this.moveJug(false);

    this.add.text(GAME_W / 2, 65, 'Trzymaj przycisk, żeby nalać mleko', { fontFamily: FONT, fontSize: '44px', fontStyle: '800', color: inkHex }).setOrigin(0.5);
    const back = this.add.text(GAME_W - 80, 190, '✖', { fontSize: '56px', color: inkHex }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.close(false));

    this.input.on('pointerdown', (_p: Phaser.Input.Pointer, over: unknown[]) => { if (!over.length) this.pouring = true; });
    this.input.on('pointerup', () => this.stopPour());
    this.space = this.input.keyboard!.addKey('SPACE');
    this.space.on('down', () => (this.pouring = true));
    this.space.on('up', () => this.stopPour());

    prompt('Trzymaj przycisk myszki i nalej mleko do czerwonej kreski. Puść w porę!');
  }

  private moveJug(animate = true) {
    const x = this.cupX[this.cup] - 130;
    if (animate) this.tweens.add({ targets: this.jug, x, duration: 500, ease: 'Quad.inOut' });
    else this.jug.x = x;
  }

  private drawFill(i: number, level: number) {
    const x = this.cupX[i];
    const h = Math.min(level, 1) * (CUP_H - 10);
    const f = this.fills[i];
    f.clear();
    f.fillStyle(0xfffdf6, 1).fillRoundedRect(x - CUP_W / 2 + 6, CUP_Y - 5 - h, CUP_W - 12, h, { tl: 0, tr: 0, bl: 26, br: 26 });
  }

  update(_t: number, deltaMs: number) {
    if (this.locked) return;
    const dt = deltaMs / 1000;
    const targetAngle = this.pouring ? 55 : 0;
    this.jug.angle += (targetAngle - this.jug.angle) * Math.min(1, dt * 10);

    const flowing = this.pouring && this.jug.angle > 35;
    this.stream.setVisible(flowing);
    if (flowing) {
      const x = this.cupX[this.cup] - 20;
      const top = this.jug.y + 40;
      this.stream.setPosition(x, top).setSize(18, CUP_Y - top - 10);
      this.fill += dt * 0.32;
      this.drawFill(this.cup, this.fill);
      if (this.fill > 1.05) this.spill();
    }
  }

  private stopPour() {
    if (!this.pouring || this.locked) return;
    this.pouring = false;
    this.stream.setVisible(false);
    if (this.fill < 0.05) return;
    if (this.fill >= GOOD_MIN && this.fill <= 1) {
      addStars();
      say(this.fill >= LINE - 0.05 && this.fill <= LINE + 0.1 ? 'Idealnie!' : 'Super!');
      this.nextCup();
    } else if (this.fill < GOOD_MIN) {
      say('Jeszcze troszkę!');
    }
  }

  /** Too much! Milk spills on the table — wipe it with the sponge. */
  private spill() {
    this.locked = true;
    this.pouring = false;
    this.stream.setVisible(false);
    this.fill = 1;
    this.drawFill(this.cup, 1);
    prompt('Ojej, wylało się! Pocieraj gąbką kałużę, żeby ją wytrzeć.');

    const x = this.cupX[this.cup];
    const puddle = this.add.ellipse(x + 40, CUP_Y + 15, 260, 50, 0xffffff, 0.95).setDepth(5);
    const sponge = this.add.image(x + 230, CUP_Y - 60, 'sponge').setDisplaySize(130, 130).setDepth(20).setInteractive({ useHandCursor: true, draggable: true });
    this.input.setDraggable(sponge);
    let dirt = 1;
    let lastX = sponge.x;
    sponge.on('drag', (_p: Phaser.Input.Pointer, dx: number, dy: number) => {
      sponge.setPosition(dx, dy);
      const over = Phaser.Math.Distance.Between(dx, dy, puddle.x, puddle.y) < 170;
      if (over) {
        dirt -= Math.abs(dx - lastX) / 1400;
        puddle.setAlpha(Math.max(dirt, 0));
        if (dirt <= 0) {
          puddle.destroy();
          sponge.destroy();
          addStars();
          say('Czysto! Brawo!');
          this.locked = false;
          this.nextCup();
        }
      }
      lastX = dx;
    });
  }

  private nextCup() {
    this.cup++;
    this.fill = 0;
    if (this.cup >= KIDS.length) {
      this.locked = true;
      const t = this.add.text(GAME_W / 2, 250, 'Brawo! Picie gotowe!', { fontFamily: FONT, fontSize: '80px', fontStyle: '800', color: inkHex }).setOrigin(0.5).setScale(0);
      this.tweens.add({ targets: t, scale: 1, duration: 400, ease: 'Back.out' });
      this.time.delayedCall(2000, () => this.close(true));
    } else {
      this.moveJug();
    }
  }

  private close(finished: boolean) {
    this.scene.stop();
    bus.emit('minigame-done', finished ? 'Pour' : null);
  }
}
