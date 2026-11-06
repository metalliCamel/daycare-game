import { Overlay } from './Overlay';
import { GAME_W, FONT, inkHex } from '../lib/layout';
import { bigButton } from '../lib/ui';
import { save, persist, prompt } from '../lib/state';
import { auntie } from '../lib/names';
import { stars } from '../lib/plural';

/** In-game menu: save and go back to the start screen, or keep playing. */
export class PauseScene extends Overlay {
  constructor() {
    super('Pause');
  }

  create() {
    this.background(0xfde9c9);
    this.heading('Przerwa', 170, 84);
    this.add.image(GAME_W / 2, 330, save.teacher).setDisplaySize(160, 160);
    this.add
      .text(GAME_W / 2, 450, `${auntie()}  ·  Dzień ${save.day}  ·  ⭐ ${save.stars}`, { fontFamily: FONT, fontSize: '40px', fontStyle: '800', color: inkHex })
      .setOrigin(0.5);
    prompt(`Gra jest zapisana: dzień ${save.day}, ${stars(save.stars)}. Po wczytaniu zaczniemy ten dzień od rana.`);
    bigButton(this, GAME_W / 2 - 300, 620, 'Graj dalej', () => this.close(null), { w: 500, color: 0x8fd9b6, speak: 'Graj dalej' });
    bigButton(this, GAME_W / 2 + 300, 620, 'Zapisz i wyjdź', () => {
      persist();
      this.close('quit');
    }, { w: 500, speak: 'Zapisz i wyjdź' });
  }
}
