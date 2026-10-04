import { test } from '@playwright/test';
import { crawl, WIDTHS } from './helpers';

// 各ページを4つの幅で撮影する。合否は判定しない（人が画像で見比べる）。
// 撮影した画像は test-results/ に保存され、必須チェックでは PR に添付される
test('全ページを4つの幅で撮影する', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const paths = await crawl(page);
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of paths) {
      await page.goto(path);
      const name = `${width}${path === '/' ? '/top' : path.replace(/\/$/, '')}.png`;
      await page.screenshot({ path: testInfo.outputPath('screenshots', name), fullPage: true });
    }
  }
});
