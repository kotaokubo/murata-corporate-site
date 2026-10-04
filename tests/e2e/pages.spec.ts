import { test, expect } from '@playwright/test';
import { crawl } from './helpers';

test('すべてのページが開け、エラーが出ず、お問い合わせ欄がある', async ({ page }) => {
  const paths = await crawl(page);
  expect(paths.length).toBeGreaterThan(5);
  for (const path of paths) {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    const res = await page.goto(path);
    expect(res?.status(), `${path} が開けない`).toBe(200);
    expect(errors, `${path} でブラウザのエラー`).toEqual([]);
    // お問い合わせ欄：電話とメールが、押すと電話・メーラーが開くリンクになっている
    const contact = page.getByTestId('contact-section');
    await expect(contact, `${path} にお問い合わせ欄がない`).toHaveCount(1);
    for (const tel of await page.getByTestId('contact-tel').all()) {
      await expect(tel).toHaveAttribute('href', /^tel:\d{10,11}$/);
    }
    await expect(page.getByTestId('contact-mail')).toHaveAttribute('href', /^mailto:.+@.+/);
    page.removeAllListeners('pageerror');
    page.removeAllListeners('console');
  }
});

test('ヘッダーの「お問い合わせ」でページ下部のお問い合わせ欄へ移る', async ({ page }) => {
  await page.goto('/company/');
  await page.getByTestId('header-contact').click();
  await expect(page).toHaveURL(/#contact$/);
  await expect(page.getByTestId('contact-section')).toBeInViewport();
});

test('スマートフォン幅でハンバーガーメニューが開く', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const nav = page.locator('#global-nav');
  await expect(nav).toBeHidden();
  await page.getByRole('button', { name: 'メニューを開く' }).click();
  await expect(nav).toBeVisible();
});

test('本番向けのビルドに下書きのお知らせが含まれない', async ({ page }) => {
  await page.goto('/news/');
  await expect(page.getByTestId('news-list')).not.toContainText('下書き');
  const res = await page.goto('/news/2026-10-02-sample-draft/');
  expect(res?.status()).toBe(404);
});

test('本番向けのビルドに noindex が付いていない', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://www.murata-jewelry.co.jp/');
});
