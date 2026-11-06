import { Overlay } from './Overlay';
import { SHOP } from '../world/decor';
import { ROOMS } from '../lib/rooms';
import { save, spendStars, persist, bus, prompt } from '../lib/state';
import { say } from '../lib/voice';
import { sfx } from '../lib/sound';
import { stars } from '../lib/plural';

/** Spend stars on decorations for the daycare. */
export class ShopScene extends Overlay {
  constructor() {
    super('Shop');
  }

  create() {
    this.background(0xfff0f5);
    this.heading('Sklepik z ozdobami');
    this.closeButton(null);
    prompt(`Masz ${stars(save.stars)}. Kup ozdobę do przedszkola!`);
    this.render();
  }

  private render() {
    this.children.list.filter((o) => o.getData?.('card')).forEach((o) => o.destroy());
    SHOP.forEach((item, i) => {
      const x = 170 + (i % 8) * 180;
      const y = 250 + Math.floor(i / 8) * 270;
      const owned = save.decor.includes(item.id);
      const label = owned ? `${item.name} ✓` : `${item.name}\n⭐ ${item.price}`;
      const color = owned ? 0xd8f5d8 : save.stars >= item.price ? 0xffffff : 0xeeeeee;
      const card = this.pictureButton(x, y, item.key, label, () => this.buy(item.id), color, 160);
      card.setData('card', true);
      if (!owned && save.stars < item.price) card.setAlpha(0.6);
    });
  }

  private buy(id: string) {
    const item = SHOP.find((s) => s.id === id)!;
    if (save.decor.includes(id)) {
      say(`${item.name} już jest w przedszkolu.`);
      return;
    }
    if (!spendStars(item.price)) {
      sfx.wrong();
      say(`Potrzebujesz jeszcze ${stars(item.price - save.stars)}.`);
      return;
    }
    save.decor.push(id);
    if (item.outfit) {
      save.outfits.push(id);
      save.outfit = id;
    }
    persist();
    bus.emit('decor-bought', id);
    sfx.cheer();
    const room = ROOMS.find((r) => r.id === item.room)!;
    say(item.outfit ? `Kupione! ${item.name} — ciocia już to nosi. Zmienisz w menu przerwy.` : `Kupione! ${item.name} jest teraz w pokoju: ${room.name}. Możesz ją przesunąć myszką.`);
    this.render();
  }
}
