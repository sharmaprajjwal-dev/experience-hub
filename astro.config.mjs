// @ts-check
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';
import { defineConfig, sessionDrivers } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

const site = process.env.PUBLIC_SITE_URL || 'https://experiencehub.example';

// https://astro.build/config
export default defineConfig({
  site,
  trailingSlash: 'never',
  adapter: cloudflare({
    // Catalogue media currently uses local CSS placeholders or Supabase Storage,
    // so a paid Cloudflare Images binding would add no value.
    imageService: 'passthrough',
  }),
  // ExperienceHub uses Supabase cookie sessions rather than Astro Sessions.
  // An in-memory fallback prevents the adapter from provisioning an unused KV
  // namespace; application code never reads Astro.session.
  session: {
    driver: sessionDrivers.lruCache(),
  },
  integrations: [
    sitemap({
      filter: (page) => {
        const pathname = new URL(page).pathname;
        return (
          !pathname.startsWith('/admin') &&
          !pathname.startsWith('/book/') &&
          !pathname.startsWith('/checkout/')
        );
      },
    }),
  ],
  security: {
    checkOrigin: true,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
