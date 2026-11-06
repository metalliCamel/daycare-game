# Przedszkole Hani

A daycare-teacher game for Hania (6). Built with Phaser 3, TypeScript and Vite, deployed to Vercel as a static site.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## Deploy

Vercel detects Vite automatically: build command `npm run build`, output directory `dist`.

## How it plays

Hania is the teacher. Click the floor (or use the arrow keys) to walk through the building; the room map in the corner jumps to any room, and a red dot shows where someone needs help. Click a child to take their hand; click the teacher to let go. While holding a child, other kids don't block clicks on the toys behind them. Hovering over anything reads it aloud.

**A day at the daycare** (the clock only runs during free time, so nothing is ever rushed):

| Time | What happens | Where |
|---|---|---|
| 7:30 | Parents bring the kids: greet them, check temperature, hang coats on each child's hook. A child with a fever goes home with the parent. | Szatnia |
| free time | Random needs: toilet → flush → wash hands, sad child → bring the teddy, toy fights → choose how to solve it, a child feeling unwell → thermometer → call the parent. Craft table: color a picture, it hangs on the wall. | everywhere |
| 9:00 | Śniadanie: sandwiches (cut + build from order cards) or porridge (each child's two favourite toppings), pour milk, carry the tray, wipe the crumbs. | Kuchnia, Jadalnia |
| 10:00 | Going out: dress kids for the weather (sun / rain / cold), then swings (push at the green ring), slide, sandbox castle, and a head count before going back in. | Szatnia, Plac zabaw |
| 12:00 | Obiad: tomato or vegetable soup — cut, put the right ingredients in the pot, stir, ladle into bowls. Water to drink. | Kuchnia, Jadalnia |
| 13:00 | Nap: tuck everyone in, switch off the light, play the lullaby, pat kids who wake up. | Sypialnia |
| 14:30 | Podwieczorek: cupcakes to decorate or a fruit salad. Juice to drink. | Kuchnia, Jadalnia |
| 15:30 | Parents come back: coat on at the hook, hand each child to the right parent. Then the day summary and the next day. | Szatnia |

Dishes alternate day by day (see `src/world/menu.ts`).

**Start screen:** new game or load game, in three save slots. A new game asks for the teacher's name ("Ciocia Patrycja") and look. In the game, 💾 saves and goes back to the start screen; loading continues from the morning of the saved day.

**Stars** are earned for everything and spent in the shop (🛍️) on decorations that appear in the rooms. Progress (stars, day, decorations, drawings, teacher name and look, music on/off) is saved in the browser, per save slot.

## Design rules

- Polish UI. Every instruction is short text **and** read aloud (`say()` in `src/lib/voice.ts`).
- Mouse-first: big click targets, drag and drop, no precise gestures.
- No failure states: mistakes become something funny to fix, never "game over".

## Code map

- `src/scenes/WorldScene.ts` – teacher, kids, input, day schedule, random needs
- `src/world/` – one module per area: `cloakroom`, `playroom`, `meals`, `bathroom`, `outside`, `nap`, `decor`; `draw.ts` paints the rooms
- `src/objects/` – `Walker` (movement), `Kid` (needs, bubbles, clothes); six kids with parents in `Kid.ts`
- `src/scenes/` – minigames and menus built on `Overlay`: Sandwich (with cutting), Pour, Health, Dress, Choice, Craft, Shop, Summary
- `src/scenes/HudScene.ts` – stars, shop and music buttons, clock, prompts, room map
- `src/lib/sound.ts` – synthesized sound effects and music; `save.ts` – localStorage; `plural.ts` – Polish plurals

## Ideas for later

- Recorded voice prompts instead of browser text-to-speech
- More recipes (soup for lunch), more toys and decorations
- Seasons and holidays (snow day, birthday party)
- Swapping OpenMoji for custom illustrations

## Credits

Illustrations: [OpenMoji](https://openmoji.org) – the open-source emoji and icon project. License: CC BY-SA 4.0.
