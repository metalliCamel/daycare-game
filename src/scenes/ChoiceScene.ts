import { Overlay } from './Overlay';
import { GAME_W } from '../lib/layout';
import { prompt } from '../lib/state';

/** A question with a few picture answers (all answers are fine — it's about choosing kindly). */
export class ChoiceScene extends Overlay {
  private title = '';
  private options: { key: string; label: string }[] = [];

  constructor() {
    super('Choice');
  }

  init(data: { title: string; options: { key: string; label: string }[] }) {
    super.init();
    this.title = data.title;
    this.options = data.options;
  }

  create() {
    this.background(0xfff0f5);
    this.heading(this.title, 200, 44).setWordWrapWidth(1200);
    prompt(this.title);
    const n = this.options.length;
    this.options.forEach((o, i) => {
      const x = GAME_W / 2 + (i - (n - 1) / 2) * 340;
      this.pictureButton(x, 450, o.key, o.label, () => this.close(i), 0xffffff, 260);
    });
  }
}
