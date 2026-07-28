// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://experiencehub.example',
  adapter: node({
    mode: 'standalone',
  }),
  integrations: [
    sitemap({
      filter: (page) => !new URL(page).pathname.startsWith('/admin'),
    }),
  ],
  security: {
    checkOrigin: true,
  },
  vite: {
    plugins: [tailwindcss()]
  }
});
