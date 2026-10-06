// @ts-check
import { renameSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/** Cloudflare Pages は階層ごとの 404.html を見る。Astro の en/404/index.html を en/404.html へ移す */
function copyLocale404() {
  return {
    name: 'copy-locale-404',
    hooks: {
      /** @param {{ dir: URL }} opts */
      'astro:build:done': async ({ dir }) => {
        const root = fileURLToPath(dir);
        for (const locale of ['en', 'zh']) {
          const src = join(root, locale, '404', 'index.html');
          const dest = join(root, locale, '404.html');
          // 移して元を消す。/en/404/ が 200 の普通のページとして残らないようにする
          if (existsSync(src)) {
            renameSync(src, dest);
            rmSync(join(root, locale, '404'), { recursive: true, force: true });
          }
        }
      },
    },
  };
}

// 本番の URL。canonical と sitemap はすべてこの URL を指す
export default defineConfig({
  site: 'https://www.murata-jewelry.co.jp',
  trailingSlash: 'ignore',
  i18n: {
    defaultLocale: 'ja',
    locales: ['ja', 'en', { path: 'zh', codes: ['zh-Hans', 'zh-CN'] }],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'ja',
        locales: {
          ja: 'ja',
          en: 'en',
          zh: 'zh-Hans',
        },
      },
    }),
    copyLocale404(),
  ],
});
