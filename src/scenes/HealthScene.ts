import Phaser from 'phaser';
import { Overlay } from './Overlay';
import { FONT, inkHex } from '../lib/layout';
import { kidDef } from '../objects/Kid';
import { prompt } from '../lib/state';
import { say } from '../lib/voice';
import { sfx } from '../lib/sound';

/** Thermometer on the forehead → read it → healthy, or home to rest. */
export class HealthScene extends Overlay {
  private fever = false;
  private kidId = '';

  constructor() {
    super('Health');
  }

  init(data: { kidId: string; fever: boolean }) {
    super.init();
    this.kidId = data.kidId;
    this.fever = data.fever;
  }

  create() {
    const def = kidDef(this.kidId);
    this.background(0xe6f6ff);
    this.heading(`Sprawdzamy, czy ${def.name} jest ${def.girl ? 'zdrowa' : 'zdrowy'}`);
    this.closeButton(null);

    const kx = 560, ky = 470;
    this.add.circle(kx, ky - 20, 230, 0xffffff, 0.8);
    const face = this.add.image(kx, ky, def.key).setDisplaySize(380, 380);
    if (this.fever) {
      // Red cheeks and a sweaty look
      this.add.circle(kx - 85, ky - 30, 34, 0xff4d4d, 0.45);
      this.add.circle(kx + 85, ky - 30, 34, 0xff4d4d, 0.45);
      this.add.image(kx + 120, ky - 160, 'drop').setDisplaySize(50, 50);
      this.tweens.add({ targets: face, angle: { from: -2, to: 2 }, duration: 900, yoyo: true, repeat: -1 });
    }

    // Reading panel
    const panel = this.add.graphics();
    panel.fillStyle(0xffffff, 1).fillRoundedRect(950, 180, 420, 140, 30);
    const reading = this.add.text(1160, 250, '?', { fontFamily: FONT, fontSize: '80px', fontStyle: '800', color: inkHex }).setOrigin(0.5);

    const target = this.add.circle(kx, ky - 140, 70, 0xffd45c, 0.25).setStrokeStyle(6, 0xffd45c, 0.9);
    this.tweens.add({ targets: target, scale: 1.15, duration: 600, yoyo: true, repeat: -1 });

    const thermo = this.add.image(1160, 520, 'thermometer').setDisplaySize(200, 200).setInteractive({ useHandCursor: true, draggable: true });
    this.input.setDraggable(thermo);
    prompt('Przeciągnij termometr na czoło i chwilkę poczekaj.');

    let holdT = 0;
    let measured = false;
    thermo.on('drag', (_p: Phaser.Input.Pointer, x: number, y: number) => thermo.setPosition(x, y));
    thermo.on('dragend', () => {
      if (!measured) this.tweens.add({ targets: thermo, x: 1160, y: 520, duration: 300 });
    });
    this.events.on('update', (_t: number, dms: number) => {
      if (measured) return;
      const on = Phaser.Math.Distance.Between(thermo.x, thermo.y, target.x, target.y) < 110;
      holdT = on ? holdT + dms : 0;
      if (on) reading.setText(['.', '..', '...'][Math.floor(holdT / 300) % 3]);
      if (holdT > 1300) {
        measured = true;
        sfx.thermo();
        target.destroy();
        reading.setText(this.fever ? '38,5°' : '36,6°').setColor(this.fever ? '#e23b3b' : '#2e9e4f');
        say(this.fever ? 'Trzydzieści osiem i pół. To gorączka!' : 'Trzydzieści sześć i sześć. Wszystko dobrze!');
        this.tweens.add({ targets: thermo, x: 1160, y: 520, duration: 400 });
        thermo.disableInteractive();
        this.time.delayedCall(1200, () => this.askDecision(def.girl));
      }
    });
  }

  private askDecision(girl: boolean) {
    prompt('Co robimy? Wybierz obrazek.');
    const decide = (sick: boolean) => {
      if (sick !== this.fever) {
        sfx.wrong();
        say(this.fever ? 'Spójrz na termometr: czerwony znaczy gorączka.' : 'Spójrz na termometr: zielony znaczy, że wszystko dobrze.');
        return;
      }
      this.bravo(sick ? 'Dobrze! Do domu, żeby wyzdrowieć.' : 'Super! Można się bawić!', () => this.close(sick ? 'home' : 'healthy'), 420);
    };
    this.pictureButton(1000, 600, 'happy', girl ? 'Zdrowa!' : 'Zdrowy!', () => decide(false), 0xd8f5d8, 190);
    this.pictureButton(1280, 600, 'sick', 'Do domu', () => decide(true), 0xffe0e0, 190);
  }
}
