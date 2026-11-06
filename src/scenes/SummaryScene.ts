import { Overlay } from './Overlay';
import { GAME_W, FONT, inkHex } from '../lib/layout';
import { KIDS } from '../objects/Kid';
import { bigButton } from '../lib/ui';
import { prompt, save } from '../lib/state';
import { stars } from '../lib/plural';
import { auntieVoc } from '../lib/names';
import { sfx } from '../lib/sound';

/** End of the day: stars earned and a wave goodbye. */
export class SummaryScene extends Overlay {
  private day = 1;
  private stars = 0;
  private total = 0;

  constructor() {
    super('Summary');
  }

  init(data: { day: number; stars: number; total: number }) {
    super.init();
    this.day = data.day;
    this.stars = data.stars;
    this.total = data.total;
  }

  create() {
    this.background(0xfde9c9);
    sfx.cheer();
    this.heading(`Koniec dnia ${this.day}!`, 120, 84);
    const group = KIDS.filter((k) => save.group.includes(k.id));
    group.forEach((k, i) => {
      const img = this.add.image(GAME_W / 2 + (i - (group.length - 1) / 2) * 150, 300, k.key).setDisplaySize(130, 130);
      this.tweens.add({ targets: img, y: 280, duration: 400, delay: i * 90, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    });
    this.add.image(GAME_W / 2 - 160, 470, 'star').setDisplaySize(110, 110);
    this.add.text(GAME_W / 2 - 90, 470, `+${this.stars} dzisiaj`, { fontFamily: FONT, fontSize: '64px', fontStyle: '800', color: inkHex }).setOrigin(0, 0.5);
    this.add.text(GAME_W / 2, 560, `Razem masz ${stars(this.total)} do wydania w sklepiku.`, { fontFamily: FONT, fontSize: '38px', fontStyle: '700', color: inkHex }).setOrigin(0.5);
    prompt(`Koniec dnia! Dzisiaj zdobyłaś ${stars(this.stars)}. Wszystkie dzieci są już w domu. Świetna robota, ${auntieVoc()}!`);
    bigButton(this, GAME_W / 2, 690, 'Następny dzień', () => this.close('next'), { w: 560, speak: 'Następny dzień' });
  }
}
