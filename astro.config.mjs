// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// 本番の URL。canonical と sitemap はすべてこの URL を指す
export default defineConfig({
  site: 'https://www.murata-jewelry.co.jp',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
});
