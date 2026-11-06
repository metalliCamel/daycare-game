import Phaser from 'phaser';
import { Overlay } from './Overlay';
import { GAME_W, GAME_H, FONT, inkHex } from '../lib/layout';
import { kidDef } from '../objects/Kid';
import { prompt, save } from '../lib/state';
import { say, sayHover } from '../lib/voice';
import { sfx } from '../lib/sound';
import type { EmojiKey } from '../lib/assets';

const NUMBERS = ['jeden', 'dwa', 'trzy', 'cztery', 'pięć', 'sześć', 'siedem', 'osiem'];
const ANIMALS: { key: EmojiKey; name: string }[] = [
  { key: 'duck', name: 'Kaczka! Kwa, kwa!' },
  { key: 'squirrel', name: 'Wiewiórka!' },
  { key: 'hedgehog', name: 'Jeż!' },
  { key: 'butterfly', name: 'Motylek!' },
  { key: 'bird', name: 'Ptaszek! Ćwir, ćwir!' },
];

/** Walk to the park: cross the street on green, spot animals, count everyone. */
export class TripScene extends Overlay {
  private kids: string[] = [];
  private layer!: Phaser.GameObjects.Container;
  private crossings = 0;

  constructor() {
    super('Trip');
  }

  init(data: { kids: string[] }) {
    super.init();
    this.kids = data.kids;
    this.crossings = 0;
  }

  create() {
    this.layer = this.add.container(0, 0);
    this.street();
  }

  private clear(bg: number) {
    this.layer.removeAll(true);
    this.layer.add(this.add.rectangle(0, 0, GAME_W, GAME_H, bg).setOrigin(0));
  }

  private group(x: number, y: number) {
    const c = this.add.container(x, y);
    c.add(this.add.image(0, -10, save.teacher).setDisplaySize(130, 130));
    this.kids.forEach((id, i) => c.add(this.add.image(90 + (i % 4) * 70, (Math.floor(i / 4) - 0.5) * 70, kidDef(id).key).setDisplaySize(70, 70)));
    return c;
  }

  // ---------- 1. Crossing the street ----------

  private street() {
    this.clear(0x9fd3f5);
    const g = this.add.graphics();
    g.fillStyle(0x8fd9b6, 1).fillRect(0, 520, GAME_W, 380);
    g.fillStyle(0xbfbfbf, 1).fillRect(0, 300, GAME_W, 60).fillRect(0, 460, GAME_W, 60);
    g.fillStyle(0x555b66, 1).fillRect(0, 360, GAME_W, 100);
    g.fillStyle(0xffffff, 1);
    for (let x = 640; x < 960; x += 50) g.fillRect(x, 365, 30, 90);
    this.layer.add(g);
    this.layer.add(this.heading(this.crossings === 0 ? 'Idziemy do parku!' : 'Jeszcze jedno przejście!'));

    // Traffic light
    const pole = this.add.graphics();
    pole.fillStyle(0x333333, 1).fillRect(1080, 160, 16, 300).fillRoundedRect(1040, 90, 96, 170, 20);
    const red = this.add.circle(1088, 135, 30, 0x552222);
    const green = this.add.circle(1088, 215, 30, 0x225522);
    this.layer.add([pole, red, green]);
    let isGreen = false;
    const setLight = (gOn: boolean) => {
      isGreen = gOn;
      red.setFillStyle(gOn ? 0x552222 : 0xff3b3b);
      green.setFillStyle(gOn ? 0x3bff6b : 0x225522);
    };
    setLight(false);
    const timer = this.time.addEvent({ delay: 2500, loop: true, callback: () => setLight(!isGreen) });

    const group = this.group(700, 580);
    this.layer.add(group);
    prompt('Przechodzimy przez ulicę. Czekamy na zielone światło! Kliknij „Idziemy”, gdy zaświeci się zielone.');
    const go = this.pictureButton(1350, 600, 'trafficlight', 'Idziemy!', () => {
      if (!isGreen) {
        sfx.wrong();
        say('Stój! Czerwone światło. Czekamy na zielone.');
        return;
      }
      timer.remove();
      go.disableInteractive();
      sfx.whoosh();
      say('Zielone! Idziemy po pasach.');
      this.tweens.add({
        targets: group, y: 230, duration: 1600, ease: 'Sine.inOut',
        onComplete: () => {
          this.crossings++;
          this.time.delayedCall(500, () => (this.crossings < 2 ? this.street() : this.park()));
        },
      });
    }, 0xffffff, 200);
    this.layer.add(go);
  }

  // ---------- 2. In the park: spot the animals ----------

  private park() {
    this.clear(0xbfe6ff);
    const g = this.add.graphics();
    g.fillStyle(0x8fd9b6, 1).fillRect(0, 430, GAME_W, 470);
    g.fillStyle(0x7fb8ff, 1).fillEllipse(1250, 640, 360, 120);
    this.layer.add(g);
    this.layer.add(this.heading('W parku! Znajdź wszystkie zwierzątka.'));
    const spots = [[230, 500], [520, 380], [860, 560], [1250, 610], [1450, 330]];
    let found = 0;
    const counter = this.add.text(GAME_W / 2, 140, `0 / ${ANIMALS.length}`, { fontFamily: FONT, fontSize: '44px', fontStyle: '800', color: inkHex }).setOrigin(0.5);
    this.layer.add(counter);
    ANIMALS.forEach((a, i) => {
      const [x, y] = spots[i];
      const img = this.add.image(x, y, a.key).setDisplaySize(80, 80).setInteractive({ useHandCursor: true });
      this.layer.add(img);
      // Half-hidden behind a tree or bush
      this.layer.add(this.add.image(x + (i % 2 ? 85 : -75), y + 25, i % 2 ? 'tree' : 'plant').setDisplaySize(i % 2 ? 200 : 140, i % 2 ? 200 : 140));
      img.once('pointerdown', () => {
        img.disableInteractive();
        found++;
        this.layer.bringToTop(img);
        sfx.pop();
        say(a.name);
        counter.setText(`${found} / ${ANIMALS.length}`);
        this.tweens.add({ targets: img, y: y - 60, scale: img.scale * 1.4, duration: 300, yoyo: true });
        if (found === ANIMALS.length) this.time.delayedCall(1200, () => this.count());
      });
    });
    prompt('Gdzie schowały się zwierzątka? Klikaj, kiedy któreś znajdziesz.');
  }

  // ---------- 3. Count the kids before going back ----------

  private count() {
    this.clear(0xfde9c9);
    this.layer.add(this.heading('Wracamy! Policz dzieci.'));
    let n = 0;
    this.kids.forEach((id, i) => {
      const def = kidDef(id);
      const x = GAME_W / 2 + (i - (this.kids.length - 1) / 2) * 170;
      const img = this.add.image(x, 420, def.key).setDisplaySize(140, 140).setInteractive({ useHandCursor: true });
      img.on('pointerover', () => sayHover(def.name));
      this.layer.add(img);
      img.once('pointerdown', () => {
        img.disableInteractive();
        n++;
        sfx.pop();
        say(NUMBERS[n - 1]);
        this.layer.add(this.add.text(x, 290, String(n), { fontFamily: FONT, fontSize: '64px', fontStyle: '800', color: '#ffffff', stroke: inkHex, strokeThickness: 10 }).setOrigin(0.5));
        if (n === this.kids.length) this.bravo(`Jest nas ${n}! Wracamy do przedszkola.`, () => this.close(true), 620);
      });
    });
    prompt('Kliknij każde dziecko i policz na głos.');
  }
}
