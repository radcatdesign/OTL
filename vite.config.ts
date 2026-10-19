import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build` makes the normal multi-file app for hosting (Vercel, Netlify, etc).
// `npm run build:preview` inlines everything into one HTML file for a shareable preview.
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'preview' ? [viteSingleFile()] : [])],
  build: {
    outDir: mode === 'preview' ? 'dist-preview' : 'dist',
    chunkSizeWarningLimit: 1200,
    // The single-file preview embeds fonts as data URIs.
    assetsInlineLimit: mode === 'preview' ? 100_000_000 : 4096,
  },
}));
