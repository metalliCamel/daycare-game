import Phaser from 'phaser';
import { FLOOR_MIN_Y, FLOOR_MAX_Y, WORLD_W } from '../lib/rooms';

/** A character that walks toward a target point with a little bounce. */
export class Walker extends Phaser.GameObjects.Container {
  sprite: Phaser.GameObjects.Image;
  speed: number;
  target: { x: number; y: number } | null = null;
  onArrive: (() => void) | null = null;
  private walkT = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, key: string, size: number, speed: number) {
    super(scene, x, y);
    this.speed = speed;
    // Origin at the feet so y means "where they stand on the floor".
    this.sprite = scene.add.image(0, 0, key).setOrigin(0.5, 0.95).setDisplaySize(size, size);
    this.add(this.sprite);
    scene.add.existing(this);
  }

  get moving() {
    return this.target !== null;
  }

  /** `exact` skips the floor clamp, e.g. to sit behind the dining table. */
  walkTo(x: number, y: number, onArrive: (() => void) | null = null, exact = false) {
    this.target = exact
      ? { x, y }
      : { x: Phaser.Math.Clamp(x, 60, WORLD_W - 60), y: Phaser.Math.Clamp(y, FLOOR_MIN_Y, FLOOR_MAX_Y) };
    this.onArrive = onArrive;
  }

  stop() {
    this.target = null;
    this.onArrive = null;
  }

  /** Move directly (arrow keys). */
  nudge(dx: number, dy: number, dt: number) {
    if (dx === 0 && dy === 0) return;
    this.stop();
    const len = Math.hypot(dx, dy);
    this.x = Phaser.Math.Clamp(this.x + (dx / len) * this.speed * dt, 60, WORLD_W - 60);
    this.y = Phaser.Math.Clamp(this.y + (dy / len) * this.speed * dt, FLOOR_MIN_Y, FLOOR_MAX_Y);
    if (dx !== 0) this.face(dx);
    this.bob(dt, true);
  }

  face(dx: number) {
    // OpenMoji people face the viewer; a gentle flip still reads as "turning".
    this.sprite.setFlipX(dx > 0);
  }

  step(dt: number) {
    let moved = false;
    if (this.target) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.hypot(dx, dy);
      const stepLen = this.speed * dt;
      if (dist <= stepLen || dist < 4) {
        this.x = this.target.x;
        this.y = this.target.y;
        const cb = this.onArrive;
        this.target = null;
        this.onArrive = null;
        cb?.();
      } else {
        this.x += (dx / dist) * stepLen;
        this.y += (dy / dist) * stepLen;
        if (Math.abs(dx) > 2) this.face(dx);
        moved = true;
      }
    }
    this.bob(dt, moved);
    this.setDepth(this.y);
  }

  private bob(dt: number, moving: boolean) {
    if (moving) {
      this.walkT += dt * 12;
      this.sprite.y = -Math.abs(Math.sin(this.walkT)) * 14;
      this.sprite.angle = Math.sin(this.walkT) * 5;
    } else {
      this.walkT = 0;
      this.sprite.y *= 0.8;
      this.sprite.angle *= 0.8;
    }
  }
}
