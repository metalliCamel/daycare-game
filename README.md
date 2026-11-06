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

Hania is the teacher. Click the floor (or use the arrow keys) to walk through the building; the room map in the corner jumps to any room, and a red dot shows where a child needs help.

- **Kids** wander around and show what they need in a bubble. Click a child to take their hand; click again to let go.
- **Łazienka:** bring a child who needs the toilet → sit on the toilet → flush → wash hands (pop the soap bubbles).
- **Sad child:** pick up the teddy from the couch in the playroom and bring it to them.
- **Meals** (śniadanie 9:00, podwieczorek 13:00): kids go to the dining room by themselves. Make sandwiches on the kitchen counter, pour milk at the jug, carry the tray to the table, then wipe up the crumbs.
- The clock only runs between meals, so there's never a rush.

## Design rules

- Polish UI. Every instruction is short text **and** read aloud (`say()` in `src/lib/voice.ts`).
- Mouse-first: big click targets, drag and drop, no precise gestures.
- No failure states: mistakes become something funny to fix, never "game over".

## Code map

- `src/scenes/WorldScene.ts` – the building, teacher, kids, needs, meals, schedule
- `src/world/draw.ts` – rooms and furniture
- `src/objects/` – `Walker` (movement), `Kid` (needs, bubbles)
- `src/scenes/SandwichScene.ts`, `PourScene.ts` – kitchen minigames
- `src/scenes/HudScene.ts` – stars, clock, prompts, room map

## Roadmap

0. Setup and deploy ✅
1. Building with rooms, teacher + kids, bathroom, teddy, kitchen (sandwiches, pouring), meal + cleanup ✅
2. Kitchen extras: cutting vegetables, washing hands before meals, dishes
3. Szatnia: morning drop-off, health check at the door, afternoon pickup by parents
4. Outside: dressing for the weather, swings, sandbox, head count; toy fights in the playroom
5. Nap time in the bedroom, crafts and games in the playroom, room decorations bought with stars, saved progress
6. Polish: teacher customization, more kids and recipes, music

## Credits

Illustrations: [OpenMoji](https://openmoji.org) – the open-source emoji and icon project. License: CC BY-SA 4.0.
