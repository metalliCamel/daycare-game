import Phaser from 'phaser';
import { Overlay } from './Overlay';
import { FONT, inkHex } from '../lib/layout';
import { kidDef } from '../objects/Kid';
import { addStars, prompt } from '../lib/state';
import { say, sayHover } from '../lib/voice';
import { sfx } from '../lib/sound';
import { WEATHER, type Weather } from '../world/outside';
import type { EmojiKey } from '../lib/assets';

const CLOTHES: { key: EmojiKey; name: string }[] = [
  { key: 'cap', name: 'czapka z daszkiem' },
  { key: 'sunglasses', name: 'okulary' },
  { key: 'umbrella', name: 'parasol' },
  { key: 'boots', name: 'kalosze' },
  { key: 'scarf', name: 'szalik' },
  { key: 'gloves', name: 'rękawiczki' },
];
const ON_BODY: Record<string, [number, number, number]> = {
  cap: [0, -150, 140], sunglasses: [0, -40, 110], umbrella: [130, -170, 200], boots: [0, 175, 110], scarf: [0, 90, 130], gloves: [120, 110, 90],
};

/** Pick the right clothes for the weather, one child at a time. */
export class DressScene extends Overlay {
  private kids: string[] = [];
  private weather: Weather = 'sun';
  private idx = 0;
  private worn: EmojiKey[] = [];
  private kidC!: Phaser.GameObjects.Container;
  private items: Phaser.GameObjects.Image[] = [];

  constructor() {
    super('Dress');
  }

  init(data: { kids: string[]; weather: Weather }) {
    super.init();
    this.kids = data.kids;
    this.weather = data.weather;
    this.idx = 0;
  }

  create() {
    const info = WEATHER[this.weather];
    this.background(0xfff3dc);
    this.heading('Ubieramy dzieci na dwór');
    this.closeButton(false);

    // Window showing today's weather
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1).fillRoundedRect(1080, 140, 300, 240, 24);
    g.fillStyle(this.weather === 'sun' ? 0xbfe6ff : 0x9aa9bf, 1).fillRoundedRect(1095, 155, 270, 210, 16);
    const wicon = this.add.image(1230, 260, info.icon).setDisplaySize(160, 160);
    this.tweens.add({ targets: wicon, scale: wicon.scale * 1.08, duration: 900, yoyo: true, repeat: -1 });
    this.add.text(1230, 410, `Dzisiaj: ${info.name}`, { fontFamily: FONT, fontSize: '40px', fontStyle: '800', color: inkHex }).setOrigin(0.5);

    // Clothes rack
    CLOTHES.forEach((c, i) => {
      const x = 250 + i * 150;
      const y = 680;
      this.add.circle(x, y, 68, 0xffffff, 1).setStrokeStyle(4, 0xe0d0b0);
      const img = this.add.image(x, y, c.key).setDisplaySize(105, 105).setInteractive({ useHandCursor: true, draggable: true });
      img.setData('home', { x, y }).setData('key', c.key);
      this.input.setDraggable(img);
      img.on('pointerover', () => sayHover(c.name));
      img.on('drag', (_p: Phaser.Input.Pointer, dx: number, dy: number) => img.setPosition(dx, dy));
      img.on('dragend', () => this.dropItem(img, c.name));
      this.items.push(img);
    });

    this.showKid();
  }

  private showKid() {
    this.kidC?.destroy();
    this.worn = [];
    const def = kidDef(this.kids[this.idx]);
    const face = this.add.image(0, 0, def.key).setDisplaySize(300, 300);
    const name = this.add.text(0, 190, def.name, { fontFamily: FONT, fontSize: '44px', fontStyle: '800', color: inkHex }).setOrigin(0.5);
    this.kidC = this.add.container(620, 360, [face, name]);
    this.kidC.setScale(0);
    this.tweens.add({ targets: this.kidC, scale: 1, duration: 300, ease: 'Back.out' });
    const info = WEATHER[this.weather];
    prompt(`Dzisiaj jest ${info.name}. Co ${def.name} ${def.girl ? 'powinna' : 'powinien'} założyć? Przeciągnij dwie rzeczy.`);
  }

  private dropItem(img: Phaser.GameObjects.Image, name: string) {
    const key = img.getData('key') as EmojiKey;
    const home = img.getData('home') as { x: number; y: number };
    const onKid = Phaser.Math.Distance.Between(img.x, img.y, 620, 380) < 230;
    const back = () => this.tweens.add({ targets: img, x: home.x, y: home.y, duration: 300 });
    if (!onKid) return back();
    const info = WEATHER[this.weather];
    if (!info.wear.includes(key)) {
      sfx.wrong();
      say(`Hmm, ${name}? Dzisiaj jest ${info.name}. Czy to pasuje?`);
      this.tweens.add({ targets: img, angle: { from: -15, to: 15 }, duration: 80, yoyo: true, repeat: 2, onComplete: () => { img.setAngle(0); back(); } });
      return;
    }
    if (this.worn.includes(key)) return back();
    this.worn.push(key);
    const [x, y, size] = ON_BODY[key];
    const piece = this.add.image(x, y, key).setDisplaySize(size, size);
    this.kidC.add(piece);
    img.setPosition(home.x, home.y);
    sfx.pop();
    say(name);
    if (this.worn.length === info.wear.length) {
      addStars();
      sfx.giggle();
      this.time.delayedCall(900, () => {
        this.idx++;
        if (this.idx < this.kids.length) this.showKid();
        else this.bravo('Wszyscy ubrani!', () => this.close(true));
      });
    }
  }
}
