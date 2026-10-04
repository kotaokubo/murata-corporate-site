import type { Page } from '@playwright/test';

/** トップから辿れるサイト内のページを集める */
export async function crawl(page: Page, start = '/'): Promise<string[]> {
  const seen = new Set<string>();
  const queue = [start];
  while (queue.length) {
    const path = queue.shift()!;
    if (seen.has(path)) continue;
    seen.add(path);
    await page.goto(path);
    const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => (a as HTMLAnchorElement).getAttribute('href') ?? ''));
    for (const href of hrefs) {
      if (!href.startsWith('/') || href.startsWith('//')) continue;
      const clean = href.split('#')[0].split('?')[0];
      if (clean && !seen.has(clean)) queue.push(clean);
    }
  }
  return [...seen].sort();
}

export const WIDTHS = [390, 768, 1366, 1920] as const;
