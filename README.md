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

## Design rules

- Polish UI. Every instruction is short text **and** read aloud (`say()` in `src/lib/voice.ts`).
- Mouse-first: big click targets, drag and drop, no precise gestures.
- No failure states: mistakes become something funny to fix, never "game over".

## Roadmap

0. Setup and deploy ✅
1. Kitchen vertical slice: sandwiches + pouring water
2. Kitchen complete: hand washing, cutting, serving, cleanup
3. Drop-off, health check, pickup
4. Outside (dressing, swings, head count) and events (toy fights, crying, sick child)
5. Full day loop, nap time, activities, stickers, room decorations, saved progress
6. Polish: teacher customization, more kids and recipes, music
