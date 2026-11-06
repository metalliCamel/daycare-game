import { defineConfig } from 'vite';

export default defineConfig({
  // Phaser is ~1.2 MB on its own; that's expected for a game.
  build: { chunkSizeWarningLimit: 1600 },
});
